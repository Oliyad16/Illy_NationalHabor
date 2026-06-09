/* Tests for the Stripe + hours + paid-order-to-Toast logic.
 * Run: node scripts/test-checkout.mjs
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const hours = require("../lib/hours.js");
const stripe = require("../lib/stripe.js");
const toast = require("../lib/toast.js");

let passed = 0, failed = 0;
function assert(cond, name) {
  if (cond) { passed++; console.log("  ok  " + name); }
  else { failed++; console.log("FAIL  " + name); }
}

/* ---- hours: open / before-open / near-close ---- */
(function testHours() {
  // Build an epoch that is a known time in America/New_York by probing.
  // 10:00 AM ET on a Wednesday should be OPEN.
  // We can't use Date.now mocking easily; instead test the pure logic via a
  // crafted epoch and verify partsInZone maps it, then availabilityAt is consistent.

  // Pick a fixed UTC instant: 2026-06-10T14:30:00Z = 10:30 ET (EDT, summer) Wed.
  const openInstant = Date.parse("2026-06-10T14:30:00Z");
  const a = hours.availabilityAt(openInstant);
  assert(a.open === true, "10:30 ET Wednesday is open");

  // 2026-06-10T11:00:00Z = 07:00 ET — before 8AM open.
  const early = hours.availabilityAt(Date.parse("2026-06-10T11:00:00Z"));
  assert(early.open === false && /opens at/i.test(early.reason), "07:00 ET is closed (before open)");

  // 2026-06-10T22:00:00Z = 18:00 ET — at close, past last-order cutoff.
  const late = hours.availabilityAt(Date.parse("2026-06-10T22:00:00Z"));
  assert(late.open === false, "18:00 ET is closed (past last order)");
})();

/* ---- stripe form encoding (nested + metadata) ---- */
(function testStripeEncode() {
  const enc = stripe.formEncode({
    amount: 1500,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: { cart: "2xlatte", note: "no foam" }
  });
  assert(enc.indexOf("amount=1500") !== -1, "encodes amount");
  assert(enc.indexOf("automatic_payment_methods%5Benabled%5D=true") !== -1, "encodes nested bracket key");
  assert(enc.indexOf("metadata%5Bcart%5D=2xlatte") !== -1, "encodes metadata bracket key");
  assert(enc.indexOf("metadata%5Bnote%5D=no%20foam") !== -1, "url-encodes metadata value");
})();

/* ---- stripe webhook signature verify ---- */
(function testWebhookVerify() {
  const crypto = require("node:crypto");
  const env = { STRIPE_WEBHOOK_SECRET: "whsec_test" };
  const payload = JSON.stringify({ type: "payment_intent.succeeded", data: { object: { id: "pi_1" } } });
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac("sha256", "whsec_test").update(t + "." + payload, "utf8").digest("hex");

  const ok = stripe.verifyWebhook(payload, "t=" + t + ",v1=" + sig, env);
  assert(ok && ok.type === "payment_intent.succeeded", "valid signature verifies + parses");

  let threw = false;
  try { stripe.verifyWebhook(payload, "t=" + t + ",v1=deadbeef", env); }
  catch (e) { threw = true; }
  assert(threw, "bad signature rejected");

  threw = false;
  try { stripe.verifyWebhook(payload, "", env); }
  catch (e) { threw = true; }
  assert(threw, "missing signature header rejected");
})();

/* ---- paid order payload marks PAID via OTHER payment ---- */
(function testPaidOrderPayload() {
  const env = { TOAST_DINING_OPTION_GUID: "dine-takeout" };
  const payload = toast.buildOrderPayload({
    items: [{ guid: "item-latte", quantity: 1 }],
    customer: { firstName: "Sam" },
    payment: { amountCents: 1500, reference: "pi_123" }
  }, env);

  const payments = payload.checks[0].payments;
  assert(Array.isArray(payments) && payments.length === 1, "paid order has a payment");
  assert(payments[0].paymentType === "OTHER", "payment type is OTHER (external/Stripe)");
  assert(payments[0].amount === 15, "payment amount is dollars (15.00)");

  // Unpaid order (no payment) should have NO payments array.
  const unpaid = toast.buildOrderPayload({
    items: [{ guid: "item-latte", quantity: 1 }]
  }, env);
  assert(!unpaid.checks[0].payments, "unpaid order has no payment");
})();

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
