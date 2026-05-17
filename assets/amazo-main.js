<<<<<<< HEAD
/* ============================================================
   AMAZO MAIN JS v4.0 — FULLY FIXED
   FIX 1: Add to Cart → adds product + opens cart drawer
   FIX 2: Buy Now / Proceed to Checkout → redirects to /checkout
   FIX 3: Quick View → fully functional with AJAX product load,
           variants, ATC, Buy Now, smooth open/close animations
   ============================================================ */
'use strict';

/* ============================================================
   GLOBAL CART DRAWER MANAGER
   ============================================================ */
window.AmazoDrw = (function () {

  var FREE_SHIPPING_THRESHOLD = (window.AmezoConfig && window.AmezoConfig.freeShippingThreshold)
    ? window.AmezoConfig.freeShippingThreshold * 100
    : 3500;

  var sym = (window.AmezoConfig && window.AmezoConfig.currencySymbol) || '₹';

  function formatMoney(cents) {
    return sym + (cents / 100).toFixed(2).replace(/\.00$/, '');
  }

  /* ── DOM Refs ── */
  function drawer()   { return document.getElementById('cartDrawer'); }
  function overlay()  { return document.getElementById('cartDrawerOverlay'); }
  function items()    { return document.getElementById('cartDrawerItems'); }
  function empty()    { return document.getElementById('cartDrawerEmpty'); }
  function footer()   { return document.getElementById('cartDrawerFooter'); }
  function subtotal() { return document.getElementById('cartSubtotal'); }
  function countEl()  { return document.getElementById('cartItemCount'); }
  function shpBar()   { return document.getElementById('cartShippingBar'); }
  function shpText()  { return document.getElementById('cartShippingText'); }
  function shpFill()  { return document.getElementById('cartShippingFill'); }

  /* ── Open / Close ── */
  function openDrawer() {
    var d = drawer(); var o = overlay();
    if (!d) return;
    d.classList.add('is-open');
    d.setAttribute('aria-hidden', 'false');
    if (o) { o.classList.add('active'); o.setAttribute('aria-hidden', 'false'); }
    document.body.classList.add('cart-is-open');
    loadCart();
  }

  function closeDrawer() {
    var d = drawer(); var o = overlay();
    if (!d) return;
    d.classList.remove('is-open');
    d.setAttribute('aria-hidden', 'true');
    if (o) { o.classList.remove('active'); o.setAttribute('aria-hidden', 'true'); }
    document.body.classList.remove('cart-is-open');
  }

  /* ── Update header cart count badges ── */
  function updateBadges(count) {
    document.querySelectorAll('#amz-cart-count, .amz-cart-count, .cart-count').forEach(function (el) {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  /* ── Shipping bar ── */
  function updateShippingBar(totalCents) {
    var bar = shpBar(); var txt = shpText(); var fill = shpFill();
    if (!bar) return;
    bar.style.display = 'block';
    if (totalCents >= FREE_SHIPPING_THRESHOLD) {
      if (txt) txt.textContent = '🎉 You qualify for FREE shipping!';
      if (fill) { fill.style.width = '100%'; fill.style.background = 'linear-gradient(90deg,#28a745,#20c997)'; }
    } else {
      var remaining = FREE_SHIPPING_THRESHOLD - totalCents;
      if (txt) txt.textContent = 'Add ' + formatMoney(remaining) + ' more for FREE shipping!';
      if (fill) { fill.style.width = ((totalCents / FREE_SHIPPING_THRESHOLD) * 100).toFixed(1) + '%'; fill.style.background = 'linear-gradient(90deg,#ff9900,#ffd814)'; }
    }
  }

  /* ── Load & Render Cart ── */
  function loadCart() {
    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) { renderCart(cart); })
      .catch(function () { });
  }

  function renderCart(cart) {
    var ftEl = footer(); var empEl = empty(); var itmEl = items();
    if (!itmEl) return;
    updateBadges(cart.item_count);
    updateShippingBar(cart.total_price);

    if (cart.item_count === 0) {
      itmEl.innerHTML = '';
      if (empEl) empEl.style.display = 'flex';
      if (ftEl) ftEl.style.display = 'none';
      return;
    }

    if (empEl) empEl.style.display = 'none';
    if (ftEl) ftEl.style.display = 'block';
    if (subtotal()) subtotal().textContent = formatMoney(cart.total_price);
    if (countEl()) countEl().textContent = cart.item_count;

    itmEl.innerHTML = cart.items.map(function (item) {
      var imgSrc = item.image ? item.image : '';
      var variantTitle = item.variant_title && item.variant_title !== 'Default Title' ? item.variant_title : '';
      return '<div class="cart-drawer-item" data-key="' + item.key + '">' +
        (imgSrc
          ? '<img src="' + imgSrc + '" alt="' + item.title.replace(/"/g, '') + '" class="cart-drawer-item__img" loading="lazy" width="72" height="72">'
          : '<div class="cart-drawer-item__img" style="background:#f3f3f3;"></div>') +
        '<div class="cart-drawer-item__info">' +
          '<div class="cart-drawer-item__title">' + item.product_title + '</div>' +
          (variantTitle ? '<div style="font-size:11px;color:#565959;margin-bottom:2px;">' + variantTitle + '</div>' : '') +
          '<div class="cart-drawer-item__price">' + formatMoney(item.final_line_price) + '</div>' +
          '<div class="cart-drawer-item__qty-row">' +
            '<button class="cart-drawer-item__qty-btn" data-action="decrease" data-key="' + item.key + '" data-qty="' + item.quantity + '" aria-label="Decrease quantity">−</button>' +
            '<span class="cart-drawer-item__qty-num">' + item.quantity + '</span>' +
            '<button class="cart-drawer-item__qty-btn" data-action="increase" data-key="' + item.key + '" data-qty="' + item.quantity + '" aria-label="Increase quantity">+</button>' +
            '<button class="cart-drawer-item__remove" data-key="' + item.key + '" aria-label="Remove item">Delete</button>' +
          '</div>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  /* ── AJAX Add to Cart ─────────────────────────────────────
     FIX 1: After successful add → renders updated cart + opens drawer
  ────────────────────────────────────────────────────────── */
  var _atcInflight = false;

  function addToCart(variantId, qty, btn, afterAdd) {
    if (_atcInflight) return;

    var id = parseInt(variantId, 10);
    if (!id || isNaN(id)) {
      showToast('⚠ Please select a product option first.', 'error');
      return;
    }

    qty = parseInt(qty, 10) || 1;
    _atcInflight = true;

    var textEl = btn && btn.querySelector('.btn-text');
    var loadEl = btn && btn.querySelector('.btn-loading');
    if (btn) btn.disabled = true;
    if (textEl) textEl.style.display = 'none';
    if (loadEl) loadEl.style.display = '';

    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: id, quantity: qty })
    })
      .then(function (r) {
        if (!r.ok) {
          return r.json().then(function (errBody) {
            var msg = (errBody && (errBody.description || errBody.message)) || 'Could not add to cart.';
            throw new Error(msg);
          });
        }
        return r.json();
      })
      .then(function () {
        _atcInflight = false;
        if (btn) btn.disabled = false;
        if (textEl) textEl.style.display = '';
        if (loadEl) loadEl.style.display = 'none';
        showToast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Added to cart!', 'success');
        /* Fetch fresh cart data */
        return fetch('/cart.js').then(function (r) { return r.json(); });
      })
      .then(function (cart) {
        renderCart(cart);
        /* If a custom callback provided (e.g. Buy Now uses redirect) */
        if (typeof afterAdd === 'function') {
          afterAdd(cart);
        } else {
          /* DEFAULT: open cart drawer */
          openDrawer();
        }
        return cart;
      })
      .catch(function (err) {
        _atcInflight = false;
        if (btn) btn.disabled = false;
        if (textEl) textEl.style.display = '';
        if (loadEl) loadEl.style.display = 'none';
        var msg = (err && err.message && err.message !== 'add failed')
          ? '⚠ ' + err.message
          : '⚠ Could not add to cart. Please try again.';
        showToast(msg, 'error');
      });
  }

  /* ── Update item quantity ── */
  function updateQty(key, newQty) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: newQty })
    })
      .then(function (r) { return r.json(); })
      .then(function (cart) { renderCart(cart); })
      .catch(function () { });
  }

  /* ── Toast ── */
  function showToast(msg, type) {
    var toast = document.getElementById('AmzToast');
    if (!toast) return;
    toast.className = 'amz-toast amz-toast--' + (type || 'success') + ' amz-toast--show';
    toast.innerHTML = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.classList.remove('amz-toast--show'); }, 3500);
  }

  /* ── Event Delegation ── */
  function initEvents() {

    /* Cart icon → open drawer */
    document.addEventListener('click', function (e) {
      /* Intercept any link pointing to /cart or having specific classes */
      var cartLink = e.target.closest('a[href="/cart"], a[href^="/cart?"], .amz-header__cart-link, [data-cart-drawer-trigger]');
      
      /* Don't intercept if cart_type is explicitly 'page' (unless triggered via button) */
      if (cartLink && window.AmezoConfig && window.AmezoConfig.cartType === 'page' && !cartLink.classList.contains('amz-header__cart-link')) {
        return; 
      }
      
      /* Only prevent default if it's not the cart drawer checkout/view cart buttons */
      if (cartLink && !cartLink.closest('#cartDrawer')) { 
        e.preventDefault(); 
        openDrawer(); 
        /* Also close side menu if it's open */
        var sideMenu = document.getElementById('amz-side-menu');
        if (sideMenu && sideMenu.classList.contains('open')) {
          sideMenu.classList.remove('open');
          var sideOverlay = document.getElementById('amz-side-overlay');
          if (sideOverlay) sideOverlay.classList.remove('active');
          document.body.classList.remove('menu-open');
        }
        return; 
      }

      /* QUICK VIEW CLOSE */
      if (e.target.closest('#QuickViewOverlay') || e.target.closest('#QuickViewClose')) {
        if (window.AmazQV) window.AmazQV.close();
        return;
      }

      /* Close overlay or close btn (Cart Drawer) */
      if (e.target.closest('#cartDrawerOverlay') || e.target.closest('#cartDrawerClose')) {
        closeDrawer(); return;
      }

      /* Cart qty buttons */
      var qtyBtn = e.target.closest('.cart-drawer-item__qty-btn');
      if (qtyBtn) {
        var key = qtyBtn.dataset.key;
        var current = parseInt(qtyBtn.dataset.qty) || 1;
        var action = qtyBtn.dataset.action;
        var newQty = action === 'increase' ? current + 1 : Math.max(0, current - 1);
        updateQty(key, newQty);
        return;
      }

      /* Remove item */
      var removeBtn = e.target.closest('.cart-drawer-item__remove');
      if (removeBtn) { updateQty(removeBtn.dataset.key, 0); return; }

      /* ── ADD TO CART ─────────────────────────────────────
         FIX 1: Intercept ALL ATC buttons (product cards + product page form)
         After add → renders cart + opens drawer
      ──────────────────────────────────────────────────── */
      var atcBtn = e.target.closest('.amz-add-to-cart, [data-add-to-cart], .product-card__add-btn');
      if (atcBtn) {
        e.preventDefault();
        e.stopPropagation();

        var variantId = atcBtn.dataset.variantId;
        if (!variantId) {
          var form = atcBtn.closest('form, .amz-product-form');
          var hiddenInput = form && form.querySelector('[name="id"]');
          variantId = hiddenInput && hiddenInput.value;
        }

        if (!variantId) {
          showToast('⚠ Please select a product option first.', 'error');
          return;
        }

        var atcForm = atcBtn.closest('form, .amz-product-form');
        var qtyInput = atcForm && atcForm.querySelector('[name="quantity"], .amz-qty-input');
        var qty = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;

        /* No afterAdd callback = default behaviour: open drawer */
        addToCart(variantId, qty, atcBtn);
        return;
      }

      /* ── BUY NOW ─────────────────────────────────────────
         FIX 2: Buy Now adds to cart then REDIRECTS to /checkout
         Works for: product page btn, product card btn, quick view btn
      ──────────────────────────────────────────────────── */
      var buyBtn = e.target.closest('.amz-buy-now, [data-buy-now]');
      if (buyBtn) {
        e.preventDefault();
        e.stopPropagation();

        /* Resolve variant ID from multiple possible sources */
        var variantId = buyBtn.dataset.variantId;

        if (!variantId) {
          var buyForm = document.getElementById(buyBtn.dataset.formId)
            || buyBtn.closest('form, .amz-product-form, .amz-buybox, #QuickViewContent');
          var hiddenId = buyForm && buyForm.querySelector('[name="id"]');
          variantId = hiddenId && hiddenId.value;
        }

        if (!variantId) {
          showToast('⚠ Please select a product option first.', 'error');
          return;
        }

        var buyForm2 = document.getElementById(buyBtn.dataset.formId)
          || buyBtn.closest('form, .amz-product-form, .amz-buybox, #QuickViewContent');
        var buyQtyInput = buyForm2 && buyForm2.querySelector('[name="quantity"], .amz-qty-input, #QuickViewQty');
        var buyQty = buyQtyInput ? (parseInt(buyQtyInput.value, 10) || 1) : 1;

        /* Visual feedback */
        var origText = buyBtn.textContent.trim();
        buyBtn.disabled = true;
        buyBtn.textContent = 'Processing…';

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ id: parseInt(variantId, 10), quantity: buyQty })
        })
          .then(function (r) {
            if (!r.ok) throw new Error('add_failed');
            /* SUCCESS → redirect to checkout */
            window.location.href = '/checkout';
          })
          .catch(function () {
            buyBtn.disabled = false;
            buyBtn.textContent = origText;
            showToast('⚠ Could not process. Please try again.', 'error');
          });
        return;
      }

      /* ── PROCEED TO CHECKOUT (cart drawer footer button) ─
         Ensure the "Proceed to Buy" link in cart drawer goes to /checkout
      ──────────────────────────────────────────────────── */
      var checkoutBtn = e.target.closest('.amz-checkout-btn, [data-checkout], .cart-drawer__checkout');
      if (checkoutBtn) {
        e.preventDefault();
        window.location.href = '/checkout';
        return;
      }

      /* ── QUICK VIEW TRIGGER ── */
      var qvBtn = e.target.closest('.amz-quickview-btn, [data-quickview-trigger]');
      if (qvBtn) {
        e.preventDefault();
        e.stopPropagation();
        var handle = qvBtn.dataset.productHandle;
        if (handle && window.AmazQV) window.AmazQV.open(handle);
        return;
      }

      /* ── QTY STEPPER (Global) ── */
      var qtyBtn = e.target.closest('.amz-qty-btn');
      if (qtyBtn && qtyBtn.dataset.target) {
        var input = document.getElementById(qtyBtn.dataset.target);
        if (input) {
          var val = parseInt(input.value, 10) || 1;
          if (qtyBtn.classList.contains('amz-qty-plus')) {
            input.value = val + 1;
          } else {
            input.value = Math.max(1, val - 1);
          }
          /* Trigger change event for any listeners */
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
    });

    /* Form submit intercept (main product form — type=submit ATC) */
    document.addEventListener('submit', function (e) {
      var form = e.target.closest('.amz-product-form');
      if (!form) return;
      e.preventDefault();
      e.stopImmediatePropagation();

      var variantInput = form.querySelector('[name="id"]');
      var qtyInput = form.querySelector('[name="quantity"]');

      if (!variantInput || !variantInput.value) {
        showToast('⚠ No variant selected. Please choose product options.', 'error');
        return;
      }

      var variantId = variantInput.value;
      var qty = parseInt((qtyInput && qtyInput.value) || '1', 10) || 1;
      var btn = form.querySelector('[name="add"], .amz-add-to-cart');
      addToCart(variantId, qty, btn);
    });

    /* ESC closes drawer or Quick View */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeDrawer();
        if (window.AmazQV) window.AmazQV.close();
      }
    });
  }

  return {
    open: openDrawer,
    close: closeDrawer,
    addToCart: addToCart,
    loadCart: loadCart,
    showToast: showToast,
    init: initEvents
  };
})();


