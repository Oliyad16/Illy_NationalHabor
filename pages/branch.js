/* Branch site engine: shared header/footer, pickup cart (localStorage), toasts. */
(function () {
  var B = window.ILLY_BRANCH || {};
  var store = B.store || {};
  var KEY = "illyBranchCart";

  /* ---------- Cart state ---------- */
  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function write(cart) {
    localStorage.setItem(KEY, JSON.stringify(cart));
    renderCartCount();
  }
  function count() {
    var c = read(), n = 0;
    Object.keys(c).forEach(function (k) { n += c[k]; });
    return n;
  }
  B.cart = {
    add: function (id, qty) {
      qty = qty || 1;
      var c = read();
      c[id] = (c[id] || 0) + qty;
      write(c);
    },
    setQty: function (id, qty) {
      var c = read();
      if (qty <= 0) { delete c[id]; } else { c[id] = qty; }
      write(c);
    },
    remove: function (id) { var c = read(); delete c[id]; write(c); },
    clear: function () { write({}); },
    items: function () {
      var c = read();
      return Object.keys(c).map(function (id) {
        var p = B.findProduct ? B.findProduct(id) : null;
        return p ? { product: p, qty: c[id] } : null;
      }).filter(Boolean);
    },
    total: function () {
      return this.items().reduce(function (sum, it) {
        return sum + it.product.price * it.qty;
      }, 0);
    },
    count: count
  };

  /* ---------- Money ---------- */
  B.money = function (n) {
    return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  B.toastOrderUrl = function () {
    var menuStore = window.ILLY_MENU && window.ILLY_MENU.store;
    return (menuStore && menuStore.orderUrl) ||
      store.toastOrderUrl ||
      "https://order.toasttab.com/online/illy-caffe-oxon-hill?diningOption=takeout";
  };

  /* ---------- Toast ---------- */
  B.toast = function (msg) {
    var t = document.querySelector(".bx-toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "bx-toast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(function () { t.classList.add("is-show"); });
    clearTimeout(window.__bxToast);
    window.__bxToast = setTimeout(function () { t.classList.remove("is-show"); }, 3000);
  };

  /* ---------- Header / footer ---------- */
  /* Real café food photos (local copies in assets/menu-photos/) for mega-menu features.
     branch.js only runs from /pages/, so the path is prefixed with ../ */
  var PB = "../assets/menu-photos/";

  var NAV = [
    {
      label: "Menu",
      active: "Menu",
      href: "section.html?cat=menu",
      links: [
        ["Full Menu", "menu.html"],
        ["Breakfast & Brunch", "section.html?cat=food#breakfast"],
        ["Lunch", "section.html?cat=food#lunch"],
        ["Drinks", "section.html?cat=drinks"],
        ["Sweets & Bakery", "section.html?cat=food#sweets"]
      ],
      feature: ["Order for pickup", PB + "7d86b7c6-b3f1-46f7-8538-95acf6a17d76-retina-large.jpg"]
    },
    {
      label: "Drinks",
      active: "Drinks",
      href: "section.html?cat=drinks",
      links: [
        ["Espresso Bar (Hot & Cold)", "menu.html#cat-espresso-bar"],
        ["Small Espresso Drinks", "menu.html#cat-small-espresso-drinks"],
        ["Tea Lattes", "menu.html#cat-tea-lattes"],
        ["Gelato", "menu.html#cat-gelato"],
        ["Brewed Coffee & Hot Chocolate", "menu.html#cat-brewed-coffee"]
      ],
      feature: ["illy espresso, hot & cold", PB + "20afbf30-27e1-4bc9-ab0c-a7103f166dc1-retina-large.jpg"]
    },
    {
      label: "Food",
      active: "Food",
      href: "section.html?cat=food",
      links: [
        ["Breakfast Sandwiches", "menu.html#cat-breakfast-sandwiches"],
        ["Bagels & Avocado Toasts", "menu.html#cat-bagels"],
        ["Salads & Lunch Sandwiches", "menu.html#cat-salads-lunch"],
        ["Pasta", "menu.html#cat-pasta-lunch"],
        ["Sweets & Bakery", "menu.html#cat-bakery-pastries"]
      ],
      feature: ["Fresh, made to order", PB + "b97ec77a-0889-4852-a4a3-a34e55b6e0cf-retina-large.jpg"]
    },
    {
      label: "Rewards",
      active: "Rewards",
      href: "section.html?cat=rewards",
      links: [
        ["How Rewards Work", "section.html?cat=rewards"],
        ["Free Tier", "section.html?cat=rewards#free"],
        ["Gold Tier", "section.html?cat=rewards#gold"],
        ["VIP Tier", "section.html?cat=rewards#vip"],
        ["Join & Earn", "menu.html"]
      ],
      feature: ["Earn on every pickup", PB + "7d86b7c6-b3f1-46f7-8538-95acf6a17d76-retina-large.jpg"]
    },
    {
      label: "Gift Cards",
      active: "Gift Cards",
      href: "section.html?cat=giftcards",
      links: [
        ["Buy a Gift Card", "section.html?cat=giftcards"],
        ["Check Balance", "section.html?cat=giftcards#balance"],
        ["How It Works", "section.html?cat=giftcards#how"]
      ],
      feature: ["The gift of illy", PB + "20afbf30-27e1-4bc9-ab0c-a7103f166dc1-retina-large.jpg"]
    },
    {
      label: "Visit Us",
      active: "Visit Us",
      href: "section.html?cat=visit",
      links: [
        ["Hours & Location", "store.html"],
        ["Order for Pickup", "menu.html"],
        ["Our Story", "section.html?cat=story"],
        ["Illy World", "section.html?cat=illyworld"],
        ["Contact", "store.html#contact"]
      ],
      feature: ["138 Waterfront Street", PB + "bc04eca2-f0ad-4390-81be-4c01c618920f-retina-large.jpg"]
    }
  ];

  B.renderChrome = function (active) {
    var logo = "../assets/www.illy.com/on/demandware.static/Sites-illy_US_SFRA-Site/-/default/dwa1d7fec0/images/logo-illy.0d478fb603.svg";
    var header =
      '<div class="bx-topbar">Order online &amp; pay securely with Toast &nbsp;|&nbsp; Pickup at 138 Waterfront Street, National Harbor</div>' +
      '<header class="bx-header">' +
        '<a class="bx-header__brand" href="../index.html">' +
          '<img src="' + logo + '" alt="illy" />' +
        '</a>' +
        '<nav class="bx-nav">' +
          NAV.map(function (n) {
            var is = (n.active === active) ? ' is-active' : '';
            var panel =
              '<div class="bx-mega" aria-label="' + n.label + '">' +
                '<div class="bx-mega__links">' +
                  '<h3>' + n.label + '</h3>' +
                  n.links.map(function (link) {
                    return '<a href="' + link[1] + '">' + link[0] + '</a>';
                  }).join('') +
                '</div>' +
                '<a class="bx-mega__feature" href="' + n.href + '">' +
                  '<img src="' + n.feature[1] + '" alt="' + n.feature[0] + '" loading="lazy">' +
                  '<span>' + n.feature[0] + '</span>' +
                '</a>' +
              '</div>';
            return '<div class="bx-nav__item"><a class="bx-nav__link' + is + '" href="' + n.href + '">' + n.label + '</a>' + panel + '</div>';
          }).join('') +
        '</nav>' +
        '<div class="bx-header__right">' +
          '<a class="bx-btn" href="menu.html" style="padding:9px 16px;font-size:13px">Order Online</a>' +
          '<a class="bx-cartlink" href="cart.html">Cart' +
            '<span class="bx-cartlink__count" data-cart-count>0</span>' +
          '</a>' +
        '</div>' +
      '</header>';

    var footer =
      '<footer class="bx-footer">' +
        '<div class="bx-footer__inner">' +
          '<div>' +
            '<h3>Order</h3>' +
            '<a href="menu.html">Full Menu</a>' +
            '<a href="section.html?cat=drinks">Drinks</a>' +
            '<a href="section.html?cat=food">Food</a>' +
            '<a href="menu.html">Order for Pickup</a>' +
            '<a href="cart.html">Your Pickup Cart</a>' +
          '</div>' +
          '<div>' +
            '<h3>More</h3>' +
            '<a href="section.html?cat=rewards">Rewards</a>' +
            '<a href="section.html?cat=giftcards">Gift Cards</a>' +
            '<a href="section.html?cat=story">Our Story</a>' +
            '<a href="section.html?cat=illyworld">Illy World</a>' +
          '</div>' +
          '<div>' +
            '<h3>Visit Us</h3>' +
            '<a href="store.html">Store &amp; Hours</a>' +
            '<a href="store.html#contact">Contact</a>' +
            '<a href="tel:' + (store.phoneHref || '') + '">' + (store.phoneDisplay || '') + '</a>' +
          '</div>' +
          '<div>' +
            '<h3>' + (store.name || 'illy Caffè') + '</h3>' +
            (store.addressLines || []).map(function (l) { return '<span style="display:block;font-size:14px;margin-bottom:8px;color:#3d2b1f">' + l + '</span>'; }).join('') +
            '<span style="display:block;font-size:14px;color:#3d2b1f">' + (store.hours || '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="bx-footer__legal">© illy Caffè — National Harbor branch. Online payments and POS order submission are handled by Toast.</div>' +
      '</footer>';

    var host = document.querySelector("[data-chrome-header]");
    if (host) host.outerHTML = header;
    var fhost = document.querySelector("[data-chrome-footer]");
    if (fhost) fhost.outerHTML = footer;
    renderCartCount();
  };

  function renderCartCount() {
    var n = count();
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = String(n);
      el.style.display = n > 0 ? "inline-flex" : "none";
    });
  }
  B.renderCartCount = renderCartCount;

  /* expose for inline onclick handlers */
  window.ILLY_BRANCH = B;
})();
