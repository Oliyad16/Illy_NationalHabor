/* GET /api/admin/stats  (admin + super_admin)
 *
 * Live operational metrics sourced directly from the Clerk Backend API:
 * total users, signups in the last 7 / 30 days, and an admin count.
 * No database required.
 */

const auth = require("../../lib/auth");

const DAY_MS = 24 * 60 * 60 * 1000;

function countSince(users, sinceMs) {
  return users.filter(function (u) {
    return typeof u.createdAt === "number" && u.createdAt >= sinceMs;
  }).length;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const me = await auth.requireRole(req, res, process.env, "admin");
  if (!me) return;

  try {
    const clerk = auth.clerkClient(process.env);
    const totalCount = await clerk.users.getCount();

    // Pull a recent page to derive signup windows and an admin tally. Clerk
    // caps page size at 500; for a single-location store this comfortably covers
    // the active user base. (When the base outgrows this, move to event logging.)
    const list = await clerk.users.getUserList({ limit: 500, orderBy: "-created_at" });
    const users = list.data || list;

    const now = Date.now();
    const adminCount = users.filter(function (u) {
      const role = String((u.publicMetadata && u.publicMetadata.role) || (u.privateMetadata && u.privateMetadata.role) || "").toLowerCase();
      return role === "admin" || role === "super_admin";
    }).length;

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      totalUsers: totalCount,
      signupsLast7Days: countSince(users, now - 7 * DAY_MS),
      signupsLast30Days: countSince(users, now - 30 * DAY_MS),
      adminCount: adminCount,
      sampledUsers: users.length,
      generatedAt: new Date(now).toISOString()
    });
  } catch (err) {
    console.error("[/api/admin/stats] failed:", err && err.message);
    res.status(502).json({ error: "stats_unavailable", message: "Could not load metrics from Clerk." });
  }
};