/* ============================================================
   QUICK VIEW SYSTEM v4.0 — FULLY FUNCTIONAL
   FIX 3: Complete AJAX product loading, variant selection,
   Add to Cart, Buy Now, smooth animations, image gallery
   ============================================================ */
window.AmazQV = (function () {

  var _currentProduct = null;   /* cached product JSON */
  var _currentVariant = null;   /* currently selected variant */
  var _isOpen = false;

  /* ── DOM helpers ── */
  function modal()    { return document.getElementById('QuickViewModal'); }
  function loading()  { return document.getElementById('QuickViewLoading'); }
  function content()  { return document.getElementById('QuickViewContent'); }
  function closeBtn() { return document.getElementById('QuickViewClose'); }

  /* ── Open modal ── */
  function openQuickView(productHandle) {
    if (!productHandle) return;
    var m = modal();
    if (!m) return;

    /* Show modal with loading state */
    _isOpen = true;
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('quickview-is-open');

    var l = loading(); var c = content();
    if (l) l.style.display = 'flex';
    if (c) c.style.display = 'none';

    /* Trap focus */
    setTimeout(function () { if (closeBtn()) closeBtn().focus(); }, 100);

    /* Load product data */
    loadProduct(productHandle);
  }

  /* ── Close modal ── */
  function closeQuickView() {
    if (!_isOpen) return;
    var m = modal();
    if (!m) return;

    _isOpen = false;
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('quickview-is-open');
    _currentProduct = null;
    _currentVariant = null;

    /* Clear content after animation */
    setTimeout(function () {
      var c = content();
      var l = loading();
      if (c) { c.style.display = 'none'; c.innerHTML = ''; }
      if (l) l.style.display = 'flex';
    }, 300);
  }

  /* ── Load Product via AJAX ── */
  function loadProduct(handle) {
    fetch('/products/' + handle + '.js')
      .then(function (r) {
        if (!r.ok) throw new Error('Product not found');
        return r.json();
      })
      .then(function (product) {
        _currentProduct = product;
        _currentVariant = product.variants[0];
        renderProduct(product);
      })
      .catch(function () {
        var l = loading();
        if (l) l.innerHTML = '<p style="color:#cc0c39;text-align:center;padding:20px;">⚠ Could not load product. Please try again.</p>';
      });
  }

  /* ── Render Product HTML ── */
  function renderProduct(product) {
    var l = loading();
    var c = content();
    if (!c) return;

    /* --- Calculate price/discount --- */
    var variant = _currentVariant;
    var price = variant.price;
    var comparePrice = variant.compare_at_price;
    var discount = 0;
    if (comparePrice && comparePrice > price) {
      discount = Math.round((comparePrice - price) / comparePrice * 100);
    }

    /* --- Build images gallery --- */
    var images = product.images || [];
    var getSrc = function(i) { return typeof i === 'string' ? i : (i && i.src ? i.src : ''); };
    var mainImgSrc = images.length > 0 ? getSrc(images[0]) : '';
    /* Use 600px width if possible */
    if (mainImgSrc) mainImgSrc = mainImgSrc.replace(/(\.\w+)(\?|$)/, '_600x600$1$2');

    var thumbsHTML = '';
    if (images.length > 1) {
      thumbsHTML = images.slice(0, 6).map(function (img, idx) {
        var s = getSrc(img);
        var thumbSrc = s.replace(/(\.\w+)(\?|$)/, '_100x100$1$2');
        return '<div class="amz-qv-thumb ' + (idx === 0 ? 'is-active' : '') + '" data-src="' + s.replace(/(\.\w+)(\?|$)/, '_600x600$1$2') + '" data-idx="' + idx + '">' +
          '<img src="' + thumbSrc + '" alt="" loading="lazy" width="60" height="60">' +
          '</div>';
      }).join('');
    }

    /* --- Build variants HTML --- */
    var variantsHTML = '';
    if (!product.has_only_default_variant) {
      var options = product.options_with_values || [];
      /* Fallback: derive from variants */
      if (!options.length && product.options) {
        product.options.forEach(function (optItem, i) {
          var oName = typeof optItem === 'string' ? optItem : (optItem.name || 'Option ' + (i + 1));
          var vals = [];
          product.variants.forEach(function (v) {
            var val = v['option' + (i + 1)];
            if (val && vals.indexOf(val) === -1) vals.push(val);
          });
          options.push({ name: oName, values: vals, position: i + 1 });
        });
      }

      variantsHTML = options.map(function (opt, i) {
        var currentVal = variant['option' + (i + 1)];
        return '<div class="amz-qv-option-group" data-option-index="' + i + '">' +
          '<label class="amz-qv-option-label"><strong>' + opt.name + ':</strong> ' +
          '<span class="amz-qv-option-val">' + (currentVal || '') + '</span></label>' +
          '<div class="amz-qv-option-btns">' +
          opt.values.map(function (val) {
            return '<button type="button" class="amz-qv-opt-btn' + (currentVal === val ? ' is-active' : '') + '" ' +
              'data-option-index="' + i + '" data-value="' + val + '">' + val + '</button>';
          }).join('') +
          '</div></div>';
      }).join('');
    }

    /* --- Build price HTML --- */
    var sym = (window.AmezoConfig && window.AmezoConfig.currencySymbol) || '₹';
    var priceHTML = '<span class="amz-qv-price-main">' + sym + (price / 100).toFixed(2).replace(/\.00$/, '') + '</span>';
    if (comparePrice && comparePrice > price) {
      priceHTML += ' <span class="amz-qv-price-compare">' + sym + (comparePrice / 100).toFixed(2).replace(/\.00$/, '') + '</span>' +
        ' <span class="amz-qv-price-badge">-' + discount + '%</span>';
    }

    /* --- Build rating stars --- */
    var rating = 3.5 + ((product.id % 25) * 0.2);
    var ratingCount = 200 + (product.id % 8000);
    var starsHTML = '';
    for (var s = 1; s <= 5; s++) {
      starsHTML += s <= Math.floor(rating) ? '★' : (s === Math.ceil(rating) && rating % 1 >= 0.3 ? '★' : '☆');
    }

    /* --- Stock --- */
    var stockHTML = variant.available
      ? '<span class="amz-qv-instock">✓ In Stock</span>'
      : '<span class="amz-qv-outstock">✗ Out of Stock</span>';

    /* --- Build full content --- */
    c.innerHTML =
      '<div class="amz-qv-image">' +
        '<img id="QuickViewMainImg" src="' + mainImgSrc + '" alt="' + product.title.replace(/"/g, '&quot;') + '" class="amz-qv-img">' +
        (thumbsHTML ? '<div class="amz-qv-thumbs" id="QuickViewThumbs">' + thumbsHTML + '</div>' : '') +
      '</div>' +
      '<div class="amz-qv-info">' +
        (product.vendor ? '<p class="amz-qv-brand">' + product.vendor + '</p>' : '') +
        '<h2 class="amz-qv-title" id="QuickViewTitle">' + product.title + '</h2>' +
        '<div class="amz-qv-rating"><span style="color:#ff9900;">' + starsHTML + '</span> <span style="color:#007185;font-size:12px;">(' + ratingCount + ')</span></div>' +
        '<div class="amz-qv-price" id="QuickViewPriceBlock">' + priceHTML + '</div>' +
        '<div class="amz-qv-stock" id="QuickViewStock">' + stockHTML + '</div>' +
        (variantsHTML ? '<div class="amz-qv-variants" id="QuickViewVariants">' + variantsHTML + '</div>' : '') +
        '<input type="hidden" id="QuickViewVariantId" value="' + variant.id + '">' +
        '<div class="amz-qv-qty-row">' +
          '<label class="amz-qty-label" for="QuickViewQtyInput">Qty:</label>' +
          '<div class="amz-qty-wrap">' +
            '<button type="button" class="amz-qty-btn amz-qty-minus" data-target="QuickViewQtyInput">−</button>' +
            '<input type="number" id="QuickViewQtyInput" value="1" min="1" max="10" class="amz-qty-input">' +
            '<button type="button" class="amz-qty-btn amz-qty-plus" data-target="QuickViewQtyInput">+</button>' +
          '</div>' +
        '</div>' +
        '<div class="amz-qv-actions">' +
          '<button class="amz-btn amz-btn--atc amz-add-to-cart" id="QvATC" data-variant-id="' + variant.id + '"' + (!variant.available ? ' disabled' : '') + '>' +
            '<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>' +
            '<span class="btn-text">' + (variant.available ? 'Add to Cart' : 'Out of Stock') + '</span>' +
            '<span class="btn-loading" style="display:none;">Adding…</span>' +
          '</button>' +
          '<button class="amz-btn amz-btn--buy amz-buy-now" id="QvBuyNow" data-variant-id="' + variant.id + '"' + (!variant.available ? ' disabled' : '') + '>' +
            'Buy Now' +
          '</button>' +
        '</div>' +
        '<a href="/products/' + product.handle + '" class="amz-qv-full-link">View Full Product Details →</a>' +
        '<div class="amz-qv-trust"><span>🔒 Secure checkout</span><span>🔄 Free returns</span><span>🚚 Free delivery</span></div>' +
      '</div>';

    /* Show content, hide loader */
    if (l) l.style.display = 'none';
    c.style.display = 'flex';

    /* Wire up thumbnail clicks */
    var thumbsCont = document.getElementById('QuickViewThumbs');
    if (thumbsCont) {
      thumbsCont.addEventListener('click', function (e) {
        var thumb = e.target.closest('.amz-qv-thumb');
        if (!thumb) return;
        var mainImg = document.getElementById('QuickViewMainImg');
        if (mainImg) {
          mainImg.style.opacity = '0.4';
          mainImg.src = thumb.dataset.src;
          mainImg.onload = function () { mainImg.style.opacity = '1'; };
        }
        thumbsCont.querySelectorAll('.amz-qv-thumb').forEach(function (t) { t.classList.remove('is-active'); });
        thumb.classList.add('is-active');
      });
    }

    /* Wire up variant option buttons */
    var variantsCont = document.getElementById('QuickViewVariants');
    if (variantsCont) {
      variantsCont.addEventListener('click', function (e) {
        var btn = e.target.closest('.amz-qv-opt-btn');
        if (!btn) return;

        var optIdx = parseInt(btn.dataset.optionIndex, 10);
        var group = variantsCont.querySelectorAll('.amz-qv-option-group')[optIdx];
        if (group) {
          group.querySelectorAll('.amz-qv-opt-btn').forEach(function (b) { b.classList.remove('is-active'); });
          btn.classList.add('is-active');
          var valLabel = group.querySelector('.amz-qv-option-val');
          if (valLabel) valLabel.textContent = btn.dataset.value;
        }

        /* Find matching variant */
        var selectedOpts = [];
        variantsCont.querySelectorAll('.amz-qv-option-group').forEach(function (g) {
          var active = g.querySelector('.amz-qv-opt-btn.is-active');
          selectedOpts.push(active ? active.dataset.value : '');
        });

        var matched = _currentProduct.variants.find(function (v) {
          var opts = [v.option1, v.option2, v.option3].filter(Boolean);
          return selectedOpts.every(function (sel, i) { return opts[i] === sel; });
        });

        if (matched) {
          _currentVariant = matched;
          applyVariantToModal(matched);
        }
      });
    }
  }

  /* ── Apply variant change to Quick View modal ── */
  function applyVariantToModal(variant) {
    var sym = (window.AmezoConfig && window.AmezoConfig.currencySymbol) || '₹';
    var price = variant.price;
    var comparePrice = variant.compare_at_price;
    var discount = (comparePrice && comparePrice > price)
      ? Math.round((comparePrice - price) / comparePrice * 100)
      : 0;

    /* Update price */
    var priceBlock = document.getElementById('QuickViewPriceBlock');
    if (priceBlock) {
      var priceHTML = '<span class="amz-qv-price-main">' + sym + (price / 100).toFixed(2).replace(/\.00$/, '') + '</span>';
      if (comparePrice && comparePrice > price) {
        priceHTML += ' <span class="amz-qv-price-compare">' + sym + (comparePrice / 100).toFixed(2).replace(/\.00$/, '') + '</span>' +
          ' <span class="amz-qv-price-badge">-' + discount + '%</span>';
      }
      priceBlock.innerHTML = priceHTML;
    }

    /* Update stock */
    var stockEl = document.getElementById('QuickViewStock');
    if (stockEl) {
      stockEl.innerHTML = variant.available
        ? '<span class="amz-qv-instock">✓ In Stock</span>'
        : '<span class="amz-qv-outstock">✗ Out of Stock</span>';
    }

    /* Update ATC + Buy Now buttons */
    var atcBtn = document.getElementById('QvATC');
    var buyBtn = document.getElementById('QvBuyNow');
    if (atcBtn) {
      atcBtn.dataset.variantId = variant.id;
      atcBtn.disabled = !variant.available;
      var textEl = atcBtn.querySelector('.btn-text');
      if (textEl) textEl.textContent = variant.available ? 'Add to Cart' : 'Out of Stock';
    }
    if (buyBtn) {
      buyBtn.dataset.variantId = variant.id;
      buyBtn.disabled = !variant.available;
    }

    /* Update hidden variant ID */
    var hiddenId = document.getElementById('QuickViewVariantId');
    if (hiddenId) hiddenId.value = variant.id;

    /* Update image if variant has one */
    if (variant.featured_image && variant.featured_image.src) {
      var mainImg = document.getElementById('QuickViewMainImg');
      if (mainImg) {
        mainImg.style.opacity = '0.4';
        mainImg.src = variant.featured_image.src.replace(/(\.\w+)(\?|$)/, '_600x600$1$2');
        mainImg.onload = function () { mainImg.style.opacity = '1'; };
      }
    }
  }

  /* ── Init event listeners for Quick View ── */
  function init() {
    /* No longer needed as handled by global listener in AmazoDrw */
  }

  return { open: openQuickView, close: closeQuickView, init: init };
})();


/* ============================================================
   1. HEADER - Side Menu / Hamburger
   ============================================================ */
(function () {
  var allBtn = document.getElementById('amz-all-btn');
  var mobileBtn = document.getElementById('amz-mobile-menu-btn');
  var sideMenu = document.getElementById('amz-side-menu');
  var sideOverlay = document.getElementById('amz-side-overlay');
  var sideClose = document.getElementById('amz-side-close');

  function openMenu() {
    if (!sideMenu) return;
    sideMenu.classList.add('open');
    sideMenu.setAttribute('aria-hidden', 'false');
    if (sideOverlay) sideOverlay.classList.add('active');
    document.body.classList.add('menu-open');
    if (sideClose) sideClose.focus();
  }
  function closeMenu() {
    if (!sideMenu) return;
    sideMenu.classList.remove('open');
    sideMenu.setAttribute('aria-hidden', 'true');
    if (sideOverlay) sideOverlay.classList.remove('active');
    document.body.classList.remove('menu-open');
  }

  if (allBtn) allBtn.addEventListener('click', openMenu);
  if (mobileBtn) mobileBtn.addEventListener('click', openMenu);
  if (sideOverlay) sideOverlay.addEventListener('click', closeMenu);
  if (sideClose) sideClose.addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
})();


/* ============================================================
   2. HERO CAROUSEL
   ============================================================ */
(function () {
  var carousel = document.getElementById('amz-hero-carousel');
  if (!carousel) return;
  var slides = document.getElementById('amz-hero-slides');
  var prevBtn = document.getElementById('amz-hero-prev');
  var nextBtn = document.getElementById('amz-hero-next');
  var dotsCont = document.getElementById('amz-hero-dots');
  if (!slides) return;

  var slideItems = slides.querySelectorAll('.amz-hero__slide');
  var total = slideItems.length;
  var current = 0;
  var timer = null;

  if (dotsCont && total > 0) {
    dotsCont.innerHTML = '';
    for (var i = 0; i < total; i++) {
      var dot = document.createElement('span');
      dot.className = 'amz-hero__dot' + (i === 0 ? ' amz-hero__dot--active' : '');
      dot.setAttribute('data-slide', i);
      dot.addEventListener('click', (function (idx) { return function () { goTo(idx); }; })(i));
      dotsCont.appendChild(dot);
    }
  }

  function goTo(idx) {
    if (idx < 0) idx = total - 1;
    if (idx >= total) idx = 0;
    current = idx;
    slides.style.transform = 'translateX(-' + (current * 100) + '%)';
    if (dotsCont) {
      dotsCont.querySelectorAll('.amz-hero__dot').forEach(function (d, i) {
        d.classList.toggle('amz-hero__dot--active', i === current);
      });
    }
  }
  function startAP() { stopAP(); timer = setInterval(function () { goTo(current + 1); }, 5000); }
  function stopAP() { if (timer) clearInterval(timer); }

  if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); startAP(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); startAP(); });
  carousel.addEventListener('mouseenter', stopAP);
  carousel.addEventListener('mouseleave', startAP);

  var tsX = 0;
  carousel.addEventListener('touchstart', function (e) { tsX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', function (e) {
    var diff = tsX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { goTo(diff > 0 ? current + 1 : current - 1); startAP(); }
  });

  if (total > 1) startAP();
})();


