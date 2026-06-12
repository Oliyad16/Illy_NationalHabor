/* POST /api/admin/set-role  (super_admin ONLY)
 * Body: { email: string, role: "super_admin" | "admin" | "customer" }
 *
 * Promotes or demotes a user by writing publicMetadata.role via the Clerk
 * Backend API. Only a super admin may call this, and only a super admin can
 * grant "super_admin". The founder email (auth.SUPER_ADMIN_EMAIL) is always
 * super admin and can never be modified here.
 */

const auth = require("../../lib/auth");

const ASSIGNABLE_ROLES = ["super_admin", "admin", "customer"];

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const me = await auth.requireRole(req, res, process.env, "super_admin");
  if (!me) return;

  const body = readBody(req);
  const email = auth.normalizeEmail(body.email);
  const role = String(body.role || "").trim().toLowerCase();

  if (!email) {
    res.status(400).json({ error: "bad_request", message: "An email address is required." });
    return;
  }
  if (ASSIGNABLE_ROLES.indexOf(role) === -1) {
    res.status(400).json({ error: "bad_request", message: "Role must be 'super_admin', 'admin', or 'customer'." });
    return;
  }
  if (email === auth.SUPER_ADMIN_EMAIL) {
    res.status(400).json({ error: "protected_account", message: "The founder super admin account cannot be modified." });
    return;
  }
  if (email === auth.normalizeEmail(me.email)) {
    res.status(400).json({ error: "self_change", message: "You cannot change your own role." });
    return;
  }

  try {
    const clerk = auth.clerkClient(process.env);
    const match = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
    const target = (match.data || match)[0];
    if (!target) {
      res.status(404).json({ error: "not_found", message: "No Clerk user has that email address." });
      return;
    }

    // Preserve any existing public metadata (e.g. phone, pickup prefs) and only
    // change the role field.
    const merged = Object.assign({}, target.publicMetadata || {}, { role: role });
    await clerk.users.updateUserMetadata(target.id, {
      publicMetadata: merged
    });

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      user: { id: target.id, email: email, role: role }
    });
  } catch (err) {
    console.error("[/api/admin/set-role] failed:", err && err.message);
    res.status(502).json({ error: "update_failed", message: "Could not update the user role in Clerk." });
  }
};
