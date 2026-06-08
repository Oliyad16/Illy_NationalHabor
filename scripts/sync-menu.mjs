/* Optional: bake a static assets/menu.json from live Toast data via the CLI.
 *
 * Use this if you'd rather not run the /api/menu serverless function — e.g. on a
 * purely static host. Run it whenever prices change and commit the result;
 * pages/menu-remote.js can be pointed at /assets/menu.json instead of /api/menu.
 *
 * Reads credentials from the environment (or a local .env you source first):
 *   TOAST_API_HOST TOAST_CLIENT_ID TOAST_CLIENT_SECRET TOAST_RESTAURANT_GUID
 *
 * Run: node scripts/sync-menu.mjs
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const toast = require(path.join(root, "lib", "toast.js"));
const overrides = require(path.join(root, "lib", "menu-overrides.js"));

const required = ["TOAST_API_HOST", "TOAST_CLIENT_ID", "TOAST_CLIENT_SECRET", "TOAST_RESTAURANT_GUID"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing env vars: " + missing.join(", "));
  console.error("Set them in your shell or a sourced .env, then re-run.");
  process.exit(1);
}

const { categories } = await toast.getMenu(process.env, {
  force: true,
  overrides: overrides.byName
});

const payload = {
  store: overrides.store,
  modifiers: overrides.modifiers,
  categories,
  meta: { source: "toast-cli", itemCount: categories.reduce((n, c) => n + c.items.length, 0) }
};

const dest = path.join(root, "assets", "menu.json");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(payload, null, 2));
console.log("Wrote " + dest + " (" + payload.meta.itemCount + " items across " + categories.length + " categories)");
