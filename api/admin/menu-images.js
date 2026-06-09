/* /api/admin/menu-images  (admin + super_admin)
 *
 *   GET  -> { items: [{ id, name, category, defaultPhoto, overrideUrl, currentUrl, updatedAt, updatedBy }] }
 *           Every live menu item with its baked-in photo and any admin override.
 *   PUT  -> body { itemId, url }  set an override; url:"" clears it back to default.
 *
 * Admins get full control of the picture shown for each food/drink item without
 * a redeploy: overrides are stored via lib/menu-images and merged into the public
 * /api/menu at request time.
 */

const auth = require("../../lib/auth");
const toast = require("../../lib/toast");
const overrides = require("../../lib/menu-overrides");
const images = require("../../lib/menu-images");

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
}

// Resolve the baked default photo URL for an item (mirrors pages/menu.js photoUrl).
function defaultPhotoUrl(item) {
  if (item.img) return item.img;
  if (item.photo) return "../assets/menu-photos/" + item.photo;
  return "";
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const me = await auth.requireRole(req, res, process.env, "admin");
  if (!me) return;

  res.setHeader("Cache-Control", "no-store");

  if (req.method === "PUT") {
    const body = readBody(req);
    const itemId = String(body.itemId || "").trim();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!itemId) {
      res.status(400).json({ error: "bad_request", message: "itemId is required." });
      return;
    }
    if (url && !images.isValidImageUrl(url)) {
      res.status(400).json({ error: "bad_request", message: "Enter a valid http(s) image URL." });
      return;
    }
    try {
      const record = await images.setImage(process.env, itemId, url, me.email);
      res.status(200).json({ ok: true, itemId: itemId, override: record });
    } catch (err) {
      const code = err && err.code;
      if (code === "bad_request") {
        res.status(400).json({ error: "bad_request", message: err.message });
        return;
      }
      console.error("[/api/admin/menu-images PUT] failed:", err && err.message);
      res.status(502).json({ error: "save_failed", message: "Could not save the image override." });
    }
    return;
  }

  // GET — join the live menu with current overrides.
  try {
    const [menu, records] = await Promise.all([
      toast.getMenu(process.env, { overrides: overrides.byName }),
      images.getImageRecords(process.env).catch(function () { return {}; })
    ]);

    const items = [];
    (menu.categories || []).forEach(function (cat) {
      (cat.items || []).forEach(function (it) {
        const rec = records[it.id];
        const overrideUrl = rec ? (typeof rec === "object" ? rec.url : rec) : "";
        const def = defaultPhotoUrl(it);
        items.push({
          id: it.id,
          name: it.name,
          category: cat.name,
          defaultPhoto: def,
          overrideUrl: overrideUrl || "",
          currentUrl: overrideUrl || def || "",
          updatedAt: rec && rec.updatedAt ? rec.updatedAt : null,
          updatedBy: rec && rec.updatedBy ? rec.updatedBy : ""
        });
      });
    });

    res.status(200).json({ ok: true, items: items, count: items.length });
  } catch (err) {
    console.error("[/api/admin/menu-images GET] failed:", err && err.message);
    res.status(502).json({ error: "menu_unavailable", message: "Could not load the menu from Toast." });
  }
};
