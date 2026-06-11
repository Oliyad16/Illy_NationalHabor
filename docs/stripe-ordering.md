# Online ordering with Stripe payment → Toast POS

> **⚠️ SUPERSEDED (2026-06-10).** This Stripe pay-online flow was removed from the
> codebase. Direct order injection into Toast requires the `orders.orders:write`
> scope, which a single location cannot get (read-only Standard API Access only).
> See **[online-ordering-roadmap.md](online-ordering-roadmap.md)** for the current
> plan: interim Toast-page handoff now, Zuppler as the recommended path to keep
> checkout on our own site. This doc is kept for historical reference only.

Customers pay by card on the website (Stripe), and the **paid** order is pushed
into the café's Toast POS. The site never stores card data (Stripe Elements
hosts the card field), and we never keep money for an order the kitchen didn't
receive (auto-refund on failure).

## Flow

```
Checkout page (pages/pickup.html)
  │  GET /api/availability   → is the café open? (disables pay if closed)
  │  GET /api/config         → Stripe publishable key (safe in browser)
  │
  │  [customer fills name/phone, enters card]
  │  POST /api/create-payment  → server prices cart from LIVE menu,
  │                              re-checks hours, creates Stripe PaymentIntent
  ▼
Stripe confirms the card  (stripe.confirmCardPayment in the browser)
  ▼
Stripe → POST /api/stripe-webhook   (server-to-server, signed)
  │  on payment_intent.succeeded:
  │    → push PAID order to Toast (Orders API, OTHER payment = already paid)
  │    → if Toast rejects: AUTO-REFUND the charge + email the café
  ▼
Order appears in Toast POS, marked paid
```

Using the **webhook** (not the browser) to finalize means the order still
completes if the customer closes the tab right after paying.

## Required env vars (Vercel → Settings → Environment Variables)

| Key | What |
| --- | --- |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_…` / `pk_live_…` (safe in browser) |
| `STRIPE_SECRET_KEY` | `sk_test_…` / `sk_live_…` (server only) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the webhook endpoint you add in Stripe |
| `RESEND_API_KEY` | Resend key for café alert emails (optional but recommended) |
| `CAFE_ALERT_EMAIL` | where failure alerts go |
| `CAFE_FROM_EMAIL` | verified Resend sender (default orders@illynationalharbor.com) |

Plus all the Toast vars (see `toast-integration.md`) — the paid order still goes
through the Toast Orders API.

## Stripe setup steps

1. Create a Stripe account → **Developers → API keys**: copy publishable + secret
   (use **test** keys first).
2. **Developers → Webhooks → Add endpoint**:
   - URL: `https://www.illynationalharbor.com/api/stripe-webhook`
   - Event: `payment_intent.succeeded`
   - Copy the **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.
3. Add all keys in Vercel, then redeploy.
4. Test with Stripe test card `4242 4242 4242 4242`, any future expiry/CVC.

## Café hours

`lib/hours.js` holds the open hours (currently 8:00 AM–6:00 PM daily, last online
order 20 min before close, `America/New_York`). Edit `HOURS` / `CLOSED_DATES`
there. When closed, the menu stays browsable but all pay buttons are disabled
with a clear message. Once the Toast Configuration API is enabled, `/api/availability`
can be upgraded to read live hours from Toast.

## Failure handling

If Stripe charges but Toast rejects the order, the webhook **auto-refunds** the
customer and emails `CAFE_ALERT_EMAIL`. If the refund itself fails, the email is
marked **URGENT** so staff can refund manually in the Stripe dashboard.

## Blocked-by note

On-site ordering reaching Toast still depends on Toast enabling the **Orders API**
for this account (currently returns 403). Stripe payment works independently; the
Toast push activates automatically once Toast grants access.
