/* Café email alerts (via Resend HTTP API — no SDK).
 *
 * Used to alert staff when an order needs manual attention — e.g. Stripe charged
 * the customer but Toast rejected the order (and we auto-refunded). Email is
 * best-effort: failures are logged, never thrown, so they don't break the
 * webhook flow.
 *
 * Env:
 *   RESEND_API_KEY   Resend API key (https://resend.com)
 *   CAFE_ALERT_EMAIL where alerts go (e.g. manager@illynationalharbor.com)
 *   CAFE_FROM_EMAIL  verified sender (e.g. orders@illynationalharbor.com)
 */

async function emailCafe(subject, text, env) {
  const key = env.RESEND_API_KEY;
  const to = env.CAFE_ALERT_EMAIL;
  const from = env.CAFE_FROM_EMAIL || "orders@illynationalharbor.com";
  if (!key || !to) {
    console.warn("[notify] email not configured (RESEND_API_KEY / CAFE_ALERT_EMAIL); skipping:", subject);
    return { sent: false, reason: "not_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from: from, to: [to], subject: subject, text: text })
    });
    if (!res.ok) {
      const b = await res.text().catch(function () { return ""; });
      console.error("[notify] email send failed:", res.status, b.slice(0, 200));
      return { sent: false, reason: "send_failed" };
    }
    return { sent: true };
  } catch (e) {
    console.error("[notify] email error:", e.message);
    return { sent: false, reason: "error" };
  }
}

module.exports = { emailCafe };
