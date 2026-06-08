/* Vercel serverless function: GET /api/menu
 *
 * Returns the live illy Caffè menu pulled from Toast, transformed into the
 * shape pages/menu.js expects: { store, modifiers, categories }.
 *
 * The browser (pages/menu-remote.js) calls this; the Toast client secret never
 * leaves the server. If anything fails, we respond 502 and the client falls
 * back to the hardcoded menu baked into pages/menu.js, so the site never breaks.
 *
 * Env vars (configure in the Vercel dashboard, Project -> Settings -> Environment
 * Variables): TOAST_API_HOST, TOAST_CLIENT_ID, TOAST_CLIENT_SECRET,
 * TOAST_RESTAURANT_GUID.
 */

const toast = require("../lib/toast");
const overrides = require("../lib/menu-overrides");

module.exports = async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { categories, cached, fetchedAt } = await toast.getMenu(process.env, {
      overrides: overrides.byName
    });

    // Cache at the CDN for 5 min, allow stale-while-revalidate for resilience.
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    );
    res.status(200).json({
      store: overrides.store,
      modifiers: overrides.modifiers,
      categories,
      meta: { source: "toast", cached: !!cached, fetchedAt }
    });
  } catch (err) {
    // Do not leak internals; log server-side, tell client to use fallback.
    console.error("[/api/menu] Toast fetch failed:", err && err.message);
    res.status(502).json({
      error: "menu_unavailable",
      message: "Live menu temporarily unavailable; using cached menu."
    });
  }
};
