# Online Ordering Roadmap — illy Caffè National Harbor

**Last updated:** 2026-06-10
**Restaurant:** illy Caffé — Oxon Hill / National Harbor (138 Waterfront Street, Oxon Hill, MD 20745)
**Toast restaurant GUID:** `9a79e503-3e09-431c-8e77-74a78d73a456`
**Toast online-ordering page:** https://order.toasttab.com/online/illy-caffe-oxon-hill

---

## 0. CHOSEN MODEL — Storefront + Toast item deep-links (SHIPPED ✅)

**Decision:** our site is the **storefront/front-end**; **Toast is the ordering + payment
engine.** We do NOT inject orders ourselves (no write access needed, no partner, no fee).

**The key discovery (verified live in a browser):** Toast's online-ordering page supports
**per-item deep-linking**. Tapping an item on our site sends the customer straight to *that
exact item's* customization modal on Toast, ready to add and pay. URL pattern:

```
https://order.toasttab.com/online/illy-caffe-oxon-hill/item-<slug>_<TOAST_ITEM_GUID>
```

- The **GUID resolves the item** (the slug is cosmetic — any slug works as long as the GUID is right).
- Every item's GUID already comes from our live `/api/menu` (Toast `menus:read`). Verified the
  GUID we return for "Salted Caramel Latte" === the GUID in Toast's own deep-link URL.
- Toast checkout is **guest-friendly** (no forced sign-in), **commission-free**, real café prices,
  and Toast enforces its own hours/availability.

**Implemented:** `B.toastItemUrl(item)` in `pages/branch.js` builds the deep link; the menu
modal's button ("Order on Toast") opens it (`pages/menu-ui.js`). Items without a GUID (static
fallback menu when Toast is unreachable) fall back to the Toast menu homepage.

**The only trade-off:** the final order/payment happens on Toast's page, not ours. Given the
client's decision to be "just the front," this is exactly the intended behavior — and it lands
the customer on the precise product, so it's a smooth handoff, not a generic redirect.

The sections below document the read-only-vs-write constraint and the partner/self-certify
alternatives — kept for reference in case the client later wants checkout fully on our own site.

---

## 1. The core constraint (why we're here)

We want customers to **browse and check out entirely on our own custom site**, with the
order landing in the café's Toast POS. Doing that ourselves requires the Toast scope
**`orders.orders:write`** ("post orders" / order injection).

Our Toast API credential is **Standard API Access**, which Toast documents as **read-only**
("your integration can only read data from Toast"). We verified this live: the token we get
carries only `:read` scopes (`menus:read`, `orders:read`, `config:read`, etc.) — no write scope.

Toast told us directly: a single location **cannot** get direct write access. It's gated behind
either **enterprise scale (~16+ locations)** or going **through a certified ordering partner**
that already holds the write integration.

**What works today (read-only, live and tested):**
- ✅ Live menu + real café prices (`/api/menu`, `menus:read`)
- ✅ Admin business metrics — revenue, top sellers, trends (`/api/admin/metrics`, `orders:read`)
- ✅ Live inventory/stock is reachable (`stock:read`) — not yet wired into the UI

**What we cannot do on our own site (needs `orders.orders:write`):**
- ❌ Place/inject orders into the POS
- ❌ Take payment for those orders

---

## 2. Where we are now — INTERIM solution (shipped)

Until a write-capable path is live, **ordering and payment hand off to the café's Toast page.**

**What changed in the site:**
- The menu's item action button now reads **"Order on Toast"** and opens
  `https://www.toasttab.com/illy-caffe-oxon-hill/` in a new tab. (`pages/menu-ui.js`)
- The checkout page (`pages/pickup.html`) primary action is **"Order & pay on Toast →"**;
  the old (now non-functional) "Order & pay at café" button that called `POST /api/order`
  was removed.
- The canonical Toast URL is set in one place per source and kept consistent:
  `branch-config.js`, `pages/catalog.js`, `pages/menu.js`, `lib/menu-overrides.js`,
  fallback in `pages/branch.js`.
- Hours text corrected to the real storefront schedule (see §6).

**Customer experience now:** browse the full menu on our branded site → tap an item →
"Order on Toast" → finish selection + pay on Toast's secure page → order prints in the
café kitchen. Toast handles payment (no PCI scope for us) and enforces its own hours.

