# Toast Integration Plan

## Current launch path

This site is a static branch preview. It can safely browse the local menu and keep a local draft cart in `localStorage`, but it cannot securely process cards or submit live POS orders by itself.

For launch, checkout hands off to the store's Toast online ordering page:

`https://order.toasttab.com/online/illy-caffe-oxon-hill?diningOption=takeout`

Toast remains the source of truth for:

- Online payment
- Pickup timing
- Order submission into the cafe POS/kitchen flow
- Availability rules managed in Toast

## Native integration requirements

To make the local cart submit directly into Toast without reselecting items in Toast, the project needs a backend service and Toast API access.

Required Toast access and data:

- Toast API `clientId` and `clientSecret`
- Restaurant/location GUID
- Menus API access for published menu items, menu groups, modifier groups, prices, and item GUIDs
- Orders API access with `orders.orders:write`
- Dining option GUID for takeout/pickup
- Payment approach approved for the Toast integration

Implementation work:

- Sync menu data from Toast Menus API instead of hardcoding `pages/menu.js`
- Store Toast GUIDs on each local menu item and modifier
- Validate required modifier minimums/maximums before checkout
- Price the order through Toast before submission
- Submit paid pickup orders to Toast Orders API
- Handle unavailable items, out-of-stock items, and time-based menu visibility before payment
- Move all credentials and API calls server-side

## Important limitation

The current static handoff cannot prefill the Toast cart from the local cart. It is intentionally labeled as a Toast checkout handoff so customers understand that final confirmation and payment happen in Toast.
