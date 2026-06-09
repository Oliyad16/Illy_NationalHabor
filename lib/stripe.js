/* Minimal Stripe REST client (no SDK dependency).
 *
 * Talks to Stripe's API with the secret key from env. We only need three calls:
 *   - createPaymentIntent  (charge setup)
 *   - getPaymentIntent     (read metadata in the webhook)
 *   - refund               (auto-refund if Toast rejects the paid order)
 * Plus webhook signature verification.
 *
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */

const crypto = require("crypto");

const API = "https://api.stripe.com/v1";

function requireEnv(name, env) {
  const v = env[name];
  if (!v) throw new Error("Missing required env var: " + name);
  return v;
}

/* Stripe expects application/x-www-form-urlencoded with bracketed nested keys. */
function formEncode(obj, prefix) {
  const parts = [];
  Object.keys(obj).forEach(function (key) {
    const val = obj[key];
    const k = prefix ? prefix + "[" + key + "]" : key;
    if (val === undefined || val === null) return;
    if (typeof val === "object") {
      parts.push(formEncode(val, k));
    } else {
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(val));
    }
  });
  return parts.join("&");
}

async function stripeCall(path, method, body, env) {
  const res = await fetch(API + path, {
    method: method,
    headers: {
      Authorization: "Bearer " + requireEnv("STRIPE_SECRET_KEY", env),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body ? formEncode(body) : undefined
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = (json && json.error && json.error.message) || ("Stripe " + res.status);
    const e = new Error(msg);
    e.stripe = json && json.error;
    e.status = res.status;
    throw e;
  }
  return json;
}

function createPaymentIntent(params, env) {
  // params: { amountCents, currency, metadata }
  return stripeCall("/payment_intents", "POST", {
    amount: params.amountCents,
    currency: params.currency || "usd",
    automatic_payment_methods: { enabled: true },
    metadata: params.metadata || {}
  }, env);
}

function getPaymentIntent(id, env) {
  return stripeCall("/payment_intents/" + encodeURIComponent(id), "GET", null, env);
}

function refund(paymentIntentId, env, reason) {
  return stripeCall("/refunds", "POST", {
    payment_intent: paymentIntentId,
    reason: reason || "requested_by_customer"
  }, env);
}

/* Verify a Stripe webhook signature (t=...,v1=...). Throws if invalid.
 * rawBody must be the exact raw request bytes/string. */
function verifyWebhook(rawBody, sigHeader, env, toleranceSec) {
  const secret = requireEnv("STRIPE_WEBHOOK_SECRET", env);
  if (!sigHeader) throw new Error("missing stripe-signature header");
  const parts = {};
  sigHeader.split(",").forEach(function (kv) {
    const i = kv.indexOf("=");
    if (i > -1) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  });
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) throw new Error("malformed stripe-signature");

  const signedPayload = t + "." + rawBody;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  // constant-time compare
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("signature mismatch");
  }
  // Optional replay protection.
  const tol = toleranceSec || 300;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - parseInt(t, 10)) > tol) {
    throw new Error("timestamp outside tolerance");
  }
  return JSON.parse(rawBody);
}

module.exports = {
  createPaymentIntent,
  getPaymentIntent,
  refund,
  verifyWebhook,
  formEncode,
  _stripeCall: stripeCall
};