/* ============================================================
   3. PRODUCT SLIDERS (Generic)
   ============================================================ */
(function () {
  document.querySelectorAll('[id^="amz-slider-"]').forEach(function (slider) {
    var trackId = slider.id.replace('amz-slider-', 'amz-slider-track-');
    var track = document.getElementById(trackId);
    if (!track) return;
    var wrap = slider.querySelector('.amz-slider-wrap') || slider.closest('.amz-slider-wrap');
    if (!wrap) return;
    var prevBtn = wrap.querySelector('.amz-slider__prev');
    var nextBtn = wrap.querySelector('.amz-slider__next');
    var itemsEl = track.querySelectorAll('.amz-slider__item');
    var itemW = 200;
    var visible = Math.floor(track.parentElement.offsetWidth / itemW) || 5;
    var maxIdx = Math.max(0, itemsEl.length - visible);
    var cur = 0;

    function update() {
      track.style.transform = 'translateX(-' + (cur * itemW) + 'px)';
      if (prevBtn) prevBtn.style.opacity = cur > 0 ? '' : '0';
      if (nextBtn) nextBtn.style.opacity = cur < maxIdx ? '' : '0';
    }
    if (prevBtn) prevBtn.addEventListener('click', function () { cur = Math.max(0, cur - visible); update(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { cur = Math.min(maxIdx, cur + visible); update(); });
    window.addEventListener('resize', function () {
      visible = Math.floor(track.parentElement.offsetWidth / itemW) || 5;
      maxIdx = Math.max(0, itemsEl.length - visible);
      cur = Math.min(cur, maxIdx);
      update();
    });
    update();
  });
})();


/* ============================================================
   4. COUNTDOWN TIMER
   ============================================================ */
(function () {
  var hEl = document.getElementById('amz-timer-h');
  var mEl = document.getElementById('amz-timer-m');
  var sEl = document.getElementById('amz-timer-s');
  if (!hEl || !mEl || !sEl) return;
  var end = new Date(); end.setHours(23, 59, 59, 999);
  function tick() {
    var rem = Math.max(0, end.getTime() - Date.now());
    hEl.textContent = String(Math.floor(rem / 3600000)).padStart(2, '0');
    mEl.textContent = String(Math.floor((rem % 3600000) / 60000)).padStart(2, '0');
    sEl.textContent = String(Math.floor((rem % 60000) / 1000)).padStart(2, '0');
  }
  tick(); setInterval(tick, 1000);
})();


/* ============================================================
   5. STICKY HEADER
   ============================================================ */
(function () {
  var hdr = document.getElementById('amz-header');
  if (!hdr) return;
  window.addEventListener('scroll', function () {
    hdr.style.boxShadow = window.pageYOffset > 80 ? '0 2px 8px rgba(0,0,0,0.35)' : 'none';
  }, { passive: true });
})();


/* ============================================================
   6. QUANTITY STEPPER (product page + quick view)
   ============================================================ */
(function () {
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.amz-qty-btn');
    if (!btn) return;
    /* Support data-target ID or closest .amz-qty-wrap */
    var targetId = btn.dataset.target;
    var input = targetId
      ? document.getElementById(targetId)
      : (btn.closest('.amz-qty-wrap') && btn.closest('.amz-qty-wrap').querySelector('.amz-qty-input'));
    if (!input) return;
    var val = parseInt(input.value) || 1;
    var min = parseInt(input.min) || 1;
    var max = parseInt(input.max) || 99;
    if (btn.classList.contains('amz-qty-minus')) val = Math.max(min, val - 1);
    if (btn.classList.contains('amz-qty-plus'))  val = Math.min(max, val + 1);
    input.value = val;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
})();


/* ============================================================
   7. SEARCH SUGGESTIONS
   Handled by header.liquid's predictive search (#amz-predictive-search)
   — no duplicate dropdown created here.
   ============================================================ */


/* ============================================================
   8. SCROLL TO TOP BUTTON
   ============================================================ */
(function () {
  var btn = document.createElement('button');
  btn.className = 'scroll-top-btn';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>';
  document.body.appendChild(btn);
  window.addEventListener('scroll', function () {
    btn.classList.toggle('visible', window.pageYOffset > 400);
  }, { passive: true });
  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();


/* ============================================================
   9. WISHLIST TOGGLE
   Handled by amazo-cro.js (Wishlist module with key 'amz_wishlist_v2')
   — no duplicate handler here to prevent double-fire and key mismatch.
   ============================================================ */


/* ============================================================
   10. PRODUCT THUMBNAILS SWITCHER (product page)
   ============================================================ */
(function () {
  var thumbCont = document.querySelector('.amz-thumbnails');
  var mainImg = document.getElementById('ProductMainImage');
  if (!thumbCont || !mainImg) return;

  thumbCont.addEventListener('click', function (e) {
    var thumb = e.target.closest('.amz-thumb-wrap');
    if (!thumb) return;
    thumbCont.querySelectorAll('.amz-thumb-wrap').forEach(function (t) { t.classList.remove('is-active'); });
    thumb.classList.add('is-active');
    var src = thumb.dataset.imageSrc;
    if (src) {
      mainImg.style.opacity = '0.5';
      mainImg.src = src;
      mainImg.onload = function () { mainImg.style.opacity = '1'; };
    }
  });
})();


/* ============================================================
   11. PRODUCT TABS
   ============================================================ */
(function () {
  document.querySelectorAll('.amz-tabs-nav').forEach(function (nav) {
    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('.amz-tab-btn');
      if (!btn) return;
      var container = btn.closest('.amz-product-tabs');
      if (!container) return;
      container.querySelectorAll('.amz-tab-btn').forEach(function (b) { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
      container.querySelectorAll('.amz-tab-panel').forEach(function (p) { p.classList.remove('is-active'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      var panel = document.getElementById('tab-' + btn.dataset.tab);
      if (panel) panel.classList.add('is-active');
    });
  });
})();


/* ============================================================
   12. VARIANT SELECTOR (product page)
   ============================================================ */
(function () {
  var form = document.querySelector('.amz-product-form');
  var variants = [];
  var productId = form && form.dataset.productId;

  if (productId) {
    var jsonEl = document.getElementById('ProductJson-' + productId);
    if (jsonEl) {
      try { variants = JSON.parse(jsonEl.textContent).variants || []; } catch (e) { variants = []; }
    }
  }

  function findVariant() {
    var groups = document.querySelectorAll('.amz-option-btns');
    var selectedOptions = [];
    groups.forEach(function (g) {
      var active = g.querySelector('.amz-option-btn.is-active');
      if (active) selectedOptions.push(active.dataset.optionValue);
    });
    if (!selectedOptions.length) return null;
    return variants.find(function (v) {
      var opts = [v.option1, v.option2, v.option3].filter(Boolean);
      return selectedOptions.every(function (sel, idx) { return opts[idx] === sel; });
    }) || null;
  }

  function applyVariant(variant) {
    if (!variant) return;
    var pid = form && form.dataset.productId;

    /* Currency symbol from DOM or config */
    var symText = (window.AmezoConfig && window.AmezoConfig.currencySymbol) || '₹';
    var mainSym = document.querySelector('.amz-price-sym');
    if (mainSym) symText = mainSym.textContent;

    function fmt(cents) {
      return symText + (cents / 100).toFixed(2).replace(/\.00$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /* 1. Hidden variant input */
    var hiddenId = document.getElementById('VariantId-' + pid) || (form && form.querySelector('[name="id"]'));
    if (hiddenId) hiddenId.value = variant.id;

    /* 2. All ATC + Buy Now buttons — update variant ID + availability */
    document.querySelectorAll('.amz-add-to-cart, .amz-buy-now').forEach(function (btn) {
      btn.dataset.variantId = variant.id;
      btn.disabled = !variant.available;
      btn.classList.toggle('is-unavailable', !variant.available);
    });

    /* 3. ATC button text (main product form only) */
    var atcBtn = form && form.querySelector('.amz-add-to-cart .btn-text');
    if (atcBtn) atcBtn.textContent = variant.available ? 'Add to Cart' : 'Out of Stock';

    /* 4. Product info column price */
    var infoPriceEl = document.querySelector('.amz-price-main');
    if (infoPriceEl) {
      infoPriceEl.innerHTML = '<span class="amz-price-sym">' + symText + '</span>' +
        (variant.price / 100).toFixed(2).replace(/\.00$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /* 5. Buybox column price */
    var bbPrice = document.querySelector('.amz-buybox__price');
    if (bbPrice) bbPrice.textContent = fmt(variant.price);

    /* 6. Sticky bar price */
    var stickyPrice = document.querySelector('.amz-sticky-buy__price');
    if (stickyPrice) stickyPrice.textContent = fmt(variant.price);

    /* 7. Compare price + discount badge (info column) */
    var compareRow = document.querySelector('.amz-price-was');
    if (compareRow) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        var saved = variant.compare_at_price - variant.price;
        var disc = Math.round(saved / variant.compare_at_price * 100);
        compareRow.innerHTML = 'List Price: <s>' + fmt(variant.compare_at_price) + '</s>' +
          ' <span class="amz-price-save">Save ' + fmt(saved) + ' (' + disc + '%)</span>';
        compareRow.style.display = '';
      } else {
        compareRow.style.display = 'none';
      }
    }

    /* 8. Buybox compare price row */
    var bbCompare = document.querySelector('.amz-buybox__price + div');
    if (bbCompare) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        var bbDisc = Math.round((variant.compare_at_price - variant.price) / variant.compare_at_price * 100);
        bbCompare.innerHTML = 'List: <s>' + fmt(variant.compare_at_price) + '</s>' +
          ' <span style="color:#cc0c39;"> &nbsp;' + bbDisc + '% off</span>';
        bbCompare.style.display = '';
      } else {
        bbCompare.style.display = 'none';
      }
    }

    /* 9. Buybox stock status */
    var stockEl = document.querySelector('.amz-buybox__stock');
    if (stockEl) {
      stockEl.className = 'amz-buybox__stock';
      if (variant.available) {
        stockEl.classList.add('amz-buybox__stock--in');
        stockEl.textContent = 'In Stock';
      } else {
        stockEl.classList.add('amz-buybox__stock--out');
        stockEl.textContent = 'Currently Unavailable';
      }
    }

    /* 10. Variant image swap */
    if (variant.featured_image && variant.featured_image.src) {
      var mainImg = document.getElementById('ProductMainImage');
      if (mainImg) {
        mainImg.style.opacity = '0.5';
        mainImg.src = variant.featured_image.src;
        mainImg.onload = function () { mainImg.style.opacity = '1'; };
      }
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.amz-option-btn');
    if (!btn) return;

    var group = btn.closest('.amz-option-btns, .amz-option-group');
    if (group) {
      group.querySelectorAll('.amz-option-btn').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
    }

    var optGroup = btn.closest('.amz-option-group');
    if (optGroup) {
      var sel = optGroup.querySelector('.amz-option-selected');
      if (sel) sel.textContent = btn.textContent.trim();
    }

    if (variants.length) {
      var matched = findVariant();
      if (matched) applyVariant(matched);
    }
  });
})();


/* ============================================================
   13. STICKY BUY BAR (mobile product page)
   ============================================================ */
(function () {
  var buyBox = document.getElementById('ProductBuyBox');
  var stickyBar = document.getElementById('StickyBuyBar');
  if (!buyBox || !stickyBar) return;
  window.addEventListener('scroll', function () {
    stickyBar.style.display = buyBox.getBoundingClientRect().bottom < 0 ? 'flex' : 'none';
  }, { passive: true });
})();


/* ============================================================
   14. RECENTLY VIEWED
   ============================================================ */
(function () {
  var KEY = 'amz_recently_viewed'; var MAX = 8;
  function getAll() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function saveAll(l) { localStorage.setItem(KEY, JSON.stringify(l)); }

  if (document.body.classList.contains('template-product')) {
    var handle = window.location.pathname.split('/products/')[1];
    var image = document.querySelector('#ProductMainImage, .amz-main-img');
    var title = document.querySelector('.amz-product-title');
    if (handle && title) {
      var list = getAll().filter(function (p) { return p.handle !== handle; });
      list.unshift({ handle: handle, title: title.textContent.trim(), image: image && image.src, url: window.location.href });
      if (list.length > MAX) list = list.slice(0, MAX);
      saveAll(list);
    }
  }

  var grid = document.getElementById('RecentlyViewedGrid');
  if (!grid) return;
  var currentHandle = window.location.pathname.split('/products/')[1];
  var rvItems = getAll().filter(function (p) { return p.handle !== currentHandle; }).slice(0, 6);
  if (!rvItems.length) {
    var section = grid.closest('.amz-recently-viewed');
    if (section) section.style.display = 'none';
    return;
  }
  grid.innerHTML = rvItems.map(function (item) {
    return '<a href="' + item.url + '" class="amz-rv-item">' +
      '<img src="' + (item.image || '') + '" alt="' + item.title + '" loading="lazy" style="width:80px;height:80px;object-fit:contain;">' +
      '<span class="amz-rv-title">' + item.title + '</span>' +
      '</a>';
  }).join('');
})();


/* ============================================================
   BOOT — Initialize all systems
   ============================================================ */
(function () {
  /* 1. Init cart drawer events */
  window.AmazoDrw.init();

  /* 2. Init Quick View system */
  window.AmazQV.init();

  /* 3. Update cart badge on load */
  fetch('/cart.js')
    .then(function (r) { return r.json(); })
    .then(function (cart) {
      document.querySelectorAll('#amz-cart-count, .amz-cart-count, .cart-count').forEach(function (el) {
        el.textContent = cart.item_count;
        el.style.display = cart.item_count > 0 ? 'flex' : 'none';
      });
    })
    .catch(function () { });

  console.log('[Amazo] Theme JS v4.0 loaded ✓ — Cart Drawer, Buy Now & Quick View FIXED');
})();
=======
/* ============================================================
   AMAZO MAIN JS v4.0 — FULLY FIXED
   FIX 1: Add to Cart → adds product + opens cart drawer
   FIX 2: Buy Now / Proceed to Checkout → redirects to /checkout
   FIX 3: Quick View → fully functional with AJAX product load,
           variants, ATC, Buy Now, smooth open/close animations
   ============================================================ */
'use strict';

/* ============================================================
   GLOBAL CART DRAWER MANAGER
   ============================================================ */
window.AmazoDrw = (function () {

  var FREE_SHIPPING_THRESHOLD = (window.AmezoConfig && window.AmezoConfig.freeShippingThreshold)
    ? window.AmezoConfig.freeShippingThreshold * 100
    : 3500;

  var sym = (window.AmezoConfig && window.AmezoConfig.currencySymbol) || '₹';

  function formatMoney(cents) {
    return sym + (cents / 100).toFixed(2).replace(/\.00$/, '');
  }

  /* ── DOM Refs ── */
  function drawer()   { return document.getElementById('cartDrawer'); }
  function overlay()  { return document.getElementById('cartDrawerOverlay'); }
  function items()    { return document.getElementById('cartDrawerItems'); }
  function empty()    { return document.getElementById('cartDrawerEmpty'); }
  function footer()   { return document.getElementById('cartDrawerFooter'); }
  function subtotal() { return document.getElementById('cartSubtotal'); }
  function countEl()  { return document.getElementById('cartItemCount'); }
  function shpBar()   { return document.getElementById('cartShippingBar'); }
  function shpText()  { return document.getElementById('cartShippingText'); }
  function shpFill()  { return document.getElementById('cartShippingFill'); }

  /* ── Open / Close ── */
  function openDrawer() {
    var d = drawer(); var o = overlay();
    if (!d) return;
    d.classList.add('is-open');
    d.setAttribute('aria-hidden', 'false');
    if (o) { o.classList.add('active'); o.setAttribute('aria-hidden', 'false'); }
    document.body.classList.add('cart-is-open');
    loadCart();
  }

  function closeDrawer() {
    var d = drawer(); var o = overlay();
    if (!d) return;
    d.classList.remove('is-open');
    d.setAttribute('aria-hidden', 'true');
    if (o) { o.classList.remove('active'); o.setAttribute('aria-hidden', 'true'); }
    document.body.classList.remove('cart-is-open');
  }

  /* ── Update header cart count badges ── */
  function updateBadges(count) {
    document.querySelectorAll('#amz-cart-count, .amz-cart-count, .cart-count').forEach(function (el) {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  /* ── Shipping bar ── */
  function updateShippingBar(totalCents) {
    var bar = shpBar(); var txt = shpText(); var fill = shpFill();
    if (!bar) return;
    bar.style.display = 'block';
    if (totalCents >= FREE_SHIPPING_THRESHOLD) {
      if (txt) txt.textContent = '🎉 You qualify for FREE shipping!';
      if (fill) { fill.style.width = '100%'; fill.style.background = 'linear-gradient(90deg,#28a745,#20c997)'; }
    } else {
      var remaining = FREE_SHIPPING_THRESHOLD - totalCents;
      if (txt) txt.textContent = 'Add ' + formatMoney(remaining) + ' more for FREE shipping!';
      if (fill) { fill.style.width = ((totalCents / FREE_SHIPPING_THRESHOLD) * 100).toFixed(1) + '%'; fill.style.background = 'linear-gradient(90deg,#ff9900,#ffd814)'; }
    }
  }

  /* ── Load & Render Cart ── */
  function loadCart() {
    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) { renderCart(cart); })
      .catch(function () { });
  }

  function renderCart(cart) {
    var ftEl = footer(); var empEl = empty(); var itmEl = items();
    if (!itmEl) return;
    updateBadges(cart.item_count);
    updateShippingBar(cart.total_price);

    if (cart.item_count === 0) {
      itmEl.innerHTML = '';
      if (empEl) empEl.style.display = 'flex';
      if (ftEl) ftEl.style.display = 'none';
      return;
    }

    if (empEl) empEl.style.display = 'none';
    if (ftEl) ftEl.style.display = 'block';
    if (subtotal()) subtotal().textContent = formatMoney(cart.total_price);
    if (countEl()) countEl().textContent = cart.item_count;

    itmEl.innerHTML = cart.items.map(function (item) {
      var imgSrc = item.image ? item.image : '';
      var variantTitle = item.variant_title && item.variant_title !== 'Default Title' ? item.variant_title : '';
      return '<div class="cart-drawer-item" data-key="' + item.key + '">' +
        (imgSrc
          ? '<img src="' + imgSrc + '" alt="' + item.title.replace(/"/g, '') + '" class="cart-drawer-item__img" loading="lazy" width="72" height="72">'
          : '<div class="cart-drawer-item__img" style="background:#f3f3f3;"></div>') +
        '<div class="cart-drawer-item__info">' +
          '<div class="cart-drawer-item__title">' + item.product_title + '</div>' +
          (variantTitle ? '<div style="font-size:11px;color:#565959;margin-bottom:2px;">' + variantTitle + '</div>' : '') +
          '<div class="cart-drawer-item__price">' + formatMoney(item.final_line_price) + '</div>' +
          '<div class="cart-drawer-item__qty-row">' +
            '<button class="cart-drawer-item__qty-btn" data-action="decrease" data-key="' + item.key + '" data-qty="' + item.quantity + '" aria-label="Decrease quantity">−</button>' +
            '<span class="cart-drawer-item__qty-num">' + item.quantity + '</span>' +
            '<button class="cart-drawer-item__qty-btn" data-action="increase" data-key="' + item.key + '" data-qty="' + item.quantity + '" aria-label="Increase quantity">+</button>' +
            '<button class="cart-drawer-item__remove" data-key="' + item.key + '" aria-label="Remove item">Delete</button>' +
          '</div>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  /* ── AJAX Add to Cart ─────────────────────────────────────
     FIX 1: After successful add → renders updated cart + opens drawer
  ────────────────────────────────────────────────────────── */
  var _atcInflight = false;

  function addToCart(variantId, qty, btn, afterAdd) {
    if (_atcInflight) return;

    var id = parseInt(variantId, 10);
    if (!id || isNaN(id)) {
      showToast('⚠ Please select a product option first.', 'error');
      return;
    }

    qty = parseInt(qty, 10) || 1;
    _atcInflight = true;

    var textEl = btn && btn.querySelector('.btn-text');
    var loadEl = btn && btn.querySelector('.btn-loading');
    if (btn) btn.disabled = true;
    if (textEl) textEl.style.display = 'none';
    if (loadEl) loadEl.style.display = '';

    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: id, quantity: qty })
    })
      .then(function (r) {
        if (!r.ok) {
          return r.json().then(function (errBody) {
            var msg = (errBody && (errBody.description || errBody.message)) || 'Could not add to cart.';
            throw new Error(msg);
          });
        }
        return r.json();
      })
      .then(function () {
        _atcInflight = false;
        if (btn) btn.disabled = false;
        if (textEl) textEl.style.display = '';
        if (loadEl) loadEl.style.display = 'none';
        showToast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Added to cart!', 'success');
        /* Fetch fresh cart data */
        return fetch('/cart.js').then(function (r) { return r.json(); });
      })
      .then(function (cart) {
        renderCart(cart);
        /* If a custom callback provided (e.g. Buy Now uses redirect) */
        if (typeof afterAdd === 'function') {
          afterAdd(cart);
        } else {
          /* DEFAULT: open cart drawer */
          openDrawer();
        }
        return cart;
      })
      .catch(function (err) {
        _atcInflight = false;
        if (btn) btn.disabled = false;
        if (textEl) textEl.style.display = '';
        if (loadEl) loadEl.style.display = 'none';
        var msg = (err && err.message && err.message !== 'add failed')
          ? '⚠ ' + err.message
          : '⚠ Could not add to cart. Please try again.';
        showToast(msg, 'error');
      });
  }

  /* ── Update item quantity ── */
  function updateQty(key, newQty) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: newQty })
    })
      .then(function (r) { return r.json(); })
      .then(function (cart) { renderCart(cart); })
      .catch(function () { });
  }

  /* ── Toast ── */
  function showToast(msg, type) {
    var toast = document.getElementById('AmzToast');
    if (!toast) return;
    toast.className = 'amz-toast amz-toast--' + (type || 'success') + ' amz-toast--show';
    toast.innerHTML = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.classList.remove('amz-toast--show'); }, 3500);
  }

  /* ── Event Delegation ── */
  function initEvents() {

    /* Cart icon → open drawer */
    document.addEventListener('click', function (e) {
      /* Intercept any link pointing to /cart or having specific classes */
      var cartLink = e.target.closest('a[href="/cart"], a[href^="/cart?"], .amz-header__cart-link, [data-cart-drawer-trigger]');
      
      /* Don't intercept if cart_type is explicitly 'page' (unless triggered via button) */
      if (cartLink && window.AmezoConfig && window.AmezoConfig.cartType === 'page' && !cartLink.classList.contains('amz-header__cart-link')) {
        return; 
      }
      
      /* Only prevent default if it's not the cart drawer checkout/view cart buttons */
      if (cartLink && !cartLink.closest('#cartDrawer')) { 
        e.preventDefault(); 
        openDrawer(); 
        /* Also close side menu if it's open */
        var sideMenu = document.getElementById('amz-side-menu');
        if (sideMenu && sideMenu.classList.contains('open')) {
          sideMenu.classList.remove('open');
          var sideOverlay = document.getElementById('amz-side-overlay');
          if (sideOverlay) sideOverlay.classList.remove('active');
          document.body.classList.remove('menu-open');
        }
        return; 
      }

      /* QUICK VIEW CLOSE */
      if (e.target.closest('#QuickViewOverlay') || e.target.closest('#QuickViewClose')) {
        if (window.AmazQV) window.AmazQV.close();
        return;
      }

      /* Close overlay or close btn (Cart Drawer) */
      if (e.target.closest('#cartDrawerOverlay') || e.target.closest('#cartDrawerClose')) {
        closeDrawer(); return;
      }

      /* Cart qty buttons */
      var qtyBtn = e.target.closest('.cart-drawer-item__qty-btn');
      if (qtyBtn) {
        var key = qtyBtn.dataset.key;
        var current = parseInt(qtyBtn.dataset.qty) || 1;
        var action = qtyBtn.dataset.action;
        var newQty = action === 'increase' ? current + 1 : Math.max(0, current - 1);
        updateQty(key, newQty);
        return;
      }

      /* Remove item */
      var removeBtn = e.target.closest('.cart-drawer-item__remove');
      if (removeBtn) { updateQty(removeBtn.dataset.key, 0); return; }

      /* ── ADD TO CART ─────────────────────────────────────
         FIX 1: Intercept ALL ATC buttons (product cards + product page form)
         After add → renders cart + opens drawer
      ──────────────────────────────────────────────────── */
      var atcBtn = e.target.closest('.amz-add-to-cart, [data-add-to-cart], .product-card__add-btn');
      if (atcBtn) {
        e.preventDefault();
        e.stopPropagation();

        var variantId = atcBtn.dataset.variantId;
        if (!variantId) {
          var form = atcBtn.closest('form, .amz-product-form');
          var hiddenInput = form && form.querySelector('[name="id"]');
          variantId = hiddenInput && hiddenInput.value;
        }

        if (!variantId) {
          showToast('⚠ Please select a product option first.', 'error');
          return;
        }

        var atcForm = atcBtn.closest('form, .amz-product-form');
        var qtyInput = atcForm && atcForm.querySelector('[name="quantity"], .amz-qty-input');
        var qty = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;

        /* No afterAdd callback = default behaviour: open drawer */
        addToCart(variantId, qty, atcBtn);
        return;
      }

      /* ── BUY NOW ─────────────────────────────────────────
         FIX 2: Buy Now adds to cart then REDIRECTS to /checkout
         Works for: product page btn, product card btn, quick view btn
      ──────────────────────────────────────────────────── */
      var buyBtn = e.target.closest('.amz-buy-now, [data-buy-now]');
      if (buyBtn) {
        e.preventDefault();
        e.stopPropagation();

        /* Resolve variant ID from multiple possible sources */
        var variantId = buyBtn.dataset.variantId;

        if (!variantId) {
          var buyForm = document.getElementById(buyBtn.dataset.formId)
            || buyBtn.closest('form, .amz-product-form, .amz-buybox, #QuickViewContent');
          var hiddenId = buyForm && buyForm.querySelector('[name="id"]');
          variantId = hiddenId && hiddenId.value;
        }

        if (!variantId) {
          showToast('⚠ Please select a product option first.', 'error');
          return;
        }

        var buyForm2 = document.getElementById(buyBtn.dataset.formId)
          || buyBtn.closest('form, .amz-product-form, .amz-buybox, #QuickViewContent');
        var buyQtyInput = buyForm2 && buyForm2.querySelector('[name="quantity"], .amz-qty-input, #QuickViewQty');
        var buyQty = buyQtyInput ? (parseInt(buyQtyInput.value, 10) || 1) : 1;

        /* Visual feedback */
        var origText = buyBtn.textContent.trim();
        buyBtn.disabled = true;
        buyBtn.textContent = 'Processing…';

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ id: parseInt(variantId, 10), quantity: buyQty })
        })
          .then(function (r) {
            if (!r.ok) throw new Error('add_failed');
            /* SUCCESS → redirect to checkout */
            window.location.href = '/checkout';
          })
          .catch(function () {
            buyBtn.disabled = false;
            buyBtn.textContent = origText;
            showToast('⚠ Could not process. Please try again.', 'error');
          });
        return;
      }

      /* ── PROCEED TO CHECKOUT (cart drawer footer button) ─
         Ensure the "Proceed to Buy" link in cart drawer goes to /checkout
      ──────────────────────────────────────────────────── */
      var checkoutBtn = e.target.closest('.amz-checkout-btn, [data-checkout], .cart-drawer__checkout');
      if (checkoutBtn) {
        e.preventDefault();
        window.location.href = '/checkout';
        return;
      }

      /* ── QUICK VIEW TRIGGER ── */
      var qvBtn = e.target.closest('.amz-quickview-btn, [data-quickview-trigger]');
      if (qvBtn) {
        e.preventDefault();
        e.stopPropagation();
        var handle = qvBtn.dataset.productHandle;
        if (handle && window.AmazQV) window.AmazQV.open(handle);
        return;
      }

      /* ── QTY STEPPER (Global) ── */
      var qtyBtn = e.target.closest('.amz-qty-btn');
      if (qtyBtn && qtyBtn.dataset.target) {
        var input = document.getElementById(qtyBtn.dataset.target);
        if (input) {
          var val = parseInt(input.value, 10) || 1;
          if (qtyBtn.classList.contains('amz-qty-plus')) {
            input.value = val + 1;
          } else {
            input.value = Math.max(1, val - 1);
          }
          /* Trigger change event for any listeners */
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
    });

    /* Form submit intercept (main product form — type=submit ATC) */
    document.addEventListener('submit', function (e) {
      var form = e.target.closest('.amz-product-form');
      if (!form) return;
      e.preventDefault();
      e.stopImmediatePropagation();

      var variantInput = form.querySelector('[name="id"]');
      var qtyInput = form.querySelector('[name="quantity"]');

      if (!variantInput || !variantInput.value) {
        showToast('⚠ No variant selected. Please choose product options.', 'error');
        return;
      }

      var variantId = variantInput.value;
      var qty = parseInt((qtyInput && qtyInput.value) || '1', 10) || 1;
      var btn = form.querySelector('[name="add"], .amz-add-to-cart');
      addToCart(variantId, qty, btn);
    });

    /* ESC closes drawer or Quick View */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeDrawer();
        if (window.AmazQV) window.AmazQV.close();
      }
    });
  }

  return {
    open: openDrawer,
    close: closeDrawer,
    addToCart: addToCart,
    loadCart: loadCart,
    showToast: showToast,
    init: initEvents
  };
})();


