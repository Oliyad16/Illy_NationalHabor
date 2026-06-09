const auth = require("../../lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const clerkUser = await auth.verifyClerkRequest(req, process.env);
    res.setHeader("Cache-Control", "no-store");
    if (!clerkUser) {
      res.status(401).json({ error: "not_authenticated" });
      return;
    }
    res.status(200).json({ ok: true, user: auth.publicUserFromClerk(clerkUser, process.env) });
  } catch (err) {
    console.error("[/api/auth/me] Clerk verification failed:", err && err.message);
    res.status(401).json({ error: "not_authenticated", message: "Clerk session could not be verified." });
  }
};
