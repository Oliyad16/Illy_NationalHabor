(function () {
  var config = window.BRANCH_CONFIG || {};
  var phoneDisplay = config.phoneDisplay || "+1 (877) 469-4559";
  var phoneHref = config.phoneHref || "+18774694559";
  var addressLines = Array.isArray(config.addressLines) ? config.addressLines : [];

  function applyPhone() {
    document.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
      link.setAttribute("href", "tel:" + phoneHref);
      var label = link.querySelector(".cc-footer__button__label") || link;
      label.textContent = "Call - " + phoneDisplay;
    });
  }

  function addBranchContact() {
    var footerColumn = document.querySelector(".cc-footer__lastItems");
    if (!footerColumn || document.querySelector(".branch-contact-card")) {
      return;
    }

    var card = document.createElement("div");
    card.className = "branch-contact-card";

    var title = document.createElement("p");
    title.className = "branch-contact-card__title";
    title.textContent = config.name || "illy Caffe - New Branch";
    card.appendChild(title);

    addressLines.forEach(function (line) {
      var item = document.createElement("p");
      item.className = "branch-contact-card__line";
      item.textContent = line;
      card.appendChild(item);
    });

    var phone = document.createElement("a");
    phone.className = "branch-contact-card__link";
    phone.href = "tel:" + phoneHref;
    phone.textContent = phoneDisplay;
    card.appendChild(phone);

    if (config.hours) {
      var hours = document.createElement("p");
      hours.className = "branch-contact-card__line";
      hours.textContent = config.hours;
      card.appendChild(hours);
    }

    footerColumn.appendChild(card);
  }

  function removeInjectedOverlays() {
    document.querySelectorAll(".modal-backdrop").forEach(function (node) {
      node.remove();
    });

    document.querySelectorAll("body *").forEach(function (node) {
      if (node.children.length > 20) {
        return;
      }

      var text = node.textContent || "";
      if (
        text.indexOf("Coffee is even better with cookies") !== -1 ||
        text.indexOf("Accept All Cookies") !== -1
      ) {
        node.remove();
      }
    });

    document.body.classList.remove("modal-open");
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }

  /* Caf\u00e9 nav: relabel the inherited illy.com mega-menu first-level links into the
     branch's core 6-item caf\u00e9 nav (Menu / Drinks / Food / Rewards / Gift Cards /
     Visit Us), rewrite their destinations to the branch pages, and hide the items
     that no longer apply. Our Story + Illy World live as links inside Visit Us. */
  var CAFE_NAV_MAP = {
    "SUBSCRIPTION":         { label: "Menu",       href: "pages/menu.html" },
    "COFFEE":               { label: "Drinks",     href: "pages/section.html?cat=drinks" },
    "COFFEE MACHINES":      { label: "Food",       href: "pages/section.html?cat=food" },
    "REWARD PROGRAM":       { label: "Rewards",    href: "pages/section.html?cat=rewards" },
    "GIFTS & ACCESSORIES":  { label: "Gift Cards", href: "pages/section.html?cat=giftcards" },
    "PROMOTIONS":           { label: "Visit Us",   href: "pages/section.html?cat=visit" }
  };
  var CAFE_NAV_HIDE = ["ILLY WORLD", "PROFESSIONAL"];

  function cleanNavigation() {
    var seen = {};

    document.querySelectorAll(".cc-menu__firstLevel").forEach(function (link) {
      // Already converted to a caf\u00e9 nav link \u2014 leave it.
      if (link.getAttribute("data-branch-nav") === "1") { return; }

      var label = link.textContent.replace(/\u200b/g, "").replace(/\s+/g, " ").trim();
      var normalized = label.toUpperCase();
      var item = link.closest(".cc-menu__item");

      // Hide items that don't apply to a caf\u00e9 (or duplicates).
      // Use !important + a class because illy.com's CSS forces display on these.
      if (CAFE_NAV_HIDE.indexOf(normalized) !== -1 || seen[normalized]) {
        if (item) {
          item.style.setProperty("display", "none", "important");
          item.classList.add("branch-nav-hidden");
        }
        return;
      }
      seen[normalized] = true;

      // Relabel + repoint the kept items to the caf\u00e9 nav.
      var map = CAFE_NAV_MAP[normalized];
      if (map) {
        var spans = link.querySelectorAll("span");
        if (spans.length) {
          spans.forEach(function (span, i) {
            span.textContent = i === 0 ? map.label : "";
          });
        } else {
          link.textContent = map.label;
        }
        link.setAttribute("href", map.href);
        link.setAttribute("data-branch-nav", "1");
        link.setAttribute("data-branch-label", map.label);
        // Drop the inherited illy.com dropdown so the caf\u00e9 nav is a simple link.
        if (item) {
          var dd = item.querySelector(".cc-menu__dropdownMenu");
          if (dd) { dd.remove(); }
          item.classList.add("branch-nav-item");
          item.setAttribute("data-branch-label", map.label);
        }
      } else {
        // Any unmapped first-level item: tidy whitespace only.
        link.querySelectorAll("span").forEach(function (span) {
          span.textContent = span.textContent.replace(/\u200b/g, "").replace(/\s+/g, " ").trim();
        });
      }
    });

    reorderCafeNav();
  }

  /* The homepage's source slots aren't in caf\u00e9 order, so reorder the relabeled
     items into the canonical sequence to match the branch pages. */
  var CAFE_NAV_ORDER = ["Menu", "Drinks", "Food", "Rewards", "Gift Cards", "Visit Us"];
  function reorderCafeNav() {
    var items = Array.prototype.slice.call(
      document.querySelectorAll(".cc-menu__item[data-branch-label]")
    );
    if (items.length < 2) { return; }
    var parent = items[0].parentNode;
    if (!parent) { return; }
    CAFE_NAV_ORDER.forEach(function (label) {
      var match = items.filter(function (it) {
        return it.getAttribute("data-branch-label") === label;
      })[0];
      if (match) { parent.appendChild(match); }
    });
  }

  function eagerLoadImages() {
    document.querySelectorAll("img").forEach(function (image) {
      if (
        image.closest(".cc-productTile") ||
        image.closest(".product-tile") ||
        image.closest(".fpls")
      ) {
        image.loading = "eager";
      }

      if (image.dataset.src && !image.getAttribute("src")) {
        image.setAttribute("src", image.dataset.src);
      }

      if (image.dataset.srcset && !image.getAttribute("srcset")) {
        image.setAttribute("srcset", image.dataset.srcset);
      }
    });

    document.querySelectorAll("source[data-srcset]").forEach(function (source) {
      if (!source.getAttribute("srcset")) {
        source.setAttribute("srcset", source.dataset.srcset);
      }
    });
  }

  function removeEmptyEmbeds() {
    document.querySelectorAll("iframe, object, embed").forEach(function (node) {
      var src = node.getAttribute("src") || "";
      var title = node.getAttribute("title") || "";
      var isTrackingFrame =
        src.indexOf("bounceexchange.com") !== -1 ||
        src.indexOf("online-metrix") !== -1 ||
        src.indexOf("adsrvr.org") !== -1 ||
        title.toLowerCase() === "empty";

      if (
        !src ||
        src === "about:blank" ||
        node.offsetWidth === 0 ||
        node.offsetHeight === 0 ||
        isTrackingFrame
      ) {
        node.remove();
      }
    });
  }

  function neutralizeLiveForms() {
    document.querySelectorAll("form").forEach(function (form) {
      if (!form.getAttribute("data-original-action")) {
        form.setAttribute("data-original-action", form.getAttribute("action") || "");
      }

      form.setAttribute("action", "#");

      if (form.dataset.staticCloneHandled) {
        return;
      }

      form.dataset.staticCloneHandled = "true";
      form.addEventListener("submit", function (event) {
        var message = form.querySelector(".static-clone-form-message");

        event.preventDefault();

        if (!message) {
          message = document.createElement("p");
          message.className = "static-clone-form-message";
          form.appendChild(message);
        }

        message.textContent = "This static branch preview does not submit to illy.com.";
      });
    });
  }

  function showToast(message) {
    var toast = document.querySelector(".static-clone-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.className = "static-clone-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    window.clearTimeout(window.__illyStaticToastTimer);
    window.__illyStaticToastTimer = window.setTimeout(function () {
      toast.remove();
    }, 3600);
  }

  function setupMobileMenu() {
    var toggle = document.querySelector(".js-menuMobile");
    var close = document.querySelector(".js-closeMenu");

    if (toggle && !toggle.dataset.staticCloneHandled) {
      toggle.dataset.staticCloneHandled = "true";
      toggle.addEventListener("click", function (event) {
        event.preventDefault();
        document.body.classList.toggle("mobile-menu-open");
      });
    }

    if (close && !close.dataset.staticCloneHandled) {
      close.dataset.staticCloneHandled = "true";
      close.addEventListener("click", function (event) {
        event.preventDefault();
        document.body.classList.remove("mobile-menu-open");
      });
    }
  }

  function setupMegaMenus() {
    document.querySelectorAll(".cc-menu__item").forEach(function (item) {
      if (item.dataset.staticMegaHandled) {
        return;
      }

      item.dataset.staticMegaHandled = "true";

      function openMenu() {
        if (window.matchMedia("(min-width: 1025px)").matches) {
          document.querySelectorAll(".cc-menu__item.static-menu-open").forEach(function (openItem) {
            if (openItem !== item) {
              openItem.classList.remove("static-menu-open");
            }
          });
          item.classList.add("static-menu-open");
        }
      }

      item.addEventListener("mouseenter", openMenu);
      item.addEventListener("mouseover", openMenu);
      item.addEventListener("pointerover", openMenu);

      item.addEventListener("mouseleave", function () {
        item.classList.remove("static-menu-open");
      });

      item.addEventListener("focusin", function () {
        if (window.matchMedia("(min-width: 1025px)").matches) {
          item.classList.add("static-menu-open");
        }
      });

      item.addEventListener("focusout", function () {
        window.setTimeout(function () {
          if (!item.contains(document.activeElement)) {
            item.classList.remove("static-menu-open");
          }
        }, 100);
      });
    });
  }

  function setupStaticSearch() {
    var panel = document.querySelector(".static-search-panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.className = "static-search-panel";
      panel.hidden = true;
      panel.innerHTML =
        '<form class="static-search-panel__row" action="#">' +
        '<input type="search" aria-label="Search" placeholder="Search the static preview" />' +
        '<button type="submit">Search</button>' +
        "</form>" +
        '<p class="static-clone-form-message">Search is disabled in this static branch preview.</p>';
      document.body.appendChild(panel);

      panel.querySelector("form").addEventListener("submit", function (event) {
        event.preventDefault();
        showToast("Search is disabled in this static preview.");
      });
    }

    document.querySelectorAll("button.search, .js-searchOnMobileMenu").forEach(function (button) {
      if (button.dataset.staticCloneHandled) {
        return;
      }

      button.dataset.staticCloneHandled = "true";
      button.addEventListener("click", function (event) {
        event.preventDefault();
        panel.hidden = !panel.hidden;
        if (!panel.hidden) {
          panel.querySelector("input").focus();
        }
      });
    });
  }

  // Shared pickup cart, written straight to localStorage so the homepage and the
  // /pages/* store all read the same cart. Keep this key in sync with pages/branch.js.
  var CART_KEY = "illyBranchCart";
  // Map homepage product SKUs to the SKUs our branch catalog actually carries.
  var SKU_ALIAS = { "60588": "60383", "25403": "25404", "A136ST": "8837ST" };

  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function cartCount() {
    var c = readCart(), n = 0;
    Object.keys(c).forEach(function (k) { n += c[k]; });
    return n;
  }

  function updateCartCount() {
    var count = cartCount();
    document.querySelectorAll(".cc-minicart__quantity").forEach(function (badge) {
      badge.classList.add("static-cart-count");
      badge.classList.remove("d-none");
      badge.textContent = String(count);
    });
    // Make the header cart icon link to our pickup cart page.
    document.querySelectorAll(".minicart-link, a.minicart-link, [class*='minicart'] a").forEach(function (a) {
      if (a.tagName === "A") { a.setAttribute("href", "pages/cart.html"); }
    });
  }

  function skuFromControl(control) {
    var pid = control.getAttribute("data-pid");
    if (pid) { return SKU_ALIAS[pid] || pid; }
    // Fall back to a SKU in the nearest product link.
    var tile = control.closest(".cc-productTile") || control.closest("[class*='productTile']") || control.parentElement;
    var link = tile && tile.querySelector("a[href*='.html']");
    var m = link && (link.getAttribute("href") || "").match(/\/([A-Z0-9]+)\.html/i);
    if (m) { return SKU_ALIAS[m[1]] || m[1]; }
    return null;
  }

  function setupCartStub() {
    updateCartCount();

    document.querySelectorAll("button, a").forEach(function (control) {
      var text = (control.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      var looksLikeAddToCart =
        text === "add to cart" ||
        control.className.indexOf("add-to-cart") !== -1 ||
        control.getAttribute("data-pid");

      if (!looksLikeAddToCart || control.dataset.staticCartHandled) {
        return;
      }

      control.dataset.staticCartHandled = "true";
      control.addEventListener("click", function (event) {
        event.preventDefault();
        var sku = skuFromControl(control);
        if (!sku) {
          showToast("Browse our shop to add items for pickup.");
          window.setTimeout(function () { window.location.href = "pages/shop.html"; }, 900);
          return;
        }
        var c = readCart();
        c[sku] = (c[sku] || 0) + 1;
        localStorage.setItem(CART_KEY, JSON.stringify(c));
        updateCartCount();
        showToast("Added to your pickup cart. View it any time from the cart icon.");
      });
    });
  }

  // Map an illy.com /en-us/... path to one of our own branch pages.
  // Returns a local URL string, or null if there's no mapping (caller decides fallback).
  function mapToBranchPage(pathname) {
    var path = pathname.replace(/^\/en-us\/?/, "").replace(/​/g, "");

    // Product detail pages -> our product page, matched by SKU in the filename.
    var skuMatch = path.match(/\/([A-Z0-9]+)\.html$/i);
    if (skuMatch) {
      var sku = skuMatch[1];
      // Normalize a few homepage SKUs to the ones our catalog actually carries.
      var skuAlias = { "60588": "60383", "25403": "25404", "A136ST": "8837ST" };
      sku = skuAlias[sku] || sku;
      if (window.ILLY_BRANCH && window.ILLY_BRANCH.findProduct && window.ILLY_BRANCH.findProduct(sku)) {
        return "pages/product.html?id=" + sku;
      }
      return "pages/product.html?id=" + sku; // PDP page handles unknown ids gracefully
    }

    // Category / listing pages -> our café sections.
    // Anything coffee/espresso/drink related -> Drinks.
    if (/^coffee-machines/.test(path)) return "pages/section.html?cat=drinks";
    if (/^coffee(\/|$)|^coffee-delivery|^subscription|^espresso|^drinks?/.test(path)) return "pages/section.html?cat=drinks";
    // Food / gifts / accessories / promotions -> Food.
    if (/^coffee-gifts|all-accessories|art-collection|^art(\/|$)|^machine-gifts|^hosting-gifts|^coffee-offers|^promotion|^promotions|^sale|^offers|^food|^breakfast|^lunch/.test(path)) return "pages/section.html?cat=food";
    // Brand / story / company -> Visit Us.
    if (/^quality|^universita-del-caffe|^illy-world|^illyworld|^illy-mission|^company|^sustainability|^live-happilly/.test(path)) return "pages/section.html?cat=visit";
    // Generic menu entry point.
    if (/^menu|^order/.test(path)) return "pages/menu.html";

    // Store / service.
    if (/^customer-care|^contact/.test(path)) return "pages/store.html#contact";
    if (/^cart$/.test(path)) return "pages/cart.html";
    if (/^shop|^store|location/.test(path)) return "pages/section.html?cat=visit";

    return null;
  }

  function topicFromPath(pathname) {
    var seg = pathname.replace(/^\/en-us\/?/, "").split("/")[0].replace(/[-%].*$/, "").replace(/-/g, " ");
    return seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : "";
  }

  function setupLinkStrategy() {
    document.querySelectorAll("a[href]").forEach(function (link) {
      var href = link.getAttribute("href");

      if (!href || href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:")) {
        return;
      }

      if (link.dataset.staticLinkHandled) {
        return;
      }

      var url;
      try {
        url = new URL(href, window.location.href);
      } catch (e) {
        return;
      }

      var isIllyInternal =
        url.hostname === "www.illy.com" ||
        (url.hostname === window.location.hostname && url.pathname.indexOf("/en-us/") === 0);

      if (!isIllyInternal) {
        return; // genuine external links (LinkedIn, app stores, etc.) stay as-is
      }

      // Rewrite the href up-front so hover/preview and middle-click also stay on-site.
      var target = mapToBranchPage(url.pathname);
      link.dataset.staticLinkHandled = "true";

      if (target) {
        link.setAttribute("href", target);
        return;
      }

      // No specific page yet -> branded on-site "coming soon" (keeps users here).
      var topic = topicFromPath(url.pathname);
      link.setAttribute("href", "pages/coming-soon.html" + (topic ? "?topic=" + encodeURIComponent(topic) : ""));
    });
  }

  function addProductBadges() {
    var tiles = Array.from(document.querySelectorAll(".cc-homePage__productSlider .cc-productTile"));

    tiles.slice(0, 3).forEach(function (tile) {
      var contentTarget =
        tile.querySelector(".cc-productTile__productSliderTile") ||
        tile.querySelector(".product-tile") ||
        tile;

      if (contentTarget.querySelector(".static-product-badge")) {
        return;
      }

      var badge = document.createElement("span");
      badge.className = "static-product-badge";
      badge.textContent = "Best Seller";
      contentTarget.insertBefore(badge, contentTarget.firstChild);
    });
  }

  function observeInjectedEmbeds() {
    if (window.__illyStaticEmbedObserver) {
      return;
    }

    window.__illyStaticEmbedObserver = new MutationObserver(function () {
      removeEmptyEmbeds();
    });

    window.__illyStaticEmbedObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function updateStaticMetadata() {
    var description = "illy Caffe new branch preview with local contact details.";
    var canonical = document.querySelector('link[rel="canonical"]');
    var metaDescription = document.querySelector('meta[name="description"]');

    document.title = config.name || "illy Caffe - New Branch";

    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    }

    if (canonical) {
      canonical.setAttribute("href", window.location.origin + window.location.pathname);
    }

    [
      ["og:title", config.name || "illy Caffe - New Branch"],
      ["og:description", description],
      ["og:url", window.location.origin + window.location.pathname]
    ].forEach(function (entry) {
      var property = entry[0];
      var content = entry[1];
      var meta = document.querySelector('meta[property="' + property + '"]');

      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }

      meta.setAttribute("content", content);
    });
  }

  function init() {
    updateStaticMetadata();
    applyPhone();
    addBranchContact();
    cleanNavigation();
    eagerLoadImages();
    removeEmptyEmbeds();
    observeInjectedEmbeds();
    neutralizeLiveForms();
    setupMobileMenu();
    setupMegaMenus();
    setupStaticSearch();
    setupCartStub();
    setupLinkStrategy();
    addProductBadges();
    removeInjectedOverlays();
    window.setTimeout(removeInjectedOverlays, 500);
    window.setTimeout(removeInjectedOverlays, 1500);
    window.setTimeout(cleanNavigation, 500);
    window.setTimeout(cleanNavigation, 1500);
    window.setTimeout(cleanNavigation, 3000);
    window.setTimeout(eagerLoadImages, 500);
    window.setTimeout(removeEmptyEmbeds, 500);
    window.setTimeout(removeEmptyEmbeds, 1500);
    window.setTimeout(removeEmptyEmbeds, 3000);
    window.setTimeout(neutralizeLiveForms, 500);
    window.setTimeout(setupMobileMenu, 500);
    window.setTimeout(setupMegaMenus, 500);
    window.setTimeout(setupStaticSearch, 500);
    window.setTimeout(setupCartStub, 500);
    window.setTimeout(setupLinkStrategy, 500);
    window.setTimeout(setupLinkStrategy, 1500);
    window.setTimeout(setupLinkStrategy, 3000);
    window.setTimeout(setupCartStub, 1500);
    window.setTimeout(addProductBadges, 500);
    observeForLateLinks();
  }

  // Footer and lazy modules can inject links after our passes run.
  // Keep rewriting any newly-added illy.com links so nothing ever leaves the site.
  function observeForLateLinks() {
    if (window.__illyLinkObserver) {
      return;
    }
    window.__illyLinkObserver = new MutationObserver(function () {
      setupLinkStrategy();
      cleanNavigation();
    });
    window.__illyLinkObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
