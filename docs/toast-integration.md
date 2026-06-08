# Toast Menus API integration

The menu page pulls **live menu items and real in-café prices straight from
Toast**, so `pages/menu.js` no longer has to be hand-maintained for pricing. If
Toast is unreachable, the site silently falls back to the menu baked into
`pages/menu.js`, so it never breaks.

## How it works

```
Browser (pages/menu.html, cart.html, pickup.html)
   │  loads pages/menu.js  (built-in fallback menu)
   │  loads pages/menu-remote.js  → fetch GET /api/menu
   ▼
/api/menu  (Vercel serverless function, api/menu.js)
   │  lib/toast.js:
   │    1. POST /authentication/v1/authentication/login  (clientId/secret)
   │    2. GET  /menus/v2/menus  (Bearer token + Toast-Restaurant-External-ID)
   │    3. transform → { store, modifiers, categories[] }   (ILLY_MENU shape)
   │  lib/menu-overrides.js re-attaches local photos + stable slugs
   ▼
Toast Menus V2 API  (ws-api.toasttab.com)
```

- The Toast **client secret never reaches the browser** — only the serverless
  function holds it, via environment variables.
- The function caches the auth token (~1h) and the transformed menu (5 min,
  plus CDN `s-maxage` + `stale-while-revalidate`) so we don't hammer Toast.

## Files

| File | Role |
| --- | --- |
| `lib/toast.js` | Toast auth + Menus V2 fetch + transform to `ILLY_MENU` shape. Token/menu caching. |
| `lib/menu-overrides.js` | **Auto-generated** from `pages/menu.js`: local photos, stable slugs, store profile, drink modifier groups, keyed by lowercased item name. |
| `api/menu.js` | Vercel function serving `GET /api/menu`. |
| `pages/menu-remote.js` | Browser loader: fetches `/api/menu`, falls back to built-in menu. Exposes `window.ILLY_MENU.ready`. |
| `scripts/build-overrides.mjs` | Regenerate `lib/menu-overrides.js` after editing photos/slugs in `pages/menu.js`. |
| `scripts/sync-menu.mjs` | Optional: bake a static `assets/menu.json` from the CLI (for non-serverless hosts). |
| `scripts/test-toast.mjs` | Offline tests for the transform + caching (no creds needed). |

## Setup on Vercel

1. In the Vercel dashboard: **Project → Settings → Environment Variables**, add
   (Production + Preview):

   | Key | Value |
   | --- | --- |
   | `TOAST_API_HOST` | `https://ws-api.toasttab.com` |
   | `TOAST_CLIENT_ID` | *(from Toast)* |
   | `TOAST_CLIENT_SECRET` | *(from Toast)* |
   | `TOAST_RESTAURANT_GUID` | your restaurant GUID / externalId |

2. Deploy. Visit `/api/menu` — you should get JSON with `meta.source: "toast"`.
3. Open `/pages/menu.html`. In the console you'll either see live data render, or
   `[menu] live Toast menu unavailable, using built-in menu: …` (fallback).

## Local testing

```sh
cp .env.example .env        # fill in real values (.env is gitignored)
node scripts/test-toast.mjs # offline transform/cache tests
# To hit Toast for real and bake a static file:
set -a && source .env && set +a
node scripts/sync-menu.mjs
```

## Maintaining photos & slugs

Toast supplies names, descriptions, prices, sizes, and stock — but **not** our
local item photos or URL slugs. Those live in `pages/menu.js` and are mapped
onto live items **by item name**. After adding/renaming a photo or item in
`pages/menu.js`:

```sh
node scripts/build-overrides.mjs
```

> **Name matching caveat:** the override (photo/slug) attaches when the Toast
> item name matches the `pages/menu.js` name (case-insensitive). If the café
> renames an item in Toast, update its name in `pages/menu.js` too and rerun the
> script, or that item will render without its local photo (it still gets the
> correct live price and a placeholder image).

## Field mapping (Toast → site)

| Site field | Toast source |
| --- | --- |
| category `name`/`id` | `menuGroups[].name` (slugified for `id`) |
| item `name` | `menuItems[].name` |
| item `desc` | `menuItems[].description` (else override desc) |
| item `price` | `menuItems[].price` (else cheapest Size option) |
| item `sizes` | modifier group whose name contains "size" |
| item `outOfStock` | `inStock === false` / empty `visibility` |
| item `photo`/`img`/`id` | `lib/menu-overrides.js` (by name) |
| item `guid` / `itemGroupGuid` | `menuItems[].guid` / group guid (used to place orders) |

---

# Ordering on the site (pay-at-pickup)

Customers build their cart on the site and place a **pay-at-pickup** order: the
order is created in the café POS via the Toast Orders API as **UNPAID**, and the
customer pays at the counter when they collect. The site never handles card data,
so there is **no PCI scope**. A secondary **"Pay online with Toast"** button
still hands off to Toast's hosted checkout for customers who want to pay now.

```
pages/pickup.html  (name + phone + cart)
   │  POST /api/order  { items:[{id, quantity}], customer, note }
   ▼
api/order.js
   │  1. getMenu()  → index live items by our slug id (also yields Toast guids)
   │  2. resolve each cart line's base item slug → Toast item guid (server-side,
   │       so the browser can't spoof items)
   │  3. lib/toast.createOrder() → POST /orders/v2/orders  (UNPAID)
   ▼
Toast Orders API → order appears in the café POS
```

## Extra env vars for ordering

| Key | Value |
| --- | --- |
| `TOAST_DINING_OPTION_GUID` | Takeout dining-option GUID (**required** to place orders) |
| `TOAST_REVENUE_CENTER_GUID` | Revenue center GUID (optional; some configs require it) |

Ask Toast (or read from the config API) for the **takeout dining option GUID**
for this restaurant — orders will be rejected without it.

## Known limitations / next steps

- **Modifiers & sizes are sent as an order note, not as priced Toast modifiers.**
  The café cart stores size/modifier choices as display labels (e.g.
  `Cappuccino (Large, Oat Milk)`), and the order currently sends the **base item**
  plus a `Customizations — …` note so staff see the choices. Full fidelity (each
  modifier as its own priced Toast selection) requires mapping modifier names to
  their Toast modifier GUIDs in `api/order.js` → `lib/toast.buildOrderPayload`.
- **Orders are created unpaid.** Payment happens at the counter. Online payment
  goes through the separate "Pay online with Toast" hosted-checkout button.
- The order endpoint resolves prices/items **server-side from the live menu**, so
  a tampered browser cart can't change what the café receives.
