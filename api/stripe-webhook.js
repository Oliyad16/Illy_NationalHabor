/* POST /api/stripe-webhook
 *
 * Step 2 of on-site checkout — the reliable, server-side completion. Stripe calls
 * this after a payment. On payment_intent.succeeded we:
 *   1. verify the Stripe signature (reject forgeries)
 *   2. rebuild the order from the PaymentIntent metadata
 *   3. push it to Toast as a PAID order (money already collected by Stripe)
 *   4. if Toast rejects → AUTO-REFUND the Stripe charge + email the café
 *
 * Using a webhook (not the browser) means an order still completes even if the
 * customer closes the tab right after paying — and we never keep money for an
 * order the kitchen never received.
 *
 * IMPORTANT: Stripe signature verification needs the RAW request body, so body
 * parsing is disabled below.
 *
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, Toast vars, (optional) Resend.
 */

const stripe = require("../lib/stripe");
const toast = require("../lib/toast");
const notify = require("../lib/notify");

// Vercel: receive the raw body so signature verification works.
module.exports.config = { api: { bodyParser: false } };

function rawBody(req) {
  return new Promise(function (resolve, reject) {
    let data = "";
    req.on("data", function (c) { data += c; });
    req.on("end", function () { resolve(data); });
    req.on("error", reject);
  });
}

async function pushPaidOrderToToast(pi, env) {
  const md = pi.metadata || {};
  let cart = [];
  try { cart = JSON.parse(md.cartJson || "[]"); } catch (e) { cart = []; }

  const items = cart
    .filter(function (r) { return r.guid; })
    .map(function (r) {
      return { guid: r.guid, itemGroupGuid: r.itemGroupGuid, quantity: r.qty };
    });

  // Surface any customizations + items missing a guid in the note.
  const customizations = cart
    .filter(function (r) { return r.options && r.options.length; })
    .map(function (r) { return r.qty + "× " + r.name + ": " + r.options.join(", "); });
  const noteParts = [];
  if (md.note) noteParts.push(md.note);
  if (customizations.length) noteParts.push("Customizations — " + customizations.join("; "));
  noteParts.push("Paid online (Stripe " + pi.id + ")");

  if (!items.length) {
    const e = new Error("no toast-resolvable items in paid order");
    e.code = "no_items";
    throw e;
  }

  return toast.createOrder({
    items: items,
    customer: {
      firstName: md.custFirst || "",
      lastName: md.custLast || "",
      phone: md.custPhone || "",
      email: md.custEmail || ""
    },
    note: noteParts.join(" | "),
    payment: { amountCents: pi.amount, reference: pi.id }
  }, env);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  let event;
  try {
    const raw = await rawBody(req);
    event = stripe.verifyWebhook(raw, req.headers["stripe-signature"], process.env);
  } catch (err) {
    console.error("[stripe-webhook] signature verify failed:", err.message);
    res.status(400).json({ error: "invalid_signature" });
    return;
  }

  // We only act on successful payments. Ack everything else so Stripe stops retrying.
  if (event.type !== "payment_intent.succeeded") {
    res.status(200).json({ received: true, ignored: event.type });
    return;
  }

  const pi = event.data.object;

  try {
    const order = await pushPaidOrderToToast(pi, process.env);
    console.log("[stripe-webhook] order pushed to Toast:", order && (order.guid || order.orderGuid), "for PI", pi.id);
    res.status(200).json({ received: true, toastOrder: order && (order.guid || order.orderGuid) });
  } catch (toastErr) {
    // Paid but the kitchen never got it → refund and alert. Never keep the money.
    console.error("[stripe-webhook] Toast push failed, refunding PI", pi.id, ":", toastErr.message);
    let refunded = false;
    try {
      await stripe.refund(pi.id, process.env, "requested_by_customer");
      refunded = true;
    } catch (refundErr) {
      console.error("[stripe-webhook] REFUND FAILED for PI", pi.id, ":", refundErr.message);
    }

    const md = pi.metadata || {};
    const dollars = (pi.amount / 100).toFixed(2);
    await notify.emailCafe(
      (refunded ? "[ACTION NEEDED] Refunded online order — Toast rejected" : "[URGENT] Paid order — Toast rejected AND refund failed"),
      [
        "An online (Stripe) order could not be sent to Toast.",
        "",
        "Customer: " + (md.custFirst || "") + " " + (md.custLast || "") + "  " + (md.custPhone || ""),
        "Email: " + (md.custEmail || "—"),
        "Amount: $" + dollars,
        "Cart: " + (md.cart || "—"),
        "Note: " + (md.note || "—"),
        "",
        "Stripe PaymentIntent: " + pi.id,
        "Toast error: " + toastErr.message,
        refunded
          ? "The customer HAS been automatically refunded. No further payment action needed; enter the order manually if they still want it."
          : "WARNING: automatic refund FAILED. Refund this charge in the Stripe dashboard immediately."
      ].join("\n"),
      process.env
    );

    // Tell Stripe we handled it (don't retry — we've already refunded/alerted).
    res.status(200).json({ received: true, toastFailed: true, refunded: refunded });
  }
};
