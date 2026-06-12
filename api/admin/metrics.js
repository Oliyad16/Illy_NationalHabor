/* GET /api/admin/metrics?range=today|7d|30d&tzOffset=<min>  (super_admin ONLY)
 *
 * Revenue figures are sensitive, so this endpoint is restricted to the super
 * admin. Regular admins receive 403. Enforced server-side regardless of UI.
 *
 * Live business KPIs derived from the Toast POS for a single café:
 * revenue, order count, average order value, refunds, top sellers, a per-day
 * revenue/orders trend, and an hour-of-day distribution.
 *
 * The site never stores orders itself, so everything here is pulled fresh from
 * Toast's ordersBulk endpoint and reduced server-side (lib/toast.summarizeOrders)
 * so the browser only receives aggregates — never raw customer order data.
 *
 * If Toast isn't configured in this environment we return { available: false }
 * with a 200 so the dashboard can render a clean "POS not connected" state
 * instead of throwing.
 */

const auth = require("../../lib/auth");
const toast = require("../../lib/toast");

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGES = { today: "today", "7d": "7d", "30d": "30d" };

// Café-local midnight for a given range, expressed back in UTC ms.
function rangeStart(range, now, tzOffsetMin) {
  const localNow = now - tzOffsetMin * 60 * 1000;
  const localMidnight = Math.floor(localNow / DAY_MS) * DAY_MS;
  const todayStartUtc = localMidnight + tzOffsetMin * 60 * 1000;
  if (range === "today") return todayStartUtc;
  if (range === "7d") return todayStartUtc - 6 * DAY_MS;
  return todayStartUtc - 29 * DAY_MS; // 30d
}

function toastConfigured(env) {
  return Boolean(
    env.TOAST_API_HOST &&
    env.TOAST_CLIENT_ID &&
    env.TOAST_CLIENT_SECRET &&
    env.TOAST_RESTAURANT_GUID
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const me = await auth.requireRole(req, res, process.env, "super_admin");
  if (!me) return;

  res.setHeader("Cache-Control", "no-store");

  const range = RANGES[(req.query && req.query.range) || "7d"] || "7d";
  const tzOffsetMin = (function () {
    const n = parseInt(req.query && req.query.tzOffset, 10);
    // Browser Date.getTimezoneOffset() range guard (UTC-14 .. UTC+14).
    return Number.isFinite(n) && Math.abs(n) <= 840 ? n : 0;
  })();

  if (!toastConfigured(process.env)) {
    res.status(200).json({ ok: true, available: false, range: range, reason: "pos_not_connected" });
    return;
  }

  const now = Date.now();
  const start = rangeStart(range, now, tzOffsetMin);

  try {
    const orders = await toast.getOrdersBulk(process.env, { start: start, end: now, now: now });
    const summary = toast.summarizeOrders(orders, { tzOffsetMin: tzOffsetMin });

    res.status(200).json({
      ok: true,
      available: true,
      range: range,
      startAt: new Date(start).toISOString(),
      generatedAt: new Date(now).toISOString(),
      metrics: summary
    });
  } catch (err) {
    console.error("[/api/admin/metrics] failed:", err && err.message);
    res.status(502).json({ error: "metrics_unavailable", message: "Could not load order metrics from Toast." });
  }
};
