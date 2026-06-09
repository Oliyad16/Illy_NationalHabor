/* POST /api/create-payment
 *
 * Step 1 of on-site (Stripe) checkout. The browser sends the cart; the server:
 *   1. refuses if the café is closed (never charge when we can't fulfill)
 *   2. recomputes the total from the LIVE menu (never trust browser prices)
 *   3. creates a Stripe PaymentIntent and stashes the resolved cart + customer
 *      in its metadata so the webhook can push the order to Toast after payment
 *   4. returns { clientSecret, amount } for Stripe Elements to confirm the card
 *
 * Request: { items:[{id, quantity}], customer:{firstName,lastName,phone,email}, note }
 * Env: STRIPE_SECRET_KEY (+ Toast vars for menu pricing)
 */

const toast = require("../lib/toast");
const overrides = require("../lib/menu-overrides");
const stripe = require("../lib/stripe");
const hours = require("../lib/hours");

function readBody(req) {
  return new Promise(function (resolve) {
    if (req.body) {
      if (typeof req.body === "string") {
        try { resolve(JSON.parse(req.body)); } catch (e) { resolve(null); }
      } else resolve(req.body);
      return;
    }
    let data = "";
    req.on("data", function (c) { data += c; });
    req.on("end", function () { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve(null); } });
    req.on("error", function () { resolve(null); });
  });
}

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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  // 1. Closed? Refuse before doing anything.
  const avail = hours.availabilityAt(Date.now());
  if (!avail.open) {
    res.status(409).json({ error: "closed", message: avail.reason });
    return;
  }

  const body = await readBody(req);
  if (!body || !Array.isArray(body.items) || !body.items.length) {
    res.status(400).json({ error: "invalid_request", message: "items required" });
    return;
  }

  try {
    // 2. Recompute total from the live menu; resolve Toast guids for later.
    const { categories } = await toast.getMenu(process.env, { overrides: overrides.byName });
    const bySlug = {};
    categories.forEach(function (c) { c.items.forEach(function (it) { bySlug[it.id] = it; }); });

    let amountCents = 0;
    const resolved = [];
    const unresolved = [];

    body.items.forEach(function (line) {
      const parsed = parseLineId(line.id);
      const mi = bySlug[parsed.baseId];
      if (!mi) { unresolved.push(line.id); return; }
      const qty = Math.max(1, parseInt(line.quantity, 10) || 1);
      amountCents += Math.round(mi.price * 100) * qty;
      resolved.push({
        id: mi.id,
        guid: mi.guid || null,
        itemGroupGuid: mi.itemGroupGuid || null,
        name: mi.name,
        qty: qty,
        options: parsed.options
      });
    });

    if (!resolved.length || amountCents <= 0) {
      res.status(409).json({ error: "items_unavailable", message: "Could not price your cart.", unresolved: unresolved });
      return;
    }

    // 3. Create the PaymentIntent. Stash a compact cart in metadata (Stripe caps
    //    metadata values at 500 chars each, so keep it lean).
    const customer = body.customer || {};
    const compactCart = resolved.map(function (r) {
      return r.qty + "x" + r.id + (r.options.length ? "(" + r.options.join("/") + ")" : "");
    }).join(";").slice(0, 490);

    const pi = await stripe.createPaymentIntent({
      amountCents: amountCents,
      currency: "usd",
      metadata: {
        cart: compactCart,
        cartJson: JSON.stringify(resolved).slice(0, 490),
        custFirst: (customer.firstName || "").slice(0, 60),
        custLast: (customer.lastName || "").slice(0, 60),
        custPhone: (customer.phone || "").slice(0, 30),
        custEmail: (customer.email || "").slice(0, 80),
        note: (body.note || "").slice(0, 300)
      }
    }, process.env);

    res.status(200).json({
      clientSecret: pi.client_secret,
      amount: amountCents,
      unresolved: unresolved.length ? unresolved : undefined
    });
  } catch (err) {
    console.error("[/api/create-payment] failed:", err && err.message);
    res.status(502).json({ error: "payment_setup_failed", message: "Could not start checkout. Please try again." });
  }
};
