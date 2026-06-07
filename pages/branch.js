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
    {
      label: "Subscriptions",
      active: "Subscriptions",
      href: "section.html?cat=subscriptions",
      links: [
        ["Coffee Subscription", "section.html?cat=subscriptions"],
        ["Pickup Favorites", "shop.html?cat=coffee"],
        ["How Pickup Works", "store.html#contact"]
      ],
      feature: ["Coffee subscription", "../assets/www.illy.com/on/demandware.static/-/Library-Sites-illySharedLibrarySFRA/default/dwac17de29/menu_desktop/abbonamentocaffe.c53d20d638.jpg"]
    },
    {
      label: "Coffee",
      active: "Coffee",
      href: "section.html?cat=coffee",
      links: [
        ["All Coffee", "shop.html?cat=coffee"],
        ["Whole Bean Coffee", "shop.html?cat=coffee"],
        ["IperEspresso Capsules", "shop.html?cat=coffee"],
        ["Ground Coffee", "shop.html?cat=coffee"]
      ],
      feature: ["All Coffee", "../assets/www.illy.com/on/demandware.static/-/Library-Sites-illySharedLibrarySFRA/default/dw17fd75be/menu_desktop/allcoffee.75ed6ecad9.jpg"]
    },
    {
      label: "Coffee Machines",
      active: "Coffee Machines",
      href: "section.html?cat=machines",
      links: [
        ["All Coffee Machines", "shop.html?cat=machines"],
        ["IperEspresso Machines", "shop.html?cat=machines"],
        ["E.S.E. Pod Machines", "shop.html?cat=machines"],
        ["Machine Tutorials", "section.html?cat=machines"]
      ],
      feature: ["All Coffee Machines", "../assets/www.illy.com/on/demandware.static/-/Library-Sites-illySharedLibrarySFRA/default/dw086f29f1/menu_desktop/abbonamentomacchina.feabf17ad5.jpg"]
    },
    {
      label: "Gift and Accessories",
      active: "Gift and Accessories",
      href: "section.html?cat=gifts",
      links: [
        ["Coffee Gifts", "section.html?cat=gifts"],
        ["Machine Gifts & Bundles", "section.html?cat=gifts"],
        ["illy Art Collection", "section.html?cat=gifts"],
        ["Accessories", "section.html?cat=gifts"]
      ],
      feature: ["Accessories", "../assets/www.illy.com/on/demandware.static/-/Library-Sites-illySharedLibrarySFRA/default/dw256de868/menu_desktop/accessories.ab21d166e3.jpg"]
    },
    {
      label: "Promotions",
      active: "Promotions",
      href: "section.html?cat=promotions",
      links: [
        ["Current Offers", "section.html?cat=promotions"],
        ["Best Sellers", "shop.html"],
        ["Coffee Deals", "shop.html?cat=coffee"]
      ],
      feature: ["Current Offers", "../assets/www.illy.com/livestory/video/illy/posts/orig/69e0fa124a2aedd4d1d953bb.8171f33675.jpg"]
    },
    {
      label: "Illyworld",
      active: "Illyworld",
      href: "section.html?cat=illyworld",
      links: [
        ["The illy Story", "section.html?cat=illyworld"],
        ["Sustainability", "section.html?cat=illyworld"],
        ["Art Collection", "section.html?cat=gifts"],
        ["Visit Our Store", "store.html"]
      ],
      feature: ["illy World", "../assets/www.illy.com/livestory/video/illy/posts/orig/67a376d23c37f6ce48da7e4e.f76ca24d67.png"]
    }
  ];

  B.renderChrome = function (active) {
    var logo = "../assets/www.illy.com/on/demandware.static/Sites-illy_US_SFRA-Site/-/default/dwa1d7fec0/images/logo-illy.0d478fb603.svg";
    var header =
      '<div class="bx-topbar">Free shipping on orders over $50+ &nbsp;|&nbsp; Order online and pick up at National Harbor</div>' +
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
            '<a href="section.html?cat=subscriptions">Subscriptions</a>' +
            '<a href="section.html?cat=coffee">Coffee</a>' +
            '<a href="section.html?cat=machines">Coffee Machines</a>' +
            '<a href="section.html?cat=gifts">Gift and Accessories</a>' +
            '<a href="section.html?cat=promotions">Promotions</a>' +
            '<a href="section.html?cat=illyworld">Illyworld</a>' +
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
