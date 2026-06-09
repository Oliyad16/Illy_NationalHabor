/* GET /api/availability
 *
 * Reports whether the café is accepting online orders right now. The checkout UI
 * calls this to enable/disable the "Order & pay at café" button so customers
 * can't place a pickup order when the café is closed.
 *
 * Source of truth: LIVE Toast restaurant hours (lib/toast.getAvailability), which
 * reads the café's real schedule + online-ordering toggle from the Toast
 * Configuration API. If Toast isn't configured or is unreachable, we fall back to
 * the local hours config (lib/hours.js) so the endpoint never hard-fails.
 *
 * Response: { open, reason, opensAt, lastOrder, source }
 *   source = "toast"  -> live hours from Toast
 *   source = "config" -> local fallback (Toast off/unreachable)
 */

const hours = require("../lib/hours");
const toast = require("../lib/toast");

function toastConfigured(env) {
  return Boolean(
    env.TOAST_API_HOST &&
    env.TOAST_CLIENT_ID &&
    env.TOAST_CLIENT_SECRET &&
    env.TOAST_RESTAURANT_GUID
  );
}

module.exports = async function handler(req, res) {
  const now = Date.now();
  res.setHeader("Cache-Control", "no-store");

  // Prefer live Toast hours when the integration is configured.
  if (toastConfigured(process.env)) {
    try {
      const a = await toast.getAvailability(process.env, {
        now: now,
        lastOrderBeforeCloseMin: hours.LAST_ORDER_BEFORE_CLOSE_MIN
      });
      res.status(200).json({
        open: a.open,
        reason: a.reason,
        opensAt: a.opensAt || null,
        lastOrder: a.lastOrder || null,
        source: "toast"
      });
      return;
    } catch (err) {
      // Toast unreachable: log and fall through to the local config fallback.
      console.error("[/api/availability] live Toast hours failed, using fallback:", err && err.message);
    }
  }

  const a = hours.availabilityAt(now);
  res.status(200).json({
    open: a.open,
    reason: a.reason,
    opensAt: a.opensAt || null,
    lastOrder: a.lastOrder || null,
    source: "config"
  });
};
