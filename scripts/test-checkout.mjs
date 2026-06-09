/* Tests for hours availability + pay-at-pickup order-to-Toast logic.
 * Run: node scripts/test-checkout.mjs
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const hours = require("../lib/hours.js");
const toast = require("../lib/toast.js");

let passed = 0, failed = 0;
function assert(cond, name) {
  if (cond) { passed++; console.log("  ok  " + name); }
  else { failed++; console.log("FAIL  " + name); }
}

/* ---- hours: open / before-open / near-close ---- */
(function testHours() {
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

/* ---- pay-at-pickup order payload (UNPAID, no payment attached) ---- */
(function testUnpaidOrderPayload() {
  const env = { TOAST_DINING_OPTION_GUID: "dine-takeout" };
  const payload = toast.buildOrderPayload({
    items: [{ guid: "item-latte", quantity: 1 }],
    customer: { firstName: "Sam" }
  }, env);

  assert(payload.diningOption.guid === "dine-takeout", "uses the takeout dining option");
  assert(payload.checks[0].selections[0].item.guid === "item-latte", "selection carries the item guid");
  assert(payload.checks[0].customer.firstName === "Sam", "customer name is attached");
  // The site never collects payment — every order is unpaid (pay at counter).
  assert(!payload.checks[0].payments, "order has no payment (pay at café)");
})();

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
