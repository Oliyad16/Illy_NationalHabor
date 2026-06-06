# illy Homepage Clone Breakdown

Source page captured from `https://www.illy.com/en-us`.

## Files

- `index.html`: captured homepage HTML, rewritten for the new branch and local assets.
- `source-capture.html`: backup of the captured page before local asset rewriting.
- `branch-config.js`: branch name, address, phone, and hours.
- `branch-overrides.js`: applies branch contact details and suppresses injected cookie overlays.
- `local-overrides.css`: local normalization for the static clone header, menu, overlays, and branch contact card.
- `static-stubs.js`: small compatibility stub for live storefront scripts that expect subscription globals.
- `asset-manifest.json`: remote-to-local asset map plus any failed downloads.
- `assets/`: mirrored CSS, JS, images, SVGs, fonts, PDFs, and catalog imagery.

## Page Structure

- Top promo bar: free shipping message.
- Header: illy logo, B Corp mark, primary navigation, search/account/cart/country utility fragments.
- Primary navigation: Subscription, Coffee, Coffee Machines, Gifts & Accessories, Promotions, illy World, Reward Program, Professional.
- Hero/content modules: Livestory-driven promotional sections and image blocks.
- Product modules: coffee and machine product tiles with catalog imagery.
- Newsletter: email subscription form and market disclaimer.
- Footer: company links, assistance links, customer service phone, payment options, apps, country selector, legal/social links.

## Branch-Specific Edits

Edit `branch-config.js` for the new branch:

- `name`
- `phoneDisplay`
- `phoneHref`
- `addressLines`
- `hours`

The override script updates all `tel:` links and adds a footer branch contact card.

## Static Clone Notes

This page came from a Salesforce Commerce Cloud storefront. Cart, login, search suggestions, consent tracking, analytics, payment widgets, and subscription code are live-service features; the local clone keeps the visual page but should not be treated as a working commerce backend.
