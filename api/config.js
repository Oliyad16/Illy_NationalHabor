/* GET /api/config
 *
 * Public, non-secret front-end config. The Stripe PUBLISHABLE key is safe to
 * expose to the browser (that's its purpose); the SECRET key never leaves the
 * server. Served from an env var so we don't hardcode it in the page.
 *
 * Env: STRIPE_PUBLISHABLE_KEY  (pk_test_... or pk_live_...)
 */
module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=300");
  res.status(200).json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ""
  });
};
