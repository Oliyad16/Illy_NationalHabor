/* Regenerate lib/menu-overrides.js from pages/menu.js.
 *
 * The live Toast Menus API gives us names, descriptions, prices, sizes and
 * stock — but NOT our local item photos or our stable URL slugs. This script
 * captures those (plus the store profile and shared drink modifier groups) from
 * the existing hand-maintained pages/menu.js so the live menu keeps its photos.
 *
 * Run after editing photos/slugs in pages/menu.js:
 *   node scripts/build-overrides.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// pages/menu.js assigns to window.ILLY_MENU; shim a window then load it.
globalThis.window = globalThis.window || {};
await import(pathToFileURL(path.join(root, "pages", "menu.js")).href);
const M = globalThis.window.ILLY_MENU;

if (!M || !Array.isArray(M.categories)) {
  throw new Error("Could not load window.ILLY_MENU from pages/menu.js");
}

const byName = {};
for (const c of M.categories) {
  for (const it of c.items) {
    const key = it.name.toLowerCase();
    const o = { id: it.id };
    if (it.photo) o.photo = it.photo;
    if (it.img) o.img = it.img;
    if (it.desc) o.desc = it.desc;
    byName[key] = o;
  }
}

const indent = (json) => JSON.stringify(json, null, 2).replace(/\n/g, "\n  ");

const out =
  "/* AUTO-GENERATED from pages/menu.js by scripts/build-overrides.mjs.\n" +
  " * Re-attaches local photos, stable slugs, and fallback descriptions to live\n" +
  " * Toast items (keyed by lowercased item name), plus the store profile and\n" +
  " * shared drink modifier groups Toast Menus V2 does not model the same way.\n" +
  " * Regenerate: node scripts/build-overrides.mjs\n" +
  " */\n" +
  "module.exports = {\n" +
  "  store: " + indent(M.store) + ",\n" +
  "  modifiers: " + indent(M.modifiers) + ",\n" +
  "  byName: " + indent(byName) + "\n" +
  "};\n";

const dest = path.join(root, "lib", "menu-overrides.js");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out);
console.log("Wrote " + dest + " (" + out.length + " bytes, " + Object.keys(byName).length + " items)");