/* ============================================================
   QUICK VIEW SYSTEM v4.0 — FULLY FUNCTIONAL
   FIX 3: Complete AJAX product loading, variant selection,
   Add to Cart, Buy Now, smooth animations, image gallery
   ============================================================ */
window.AmazQV = (function () {

  var _currentProduct = null;   /* cached product JSON */
  var _currentVariant = null;   /* currently selected variant */
  var _isOpen = false;

  /* ── DOM helpers ── */
  function modal()    { return document.getElementById('QuickViewModal'); }
  function loading()  { return document.getElementById('QuickViewLoading'); }
  function content()  { return document.getElementById('QuickViewContent'); }
  function closeBtn() { return document.getElementById('QuickViewClose'); }

  /* ── Open modal ── */
  function openQuickView(productHandle) {
    if (!productHandle) return;
    var m = modal();
    if (!m) return;

    /* Show modal with loading state */
    _isOpen = true;
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('quickview-is-open');

    var l = loading(); var c = content();
    if (l) l.style.display = 'flex';
    if (c) c.style.display = 'none';

    /* Trap focus */
    setTimeout(function () { if (closeBtn()) closeBtn().focus(); }, 100);

    /* Load product data */
    loadProduct(productHandle);
  }

  /* ── Close modal ── */
  function closeQuickView() {
    if (!_isOpen) return;
    var m = modal();
    if (!m) return;

    _isOpen = false;
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('quickview-is-open');
    _currentProduct = null;
    _currentVariant = null;

    /* Clear content after animation */
    setTimeout(function () {
      var c = content();
      var l = loading();
      if (c) { c.style.display = 'none'; c.innerHTML = ''; }
      if (l) l.style.display = 'flex';
    }, 300);
  }

  /* ── Load Product via AJAX ── */
  function loadProduct(handle) {
    fetch('/products/' + handle + '.js')
      .then(function (r) {
        if (!r.ok) throw new Error('Product not found');
        return r.json();
      })
      .then(function (product) {
        _currentProduct = product;
        _currentVariant = product.variants[0];
        renderProduct(product);
      })
      .catch(function () {
        var l = loading();
        if (l) l.innerHTML = '<p style="color:#cc0c39;text-align:center;padding:20px;">⚠ Could not load product. Please try again.</p>';
      });
  }

  /* ── Render Product HTML ── */
  function renderProduct(product) {
    var l = loading();
    var c = content();
    if (!c) return;

    /* --- Calculate price/discount --- */
    var variant = _currentVariant;
    var price = variant.price;
    var comparePrice = variant.compare_at_price;
    var discount = 0;
    if (comparePrice && comparePrice > price) {
      discount = Math.round((comparePrice - price) / comparePrice * 100);
    }

    /* --- Build images gallery --- */
    var images = product.images || [];
    var getSrc = function(i) { return typeof i === 'string' ? i : (i && i.src ? i.src : ''); };
    var mainImgSrc = images.length > 0 ? getSrc(images[0]) : '';
    /* Use 600px width if possible */
    if (mainImgSrc) mainImgSrc = mainImgSrc.replace(/(\.\w+)(\?|$)/, '_600x600$1$2');

    var thumbsHTML = '';
    if (images.length > 1) {
      thumbsHTML = images.slice(0, 6).map(function (img, idx) {
        var s = getSrc(img);
        var thumbSrc = s.replace(/(\.\w+)(\?|$)/, '_100x100$1$2');
        return '<div class="amz-qv-thumb ' + (idx === 0 ? 'is-active' : '') + '" data-src="' + s.replace(/(\.\w+)(\?|$)/, '_600x600$1$2') + '" data-idx="' + idx + '">' +
          '<img src="' + thumbSrc + '" alt="" loading="lazy" width="60" height="60">' +
          '</div>';
      }).join('');
    }

    /* --- Build variants HTML --- */
    var variantsHTML = '';
    if (!product.has_only_default_variant) {
      var options = product.options_with_values || [];
      /* Fallback: derive from variants */
      if (!options.length && product.options) {
        product.options.forEach(function (optItem, i) {
          var oName = typeof optItem === 'string' ? optItem : (optItem.name || 'Option ' + (i + 1));
          var vals = [];
          product.variants.forEach(function (v) {
            var val = v['option' + (i + 1)];
            if (val && vals.indexOf(val) === -1) vals.push(val);
          });
          options.push({ name: oName, values: vals, position: i + 1 });
        });
      }

      variantsHTML = options.map(function (opt, i) {
        var currentVal = variant['option' + (i + 1)];
        return '<div class="amz-qv-option-group" data-option-index="' + i + '">' +
          '<label class="amz-qv-option-label"><strong>' + opt.name + ':</strong> ' +
          '<span class="amz-qv-option-val">' + (currentVal || '') + '</span></label>' +
          '<div class="amz-qv-option-btns">' +
          opt.values.map(function (val) {
            return '<button type="button" class="amz-qv-opt-btn' + (currentVal === val ? ' is-active' : '') + '" ' +
              'data-option-index="' + i + '" data-value="' + val + '">' + val + '</button>';
          }).join('') +
          '</div></div>';
      }).join('');
    }

    /* --- Build price HTML --- */
    var sym = (window.AmezoConfig && window.AmezoConfig.currencySymbol) || '₹';
    var priceHTML = '<span class="amz-qv-price-main">' + sym + (price / 100).toFixed(2).replace(/\.00$/, '') + '</span>';
    if (comparePrice && comparePrice > price) {
      priceHTML += ' <span class="amz-qv-price-compare">' + sym + (comparePrice / 100).toFixed(2).replace(/\.00$/, '') + '</span>' +
        ' <span class="amz-qv-price-badge">-' + discount + '%</span>';
    }

    /* --- Build rating stars --- */
    var rating = 3.5 + ((product.id % 25) * 0.2);
    var ratingCount = 200 + (product.id % 8000);
    var starsHTML = '';
    for (var s = 1; s <= 5; s++) {
      starsHTML += s <= Math.floor(rating) ? '★' : (s === Math.ceil(rating) && rating % 1 >= 0.3 ? '★' : '☆');
    }

    /* --- Stock --- */
    var stockHTML = variant.available
      ? '<span class="amz-qv-instock">✓ In Stock</span>'
      : '<span class="amz-qv-outstock">✗ Out of Stock</span>';

    /* --- Build full content --- */
    c.innerHTML =
      '<div class="amz-qv-image">' +
        '<img id="QuickViewMainImg" src="' + mainImgSrc + '" alt="' + product.title.replace(/"/g, '&quot;') + '" class="amz-qv-img">' +
        (thumbsHTML ? '<div class="amz-qv-thumbs" id="QuickViewThumbs">' + thumbsHTML + '</div>' : '') +
      '</div>' +
      '<div class="amz-qv-info">' +
        (product.vendor ? '<p class="amz-qv-brand">' + product.vendor + '</p>' : '') +
        '<h2 class="amz-qv-title" id="QuickViewTitle">' + product.title + '</h2>' +
        '<div class="amz-qv-rating"><span style="color:#ff9900;">' + starsHTML + '</span> <span style="color:#007185;font-size:12px;">(' + ratingCount + ')</span></div>' +
        '<div class="amz-qv-price" id="QuickViewPriceBlock">' + priceHTML + '</div>' +
        '<div class="amz-qv-stock" id="QuickViewStock">' + stockHTML + '</div>' +
        (variantsHTML ? '<div class="amz-qv-variants" id="QuickViewVariants">' + variantsHTML + '</div>' : '') +
        '<input type="hidden" id="QuickViewVariantId" value="' + variant.id + '">' +
        '<div class="amz-qv-qty-row">' +
          '<label class="amz-qty-label" for="QuickViewQtyInput">Qty:</label>' +
          '<div class="amz-qty-wrap">' +
            '<button type="button" class="amz-qty-btn amz-qty-minus" data-target="QuickViewQtyInput">−</button>' +
            '<input type="number" id="QuickViewQtyInput" value="1" min="1" max="10" class="amz-qty-input">' +
            '<button type="button" class="amz-qty-btn amz-qty-plus" data-target="QuickViewQtyInput">+</button>' +
          '</div>' +
        '</div>' +
        '<div class="amz-qv-actions">' +
          '<button class="amz-btn amz-btn--atc amz-add-to-cart" id="QvATC" data-variant-id="' + variant.id + '"' + (!variant.available ? ' disabled' : '') + '>' +
            '<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>' +
            '<span class="btn-text">' + (variant.available ? 'Add to Cart' : 'Out of Stock') + '</span>' +
            '<span class="btn-loading" style="display:none;">Adding…</span>' +
          '</button>' +
          '<button class="amz-btn amz-btn--buy amz-buy-now" id="QvBuyNow" data-variant-id="' + variant.id + '"' + (!variant.available ? ' disabled' : '') + '>' +
            'Buy Now' +
          '</button>' +
        '</div>' +
        '<a href="/products/' + product.handle + '" class="amz-qv-full-link">View Full Product Details →</a>' +
        '<div class="amz-qv-trust"><span>🔒 Secure checkout</span><span>🔄 Free returns</span><span>🚚 Free delivery</span></div>' +
      '</div>';

    /* Show content, hide loader */
    if (l) l.style.display = 'none';
    c.style.display = 'flex';

    /* Wire up thumbnail clicks */
    var thumbsCont = document.getElementById('QuickViewThumbs');
    if (thumbsCont) {
      thumbsCont.addEventListener('click', function (e) {
        var thumb = e.target.closest('.amz-qv-thumb');
        if (!thumb) return;
        var mainImg = document.getElementById('QuickViewMainImg');
        if (mainImg) {
          mainImg.style.opacity = '0.4';
          mainImg.src = thumb.dataset.src;
          mainImg.onload = function () { mainImg.style.opacity = '1'; };
        }
        thumbsCont.querySelectorAll('.amz-qv-thumb').forEach(function (t) { t.classList.remove('is-active'); });
        thumb.classList.add('is-active');
      });
    }

    /* Wire up variant option buttons */
    var variantsCont = document.getElementById('QuickViewVariants');
    if (variantsCont) {
      variantsCont.addEventListener('click', function (e) {
        var btn = e.target.closest('.amz-qv-opt-btn');
        if (!btn) return;

        var optIdx = parseInt(btn.dataset.optionIndex, 10);
        var group = variantsCont.querySelectorAll('.amz-qv-option-group')[optIdx];
        if (group) {
          group.querySelectorAll('.amz-qv-opt-btn').forEach(function (b) { b.classList.remove('is-active'); });
          btn.classList.add('is-active');
          var valLabel = group.querySelector('.amz-qv-option-val');
          if (valLabel) valLabel.textContent = btn.dataset.value;
        }

        /* Find matching variant */
        var selectedOpts = [];
        variantsCont.querySelectorAll('.amz-qv-option-group').forEach(function (g) {
          var active = g.querySelector('.amz-qv-opt-btn.is-active');
          selectedOpts.push(active ? active.dataset.value : '');
        });

        var matched = _currentProduct.variants.find(function (v) {
          var opts = [v.option1, v.option2, v.option3].filter(Boolean);
          return selectedOpts.every(function (sel, i) { return opts[i] === sel; });
        });

        if (matched) {
          _currentVariant = matched;
          applyVariantToModal(matched);
        }
      });
    }
  }

  /* ── Apply variant change to Quick View modal ── */
  function applyVariantToModal(variant) {
    var sym = (window.AmezoConfig && window.AmezoConfig.currencySymbol) || '₹';
    var price = variant.price;
    var comparePrice = variant.compare_at_price;
    var discount = (comparePrice && comparePrice > price)
      ? Math.round((comparePrice - price) / comparePrice * 100)
      : 0;

    /* Update price */
    var priceBlock = document.getElementById('QuickViewPriceBlock');
    if (priceBlock) {
      var priceHTML = '<span class="amz-qv-price-main">' + sym + (price / 100).toFixed(2).replace(/\.00$/, '') + '</span>';
      if (comparePrice && comparePrice > price) {
        priceHTML += ' <span class="amz-qv-price-compare">' + sym + (comparePrice / 100).toFixed(2).replace(/\.00$/, '') + '</span>' +
          ' <span class="amz-qv-price-badge">-' + discount + '%</span>';
      }
      priceBlock.innerHTML = priceHTML;
    }

    /* Update stock */
    var stockEl = document.getElementById('QuickViewStock');
    if (stockEl) {
      stockEl.innerHTML = variant.available
        ? '<span class="amz-qv-instock">✓ In Stock</span>'
        : '<span class="amz-qv-outstock">✗ Out of Stock</span>';
    }

    /* Update ATC + Buy Now buttons */
    var atcBtn = document.getElementById('QvATC');
    var buyBtn = document.getElementById('QvBuyNow');
    if (atcBtn) {
      atcBtn.dataset.variantId = variant.id;
      atcBtn.disabled = !variant.available;
      var textEl = atcBtn.querySelector('.btn-text');
      if (textEl) textEl.textContent = variant.available ? 'Add to Cart' : 'Out of Stock';
    }
    if (buyBtn) {
      buyBtn.dataset.variantId = variant.id;
      buyBtn.disabled = !variant.available;
    }

    /* Update hidden variant ID */
    var hiddenId = document.getElementById('QuickViewVariantId');
    if (hiddenId) hiddenId.value = variant.id;

    /* Update image if variant has one */
    if (variant.featured_image && variant.featured_image.src) {
      var mainImg = document.getElementById('QuickViewMainImg');
      if (mainImg) {
        mainImg.style.opacity = '0.4';
        mainImg.src = variant.featured_image.src.replace(/(\.\w+)(\?|$)/, '_600x600$1$2');
        mainImg.onload = function () { mainImg.style.opacity = '1'; };
      }
    }
  }

  /* ── Init event listeners for Quick View ── */
  function init() {
    /* No longer needed as handled by global listener in AmazoDrw */
  }

  return { open: openQuickView, close: closeQuickView, init: init };
})();


/* ============================================================
   1. HEADER - Side Menu / Hamburger
   ============================================================ */
(function () {
  var allBtn = document.getElementById('amz-all-btn');
  var mobileBtn = document.getElementById('amz-mobile-menu-btn');
  var sideMenu = document.getElementById('amz-side-menu');
  var sideOverlay = document.getElementById('amz-side-overlay');
  var sideClose = document.getElementById('amz-side-close');

  function openMenu() {
    if (!sideMenu) return;
    sideMenu.classList.add('open');
    sideMenu.setAttribute('aria-hidden', 'false');
    if (sideOverlay) sideOverlay.classList.add('active');
    document.body.classList.add('menu-open');
    if (sideClose) sideClose.focus();
  }
  function closeMenu() {
    if (!sideMenu) return;
    sideMenu.classList.remove('open');
    sideMenu.setAttribute('aria-hidden', 'true');
    if (sideOverlay) sideOverlay.classList.remove('active');
    document.body.classList.remove('menu-open');
  }

  if (allBtn) allBtn.addEventListener('click', openMenu);
  if (mobileBtn) mobileBtn.addEventListener('click', openMenu);
  if (sideOverlay) sideOverlay.addEventListener('click', closeMenu);
  if (sideClose) sideClose.addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
})();


/* ============================================================
   2. HERO CAROUSEL
   ============================================================ */
(function () {
  var carousel = document.getElementById('amz-hero-carousel');
  if (!carousel) return;
  var slides = document.getElementById('amz-hero-slides');
  var prevBtn = document.getElementById('amz-hero-prev');
  var nextBtn = document.getElementById('amz-hero-next');
  var dotsCont = document.getElementById('amz-hero-dots');
  if (!slides) return;

  var slideItems = slides.querySelectorAll('.amz-hero__slide');
  var total = slideItems.length;
  var current = 0;
  var timer = null;

  if (dotsCont && total > 0) {
    dotsCont.innerHTML = '';
    for (var i = 0; i < total; i++) {
      var dot = document.createElement('span');
      dot.className = 'amz-hero__dot' + (i === 0 ? ' amz-hero__dot--active' : '');
      dot.setAttribute('data-slide', i);
      dot.addEventListener('click', (function (idx) { return function () { goTo(idx); }; })(i));
      dotsCont.appendChild(dot);
    }
  }

  function goTo(idx) {
    if (idx < 0) idx = total - 1;
    if (idx >= total) idx = 0;
    current = idx;
    slides.style.transform = 'translateX(-' + (current * 100) + '%)';
    if (dotsCont) {
      dotsCont.querySelectorAll('.amz-hero__dot').forEach(function (d, i) {
        d.classList.toggle('amz-hero__dot--active', i === current);
      });
    }
  }
  function startAP() { stopAP(); timer = setInterval(function () { goTo(current + 1); }, 5000); }
  function stopAP() { if (timer) clearInterval(timer); }

  if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); startAP(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); startAP(); });
  carousel.addEventListener('mouseenter', stopAP);
  carousel.addEventListener('mouseleave', startAP);

  var tsX = 0;
  carousel.addEventListener('touchstart', function (e) { tsX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', function (e) {
    var diff = tsX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { goTo(diff > 0 ? current + 1 : current - 1); startAP(); }
  });

  if (total > 1) startAP();
})();


