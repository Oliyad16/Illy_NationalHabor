/* Admin-managed menu image overrides — runtime, no database, no redeploy.
 *
 * Photos in lib/menu-overrides.js are baked at build time. This store lets
 * admins set or change a food image live from the dashboard and have the public
 * menu reflect it on the next request.
 *
 * Storage: a single { itemId -> { url, updatedAt, updatedBy } } map kept in the
 * SUPER ADMIN user's privateMetadata under `menuImages`. We reuse Clerk as the
 * store (same no-DB pattern as profiles/roles) and pick the super admin's record
 * because it's stable, server-only, and already privileged. privateMetadata is
 * never exposed to the browser by Clerk.
 *
 * Merge: getImageMap() is read by /api/menu, which sets item.img on matching
 * items — and item.img already wins over the baked item.photo in the UI
 * (pages/menu.js photoUrl), so an override transparently replaces the default.
 */

const auth = require("./auth");

const META_KEY = "menuImages";

// Accept only http(s) image URLs (or our local /assets path) to avoid javascript:
// and data: injection through the image src.
function isValidImageUrl(url) {
  const s = String(url || "").trim();
  if (!s) return false;
  if (s.length > 2048) return false;
  if (/^https:\/\//i.test(s) || /^http:\/\//i.test(s)) return true;
  if (/^(\.\.\/)?assets\//.test(s)) return true; // local bundled asset
  return false;
}

let _cache = null; // { map, fetchedAt }
const CACHE_TTL_MS = 30 * 1000;

async function findSuperAdmin(clerk) {
  const match = await clerk.users.getUserList({
    emailAddress: [auth.SUPER_ADMIN_EMAIL],
    limit: 1
  });
  return (match.data || match)[0] || null;
}

// Read the override map ({ itemId -> url }). Cached briefly so the public menu
// endpoint isn't doing a Clerk lookup on every hit.
async function getImageMap(env, opts) {
  opts = opts || {};
  const now = opts.now || Date.now();
  if (!opts.force && _cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.map;
  }
  const clerk = auth.clerkClient(env);
  const su = await findSuperAdmin(clerk);
  const raw = (su && su.privateMetadata && su.privateMetadata[META_KEY]) || {};
  const map = {};
  Object.keys(raw).forEach(function (id) {
    const entry = raw[id];
    const url = entry && typeof entry === "object" ? entry.url : entry;
    if (isValidImageUrl(url)) map[id] = String(url).trim();
  });
  _cache = { map: map, fetchedAt: now };
  return map;
}

// Full records (with updatedAt/updatedBy) for the admin UI.
async function getImageRecords(env) {
  const clerk = auth.clerkClient(env);
  const su = await findSuperAdmin(clerk);
  if (!su) throw new Error("super_admin_missing");
  return (su.privateMetadata && su.privateMetadata[META_KEY]) || {};
}

// Set or clear one item's image. Pass url="" (or null) to remove the override.
async function setImage(env, itemId, url, actorEmail) {
  const id = String(itemId || "").trim();
  if (!id) { const e = new Error("itemId required"); e.code = "bad_request"; throw e; }

  const clerk = auth.clerkClient(env);
  const su = await findSuperAdmin(clerk);
  if (!su) { const e = new Error("super admin account not found"); e.code = "super_admin_missing"; throw e; }

  const current = Object.assign({}, (su.privateMetadata && su.privateMetadata[META_KEY]) || {});
  if (url) {
    if (!isValidImageUrl(url)) { const e = new Error("invalid image url"); e.code = "bad_request"; throw e; }
    current[id] = { url: String(url).trim(), updatedAt: Date.now(), updatedBy: actorEmail || "" };
  } else {
    delete current[id];
  }

  const merged = Object.assign({}, su.privateMetadata || {});
  merged[META_KEY] = current;
  await clerk.users.updateUserMetadata(su.id, { privateMetadata: merged });
  _cache = null; // bust cache so the public menu reflects it immediately
  return current[id] || null;
}

function _resetCacheForTest() { _cache = null; }

module.exports = {
  META_KEY,
  isValidImageUrl,
  getImageMap,
  getImageRecords,
  setImage,
  _resetCacheForTest
};
