/* GET /api/availability
 *
 * Reports whether the café is accepting online orders right now. The checkout UI
 * calls this to enable/disable the "Order & pay at café" button so customers
 * can't place a pickup order when the café is closed.
 *
 * Source of truth: configured hours in lib/hours.js (fallback). Once the Toast
 * Configuration API is enabled, this will prefer live Toast hours/online-ordering
 * status; until then it uses the local config.
 *
 * Response: { open: bool, reason: string, opensAt: string|null, source: string }
 */

const hours = require("../lib/hours");

module.exports = async function handler(req, res) {
  // NOTE: when Toast Config API is enabled, fetch live hours here and prefer them.
  // For now we use the configured local hours as the authoritative fallback.
  const now = Date.now();
  const a = hours.availabilityAt(now);

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    open: a.open,
    reason: a.reason,
    opensAt: a.opensAt || null,
    lastOrder: a.lastOrder || null,
    source: "config"
  });
};
