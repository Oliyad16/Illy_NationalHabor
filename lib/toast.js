/* Toast Menus V2 client + transform.
 *
 * Pulls the live menu and REAL in-cafe prices straight from Toast so we stop
 * hand-maintaining pages/menu.js. Used by:
 *   - api/menu.js          (Vercel serverless function the browser calls)
 *   - scripts/sync-menu.mjs (optional: bake a static menu.json from the CLI)
 *
 * Auth: POST clientId/clientSecret to /authentication/v1/authentication/login
 *       with userAccessType TOAST_MACHINE_CLIENT. Token lives ~1h; we cache it.
 * Menus: GET /menus/v2/menus with the restaurant GUID in the
 *        Toast-Restaurant-External-ID header.
 *
 * Required env vars (set in Vercel, never committed):
 *   TOAST_API_HOST          e.g. https://ws-api.toasttab.com  (production)
 *   TOAST_CLIENT_ID
 *   TOAST_CLIENT_SECRET
 *   TOAST_RESTAURANT_GUID   the restaurant's externalId / GUID
 */

const AUTH_PATH = "/authentication/v1/authentication/login";
const MENUS_PATH = "/menus/v2/menus";
const ORDERS_PATH = "/orders/v2/orders";

/* In-process caches (warm across invocations on a reused Vercel instance). */
let _token = null;          // { value, expiresAt (ms epoch) }
let _menuCache = null;      // { data, fetchedAt (ms epoch) }

const MENU_TTL_MS = 5 * 60 * 1000;        // serve cached menu for 5 min
const TOKEN_SKEW_MS = 60 * 1000;          // refresh token 1 min before expiry

function requireEnv(name, env) {
  const v = env[name];
  if (!v) throw new Error("Missing required env var: " + name);
  return v;
}

function host(env) {
  return requireEnv("TOAST_API_HOST", env).replace(/\/+$/, "");
}

/* ---------- Auth ---------- */
async function getToken(env, now) {
  if (_token && _token.expiresAt - TOKEN_SKEW_MS > now) return _token.value;

  const res = await fetch(host(env) + AUTH_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: requireEnv("TOAST_CLIENT_ID", env),
      clientSecret: requireEnv("TOAST_CLIENT_SECRET", env),
      userAccessType: "TOAST_MACHINE_CLIENT"
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error("Toast auth failed (" + res.status + "): " + body.slice(0, 300));
  }

  const json = await res.json();
  // Response shape: { token: { accessToken, expiresIn, tokenType }, ... }
  const tok = json && json.token;
  if (!tok || !tok.accessToken) {
    throw new Error("Toast auth response missing token");
  }
  const expiresInMs = (Number(tok.expiresIn) || 3600) * 1000;
  _token = { value: tok.accessToken, expiresAt: now + expiresInMs };
  return _token.value;
}

/* ---------- Fetch raw menus ---------- */
async function fetchMenus(env, now) {
  const token = await getToken(env, now);
  const res = await fetch(host(env) + MENUS_PATH, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
      "Toast-Restaurant-External-ID": requireEnv("TOAST_RESTAURANT_GUID", env),
      Accept: "application/json"
    }
  });

  if (res.status === 401) {
    // Token may have been invalidated early; clear and retry once.
    _token = null;
    const retryToken = await getToken(env, now);
    const retry = await fetch(host(env) + MENUS_PATH, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + retryToken,
        "Toast-Restaurant-External-ID": requireEnv("TOAST_RESTAURANT_GUID", env),
        Accept: "application/json"
      }
    });
    if (!retry.ok) {
      const body = await retry.text().catch(() => "");
      throw new Error("Toast menus fetch failed (" + retry.status + "): " + body.slice(0, 300));
    }
    return retry.json();
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error("Toast menus fetch failed (" + res.status + "): " + body.slice(0, 300));
  }
  return res.json();
}

