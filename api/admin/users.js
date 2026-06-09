/* GET /api/admin/users?limit=&offset=&query=  (admin + super_admin)
 *
 * Paginated user directory from the Clerk Backend API. Each row carries the
 * resolved role (super admin email + metadata + ADMIN_EMAILS allowlist) so the
 * dashboard renders the same role logic the rest of the app enforces.
 */

const auth = require("../../lib/auth");

function intParam(value, fallback, max) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return max ? Math.min(n, max) : n;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const me = await auth.requireRole(req, res, process.env, "admin");
  if (!me) return;

  const limit = intParam(req.query && req.query.limit, 25, 100);
  const offset = intParam(req.query && req.query.offset, 0);
  const query = (req.query && req.query.query ? String(req.query.query) : "").trim();

  try {
    const clerk = auth.clerkClient(process.env);
    const opts = { limit: limit, offset: offset, orderBy: "-created_at" };
    if (query) opts.query = query;

    const list = await clerk.users.getUserList(opts);
    const data = list.data || list;
    const totalCount = typeof list.totalCount === "number" ? list.totalCount : data.length;

    const rows = data.map(function (u) {
      return {
        id: u.id,
        email: auth.primaryEmail(u),
        name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "",
        role: auth.roleForUser(u, process.env),
        createdAt: u.createdAt || null,
        lastActiveAt: u.lastActiveAt || null
      };
    });

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: true, users: rows, totalCount: totalCount, limit: limit, offset: offset });
  } catch (err) {
    console.error("[/api/admin/users] failed:", err && err.message);
    res.status(502).json({ error: "users_unavailable", message: "Could not load users from Clerk." });
  }
};
