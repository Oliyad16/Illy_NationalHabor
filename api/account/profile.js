/* GET / PATCH /api/account/profile  (any signed-in user)
 *
 * Lightweight profile fields the customer dashboard can edit without a database:
 * phone number and a saved pickup preference, persisted in Clerk publicMetadata.
 * Identity fields (name, email) stay managed by Clerk's own UI.
 */

const auth = require("../../lib/auth");

const PICKUP_OPTIONS = ["asap", "scheduled", "curbside"];

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
}

function profileFromUser(user) {
  const meta = (user && user.publicMetadata) || {};
  return {
    phone: typeof meta.phone === "string" ? meta.phone : "",
    pickupPreference: PICKUP_OPTIONS.indexOf(meta.pickupPreference) !== -1 ? meta.pickupPreference : "asap"
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  let clerkUser;
  try {
    clerkUser = await auth.verifyClerkRequest(req, process.env);
  } catch (err) {
    res.status(401).json({ error: "not_authenticated", message: "Clerk session could not be verified." });
    return;
  }
  if (!clerkUser) {
    res.status(401).json({ error: "not_authenticated" });
    return;
  }

  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    res.status(200).json({ ok: true, profile: profileFromUser(clerkUser) });
    return;
  }

  // PATCH
  const body = readBody(req);
  const patch = {};
  if (typeof body.phone === "string") patch.phone = body.phone.trim().slice(0, 32);
  if (typeof body.pickupPreference === "string") {
    const pref = body.pickupPreference.trim().toLowerCase();
    if (PICKUP_OPTIONS.indexOf(pref) === -1) {
      res.status(400).json({ error: "bad_request", message: "Invalid pickup preference." });
      return;
    }
    patch.pickupPreference = pref;
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "bad_request", message: "Nothing to update." });
    return;
  }

  try {
    const clerk = auth.clerkClient(process.env);
    const merged = Object.assign({}, clerkUser.publicMetadata || {}, patch);
    const updated = await clerk.users.updateUserMetadata(clerkUser.id, { publicMetadata: merged });
    res.status(200).json({ ok: true, profile: profileFromUser(updated) });
  } catch (err) {
    console.error("[/api/account/profile] failed:", err && err.message);
    res.status(502).json({ error: "update_failed", message: "Could not save your profile." });
  }
};