/* ---------- Transform Toast -> ILLY_MENU shape ----------
 * The Menus V2 payload is a tree: menus[] -> menuGroups[] -> menuItems[].
 * Each menuItem has a `price` and optional nested groups for sizes/modifiers.
 * We flatten it into the category/item shape pages/menu.js already renders:
 *   categories: [{ id, name, items: [{ id, name, desc, price, sizes?, outOfStock }] }]
 * `overrides` (built from the existing menu.js) lets us re-attach local photos
 * and stable slugs that Toast doesn't know about, keyed by lowercased item name.
 */
function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";
}

function itemPrice(mi) {
  if (typeof mi.price === "number") return mi.price;
  // Some items price only through their size group; take the lowest option.
  const sizes = extractSizes(mi);
  if (sizes.length) return Math.min.apply(null, sizes.map((s) => s.price));
  return 0;
}

function extractSizes(mi) {
  const groups = mi.modifierGroups || mi.optionGroups || [];
  for (const g of groups) {
    const name = (g.name || "").toLowerCase();
    if (name.indexOf("size") === -1) continue;
    const opts = (g.modifierOptions || g.options || g.items || [])
      .map((o) => ({
        name: o.name,
        price: typeof o.price === "number" ? o.price : Number(o.basePrice) || 0
      }))
      .filter((o) => o.name);
    if (opts.length) return opts;
  }
  return [];
}

function isOutOfStock(mi) {
  // Toast surfaces 86'd items via visibility / inStock flags depending on config.
  if (mi.inStock === false) return true;
  if (Array.isArray(mi.visibility) && mi.visibility.length === 0) return true;
  return false;
}

function transform(raw, overrides) {
  overrides = overrides || {};
  const menus = Array.isArray(raw) ? raw : (raw && raw.menus) || [];
  const categories = [];
  const seenCat = {};

  for (const menu of menus) {
    const groups = menu.menuGroups || menu.groups || [];
    for (const g of groups) {
      const catName = g.name || "Menu";
      const catId = slugify(catName);
      let cat = seenCat[catId];
      if (!cat) {
        cat = { id: catId, name: catName, items: [] };
        seenCat[catId] = cat;
        categories.push(cat);
      }
      const items = g.menuItems || g.items || [];
      for (const mi of items) {
        if (!mi.name) continue;
        const ov = overrides[mi.name.toLowerCase()] || {};
        const sizes = extractSizes(mi);
        const item = {
          id: ov.id || slugify(mi.name),
          name: mi.name,
          price: itemPrice(mi)
        };
        // Toast GUIDs needed to place orders via the Orders API.
        if (mi.guid) item.guid = mi.guid;
        if (mi.itemGroupGuid || g.guid) item.itemGroupGuid = mi.itemGroupGuid || g.guid;
        if (mi.description) item.desc = mi.description;
        else if (ov.desc) item.desc = ov.desc;
        if (sizes.length) item.sizes = sizes;
        if (isOutOfStock(mi)) item.outOfStock = true;
        if (ov.photo) item.photo = ov.photo;
        if (ov.img) item.img = ov.img;
        cat.items.push(item);
      }
    }
  }
  return categories;
}

/* ---------- Public: get the menu (cached) ---------- */
async function getMenu(env, opts) {
  opts = opts || {};
  const now = opts.now || Date.now();
  if (!opts.force && _menuCache && now - _menuCache.fetchedAt < MENU_TTL_MS) {
    return { categories: _menuCache.data, cached: true, fetchedAt: _menuCache.fetchedAt };
  }
  const raw = await fetchMenus(env, now);
  const categories = transform(raw, opts.overrides);
  _menuCache = { data: categories, fetchedAt: now };
  return { categories, cached: false, fetchedAt: now };
}

