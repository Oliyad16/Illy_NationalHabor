/* Offline tests for lib/toast.js transform + auth/fetch caching.
 * No live Toast credentials required — fetch is stubbed.
 * Run: node scripts/test-toast.mjs
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const toast = require(path.join(root, "lib", "toast.js"));

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error("  ✗ " + msg); }
}

/* ---- transform() ---- */
(function testTransform() {
  const raw = {
    menus: [
      {
        name: "All Day",
        menuGroups: [
          {
            name: "Espresso Bar",
            menuItems: [
              {
                name: "Cappuccino",
                description: "Classic cappuccino.",
                modifierGroups: [
                  {
                    name: "Size",
                    modifierOptions: [
                      { name: "Small", price: 4.5 },
                      { name: "Large", price: 5.5 }
                    ]
                  }
                ]
              },
              { name: "Drip Coffee", price: 3.25 },
              { name: "Sold Out Latte", price: 5.0, inStock: false }
            ]
          }
        ]
      }
    ]
  };
  const overrides = { "cappuccino": { id: "cappuccino", photo: "capp.jpg" } };
  const cats = toast.transform(raw, overrides);

  assert(cats.length === 1, "one category produced");
  assert(cats[0].id === "espresso-bar", "category slug derived from group name");
  assert(cats[0].items.length === 3, "three items produced");

  const capp = cats[0].items[0];
  assert(capp.id === "cappuccino", "override id applied");
  assert(capp.photo === "capp.jpg", "override photo applied");
  assert(capp.price === 4.5, "price taken from cheapest size when item has no base price");
  assert(Array.isArray(capp.sizes) && capp.sizes.length === 2, "sizes extracted");

  const drip = cats[0].items[1];
  assert(drip.price === 3.25, "base price used directly");
  assert(drip.id === "drip-coffee", "slug fallback when no override");

  const sold = cats[0].items[2];
  assert(sold.outOfStock === true, "inStock:false maps to outOfStock");
})();

/* ---- slugify() ---- */
(function testSlugify() {
  assert(toast.slugify("Ham & Cheese Croissant") === "ham-and-cheese-croissant", "& -> and");
  assert(toast.slugify("  Café Latte!  ") === "caf-latte", "trims + strips punctuation");
})();

/* ---- getToken caching + getMenu with stubbed fetch ---- */
await (async function testFetchAndCache() {
  toast._resetCachesForTest();
  let authCalls = 0, menuCalls = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.endsWith("/authentication/v1/authentication/login")) {
      authCalls++;
      return {
        ok: true,
        status: 200,
        json: async () => ({ token: { accessToken: "tok123", expiresIn: 3600 } })
      };
    }
    if (url.endsWith("/menus/v2/menus")) {
      menuCalls++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          menus: [{ name: "M", menuGroups: [{ name: "Drinks", menuItems: [{ name: "Tea", price: 3 }] }] }]
        })
      };
    }
    throw new Error("unexpected url " + url);
  };

  const env = {
    TOAST_API_HOST: "https://ws-api.toasttab.com",
    TOAST_CLIENT_ID: "id",
    TOAST_CLIENT_SECRET: "secret",
    TOAST_RESTAURANT_GUID: "guid"
  };

  const now = 1000000;
  const r1 = await toast.getMenu(env, { now });
  assert(r1.cached === false, "first getMenu is a live fetch");
  assert(r1.categories[0].items[0].name === "Tea", "menu transformed from stub");

  const r2 = await toast.getMenu(env, { now: now + 1000 });
  assert(r2.cached === true, "second getMenu within TTL is cached");
  assert(authCalls === 1, "token reused (auth called once)");
  assert(menuCalls === 1, "menu fetched once within TTL");

  const r3 = await toast.getMenu(env, { now: now + toast.MENU_TTL_MS + 1 });
  assert(r3.cached === false, "menu refetched after TTL expiry");
  assert(authCalls === 1, "token still valid (1h), not re-auth'd");
  assert(menuCalls === 2, "menu fetched again after TTL");

  globalThis.fetch = realFetch;
})();

/* ---- transform captures Toast GUIDs for ordering ---- */
(function testGuidCapture() {
  const raw = {
    menus: [{
      name: "M",
      menuGroups: [{
        name: "Drinks", guid: "grp-1",
        menuItems: [{ name: "Latte", price: 5, guid: "item-latte" }]
      }]
    }]
  };
  const cats = toast.transform(raw, {});
  const latte = cats[0].items[0];
  assert(latte.guid === "item-latte", "item guid captured");
  assert(latte.itemGroupGuid === "grp-1", "item group guid captured from group");
})();

/* ---- buildOrderPayload ---- */
(function testBuildOrderPayload() {
  const env = {
    TOAST_DINING_OPTION_GUID: "dine-takeout",
    TOAST_REVENUE_CENTER_GUID: "rev-1"
  };
  const payload = toast.buildOrderPayload({
    items: [{ guid: "item-latte", itemGroupGuid: "grp-1", quantity: 2 }],
    customer: { firstName: "Sam", lastName: "Lee", phone: "555", email: "" },
    note: "no foam"
  }, env);

  assert(payload.diningOption.guid === "dine-takeout", "dining option set from env");
  assert(payload.revenueCenter.guid === "rev-1", "revenue center set when env present");
  assert(payload.checks.length === 1, "one check");
  const sel = payload.checks[0].selections[0];
  assert(sel.item.guid === "item-latte", "selection references item guid");
  assert(sel.quantity === 2, "selection quantity preserved");
  assert(sel.itemGroup.guid === "grp-1", "selection item group set");
  assert(payload.checks[0].customer.firstName === "Sam", "customer name set");
  assert(payload.checks[0].note === "no foam", "note set");
})();

/* ---- createOrder: validation + POST ---- */
await (async function testCreateOrder() {
  toast._resetCachesForTest();
  const env = {
    TOAST_API_HOST: "https://ws-api.toasttab.com",
    TOAST_CLIENT_ID: "id", TOAST_CLIENT_SECRET: "secret",
    TOAST_RESTAURANT_GUID: "guid", TOAST_DINING_OPTION_GUID: "dine"
  };

  // empty order rejected
  let threw = false;
  try { await toast.createOrder({ items: [] }, env); }
  catch (e) { threw = e.code === "empty_order"; }
  assert(threw, "empty order rejected with empty_order");

  // missing guid rejected
  threw = false;
  try { await toast.createOrder({ items: [{ quantity: 1 }] }, env); }
  catch (e) { threw = e.code === "missing_guid"; }
  assert(threw, "item without guid rejected with missing_guid");

  // happy path posts to /orders/v2/orders
  const realFetch = globalThis.fetch;
  let postedUrl = null, postedBody = null;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith("/authentication/v1/authentication/login")) {
      return { ok: true, status: 200, json: async () => ({ token: { accessToken: "t", expiresIn: 3600 } }) };
    }
    if (url.endsWith("/orders/v2/orders")) {
      postedUrl = url; postedBody = JSON.parse(init.body);
      return { ok: true, status: 201, json: async () => ({ guid: "order-123", checks: [{ displayNumber: "A7" }] }) };
    }
    throw new Error("unexpected " + url);
  };

  const result = await toast.createOrder(
    { items: [{ guid: "item-latte", quantity: 1 }], customer: { firstName: "A", phone: "5" } },
    env
  );
  assert(postedUrl.endsWith("/orders/v2/orders"), "order POSTed to orders endpoint");
  assert(postedBody.checks[0].selections[0].item.guid === "item-latte", "posted body references item guid");
  assert(result.guid === "order-123", "order guid returned");

  globalThis.fetch = realFetch;
})();

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
