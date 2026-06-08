/* Live menu loader. Tries the Toast-backed /api/menu endpoint and, on success,
 * overwrites window.ILLY_MENU.categories/store with the live data BEFORE the
 * page renders. If the endpoint is missing (pure static host) or fails, the
 * hardcoded menu already baked into pages/menu.js is used unchanged.
 *
 * Usage: load this AFTER menu.js and BEFORE the page's render script, and have
 * the render script await window.ILLY_MENU.ready.
 *
 *   <script src="menu.js"></script>
 *   <script src="menu-remote.js"></script>
 *   ... render script does: await M.ready; ...renders M.categories...
 */
(function () {
  var M = window.ILLY_MENU = window.ILLY_MENU || {};

  // Endpoint is root-relative so it works from /pages/* and from /.
  var ENDPOINT = "/api/menu";

  M.source = "static"; // becomes "toast" if the live fetch succeeds

  M.ready = (function () {
    if (typeof fetch !== "function") return Promise.resolve(M);

    return fetch(ENDPOINT, { headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.categories) || !data.categories.length) {
          throw new Error("empty menu payload");
        }
        // Live data wins; keep local helpers (photoUrl, allItems, findItem).
        M.categories = data.categories;
        if (data.store) M.store = data.store;
        if (data.modifiers) M.modifiers = data.modifiers;
        M.source = "toast";
        M.meta = data.meta || null;
        return M;
      })
      .catch(function (err) {
        // Static fallback: leave the hardcoded menu in place.
        if (window.console && console.info) {
          console.info("[menu] live Toast menu unavailable, using built-in menu:", err.message);
        }
        M.source = "static";
        return M;
      });
  })();
})();