/* ---------- Place an order (pay-at-pickup, UNPAID) ----------
 * Creates a real order in the café POS via the Orders API. We deliberately do
 * NOT attach a payment — the customer pays at the counter on pickup, so the site
 * never handles card data (no PCI scope). Toast surfaces it to staff as an
 * unpaid online/takeout order.
 *
 * `order` shape (from the browser, validated by the caller):
 *   {
 *     items: [{ guid, itemGroupGuid, quantity }],   // GUIDs from the menu fetch
 *     customer: { firstName, lastName, phone, email },
 *     note: "optional kitchen note"
 *   }
 *
 * Required env: TOAST_RESTAURANT_GUID, plus a dining option + revenue center
 * GUID for takeout, which Toast assigns per restaurant:
 *   TOAST_DINING_OPTION_GUID   (takeout dining option)
 *   TOAST_REVENUE_CENTER_GUID  (optional; some configs require it)
 */
function buildOrderPayload(order, env) {
  const selections = (order.items || []).map(function (it) {
    const sel = {
      item: { guid: it.guid },
      quantity: Math.max(1, parseInt(it.quantity, 10) || 1)
    };
    if (it.itemGroupGuid) sel.itemGroup = { guid: it.itemGroupGuid };
    if (Array.isArray(it.modifiers) && it.modifiers.length) {
      sel.modifiers = it.modifiers
        .filter(function (m) { return m && m.guid; })
        .map(function (m) {
          return {
            item: { guid: m.guid },
            quantity: Math.max(1, parseInt(m.quantity, 10) || 1),
            itemGroup: m.itemGroupGuid ? { guid: m.itemGroupGuid } : undefined
          };
        });
    }
    return sel;
  });

  const payload = {
    // Takeout pickup order, entered via API.
    diningOption: { guid: requireEnv("TOAST_DINING_OPTION_GUID", env) },
    checks: [
      {
        selections: selections,
        customer: order.customer
          ? {
              firstName: order.customer.firstName || "",
              lastName: order.customer.lastName || "",
              phone: order.customer.phone || "",
              email: order.customer.email || ""
            }
          : undefined
      }
    ]
  };
  if (order.note) payload.checks[0].note = order.note;

  // If already paid externally (e.g. Stripe), record an OTHER payment on the
  // check so Toast marks it PAID rather than expecting collection at pickup.
  if (order.payment && order.payment.amountCents > 0) {
    payload.checks[0].payments = [
      {
        paymentType: "OTHER",
        amount: order.payment.amountCents / 100,
        tipAmount: 0,
        // A human-traceable reference back to the Stripe charge.
        otherPayment: order.payment.reference
          ? { guid: undefined, name: ("Stripe " + order.payment.reference).slice(0, 64) }
          : undefined
      }
    ];
  }

  if (env.TOAST_REVENUE_CENTER_GUID) {
    payload.revenueCenter = { guid: env.TOAST_REVENUE_CENTER_GUID };
  }
  return payload;
}

async function createOrder(order, env, opts) {
  opts = opts || {};
  const now = opts.now || Date.now();

  if (!order || !Array.isArray(order.items) || !order.items.length) {
    const e = new Error("order has no items");
    e.code = "empty_order";
    throw e;
  }
  const missingGuid = order.items.some(function (it) { return !it.guid; });
  if (missingGuid) {
    const e = new Error("one or more items is missing a Toast guid");
    e.code = "missing_guid";
    throw e;
  }

  const token = await getToken(env, now);
  const payload = buildOrderPayload(order, env);

  const res = await fetch(host(env) + ORDERS_PATH, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Toast-Restaurant-External-ID": requireEnv("TOAST_RESTAURANT_GUID", env),
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const body = await res.text().catch(function () { return ""; });
    const e = new Error("Toast order create failed (" + res.status + "): " + body.slice(0, 400));
    e.code = "toast_error";
    e.status = res.status;
    throw e;
  }
  return res.json();
}

function _resetCachesForTest() {
  _token = null;
  _menuCache = null;
}

module.exports = {
  getMenu,
  getToken,
  fetchMenus,
  transform,
  slugify,
  createOrder,
  buildOrderPayload,
  _resetCachesForTest,
  MENU_TTL_MS
};
