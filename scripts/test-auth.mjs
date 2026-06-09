import assert from "node:assert/strict";
import auth from "../lib/auth.js";

function clerkUser(overrides = {}) {
  return Object.assign({
    id: "user_123",
    firstName: "Test",
    lastName: "User",
    username: null,
    primaryEmailAddressId: "email_123",
    emailAddresses: [{ id: "email_123", emailAddress: "guest@example.com" }],
    publicMetadata: {},
    privateMetadata: {}
  }, overrides);
}

assert.equal(
  auth.roleForUser(
    clerkUser({
      emailAddresses: [{ id: "email_123", emailAddress: "oliyad@thelivingstonefoundation.com" }]
    }),
    {}
  ),
  "super_admin",
  "configured email always resolves to super_admin"
);

assert.equal(
  auth.roleForUser(
    clerkUser({ publicMetadata: { role: "admin" } }),
    {}
  ),
  "admin",
  "public metadata can assign admin"
);

assert.equal(
  auth.roleForUser(
    clerkUser({ privateMetadata: { role: "super_admin" } }),
    {}
  ),
  "super_admin",
  "private metadata can assign super_admin"
);

assert.equal(
  auth.roleForUser(
    clerkUser({ emailAddresses: [{ id: "email_123", emailAddress: "manager@example.com" }] }),
    { ADMIN_EMAILS: "manager@example.com,staff@example.com" }
  ),
  "admin",
  "ADMIN_EMAILS allowlist can assign admin"
);

assert.equal(auth.roleForUser(clerkUser(), {}), "customer", "default role is customer");

const pub = auth.publicUserFromClerk(
  clerkUser({ publicMetadata: { role: "admin" } }),
  {}
);
assert.equal(pub.email, "guest@example.com", "public user includes email");
assert.equal(pub.name, "Test User", "public user includes display name");
assert.equal(pub.isAdmin, true, "public user includes admin flag");
assert.equal(pub.isSuperAdmin, false, "public user includes super admin flag");

console.log("auth tests passed");
