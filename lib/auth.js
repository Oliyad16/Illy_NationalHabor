const { createClerkClient, verifyToken } = require("@clerk/backend");

const SUPER_ADMIN_EMAIL = "oliyad@thelivingstonefoundation.com";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function splitEmails(value) {
  return String(value || "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

function bearerToken(req) {
  const header = (req.headers && (req.headers.authorization || req.headers.Authorization)) || "";
  if (header.toLowerCase().indexOf("bearer ") === 0) return header.slice(7).trim();
  return "";
}

async function verifyClerkRequest(req, env) {
  const token = bearerToken(req);
  if (!token) return null;

  if (!env.CLERK_SECRET_KEY) {
    throw new Error("Missing CLERK_SECRET_KEY");
  }

  const options = { secretKey: env.CLERK_SECRET_KEY };
  if (env.CLERK_JWT_KEY) options.jwtKey = env.CLERK_JWT_KEY;
  if (env.CLERK_AUTHORIZED_PARTIES) {
    options.authorizedParties = env.CLERK_AUTHORIZED_PARTIES
      .split(",")
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  const verified = await verifyToken(token, options);
  const userId = verified && verified.sub;
  if (!userId) return null;

  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
  const clerkUser = await clerk.users.getUser(userId);
  return clerkUser;
}

function primaryEmail(user) {
  const primaryId = user && user.primaryEmailAddressId;
  const emails = (user && user.emailAddresses) || [];
  const primary = emails.filter(function (entry) { return entry.id === primaryId; })[0] || emails[0];
  return normalizeEmail(primary && primary.emailAddress);
}

function nameForUser(user) {
  if (!user) return "";
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.join(" ") || user.username || "";
}

function metadataRole(user) {
  const metadata = Object.assign(
    {},
    (user && user.publicMetadata) || {},
    (user && user.privateMetadata) || {}
  );
  const role = String(metadata.role || "").trim().toLowerCase();
  if (role === "super_admin" || role === "admin" || role === "customer") return role;
  return "";
}

function roleForUser(user, env) {
  const email = primaryEmail(user);
  if (email === SUPER_ADMIN_EMAIL) return "super_admin";
  const role = metadataRole(user);
  if (role) return role;
  if (splitEmails(env.ADMIN_EMAILS).indexOf(email) !== -1) return "admin";
  return "customer";
}

function publicUserFromClerk(user, env) {
  if (!user) return null;
  const role = roleForUser(user, env);
  const email = primaryEmail(user);
  return {
    id: user.id,
    email: email,
    name: nameForUser(user),
    role: role,
    isAdmin: role === "admin" || role === "super_admin",
    isSuperAdmin: role === "super_admin"
  };
}

function clerkClient(env) {
  if (!env.CLERK_SECRET_KEY) throw new Error("Missing CLERK_SECRET_KEY");
  return createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
}

// Verify the request and return the public user, or null when unauthenticated.
async function authenticate(req, env) {
  const clerkUser = await verifyClerkRequest(req, env);
  if (!clerkUser) return null;
  return publicUserFromClerk(clerkUser, env);
}

// Express/Vercel-style guard. Writes the error response and returns null when the
// caller lacks the required access; otherwise returns the public user object.
//   need: "user" | "admin" | "super_admin"
async function requireRole(req, res, env, need) {
  let user;
  try {
    user = await authenticate(req, env);
  } catch (err) {
    res.status(401).json({ error: "not_authenticated", message: "Clerk session could not be verified." });
    return null;
  }
  if (!user) {
    res.status(401).json({ error: "not_authenticated" });
    return null;
  }
  if (need === "super_admin" && !user.isSuperAdmin) {
    res.status(403).json({ error: "forbidden", message: "Super admin access required." });
    return null;
  }
  if (need === "admin" && !user.isAdmin) {
    res.status(403).json({ error: "forbidden", message: "Admin access required." });
    return null;
  }
  return user;
}

module.exports = {
  SUPER_ADMIN_EMAIL,
  normalizeEmail,
  verifyClerkRequest,
  publicUserFromClerk,
  roleForUser,
  primaryEmail,
  clerkClient,
  authenticate,
  requireRole
};
