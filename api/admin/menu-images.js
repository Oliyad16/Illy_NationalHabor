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

function titleCase(s) {
  return String(s || "")
    .split(/\s+/)
    .map(function (w) { return w ? w.charAt(0).toUpperCase() + w.slice(1) : w; })
    .join(" ");
}

// Fallback item list built from the baked menu overrides (lib/menu-overrides.js),
// used when Toast is unconfigured/unreachable so the image manager ALWAYS lists
// every item and admins can still set photos. The byName map is keyed by the
// lowercased item name and carries the stable slug id + any baked photo/img.
function bakedItems() {
  const byName = overrides.byName || {};
  return Object.keys(byName).map(function (name) {
    const o = byName[name] || {};
    return {
      id: o.id || name,
      name: titleCase(name),
      // No category grouping in the baked map; bucket them together.
      _category: "Menu",
      img: o.img,
      photo: o.photo
    };
  });
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

  // GET — list every menu item joined with current overrides.
  // Source the item list from live Toast when available; otherwise fall back to
  // the baked menu so the manager ALWAYS works (no hard dependency on Toast).
  let records = {};
  try {
    records = await images.getImageRecords(process.env);
  } catch (e) {
    records = {};
  }

  // Build [{ id, name, category, img?, photo? }] from Toast or the baked menu.
  let sourceItems = [];
  let source = "baked";
  try {
    const menu = await toast.getMenu(process.env, { overrides: overrides.byName });
    (menu.categories || []).forEach(function (cat) {
      (cat.items || []).forEach(function (it) {
        sourceItems.push({ id: it.id, name: it.name, _category: cat.name, img: it.img, photo: it.photo });
      });
    });
    if (sourceItems.length) source = "toast";
  } catch (e) {
    // Toast off/unreachable — fall back below.
    sourceItems = [];
  }
  if (!sourceItems.length) {
    sourceItems = bakedItems();
    source = "baked";
  }

  // De-dupe by id (the baked map can hold a name twice via modifiers, etc.).
  const seen = {};
  const items = [];
  sourceItems.forEach(function (it) {
    if (!it.id || seen[it.id]) return;
    seen[it.id] = true;
    const rec = records[it.id];
    const overrideUrl = rec ? (typeof rec === "object" ? rec.url : rec) : "";
    const def = defaultPhotoUrl(it);
    items.push({
      id: it.id,
      name: it.name,
      category: it._category || "Menu",
      defaultPhoto: def,
      overrideUrl: overrideUrl || "",
      currentUrl: overrideUrl || def || "",
      updatedAt: rec && rec.updatedAt ? rec.updatedAt : null,
      updatedBy: rec && rec.updatedBy ? rec.updatedBy : ""
    });
  });

  items.sort(function (a, b) {
    return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
  });

  res.status(200).json({ ok: true, items: items, count: items.length, source: source });
};
