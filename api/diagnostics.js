/* TEMPORARY diagnostics endpoint — GET /api/diagnostics?key=YOUR_KEY
 *
 * Helps you find the values needed to enable on-site ordering:
 *   - confirms Toast auth works
 *   - lists the restaurant's dining options + GUIDs (find the "Takeout" GUID
 *     for TOAST_DINING_OPTION_GUID)
 *   - confirms whether the Orders API responds for this account
 *
 * Guarded by a shared secret so it is not a public info leak. Set env var
 * TOAST_DIAG_KEY to any random string, then call:
 *   https://YOUR-SITE/api/diagnostics?key=THAT_STRING
 *
 * DELETE THIS FILE once you have your dining-option GUID. It is not part of the
 * normal customer flow.
 */

const toast = require("../lib/toast");

const CONFIG_PATH = "/config/v2/diningOptions";

module.exports = async function handler(req, res) {
  const key = (req.query && req.query.key) || "";
  const expected = process.env.TOAST_DIAG_KEY || "";
  if (!expected || key !== expected) {
    res.status(403).json({ error: "forbidden", hint: "set TOAST_DIAG_KEY and pass ?key=" });
    return;
  }

  const out = { auth: false, diningOptions: [], ordersApi: "unknown", errors: [] };

  try {
    const env = process.env;
    const token = await toast.getToken(env, Date.now());
    out.auth = !!token;

    // Dining options (for TOAST_DINING_OPTION_GUID).
    try {
      const host = (env.TOAST_API_HOST || "").replace(/\/+$/, "");
      const r = await fetch(host + CONFIG_PATH, {
        headers: {
          Authorization: "Bearer " + token,
          "Toast-Restaurant-External-ID": env.TOAST_RESTAURANT_GUID || "",
          Accept: "application/json"
        }
      });
      if (r.ok) {
        const list = await r.json();
        out.diningOptions = (Array.isArray(list) ? list : []).map(function (d) {
          return { name: d.name, guid: d.guid, behavior: d.behavior };
        });
      } else {
        out.errors.push("diningOptions HTTP " + r.status);
      }
    } catch (e) {
      out.errors.push("diningOptions: " + e.message);
    }

    // Probe the Orders API (a GET; we only care that it is reachable/authorized).
    try {
      const host = (env.TOAST_API_HOST || "").replace(/\/+$/, "");
      const r = await fetch(host + "/orders/v2/orders?pageSize=1", {
        headers: {
          Authorization: "Bearer " + token,
          "Toast-Restaurant-External-ID": env.TOAST_RESTAURANT_GUID || "",
          Accept: "application/json"
        }
      });
      out.ordersApi = r.status === 403 || r.status === 401 ? "NOT enabled (" + r.status + ")" : "reachable (" + r.status + ")";
    } catch (e) {
      out.errors.push("ordersApi: " + e.message);
    }
  } catch (e) {
    out.errors.push("auth: " + e.message);
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(out);
};
