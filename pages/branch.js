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
  var NAV = [
    { label: "Shop", href: "shop.html" },
    { label: "Coffee", href: "shop.html?cat=coffee" },
    { label: "Machines", href: "shop.html?cat=machines" },
    { label: "Our Store", href: "store.html" },
    { label: "Contact", href: "store.html#contact" }
  ];

  B.renderChrome = function (active) {
    var logo = "../assets/www.illy.com/on/demandware.static/Sites-illy_US_SFRA-Site/-/default/dw7c05cd4a/images/logo.086476d5d8.svg";
    var header =
      '<div class="bx-topbar">Order online &amp; pick up at our National Harbor store</div>' +
      '<header class="bx-header">' +
        '<a class="bx-header__brand" href="index.html">' +
          '<img src="' + logo + '" alt="illy" />' +
          '<span>National Harbor</span>' +
        '</a>' +
        '<nav class="bx-nav">' +
          NAV.map(function (n) {
            var is = (n.label === active) ? ' class="is-active"' : '';
            return '<a href="' + n.href + '"' + is + '>' + n.label + '</a>';
          }).join('') +
        '</nav>' +
        '<div class="bx-header__right">' +
          '<a class="bx-cartlink" href="cart.html">Cart' +
            '<span class="bx-cartlink__count" data-cart-count>0</span>' +
          '</a>' +
        '</div>' +
      '</header>';

    var footer =
      '<footer class="bx-footer">' +
        '<div class="bx-footer__inner">' +
          '<div>' +
            '<h3>Shop</h3>' +
            '<a href="shop.html?cat=coffee">Coffee</a>' +
            '<a href="shop.html?cat=machines">Coffee Machines</a>' +
            '<a href="cart.html">Your Pickup Cart</a>' +
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
        '<div class="bx-footer__legal">© illy Caffè — National Harbor branch. Independent local store site. Order online, collect in store.</div>' +
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
