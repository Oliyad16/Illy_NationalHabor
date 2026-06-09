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
  function isPagesRoute() {
    return window.location.pathname.indexOf("/pages/") !== -1;
  }
  function rootPath(path) {
    return (isPagesRoute() ? "../" : "") + path;
  }
  function pagePath(path) {
    return (isPagesRoute() ? "" : "pages/") + path;
  }

  /* Real café food photos (local copies in assets/menu-photos/) for mega-menu features. */
  var PB = rootPath("assets/menu-photos/");

  var NAV = [
    {
      label: "Menu",
      active: "Menu",
      href: pagePath("menu.html"),
      links: [
        ["Full Menu", pagePath("menu.html")],
        ["Breakfast & Brunch", pagePath("section.html?cat=food#breakfast")],
        ["Lunch", pagePath("section.html?cat=food#lunch")],
        ["Drinks", pagePath("section.html?cat=drinks")],
        ["Sweets & Bakery", pagePath("section.html?cat=food#sweets")]
      ],
      feature: ["Order for pickup", PB + "7d86b7c6-b3f1-46f7-8538-95acf6a17d76-retina-large.jpg"]
    },
    {
      label: "Drinks",
      active: "Drinks",
      href: pagePath("section.html?cat=drinks"),
      links: [
        ["Espresso Bar (Hot & Cold)", pagePath("menu.html#cat-espresso-bar")],
        ["Small Espresso Drinks", pagePath("menu.html#cat-small-espresso-drinks")],
        ["Tea Lattes", pagePath("menu.html#cat-tea-lattes")],
        ["Gelato", pagePath("menu.html#cat-gelato")],
        ["Brewed Coffee & Hot Chocolate", pagePath("menu.html#cat-brewed-coffee")]
      ],
      feature: ["illy espresso, hot & cold", PB + "20afbf30-27e1-4bc9-ab0c-a7103f166dc1-retina-large.jpg"]
    },
    {
      label: "Food",
      active: "Food",
      href: pagePath("section.html?cat=food"),
      links: [
        ["Breakfast Sandwiches", pagePath("menu.html#cat-breakfast-sandwiches")],
        ["Bagels & Avocado Toasts", pagePath("menu.html#cat-bagels")],
        ["Salads & Lunch Sandwiches", pagePath("menu.html#cat-salads-lunch")],
        ["Pasta", pagePath("menu.html#cat-pasta-lunch")],
        ["Sweets & Bakery", pagePath("menu.html#cat-bakery-pastries")]
      ],
      feature: ["Fresh, made to order", PB + "b97ec77a-0889-4852-a4a3-a34e55b6e0cf-retina-large.jpg"]
    },
    {
      label: "Rewards",
      active: "Rewards",
      href: pagePath("section.html?cat=rewards"),
      links: [
        ["How Rewards Work", pagePath("section.html?cat=rewards")],
        ["Free Tier", pagePath("section.html?cat=rewards#free")],
        ["Gold Tier", pagePath("section.html?cat=rewards#gold")],
        ["VIP Tier", pagePath("section.html?cat=rewards#vip")],
        ["Join & Earn", pagePath("menu.html")]
      ],
      feature: ["Earn on every pickup", PB + "7d86b7c6-b3f1-46f7-8538-95acf6a17d76-retina-large.jpg"]
    },
    {
      label: "Gift Cards",
      active: "Gift Cards",
      href: pagePath("section.html?cat=giftcards"),
      links: [
        ["Buy a Gift Card", pagePath("section.html?cat=giftcards")],
        ["Check Balance", pagePath("section.html?cat=giftcards#balance")],
        ["How It Works", pagePath("section.html?cat=giftcards#how")]
      ],
      feature: ["The gift of illy", PB + "20afbf30-27e1-4bc9-ab0c-a7103f166dc1-retina-large.jpg"]
    },
    {
      label: "Visit Us",
      active: "Visit Us",
      href: pagePath("section.html?cat=visit"),
      links: [
        ["Hours & Location", pagePath("store.html")],
        ["Order for Pickup", pagePath("menu.html")],
        ["Our Story", pagePath("section.html?cat=story")],
        ["Illy World", pagePath("section.html?cat=illyworld")],
        ["Contact", pagePath("store.html#contact")]
      ],
      feature: ["138 Waterfront Street", PB + "bc04eca2-f0ad-4390-81be-4c01c618920f-retina-large.jpg"]
    }
  ];

  /* Inline line-icons (illy-style mobile chrome) */
  var ICON = {
    burger: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    person: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    bag: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>'
  };

  B.renderChrome = function (active) {
    var logo = rootPath("assets/www.illy.com/on/demandware.static/Sites-illy_US_SFRA-Site/-/default/dwa1d7fec0/images/logo-illy.0d478fb603.svg");

    var drawerLinks = NAV.map(function (n) {
      var is = (n.active === active) ? ' is-active' : '';
      var sub = n.links.map(function (link) {
        return '<a class="bx-drawer__sublink" href="' + link[1] + '">' + link[0] + '</a>';
      }).join('');
      return '<div class="bx-drawer__group">' +
        '<a class="bx-drawer__link' + is + '" href="' + n.href + '">' + n.label + '</a>' +
        '<div class="bx-drawer__sub">' + sub + '</div>' +
      '</div>';
    }).join('');

    var header =
      '<div class="bx-topbar">Order online with Toast &nbsp;|&nbsp; National Harbor pickup</div>' +
      '<header class="bx-header">' +
        '<button class="bx-burger" type="button" aria-label="Open menu" aria-expanded="false" data-drawer-open>' + ICON.burger + '</button>' +
        '<a class="bx-header__brand" href="' + rootPath("index.html") + '">' +
          '<img src="' + logo + '" alt="illy" />' +
          '<span>National Harbor</span>' +
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
          '<a class="bx-btn bx-header__order" href="' + pagePath("menu.html") + '" style="padding:9px 16px;font-size:13px">Order Online</a>' +
          '<a class="bx-cartlink" href="' + pagePath("account.html") + '">Account</a>' +
          '<a class="bx-cartlink" href="' + pagePath("cart.html") + '">Cart' +
            '<span class="bx-cartlink__count" data-cart-count>0</span>' +
          '</a>' +
          '<a class="bx-iconlink" href="' + pagePath("account.html") + '" aria-label="Account">' + ICON.person + '</a>' +
          '<a class="bx-iconlink" href="' + pagePath("cart.html") + '" aria-label="Cart">' + ICON.bag +
            '<span class="bx-iconlink__count" data-cart-count>0</span>' +
          '</a>' +
        '</div>' +
      '</header>' +
      '<div class="bx-drawer" data-drawer hidden>' +
        '<div class="bx-drawer__scrim" data-drawer-close></div>' +
        '<aside class="bx-drawer__panel" role="dialog" aria-modal="true" aria-label="Menu">' +
          '<div class="bx-drawer__head">' +
            '<img class="bx-drawer__logo" src="' + logo + '" alt="illy" />' +
            '<button class="bx-drawer__close" type="button" aria-label="Close menu" data-drawer-close>' + ICON.close + '</button>' +
          '</div>' +
          '<a class="bx-btn bx-btn--lg bx-drawer__cta" href="' + pagePath("menu.html") + '">Order Online</a>' +
          '<nav class="bx-drawer__nav">' + drawerLinks + '</nav>' +
          '<div class="bx-drawer__foot">' +
            '<a href="' + pagePath("account.html") + '">Account</a>' +
            '<a href="' + pagePath("cart.html") + '">Cart</a>' +
            '<a href="' + pagePath("store.html") + '">Hours &amp; Location</a>' +
          '</div>' +
        '</aside>' +
      '</div>';

    var footer =
      '<footer class="bx-footer">' +
        '<div class="bx-footer__inner">' +
          '<div>' +
            '<h3>Order</h3>' +
            '<a href="' + pagePath("menu.html") + '">Full Menu</a>' +
            '<a href="' + pagePath("section.html?cat=drinks") + '">Drinks</a>' +
            '<a href="' + pagePath("section.html?cat=food") + '">Food</a>' +
            '<a href="' + pagePath("menu.html") + '">Order for Pickup</a>' +
            '<a href="' + pagePath("cart.html") + '">Your Pickup Cart</a>' +
          '</div>' +
          '<div>' +
            '<h3>More</h3>' +
            '<a href="' + pagePath("section.html?cat=rewards") + '">Rewards</a>' +
            '<a href="' + pagePath("section.html?cat=giftcards") + '">Gift Cards</a>' +
            '<a href="' + pagePath("section.html?cat=story") + '">Our Story</a>' +
            '<a href="' + pagePath("section.html?cat=illyworld") + '">Illy World</a>' +
            '<a href="' + pagePath("account.html") + '">Account</a>' +
          '</div>' +
          '<div>' +
            '<h3>Visit Us</h3>' +
            '<a href="' + pagePath("store.html") + '">Store &amp; Hours</a>' +
            '<a href="' + pagePath("store.html#contact") + '">Contact</a>' +
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
    wireDrawer();
    renderCartCount();
  };

  /* ---------- Mobile drawer ---------- */
  function wireDrawer() {
    var drawer = document.querySelector("[data-drawer]");
    var burger = document.querySelector("[data-drawer-open]");
    if (!drawer || !burger || drawer.dataset.wired === "1") return;
    drawer.dataset.wired = "1";

    function open() {
      drawer.hidden = false;
      requestAnimationFrame(function () { drawer.classList.add("is-open"); });
      burger.setAttribute("aria-expanded", "true");
      document.body.classList.add("bx-noscroll");
    }
    function close() {
      drawer.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      document.body.classList.remove("bx-noscroll");
      setTimeout(function () { drawer.hidden = true; }, 260);
    }

    burger.addEventListener("click", open);
    drawer.querySelectorAll("[data-drawer-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !drawer.hidden) close();
    });
  }

  function renderCartCount() {
    var n = count();
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = String(n);
      el.style.display = n > 0 ? "inline-flex" : "none";
    });
  }
  B.renderCartCount = renderCartCount;

  function normalizeFluidButton(btn) {
    if (!btn || btn.dataset.fluidReady === "1") return;
    btn.dataset.fluidReady = "1";
    if (!btn.querySelector(".bx-btn__label")) {
      var nodes = Array.prototype.slice.call(btn.childNodes);
      var label = document.createElement("span");
      label.className = "bx-btn__label";
      nodes.forEach(function (node) { label.appendChild(node); });
      btn.appendChild(label);
    }
  }

  function setFluidState(el, isOver) {
    if (!el) return;
    normalizeFluidButton(el.classList.contains("bx-btn") ? el : null);
    el.classList.toggle("bx-btn-mouseover", isOver);
    el.classList.toggle("bx-btn__mouseover", isOver);
    el.classList.toggle("bx-btn-mouseout", !isOver);
    el.classList.toggle("bx-btn__mouseout", !isOver);
  }

  function fluidTarget(e) {
    var btn = e.target.closest && e.target.closest(".bx-btn");
    if (btn) return btn;
    var item = e.target.closest && e.target.closest(".mn-item");
    return item ? item.querySelector(".mn-item__add") : null;
  }

  document.addEventListener("pointerover", function (e) {
    var target = fluidTarget(e);
    if (!target || (e.relatedTarget && target.contains(e.relatedTarget))) return;
    setFluidState(target, true);
  });

  document.addEventListener("pointerout", function (e) {
    var target = fluidTarget(e);
    if (!target || (e.relatedTarget && target.contains(e.relatedTarget))) return;
    setFluidState(target, false);
  });

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".bx-btn").forEach(normalizeFluidButton);
  });

  /* expose for inline onclick handlers */
  window.ILLY_BRANCH = B;
})();
