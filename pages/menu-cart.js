/* Café ordering cart — extends window.ILLY_BRANCH.cart so that configured café
   line items (size + modifiers + computed price) live alongside the retail
   pickup cart and surface through the SAME items()/total()/count() the existing
   cart.html and pickup.html already consume.

   Café line items are stored under a separate localStorage key as an array of
   entries. Each entry carries a synthetic "product" object shaped exactly like a
   retail product ({ id, name, price, img }) plus the chosen options, so the
   existing cart/pickup UIs render them without modification.

   Load order on café pages: branch-config.js → catalog.js → branch.js →
   menu.js → menu-cart.js  (menu-cart.js must come AFTER branch.js so it can wrap
   the cart, and AFTER menu.js so it can read item definitions). */
(function () {
  var B = window.ILLY_BRANCH;
  if (!B) return;
  var M = window.ILLY_MENU || {};
  var CAFE_KEY = "illyCafeCart";

  /* Inline espresso-cup placeholder so café line items render an image in the
     existing cart/pickup rows (which expect product.img). */
  B.MENU_PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23f6f1ec'/%3E%3Cpath d='M16 24h28v12a10 10 0 0 1-10 10H26a10 10 0 0 1-10-10V24Z' fill='none' stroke='%23512c1f' stroke-width='3'/%3E%3Cpath d='M44 27h5a5 5 0 0 1 0 10h-5' fill='none' stroke='%23512c1f' stroke-width='3'/%3E%3Cpath d='M24 12c-2 3 2 4 0 7M32 12c-2 3 2 4 0 7' fill='none' stroke='%23d12420' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E";

  /* ---------- Café line storage ---------- */
  function readCafe() {
    try { return JSON.parse(localStorage.getItem(CAFE_KEY)) || []; }
    catch (e) { return []; }
  }
  function writeCafe(lines) {
    localStorage.setItem(CAFE_KEY, JSON.stringify(lines));
    if (B.renderCartCount) B.renderCartCount();
  }

  /* A stable line id from item + chosen options, so re-adding the SAME
     configuration merges quantities instead of duplicating rows. */
  function lineId(itemId, size, modifiers) {
    var parts = [itemId];
    if (size) parts.push("sz:" + size);
    (modifiers || []).slice().sort().forEach(function (m) { parts.push("md:" + m); });
    return "cafe::" + parts.join("|");
  }

  /* Build a retail-shaped product object for a configured café item. */
  function buildProduct(item, size, modifiers, unitPrice) {
    var bits = [];
    if (size && size.name) bits.push(size.name);
    (modifiers || []).forEach(function (m) { bits.push(m.label); });
    var suffix = bits.length ? " (" + bits.join(", ") + ")" : "";
    var photo = (M.photoUrl && M.photoUrl(item)) || null;
    return {
      id: lineId(item.id, size && size.name, (modifiers || []).map(function (m) { return m.label; })),
      name: item.name + suffix,
      price: unitPrice,
      img: photo || B.MENU_PLACEHOLDER_IMG || "",
      cafe: true,
      baseName: item.name,
      size: size ? size.name : null,
      modifiers: (modifiers || []).map(function (m) { return m.label; })
    };
  }

  B.cafeCart = {
    /* item: a menu item object; choice: { size:{name,price}, modifiers:[{label,price}], qty } */
    add: function (item, choice) {
      choice = choice || {};
      var size = choice.size || null;
      var mods = choice.modifiers || [];
      var qty = Math.max(1, choice.qty || 1);
      var base = size ? size.price : item.price;
      var unit = mods.reduce(function (s, m) { return s + (m.price || 0); }, base);
      var product = buildProduct(item, size, mods, unit);

      var lines = readCafe();
      var existing = lines.filter(function (l) { return l.product.id === product.id; })[0];
      if (existing) { existing.qty += qty; }
      else { lines.push({ product: product, qty: qty }); }
      writeCafe(lines);
      return product;
    },
    setQty: function (id, qty) {
      var lines = readCafe();
      if (qty <= 0) {
        lines = lines.filter(function (l) { return l.product.id !== id; });
      } else {
        lines.forEach(function (l) { if (l.product.id === id) l.qty = qty; });
      }
      writeCafe(lines);
    },
    remove: function (id) {
      writeCafe(readCafe().filter(function (l) { return l.product.id !== id; }));
    },
    items: function () { return readCafe(); },
    count: function () {
      return readCafe().reduce(function (n, l) { return n + l.qty; }, 0);
    },
    total: function () {
      return readCafe().reduce(function (s, l) { return s + l.product.price * l.qty; }, 0);
    }
  };

  /* ---------- Wrap the shared cart so café lines flow through it ---------- */
  var retail = B.cart;
  B.cart = {
    add: retail.add.bind(retail),
    setQty: function (id, qty) {
      if (String(id).indexOf("cafe::") === 0) return B.cafeCart.setQty(id, qty);
      return retail.setQty(id, qty);
    },
    remove: function (id) {
      if (String(id).indexOf("cafe::") === 0) return B.cafeCart.remove(id);
      return retail.remove(id);
    },
    clear: function () { retail.clear(); writeCafe([]); },
    items: function () { return retail.items().concat(B.cafeCart.items()); },
    count: function () { return retail.count() + B.cafeCart.count(); },
    total: function () { return retail.total() + B.cafeCart.total(); }
  };

  /* findProduct also needs to resolve café line ids (used by some callers). */
  var findRetail = B.findProduct;
  B.findProduct = function (id) {
    if (String(id).indexOf("cafe::") === 0) {
      var hit = B.cafeCart.items().filter(function (l) { return l.product.id === id; })[0];
      return hit ? hit.product : null;
    }
    return findRetail ? findRetail(id) : null;
  };

  /* Refresh the header badge now that café lines count too. */
  if (B.renderCartCount) B.renderCartCount();
})();
