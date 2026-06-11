/* Shared café ordering UI — item cards + customization modal.
   Used by both menu.html (full menu) and section.html (category landing pages)
   so the ordering experience is identical everywhere and defined once.

   Load order: branch.js → menu.js → menu-cart.js → menu-ui.js
   Exposes window.ILLY_BRANCH.MENU_UI with:
     itemCardHTML(item)        -> HTML string for one item button
     itemsGridHTML(items)      -> HTML string for a grid of item buttons
     mountModal()              -> injects the modal DOM + wires it (idempotent)
     bindGrid(rootEl)          -> delegates clicks in rootEl to add/customize
*/
(function () {
  var B = window.ILLY_BRANCH;
  if (!B) return;
  var M = window.ILLY_MENU || {};

  function priceLabel(item) {
    if (item.outOfStock) return '<span class="mn-item__oos">Out of stock</span>';
    if (item.sizes && item.sizes.length > 1) {
      return '<span class="mn-item__priceline"><span class="mn-item__from">from </span><span class="mn-item__price">' + B.money(item.price) + '</span></span>';
    }
    return '<span class="mn-item__priceline"><span class="mn-item__price">' + B.money(item.price) + '</span></span>';
  }
  function hasOptions(item) {
    return (item.sizes && item.sizes.length) || (item.modifiers && item.modifiers.length);
  }

  function itemCardHTML(item) {
    var disabled = item.outOfStock ? ' disabled' : '';
    var photo = M.photoUrl ? M.photoUrl(item) : null;
    var hasPhoto = !!photo;
    return '<button class="mn-item' + (hasPhoto ? ' mn-item--photo' : '') + '" data-item="' + item.id + '"' + disabled + '>' +
      (hasPhoto ? '<div class="mn-item__thumb"><img src="' + photo + '" alt="' + item.name + '" loading="lazy"></div>' : '') +
      '<div class="mn-item__main">' +
        '<p class="mn-item__name">' + item.name + '</p>' +
        (item.desc ? '<p class="mn-item__desc">' + item.desc + '</p>' : '') +
      '</div>' +
      '<div class="mn-item__right">' + priceLabel(item) +
        (!item.outOfStock ? '<div class="mn-item__add">' + (hasOptions(item) ? 'Customize' : 'Add +') + '</div>' : '') +
      '</div>' +
    '</button>';
  }

  function itemsGridHTML(items) {
    return '<div class="mn-items">' + items.map(itemCardHTML).join('') + '</div>';
  }

  /* ---------------- Modal ---------------- */
  var els = null;   // cached modal element refs
  var current = null;

  function modGroups(item) {
    return (item.modifiers || []).map(function (key) { return M.modifiers[key]; }).filter(Boolean);
  }

  function mountModal() {
    if (document.getElementById("mn-modal")) { cacheEls(); return; }
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="mn-modal" id="mn-modal" role="dialog" aria-modal="true" aria-labelledby="mn-modal-title">' +
        '<div class="mn-modal__scrim" data-close></div>' +
        '<div class="mn-modal__panel">' +
          '<div class="mn-modal__hero" id="mn-modal-hero" hidden><img id="mn-modal-img" alt=""></div>' +
          '<div class="mn-modal__head">' +
            '<button class="mn-modal__close" data-close aria-label="Close">×</button>' +
            '<h2 id="mn-modal-title"></h2>' +
            '<p id="mn-modal-desc"></p>' +
          '</div>' +
          '<div class="mn-modal__body" id="mn-modal-body"></div>' +
          '<div class="mn-modal__foot">' +
            '<div class="bx-qty"><input type="number" min="1" value="1" id="mn-qty" aria-label="Quantity"></div>' +
            '<button class="bx-btn bx-btn--lg" id="mn-add"></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap.firstChild);
    cacheEls();
    wireModal();
  }

  function cacheEls() {
    els = {
      modal: document.getElementById("mn-modal"),
      title: document.getElementById("mn-modal-title"),
      desc: document.getElementById("mn-modal-desc"),
      body: document.getElementById("mn-modal-body"),
      qty: document.getElementById("mn-qty"),
      add: document.getElementById("mn-add"),
      hero: document.getElementById("mn-modal-hero"),
      img: document.getElementById("mn-modal-img")
    };
  }

  function openItem(item) {
    current = item;
    els.title.textContent = item.name;
    els.desc.textContent = item.desc || "";
    els.qty.value = 1;

    var photo = M.photoUrl ? M.photoUrl(item) : null;
    if (photo) { els.img.src = photo; els.img.alt = item.name; els.hero.hidden = false; }
    else { els.img.removeAttribute("src"); els.hero.hidden = true; }

    var html = "";
    if (item.sizes && item.sizes.length) {
      html += '<div class="mn-group" data-group="size">' +
        '<div class="mn-group__label"><h3>Size</h3><span class="mn-group__req">Required</span></div>' +
        item.sizes.map(function (s, i) {
          return '<label class="mn-opt">' +
            '<span class="mn-opt__name"><input type="radio" name="size" value="' + i + '"' + (i === 0 ? ' checked' : '') + '>' + s.name + '</span>' +
            '<span class="mn-opt__price">' + B.money(s.price) + '</span>' +
          '</label>';
        }).join('') +
      '</div>';
    }
    modGroups(item).forEach(function (g, gi) {
      var single = g.max === 1;
      html += '<div class="mn-group" data-group="mod" data-gi="' + gi + '">' +
        '<div class="mn-group__label"><h3>' + g.name + '</h3>' +
          (g.required ? '<span class="mn-group__req">Required</span>' : '<span class="mn-group__opt">Optional' + (single ? ' · pick 1' : '') + '</span>') +
        '</div>' +
        g.options.map(function (o, oi) {
          var type = single ? "radio" : "checkbox";
          return '<label class="mn-opt">' +
            '<span class="mn-opt__name"><input type="' + type + '" name="g' + gi + '" value="' + oi + '">' + o.name + '</span>' +
            (o.price ? '<span class="mn-opt__price">+' + B.money(o.price) + '</span>' : '') +
          '</label>';
        }).join('') +
      '</div>';
    });
    if (!html) html = '<p style="color:#6a584c;font-size:14px;margin:0">No options to choose — just add it to your order.</p>';
    els.body.innerHTML = html;
    recalc();
    els.modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function gather() {
    var size = null, modifiers = [];
    if (current.sizes && current.sizes.length) {
      var sel = els.body.querySelector('input[name="size"]:checked');
      var idx = sel ? parseInt(sel.value, 10) : 0;
      size = current.sizes[idx];
    }
    modGroups(current).forEach(function (g, gi) {
      els.body.querySelectorAll('input[name="g' + gi + '"]:checked').forEach(function (inp) {
        var o = g.options[parseInt(inp.value, 10)];
        modifiers.push({ label: o.name, price: o.price || 0 });
      });
    });
    return { size: size, modifiers: modifiers, qty: Math.max(1, parseInt(els.qty.value, 10) || 1) };
  }

  function recalc() {
    if (!current) return;
    var c = gather();
    var base = c.size ? c.size.price : current.price;
    var unit = c.modifiers.reduce(function (s, m) { return s + m.price; }, base);
    /* Interim: the button hands off to Toast to order + pay. Show the item's
       price for context but label the action as the Toast handoff. */
    els.add.textContent = "Order on Toast · " + B.money(unit * c.qty);
  }

  function closeModal() {
    els.modal.classList.remove("is-open");
    document.body.style.overflow = "";
    current = null;
  }

  function wireModal() {
    els.body.addEventListener("change", recalc);
    els.qty.addEventListener("input", recalc);
    els.modal.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-close")) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && els.modal.classList.contains("is-open")) closeModal();
    });
    els.add.addEventListener("click", function () {
      if (!current) return;
      /* The site is the storefront; ordering + payment happen on Toast. We
         deep-link straight to THIS item's customization modal on the café's
         Toast page (URL carries the Toast item GUID), so the guest lands on the
         exact product, customizes, adds, and pays there. */
      var name = current.name;
      var url = B.toastItemUrl(current);
      closeModal();
      B.toast('Opening "' + name + '" on Toast to order…');
      window.open(url, "_blank", "noopener");
    });
  }

  function bindGrid(root) {
    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-item]");
      if (!btn || btn.disabled) return;
      var item = M.findItem(btn.getAttribute("data-item"));
      if (!item) return;
      /* Tapping any item — with or without options — opens the detail popup
         (enlarged photo, name, description, price, qty + Add, and an X to
         close). Adding to the cart happens from inside the modal so the
         header badge always refreshes and the user gets clear confirmation. */
      openItem(item);
    });
  }

  B.MENU_UI = {
    itemCardHTML: itemCardHTML,
    itemsGridHTML: itemsGridHTML,
    priceLabel: priceLabel,
    hasOptions: hasOptions,
    mountModal: mountModal,
    bindGrid: bindGrid,
    openItem: function (item) { mountModal(); openItem(item); }
  };
})();