**Limitation:** the customer leaves our site for the final checkout, and the local cart does
not carry over (Toast doesn't support deep-linking a pre-filled cart). This is the trade-off
of the interim model.

---

## 3. Options evaluated (and rejected)

| Option | Keeps checkout on our site? | Verdict |
|---|---|---|
| **Direct Toast write access** | ✅ | ❌ Not available to a single location (needs ~16+ locations) |
| **Otter** | ❌ | ❌ Rejected after meeting — rebuilds the menu on their side, redirects customers to Otter's page, forces a customer sign-in |
| **Self-certify as a Toast partner** | ✅ | ⚠️ Possible but heavy (see §5) — multi-month, legal/security review, built for software companies not single cafés |
| **Toast Online Ordering handoff** | ❌ (handoff) | ✅ Shipped as the interim solution (§2) |
| **Zuppler** | ✅ | ✅ Recommended next step (§4) |

---

## 4. RECOMMENDED PATH — Zuppler (keep checkout on our site)

**What it is:** Zuppler is a Toast-certified online-ordering partner that **holds the
`orders.orders:write` integration** and exposes a **developer API + embeddable widget** so we
can drive ordering from our existing site. We borrow Zuppler's certified write access; our
read-only Toast credential keeps powering menu + metrics.

**Why it fits (vs. Otter):** Zuppler's own docs state customers **"will remain on the
restaurant website while ordering online and will NOT be redirected to an external website."**
Integration is a drop-in embed (`<div id="zuppler-menu" ...>`) plus a RESTful JSON / JavaScript
API. This is exactly the no-redirect, your-branding requirement Otter failed.

**Architecture:**
```
Our custom site (menu, branding, checkout UI — all kept)
        │  customer orders + pays ON our site
        ▼
   Zuppler API / embed   ← we integrate here instead of POST /orders/v2/orders
        │  Zuppler is certified for Toast write
        ▼
   Toast POS  →  order prints in the café kitchen
```

**Cost (published, confirm for one location):**
- ~**$129/month** flat subscription, **commission-free** ($0 per-order to Zuppler).
- Payment processing handled in their flow (confirm processor + rate).
- Possible one-time setup fee — confirm.

**Engineering effort on our side (medium):**
- Swap the order-injection portion of `lib/toast.js` (`createOrder` / `buildOrderPayload`)
  to call Zuppler's order API instead of Toast's Orders API.
- Wire the embed or build our own UI against their REST API.
- Map our menu item IDs ↔ Zuppler/Toast GUIDs.
- Everything else stays: live menu pull, cart, hours, admin metrics.

**⚠️ MUST-CONFIRM before committing (the exact things that killed Otter):**
1. **No customer sign-in** — does Zuppler force account creation/login at checkout, or is
   guest checkout supported? (Their docs say "no redirect" but don't explicitly say "no login.")
2. **Self-hosted checkout vs. their widget** — can we fully build our own checkout UI against
   the API, or must payment run through Zuppler's hosted widget/iframe?
3. **Single-location pricing** — exact monthly + any setup fee for one café.
4. **Toast onboarding** — confirm they connect to our specific location
   (GUID `9a79e503-...`, Oxon Hill) and order injection prints in the kitchen.

**Zuppler links:**
- Developer API: https://developer.zuppler.com/
- Integration docs (no-redirect): http://api.zuppler.com/docs/wizard-online-ordering-website.html
- Toast + Zuppler: https://pos.toasttab.com/integrations/zuppler

---

## 5. ALTERNATIVE PATH — Become a Toast integration partner ourselves

This gets us **direct `orders.orders:write` with no middleman and no monthly partner fee** — but
Toast's process is built for software companies, and is heavy for a single café.

**What Toast requires (from their integration partner process docs):**
1. **Integration Partner Application** + review of the API Documentation License Agreement.
2. **Approval from Toast's compliance, privacy, security, and legal teams.**
3. A **signed partner agreement** with Toast.
4. An **assigned Toast integrations representative**.
5. Development against Toast's API, then a **1-hour certification call** (interactive demo review).
6. **Alpha phase** — enabled for a single restaurant for ~1 week; Toast reviews performance logs.
7. **Beta phase** — 3–5 locations/management groups run it in production for several weeks.
8. Production credentials granted → live.

**Timeline:** realistically **multiple months** (legal/security review + alpha + beta phases).
The 3–5 location beta requirement is awkward for a single café.

**Cost:** no published per-seat fee, but cost is in **time, legal review, and engineering** to
pass certification. Likely needs a developer-of-record to own the integration long-term.

**When this makes sense:** if the café grows to multiple locations, or if there's appetite to
own the integration fully and avoid recurring partner fees. **Not recommended as the immediate
path** for a single location.

**Toast links:**
- Partner application: https://pos.toasttab.com/partners/integration-partner-application
- Integration process: https://doc.toasttab.com/doc/devguide/integrationDevProcess.html
- API scopes (note `orders.orders:write` = "post orders"): https://doc.toasttab.com/doc/devguide/apiScopes.html

---

## 6. Live hours — what we learned

The café's **real online-ordering hours** (from the Toast storefront):
- **Monday: CLOSED**
- **Tue–Thu: 8:00 AM – 5:30 PM**
- **Fri / Sat / Sun: 8:00 AM – 6:30 PM**

**Important:** the Toast **Configuration API does NOT expose these real online-ordering hours.**
It only returns a generic "All Days" schedule (6 AM–8 PM uniform) that doesn't even know Monday
is closed. We confirmed the dedicated scheduling/availability endpoints `404` for our credential,
and `orders/v2/prices` (which would let us test availability via a draft order) returns `403`.

So the real hours are **hardcoded** from the storefront into `lib/hours.js` as the source of
truth, and `/api/availability` uses them. (We backed away from trusting the API's generic
schedule.) **If the café changes its hours in Toast, update `lib/hours.js` to match.**

Once Zuppler (or direct write access) is live, the partner/Toast page enforces hours itself and
this becomes a heads-up only.

---

## 7. Decision summary & next actions

| | Effort | Recurring cost | Keeps checkout on our site | Timeline |
|---|---|---|---|---|
| **Interim (Toast handoff)** | done | $0 | ❌ handoff | ✅ live now |
| **Zuppler** (recommended) | medium | ~$129/mo | ✅ | days–weeks after sign-up |
| **Self-partner with Toast** | high | $0 partner fee | ✅ | multiple months |

**Immediate next actions:**
1. **Get Zuppler answers** to the 4 must-confirm questions in §4 (guest checkout, self-hosted
   checkout, single-location price, Toast onboarding). This is the gating decision.
2. If Zuppler clears those → integrate (swap `lib/toast.js` order path to Zuppler).
3. Keep the interim Toast handoff live until Zuppler is wired.
4. Revisit self-partnering only if the café scales to multiple locations.