/* ============================================================
   3. PRODUCT SLIDERS (Generic)
   ============================================================ */
(function () {
  document.querySelectorAll('[id^="amz-slider-"]').forEach(function (slider) {
    var trackId = slider.id.replace('amz-slider-', 'amz-slider-track-');
    var track = document.getElementById(trackId);
    if (!track) return;
    var wrap = slider.querySelector('.amz-slider-wrap') || slider.closest('.amz-slider-wrap');
    if (!wrap) return;
    var prevBtn = wrap.querySelector('.amz-slider__prev');
    var nextBtn = wrap.querySelector('.amz-slider__next');
    var itemsEl = track.querySelectorAll('.amz-slider__item');
    var itemW = 200;
    var visible = Math.floor(track.parentElement.offsetWidth / itemW) || 5;
    var maxIdx = Math.max(0, itemsEl.length - visible);
    var cur = 0;

    function update() {
      track.style.transform = 'translateX(-' + (cur * itemW) + 'px)';
      if (prevBtn) prevBtn.style.opacity = cur > 0 ? '' : '0';
      if (nextBtn) nextBtn.style.opacity = cur < maxIdx ? '' : '0';
    }
    if (prevBtn) prevBtn.addEventListener('click', function () { cur = Math.max(0, cur - visible); update(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { cur = Math.min(maxIdx, cur + visible); update(); });
    window.addEventListener('resize', function () {
      visible = Math.floor(track.parentElement.offsetWidth / itemW) || 5;
      maxIdx = Math.max(0, itemsEl.length - visible);
      cur = Math.min(cur, maxIdx);
      update();
    });
    update();
  });
})();


/* ============================================================
   4. COUNTDOWN TIMER
   ============================================================ */
(function () {
  var hEl = document.getElementById('amz-timer-h');
  var mEl = document.getElementById('amz-timer-m');
  var sEl = document.getElementById('amz-timer-s');
  if (!hEl || !mEl || !sEl) return;
  var end = new Date(); end.setHours(23, 59, 59, 999);
  function tick() {
    var rem = Math.max(0, end.getTime() - Date.now());
    hEl.textContent = String(Math.floor(rem / 3600000)).padStart(2, '0');
    mEl.textContent = String(Math.floor((rem % 3600000) / 60000)).padStart(2, '0');
    sEl.textContent = String(Math.floor((rem % 60000) / 1000)).padStart(2, '0');
  }
  tick(); setInterval(tick, 1000);
})();


/* ============================================================
   5. STICKY HEADER
   ============================================================ */
(function () {
  var hdr = document.getElementById('amz-header');
  if (!hdr) return;
  window.addEventListener('scroll', function () {
    hdr.style.boxShadow = window.pageYOffset > 80 ? '0 2px 8px rgba(0,0,0,0.35)' : 'none';
  }, { passive: true });
})();


/* ============================================================
   6. QUANTITY STEPPER (product page + quick view)
   ============================================================ */
(function () {
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.amz-qty-btn');
    if (!btn) return;
    /* Support data-target ID or closest .amz-qty-wrap */
    var targetId = btn.dataset.target;
    var input = targetId
      ? document.getElementById(targetId)
      : (btn.closest('.amz-qty-wrap') && btn.closest('.amz-qty-wrap').querySelector('.amz-qty-input'));
    if (!input) return;
    var val = parseInt(input.value) || 1;
    var min = parseInt(input.min) || 1;
    var max = parseInt(input.max) || 99;
    if (btn.classList.contains('amz-qty-minus')) val = Math.max(min, val - 1);
    if (btn.classList.contains('amz-qty-plus'))  val = Math.min(max, val + 1);
    input.value = val;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
})();


/* ============================================================
   7. SEARCH SUGGESTIONS
   Handled by header.liquid's predictive search (#amz-predictive-search)
   — no duplicate dropdown created here.
   ============================================================ */


/* ============================================================
   8. SCROLL TO TOP BUTTON
   ============================================================ */
(function () {
  var btn = document.createElement('button');
  btn.className = 'scroll-top-btn';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>';
  document.body.appendChild(btn);
  window.addEventListener('scroll', function () {
    btn.classList.toggle('visible', window.pageYOffset > 400);
  }, { passive: true });
  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();


/* ============================================================
   9. WISHLIST TOGGLE
   Handled by amazo-cro.js (Wishlist module with key 'amz_wishlist_v2')
   — no duplicate handler here to prevent double-fire and key mismatch.
   ============================================================ */


/* ============================================================
   10. PRODUCT THUMBNAILS SWITCHER (product page)
   ============================================================ */
(function () {
  var thumbCont = document.querySelector('.amz-thumbnails');
  var mainImg = document.getElementById('ProductMainImage');
  if (!thumbCont || !mainImg) return;

  thumbCont.addEventListener('click', function (e) {
    var thumb = e.target.closest('.amz-thumb-wrap');
    if (!thumb) return;
    thumbCont.querySelectorAll('.amz-thumb-wrap').forEach(function (t) { t.classList.remove('is-active'); });
    thumb.classList.add('is-active');
    var src = thumb.dataset.imageSrc;
    if (src) {
      mainImg.style.opacity = '0.5';
      mainImg.src = src;
      mainImg.onload = function () { mainImg.style.opacity = '1'; };
    }
  });
})();


/* ============================================================
   11. PRODUCT TABS
   ============================================================ */
(function () {
  document.querySelectorAll('.amz-tabs-nav').forEach(function (nav) {
    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('.amz-tab-btn');
      if (!btn) return;
      var container = btn.closest('.amz-product-tabs');
      if (!container) return;
      container.querySelectorAll('.amz-tab-btn').forEach(function (b) { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
      container.querySelectorAll('.amz-tab-panel').forEach(function (p) { p.classList.remove('is-active'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      var panel = document.getElementById('tab-' + btn.dataset.tab);
      if (panel) panel.classList.add('is-active');
    });
  });
})();


/* ============================================================
   12. VARIANT SELECTOR (product page)
   ============================================================ */
(function () {
  var form = document.querySelector('.amz-product-form');
  var variants = [];
  var productId = form && form.dataset.productId;

  if (productId) {
    var jsonEl = document.getElementById('ProductJson-' + productId);
    if (jsonEl) {
      try { variants = JSON.parse(jsonEl.textContent).variants || []; } catch (e) { variants = []; }
    }
  }

  function findVariant() {
    var groups = document.querySelectorAll('.amz-option-btns');
    var selectedOptions = [];
    groups.forEach(function (g) {
      var active = g.querySelector('.amz-option-btn.is-active');
      if (active) selectedOptions.push(active.dataset.optionValue);
    });
    if (!selectedOptions.length) return null;
    return variants.find(function (v) {
      var opts = [v.option1, v.option2, v.option3].filter(Boolean);
      return selectedOptions.every(function (sel, idx) { return opts[idx] === sel; });
    }) || null;
  }

  function applyVariant(variant) {
    if (!variant) return;
    var pid = form && form.dataset.productId;

    /* Currency symbol from DOM or config */
    var symText = (window.AmezoConfig && window.AmezoConfig.currencySymbol) || '₹';
    var mainSym = document.querySelector('.amz-price-sym');
    if (mainSym) symText = mainSym.textContent;

    function fmt(cents) {
      return symText + (cents / 100).toFixed(2).replace(/\.00$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /* 1. Hidden variant input */
    var hiddenId = document.getElementById('VariantId-' + pid) || (form && form.querySelector('[name="id"]'));
    if (hiddenId) hiddenId.value = variant.id;

    /* 2. All ATC + Buy Now buttons — update variant ID + availability */
    document.querySelectorAll('.amz-add-to-cart, .amz-buy-now').forEach(function (btn) {
      btn.dataset.variantId = variant.id;
      btn.disabled = !variant.available;
      btn.classList.toggle('is-unavailable', !variant.available);
    });

    /* 3. ATC button text (main product form only) */
    var atcBtn = form && form.querySelector('.amz-add-to-cart .btn-text');
    if (atcBtn) atcBtn.textContent = variant.available ? 'Add to Cart' : 'Out of Stock';

    /* 4. Product info column price */
    var infoPriceEl = document.querySelector('.amz-price-main');
    if (infoPriceEl) {
      infoPriceEl.innerHTML = '<span class="amz-price-sym">' + symText + '</span>' +
        (variant.price / 100).toFixed(2).replace(/\.00$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /* 5. Buybox column price */
    var bbPrice = document.querySelector('.amz-buybox__price');
    if (bbPrice) bbPrice.textContent = fmt(variant.price);

    /* 6. Sticky bar price */
    var stickyPrice = document.querySelector('.amz-sticky-buy__price');
    if (stickyPrice) stickyPrice.textContent = fmt(variant.price);

    /* 7. Compare price + discount badge (info column) */
    var compareRow = document.querySelector('.amz-price-was');
    if (compareRow) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        var saved = variant.compare_at_price - variant.price;
        var disc = Math.round(saved / variant.compare_at_price * 100);
        compareRow.innerHTML = 'List Price: <s>' + fmt(variant.compare_at_price) + '</s>' +
          ' <span class="amz-price-save">Save ' + fmt(saved) + ' (' + disc + '%)</span>';
        compareRow.style.display = '';
      } else {
        compareRow.style.display = 'none';
      }
    }

    /* 8. Buybox compare price row */
    var bbCompare = document.querySelector('.amz-buybox__price + div');
    if (bbCompare) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        var bbDisc = Math.round((variant.compare_at_price - variant.price) / variant.compare_at_price * 100);
        bbCompare.innerHTML = 'List: <s>' + fmt(variant.compare_at_price) + '</s>' +
          ' <span style="color:#cc0c39;"> &nbsp;' + bbDisc + '% off</span>';
        bbCompare.style.display = '';
      } else {
        bbCompare.style.display = 'none';
      }
    }

    /* 9. Buybox stock status */
    var stockEl = document.querySelector('.amz-buybox__stock');
    if (stockEl) {
      stockEl.className = 'amz-buybox__stock';
      if (variant.available) {
        stockEl.classList.add('amz-buybox__stock--in');
        stockEl.textContent = 'In Stock';
      } else {
        stockEl.classList.add('amz-buybox__stock--out');
        stockEl.textContent = 'Currently Unavailable';
      }
    }

    /* 10. Variant image swap */
    if (variant.featured_image && variant.featured_image.src) {
      var mainImg = document.getElementById('ProductMainImage');
      if (mainImg) {
        mainImg.style.opacity = '0.5';
        mainImg.src = variant.featured_image.src;
        mainImg.onload = function () { mainImg.style.opacity = '1'; };
      }
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.amz-option-btn');
    if (!btn) return;

    var group = btn.closest('.amz-option-btns, .amz-option-group');
    if (group) {
      group.querySelectorAll('.amz-option-btn').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
    }

    var optGroup = btn.closest('.amz-option-group');
    if (optGroup) {
      var sel = optGroup.querySelector('.amz-option-selected');
      if (sel) sel.textContent = btn.textContent.trim();
    }

    if (variants.length) {
      var matched = findVariant();
      if (matched) applyVariant(matched);
    }
  });
})();


/* ============================================================
   13. STICKY BUY BAR (mobile product page)
   ============================================================ */
(function () {
  var buyBox = document.getElementById('ProductBuyBox');
  var stickyBar = document.getElementById('StickyBuyBar');
  if (!buyBox || !stickyBar) return;
  window.addEventListener('scroll', function () {
    stickyBar.style.display = buyBox.getBoundingClientRect().bottom < 0 ? 'flex' : 'none';
  }, { passive: true });
})();


/* ============================================================
   14. RECENTLY VIEWED
   ============================================================ */
(function () {
  var KEY = 'amz_recently_viewed'; var MAX = 8;
  function getAll() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function saveAll(l) { localStorage.setItem(KEY, JSON.stringify(l)); }

  if (document.body.classList.contains('template-product')) {
    var handle = window.location.pathname.split('/products/')[1];
    var image = document.querySelector('#ProductMainImage, .amz-main-img');
    var title = document.querySelector('.amz-product-title');
    if (handle && title) {
      var list = getAll().filter(function (p) { return p.handle !== handle; });
      list.unshift({ handle: handle, title: title.textContent.trim(), image: image && image.src, url: window.location.href });
      if (list.length > MAX) list = list.slice(0, MAX);
      saveAll(list);
    }
  }

  var grid = document.getElementById('RecentlyViewedGrid');
  if (!grid) return;
  var currentHandle = window.location.pathname.split('/products/')[1];
  var rvItems = getAll().filter(function (p) { return p.handle !== currentHandle; }).slice(0, 6);
  if (!rvItems.length) {
    var section = grid.closest('.amz-recently-viewed');
    if (section) section.style.display = 'none';
    return;
  }
  grid.innerHTML = rvItems.map(function (item) {
    return '<a href="' + item.url + '" class="amz-rv-item">' +
      '<img src="' + (item.image || '') + '" alt="' + item.title + '" loading="lazy" style="width:80px;height:80px;object-fit:contain;">' +
      '<span class="amz-rv-title">' + item.title + '</span>' +
      '</a>';
  }).join('');
})();


/* ============================================================
   BOOT — Initialize all systems
   ============================================================ */
(function () {
  /* 1. Init cart drawer events */
  window.AmazoDrw.init();

  /* 2. Init Quick View system */
  window.AmazQV.init();

  /* 3. Update cart badge on load */
  fetch('/cart.js')
    .then(function (r) { return r.json(); })
    .then(function (cart) {
      document.querySelectorAll('#amz-cart-count, .amz-cart-count, .cart-count').forEach(function (el) {
        el.textContent = cart.item_count;
        el.style.display = cart.item_count > 0 ? 'flex' : 'none';
      });
    })
    .catch(function () { });

  console.log('[Amazo] Theme JS v4.0 loaded ✓ — Cart Drawer, Buy Now & Quick View FIXED');
})();
>>>>>>> 707699fb9e9b8deeed5de1f597c064315e3ea5f2
