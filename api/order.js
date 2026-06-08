/* Vercel serverless function: POST /api/order
 *
 * Places a pay-at-pickup order in the café POS via the Toast Orders API.
 * The order is created UNPAID — the customer pays at the counter on pickup — so
 * this site never handles card data (no PCI scope).
 *
 * Request body (JSON):
 *   {
 *     items: [{ id, quantity }],          // id = our slug; resolved to a Toast guid server-side
 *     customer: { firstName, lastName, phone, email },
 *     note: "optional"
 *   }
 *
 * We resolve slugs -> Toast GUIDs from the live menu on the server so the
 * browser can't spoof prices/items and so it works even if the client rendered
 * the static fallback menu.
 *
 * Env: TOAST_API_HOST, TOAST_CLIENT_ID, TOAST_CLIENT_SECRET,
 *      TOAST_RESTAURANT_GUID, TOAST_DINING_OPTION_GUID
 *      (optional) TOAST_REVENUE_CENTER_GUID
 */

const toast = require("../lib/toast");
const overrides = require("../lib/menu-overrides");

/* Café cart line ids look like:  cafe::bacon-egg|sz:Large|md:Oat Milk|md:Extra Shot
 * Parse out the base item slug and the chosen size/modifier labels. Plain retail
 * ids (no "cafe::" prefix, no pipes) pass through as the base id. */
function parseLineId(id) {
  id = String(id || "");
  const stripped = id.indexOf("cafe::") === 0 ? id.slice(6) : id;
  const parts = stripped.split("|");
  const baseId = parts.shift();
  const options = parts.map(function (p) {
    if (p.indexOf("sz:") === 0) return "Size " + p.slice(3);
    if (p.indexOf("md:") === 0) return p.slice(3);
    return p;
  });
  return { baseId: baseId, options: options };
}

function readBody(req) {
  return new Promise(function (resolve) {
    if (req.body) {
      // Vercel may have parsed it already.
      if (typeof req.body === "string") {
        try { resolve(JSON.parse(req.body)); } catch (e) { resolve(null); }
      } else {
        resolve(req.body);
      }
      return;
    }
    let data = "";
    req.on("data", function (c) { data += c; });
    req.on("end", function () {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { resolve(null); }
    });
    req.on("error", function () { resolve(null); });
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const body = await readBody(req);
  if (!body || !Array.isArray(body.items) || !body.items.length) {
    res.status(400).json({ error: "invalid_request", message: "items required" });
    return;
  }

  try {
    // Pull the live menu (cached) and index Toast items by our slug id.
    const { categories } = await toast.getMenu(process.env, { overrides: overrides.byName });
    const bySlug = {};
    categories.forEach(function (c) {
      c.items.forEach(function (it) { bySlug[it.id] = it; });
    });

    const items = [];
    const unresolved = [];
    const customizations = []; // human-readable size/modifier notes for the café

    body.items.forEach(function (line) {
      const parsed = parseLineId(line.id);
      const menuItem = bySlug[parsed.baseId];
      if (!menuItem || !menuItem.guid) {
        unresolved.push(line.id);
        return;
      }
      const qty = Math.max(1, parseInt(line.quantity, 10) || 1);
      items.push({
        guid: menuItem.guid,
        itemGroupGuid: menuItem.itemGroupGuid,
        quantity: qty
      });
      // Until per-modifier GUID mapping is wired, surface the customer's chosen
      // size/modifiers to the café as an order note so nothing is lost.
      if (parsed.options.length) {
        customizations.push(qty + "× " + menuItem.name + ": " + parsed.options.join(", "));
      }
    });

    if (!items.length) {
      res.status(409).json({
        error: "items_unavailable",
        message: "None of the requested items could be matched to the live Toast menu.",
        unresolved: unresolved
      });
      return;
    }

    const noteParts = [];
    if (body.note) noteParts.push(String(body.note));
    if (customizations.length) noteParts.push("Customizations — " + customizations.join("; "));

    const result = await toast.createOrder(
      {
        items: items,
        customer: body.customer,
        note: noteParts.join(" | ")
      },
      process.env
    );

    res.status(201).json({
      ok: true,
      orderGuid: result && (result.guid || result.orderGuid),
      // Surface a check/display number if Toast returned one.
      displayNumber:
        result && result.checks && result.checks[0] && result.checks[0].displayNumber,
      unresolved: unresolved.length ? unresolved : undefined
    });
  } catch (err) {
    const code = err && err.code;
    if (code === "empty_order" || code === "missing_guid") {
      res.status(400).json({ error: code, message: err.message });
      return;
    }
    console.error("[/api/order] failed:", err && err.message);
    res.status(502).json({
      error: "order_failed",
      message: "Could not place the order with Toast. Please try the Pay online option or call the café."
    });
  }
};
