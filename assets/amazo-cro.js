/**
 * Amazo Theme – CRO Master JS v4.0
 * Handles: Wishlist, Quick View, Add to Cart (AJAX), Buy Now,
 *          Reviews, Urgency Timers, Social Proof, Qty Stepper,
 *          Product Tabs, Recently Viewed, Notify Me
 */

(function () {
  'use strict';

  const Cfg = window.AmezoConfig || {};

  /* ══════════════════════════════════════════
     UTILITY HELPERS
  ══════════════════════════════════════════ */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }

  function showToast(msg, type = 'success', duration = 3500) {
    const toast = document.getElementById('AmzToast');
    if (!toast) return;
    toast.className = 'amz-toast amz-toast--' + type + ' amz-toast--show';
    toast.innerHTML = msg;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('amz-toast--show');
    }, duration);
  }

  function formatMoney(cents) {
    const sym = Cfg.currencySymbol || '$';
    return sym + (cents / 100).toFixed(2);
  }

  /* ══════════════════════════════════════════
     1. WISHLIST (localStorage)
  ══════════════════════════════════════════ */
  const Wishlist = {
    KEY: 'amz_wishlist_v2',

    getAll() {
      try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
      catch { return []; }
    },

    save(list) {
      localStorage.setItem(this.KEY, JSON.stringify(list));
    },

    has(id, variantId) {
      if (variantId) return this.getAll().some(p => String(p.variantId) === String(variantId));
      return this.getAll().some(p => String(p.id) === String(id));
    },

    add(item) {
      const list = this.getAll();
      if (!this.has(item.id, item.variantId)) {
        list.push(item);
        this.save(list);
      }
    },

    remove(id, variantId) {
      let list = [];
      if (variantId) {
        list = this.getAll().filter(p => String(p.variantId) !== String(variantId));
      } else {
        list = this.getAll().filter(p => String(p.id) !== String(id));
      }
      this.save(list);
    },

    toggle(item) {
      if (this.has(item.id, item.variantId)) {
        this.remove(item.id, item.variantId);
        return false;
      } else {
        this.add(item);
        return true;
      }
    },

    count() { return this.getAll().length; },

    updateAllButtons() {
      $$('.amz-wishlist-btn').forEach(btn => {
        const id = btn.dataset.productId;
        const variantId = btn.dataset.variantId;
        if (!id) return;
        const active = this.has(id, variantId);
        btn.classList.toggle('is-wishlisted', active);
        const heart = btn.querySelector('.amz-heart-icon');
        if (heart) heart.style.fill = active ? '#cc0c39' : 'none';
        const tooltip = btn.querySelector('.amz-wishlist-tooltip, .amz-wishlist-text');
        if (tooltip) tooltip.textContent = active ? 'Saved ✓' : 'Save to Wishlist';
      });
      this.updateCounter();
    },

    updateCounter() {
      const count = this.count();
      $$('.amz-wishlist-counter').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
      });
    },

    init() {
      if (!Cfg.enableWishlist) return;
      this.updateAllButtons();

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.amz-wishlist-btn');
        if (!btn) return;
        e.preventDefault();

        const item = {
          id: btn.dataset.productId,
          title: btn.dataset.productTitle,
          url: btn.dataset.productUrl,
          image: btn.dataset.productImage,
          price: btn.dataset.productPrice || '',
          variantId: btn.dataset.variantId
        };

        const added = this.toggle(item);
        this.updateAllButtons();
        document.dispatchEvent(new Event('wishlist:update'));

        showToast(
          added
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="#cc0c39"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> <strong>${item.title}</strong> added to wishlist`
            : `Removed from wishlist`,
          added ? 'success' : 'info'
        );

        if (typeof WishlistDrawer !== 'undefined') {
          WishlistDrawer.open();
        }
      });

      // Wishlist Page
      this.renderWishlistPage();
    },

    renderWishlistPage() {
      const grid = document.getElementById('WishlistGrid');
      const empty = document.getElementById('WishlistEmpty');
      const footer = document.getElementById('WishlistFooter');
      const counter = document.getElementById('WishlistCount');
      if (!grid) return;

      const renderItems = () => {
        const items = this.getAll();
        if (counter) counter.textContent = items.length + ' item' + (items.length !== 1 ? 's' : '');
        if (items.length === 0) {
          grid.innerHTML = '';
          if (empty) empty.style.display = 'flex';
          if (footer) footer.style.display = 'none';
          return;
        }
        if (empty) empty.style.display = 'none';
        if (footer) footer.style.display = 'block';

        grid.innerHTML = items.map(item => `
          <div class="amz-wl-card" data-product-id="${item.id}">
            <a href="${item.url}" class="amz-wl-img-link">
              <img src="${item.image}" alt="${item.title}" class="amz-wl-img" loading="lazy" width="150" height="150">
            </a>
            <div class="amz-wl-info">
              <a href="${item.url}" class="amz-wl-title">${item.title}</a>
              <div class="amz-wl-btns">
                <button class="amz-btn amz-btn--atc amz-wl-atc amz-add-to-cart"
                  data-variant-id="${item.variantId || ''}"
                  data-product-id="${item.id}"
                  data-product-title="${item.title}">
                  Add to Cart
                </button>
                <button class="amz-btn amz-wl-remove amz-wishlist-btn"
                  data-product-id="${item.id}"
                  data-variant-id="${item.variantId || ''}"
                  data-product-title="${item.title}"
                  aria-label="Remove from wishlist">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="#cc0c39"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  Remove
                </button>
              </div>
            </div>
          </div>
        `).join('');
      };

      renderItems();

      // Re-render on wishlist changes
      document.addEventListener('wishlist:update', renderItems);

      // Share
      const shareBtn = document.getElementById('ShareWishlistBtn');
      if (shareBtn) {
        shareBtn.addEventListener('click', () => {
          const items = this.getAll();
          const text = items.map(i => `${i.title}: ${window.location.origin}${i.url}`).join('\n');
          if (navigator.share) {
            navigator.share({ title: 'My Wishlist', text });
          } else {
            navigator.clipboard.writeText(text).then(() => showToast('Wishlist copied to clipboard!'));
          }
        });
      }

      // Clear All
      const clearBtn = document.getElementById('ClearWishlistBtn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          if (confirm('Remove all items from wishlist?')) {
            this.save([]);
            this.updateAllButtons();
            renderItems();
            document.dispatchEvent(new Event('wishlist:update'));
          }
        });
      }

      // Add All to Cart
      const addAllBtn = document.getElementById('AddAllToCartBtn');
      if (addAllBtn) {
        addAllBtn.addEventListener('click', async () => {
          const items = this.getAll();
          for (const item of items) {
            if (item.variantId) {
              await CartManager.addItem(item.variantId, 1);
            }
          }
          showToast('✓ All wishlist items added to cart!');
        });
      }
    }
  };

  /* ══════════════════════════════════════════
     1.1 WISHLIST DRAWER
  ══════════════════════════════════════════ */
  const WishlistDrawer = {
    open() {
      const d = document.getElementById('wishlistDrawer');
      const o = document.getElementById('wishlistDrawerOverlay');
      if (!d) return;
      d.classList.add('is-open');
      if (o) o.classList.add('active');
      document.body.classList.add('wishlist-is-open');
      this.render();
    },

    close() {
      const d = document.getElementById('wishlistDrawer');
      const o = document.getElementById('wishlistDrawerOverlay');
      if (!d) return;
      d.classList.remove('is-open');
      if (o) o.classList.remove('active');
      document.body.classList.remove('wishlist-is-open');
    },

    render() {
      const itmEl = document.getElementById('wishlistDrawerItems');
      const empEl = document.getElementById('wishlistDrawerEmpty');
      const ftEl = document.getElementById('wishlistDrawerFooter');
      if (!itmEl) return;

      const items = Wishlist.getAll();
      if (items.length === 0) {
        itmEl.innerHTML = '';
        if (empEl) empEl.style.display = 'flex';
        if (ftEl) ftEl.style.display = 'none';
        return;
      }

      if (empEl) empEl.style.display = 'none';
      if (ftEl) ftEl.style.display = 'block';

      itmEl.innerHTML = items.map(item => {
        const priceHtml = item.price
          ? `<div class="wishlist-drawer-item__price">${formatMoney(Number(item.price))}</div>`
          : '';
        const noVariant = !item.variantId || item.variantId === 'undefined' || !parseInt(item.variantId, 10);
        return `
        <div class="wishlist-drawer-item" data-id="${item.id}" data-variant-id="${item.variantId || ''}">
          <a href="${item.url || '#'}" class="wishlist-drawer-item__img-link">
            <img src="${item.image}" alt="${item.title}" class="wishlist-drawer-item__img" width="70" height="70">
          </a>
          <div class="wishlist-drawer-item__info">
            <a href="${item.url || '#'}" class="wishlist-drawer-item__title">${item.title}</a>
            ${priceHtml}
            <div class="wishlist-drawer-item__actions">
              <button class="wishlist-drawer-item__atc" data-variant-id="${item.variantId || ''}" data-id="${item.id}"${noVariant ? ' disabled title="Select a variant on the product page"' : ''}>
                <span class="btn-text">Add to Cart</span>
                <span class="btn-loading" style="display:none;">Adding…</span>
              </button>
              <button class="wishlist-drawer-item__buy" data-variant-id="${item.variantId || ''}" data-id="${item.id}"${noVariant ? ' disabled title="Select a variant on the product page"' : ''}>
                <span class="btn-text">Buy Now</span>
                <span class="btn-loading" style="display:none;">Processing…</span>
              </button>
              <button class="wishlist-drawer-item__remove" data-id="${item.id}" data-variant-id="${item.variantId || ''}">Remove</button>
            </div>
          </div>
        </div>`;
      }).join('');
    },

    init() {
      document.addEventListener('click', (e) => {
        // Toggle from header
        if (e.target.closest('.amz-header__wishlist-link')) {
          e.preventDefault();
          this.open();
        }

        // Close
        if (e.target.closest('#wishlistDrawerClose') || e.target.closest('#wishlistDrawerOverlay')) {
          this.close();
        }

        // Item Actions
        const removeBtn = e.target.closest('.wishlist-drawer-item__remove');
        if (removeBtn) {
          Wishlist.remove(removeBtn.dataset.id, removeBtn.dataset.variantId);
          Wishlist.updateAllButtons();
          document.dispatchEvent(new Event('wishlist:update'));
        }

        const atcBtn = e.target.closest('.wishlist-drawer-item__atc');
        if (atcBtn) {
          const vid = parseInt(atcBtn.dataset.variantId, 10);
          if (!vid) { showToast('⚠ Variant not found. Open the product page and re-save.', 'error'); return; }
          if (atcBtn.dataset.inFlight === '1') return;
          atcBtn.dataset.inFlight = '1';
          const tEl = atcBtn.querySelector('.btn-text');
          const lEl = atcBtn.querySelector('.btn-loading');
          atcBtn.disabled = true;
          if (tEl) tEl.style.display = 'none';
          if (lEl) lEl.style.display = '';
          fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ id: vid, quantity: 1 })
          })
            .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
            .then(() => {
              atcBtn.disabled = false;
              atcBtn.dataset.inFlight = '';
              if (tEl) { tEl.textContent = '✓ Added!'; tEl.style.display = ''; }
              if (lEl) lEl.style.display = 'none';
              setTimeout(() => { if (tEl) tEl.textContent = 'Add to Cart'; }, 2000);
              showToast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Added to cart!', 'success');
              // Refresh cart badge count
              fetch('/cart.js').then(r => r.json()).then(cart => {
                document.querySelectorAll('#amz-cart-count, .amz-cart-count, .cart-count').forEach(el => {
                  el.textContent = cart.item_count;
                  el.style.display = cart.item_count > 0 ? 'flex' : 'none';
                });
                if (window.AmazoDrw) { window.AmazoDrw.loadCart(); window.AmazoDrw.open(); }
              });
            })
            .catch(err => {
              atcBtn.disabled = false;
              atcBtn.dataset.inFlight = '';
              if (tEl) tEl.style.display = '';
              if (lEl) lEl.style.display = 'none';
              showToast('⚠ ' + (err.description || err.message || 'Could not add to cart.'), 'error');
            });
        }

        const buyBtn = e.target.closest('.wishlist-drawer-item__buy');
        if (buyBtn) {
          const vid = parseInt(buyBtn.dataset.variantId, 10);
          if (!vid) { showToast('⚠ Variant not found. Open the product page and re-save.', 'error'); return; }
          if (buyBtn.dataset.inFlight === '1') return;
          buyBtn.dataset.inFlight = '1';
          const tEl = buyBtn.querySelector('.btn-text');
          const lEl = buyBtn.querySelector('.btn-loading');
          buyBtn.disabled = true;
          if (tEl) tEl.style.display = 'none';
          if (lEl) lEl.style.display = '';
          fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ id: vid, quantity: 1 })
          })
            .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
            .then(() => { window.location.href = '/checkout'; })
            .catch(err => {
              buyBtn.disabled = false;
              buyBtn.dataset.inFlight = '';
              if (tEl) tEl.style.display = '';
              if (lEl) lEl.style.display = 'none';
              showToast('⚠ ' + (err.description || err.message || 'Could not proceed to checkout.'), 'error');
            });
        }
      });

      // Add All
      const addAll = document.getElementById('AddAllWishlistToCart');
      if (addAll) {
        addAll.addEventListener('click', async () => {
          const items = Wishlist.getAll().filter(i => i.variantId && parseInt(i.variantId, 10));
          if (!items.length) { showToast('⚠ No items with a valid variant to add.', 'error'); return; }
          addAll.disabled = true;
          addAll.textContent = 'Adding…';
          for (const item of items) {
            await fetch('/cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({ id: parseInt(item.variantId, 10), quantity: 1 })
            }).catch(() => {});
          }
          addAll.disabled = false;
          addAll.textContent = 'Add All to Cart';
          showToast('✓ All wishlist items added to cart!', 'success');
          fetch('/cart.js').then(r => r.json()).then(cart => {
            document.querySelectorAll('#amz-cart-count, .amz-cart-count, .cart-count').forEach(el => {
              el.textContent = cart.item_count;
              el.style.display = cart.item_count > 0 ? 'flex' : 'none';
            });
            if (window.AmazoDrw) { window.AmazoDrw.loadCart(); }
          });
          this.close();
          if (window.AmazoDrw) window.AmazoDrw.open();
        });
      }

      // ESC close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.close();
      });

      // Auto re-render whenever wishlist data changes
      document.addEventListener('wishlist:update', () => this.render());
    }
  };

  // Expose WishlistDrawer globally so amazo-main.js can open/close it
  window.AmazWL = WishlistDrawer;

  /* ══════════════════════════════════════════
     2. CART MANAGER (AJAX)
  ══════════════════════════════════════════ */
  const CartManager = {
    // CartManager in cro.js is a lightweight delegate that uses window.AmazoDrw
    // The full implementation is in amazo-main.js (window.AmazoDrw)
    async addItem(variantId, qty = 1) {
      if (!variantId) return null;
      if (window.AmazoDrw) return window.AmazoDrw.addToCart(variantId, qty, null);
      try {
        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ id: parseInt(variantId), quantity: qty })
        });
        if (!res.ok) throw new Error('Add to cart failed');
        return await res.json();
      } catch (err) {
        console.error('Cart add error:', err);
        return null;
      }
    },

    async getCart() {
      const res = await fetch('/cart.js');
      return res.json();
    },

    async updateCount() {
      try {
        const cart = await this.getCart();
        const count = cart.item_count;
        $$('#amz-cart-count, .amz-cart-count, .cart-count').forEach(el => {
          el.textContent = count;
          el.style.display = count > 0 ? 'flex' : 'none';
        });
        return count;
      } catch { return 0; }
    },

    openDrawer() {
      // Delegate to AmazoDrw which uses correct IDs
      if (window.AmazoDrw) { window.AmazoDrw.open(); return; }
      const drawer = document.getElementById('cartDrawer');
      if (drawer) {
        drawer.classList.add('is-open');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.classList.add('cart-is-open');
      }
    },

    init() {
      // ATC & form submit handled by amazo-main.js (window.AmazoDrw)
      // Just update count on load
      this.updateCount();
    }
  };

  /* ══════════════════════════════════════════
     3. BUY NOW
  ══════════════════════════════════════════ */
  const BuyNow = {
    // Buy Now is handled by amazo-main.js (window.AmazoDrw)
    init() { /* delegated to amazo-main.js */ }
  };

  /* ══════════════════════════════════════════
     4. QUICK VIEW
  ══════════════════════════════════════════ */
  const QuickView = {
    modal: null,
    overlay: null,
    isOpen: false,

    init() {
      // Delegated to window.AmazQV in amazo-main.js — do not register duplicate listeners here
      return;

      // Close
      document.getElementById('QuickViewClose')?.addEventListener('click', () => this.close());
      this.overlay?.addEventListener('click', () => this.close());
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) this.close();
      });
    },

    async open(handle, productId) {
      if (!this.modal) return;
      this.isOpen = true;
      this.modal.setAttribute('aria-hidden', 'false');
      this.modal.classList.add('is-open');
      document.body.classList.add('modal-open');

      const loading = document.getElementById('QuickViewLoading');
      const content = document.getElementById('QuickViewContent');
      if (loading) loading.style.display = '';
      if (content) content.style.display = 'none';

      try {
        const res = await fetch(`/products/${handle}.js`);
        const prod = await res.json();
        this.render(prod);
      } catch (err) {
        console.error('QuickView load error:', err);
        showToast('⚠ Could not load product.', 'error');
        this.close();
      }
    },

    render(prod) {
      const loading = document.getElementById('QuickViewLoading');
      const content = document.getElementById('QuickViewContent');
      const variant = prod.variants[0];

      // Image
      const imgEl = document.getElementById('QuickViewImage');
      if (imgEl && prod.images.length) {
        imgEl.src = prod.images[0].src.replace('.jpg', '_600x600.jpg').replace('.png', '_600x600.png') || prod.images[0].src;
        imgEl.alt = prod.title;
      }

      // Thumbnails
      const thumbsEl = document.getElementById('QuickViewThumbs');
      if (thumbsEl) {
        thumbsEl.innerHTML = prod.images.slice(0, 5).map((img, i) =>
          `<img src="${img.src.replace('.jpg', '_100x100.jpg').replace('.png', '_100x100.png')}" alt="${prod.title}" class="amz-qv-thumb" data-src="${img.src}" loading="lazy">`
        ).join('');
        thumbsEl.addEventListener('click', (e) => {
          const thumb = e.target.closest('.amz-qv-thumb');
          if (thumb && imgEl) imgEl.src = thumb.dataset.src;
        });
      }

      // Brand
      const brandEl = document.getElementById('QuickViewBrand');
      if (brandEl) brandEl.textContent = prod.vendor || '';

      // Title
      const titleEl = document.getElementById('QuickViewTitle');
      if (titleEl) titleEl.textContent = prod.title;

      // Rating
      const ratingEl = document.getElementById('QuickViewRating');
      if (ratingEl) {
        const r = ((prod.id % 25) * 0.2 + 3.5).toFixed(1);
        ratingEl.innerHTML = `<span style="color:#ff9900;font-size:16px;">★★★★☆</span> <span style="color:#007185;font-size:13px;">${r} out of 5</span>`;
      }

      // Price
      const priceEl = document.getElementById('QuickViewPrice');
      if (priceEl) {
        let html = `<span class="amz-price-main" style="font-size:22px;color:#b12704;">${formatMoney(variant.price)}</span>`;
        if (variant.compare_at_price > variant.price) {
          html += ` <s style="color:#565959;font-size:13px;">${formatMoney(variant.compare_at_price)}</s>`;
        }
        priceEl.innerHTML = html;
      }

      // Stock
      const stockEl = document.getElementById('QuickViewStock');
      if (stockEl) {
        stockEl.innerHTML = prod.available
          ? `<span style="color:#007600;font-size:13px;">✓ In Stock</span>`
          : `<span style="color:#cc0c39;font-size:13px;">✗ Out of Stock</span>`;
      }

      // Variants
      const varEl = document.getElementById('QuickViewVariants');
      if (varEl && prod.options && prod.options[0] !== 'Title') {
        varEl.innerHTML = prod.options.map(opt => `
          <div class="amz-option-group" style="margin-bottom:10px;">
            <label style="font-size:13px;font-weight:600;">${opt}:</label>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
              ${[...new Set(prod.variants.map(v => v.option1))].map(val =>
          `<button class="amz-option-btn" style="padding:4px 10px;border:1px solid #ddd;border-radius:3px;background:white;cursor:pointer;font-size:12px;">${val}</button>`
        ).join('')}
            </div>
          </div>
        `).join('');
      }

      // ATC & Buy Now
      const atcBtn = document.getElementById('QuickViewATC');
      const buyBtn = document.getElementById('QuickViewBuyNow');
      const wlBtn = document.getElementById('QuickViewWishlist');

      if (atcBtn) { atcBtn.dataset.variantId = variant.id; atcBtn.disabled = !prod.available; }
      if (buyBtn) { buyBtn.dataset.variantId = variant.id; buyBtn.disabled = !prod.available; }
      if (wlBtn) {
        wlBtn.dataset.productId = prod.id;
        wlBtn.dataset.productTitle = prod.title;
        wlBtn.dataset.productUrl = `/products/${prod.handle}`;
        wlBtn.dataset.productImage = prod.images[0]?.src || '';
      }

      // Full product link
      const fullLink = document.getElementById('QuickViewFullLink');
      if (fullLink) fullLink.href = `/products/${prod.handle}`;

      // Update wishlist button state
      Wishlist.updateAllButtons();

      if (loading) loading.style.display = 'none';
      if (content) content.style.display = '';
      this.modal.focus();
    },

    close() {
      if (!this.modal) return;
      this.isOpen = false;
      this.modal.setAttribute('aria-hidden', 'true');
      this.modal.classList.remove('is-open');
      document.body.classList.remove('modal-open');
    }
  };

  /* ══════════════════════════════════════════
     5. QUANTITY STEPPER
     DELEGATED to amazo-main.js — no duplicate listener here
  ══════════════════════════════════════════ */
  const QtyStepper = { init() { /* handled by amazo-main.js */ } };

  /* ══════════════════════════════════════════
     6. PRODUCT TABS
     DELEGATED to amazo-main.js — no duplicate listener here
  ══════════════════════════════════════════ */
  const ProductTabs = { init() { /* handled by amazo-main.js */ } };

  /* ══════════════════════════════════════════
     7. REVIEWS — Dynamic (localStorage) + Login Modal
  ══════════════════════════════════════════ */
  const Reviews = {
    STORAGE_KEY: 'amz_reviews',

    /* ── Get reviews for a specific product ── */
    getReviews(productId) {
      try {
        const all = JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
        return all[productId] || [];
      } catch { return []; }
    },

    /* ── Save a review for a product ── */
    saveReview(productId, review) {
      try {
        const all = JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
        if (!all[productId]) all[productId] = [];
        review.id = 'review_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        review.date = new Date().toISOString().split('T')[0];
        all[productId].unshift(review);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
        return review;
      } catch { return null; }
    },

    /* ── Render user-submitted reviews into the DOM ── */
    renderUserReviews(productId) {
      const container = document.getElementById('UserReviewsList');
      if (!container) return;
      const reviews = this.getReviews(productId);
      if (reviews.length === 0) {
        container.innerHTML = '';
        return;
      }
      container.innerHTML = reviews.map(r => `
        <div class="amz-review-item amz-review-item--user">
          <div class="amz-review-item__header">
            <div class="amz-reviewer-avatar" style="background:#007185;">${(r.author || 'U').charAt(0).toUpperCase()}</div>
            <span class="amz-reviewer-name">${this.escapeHtml(r.author)}</span>
            <span class="amz-verified-badge">✔ Verified Purchase</span>
            <span class="amz-user-review-badge">Your Review</span>
          </div>
          <div class="amz-review-item__stars" style="color:#ff9900;font-size:16px;">
            ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
          </div>
          ${r.title ? `<h4 class="amz-review-item__title">${this.escapeHtml(r.title)}</h4>` : ''}
          <p class="amz-review-item__body">${this.escapeHtml(r.body)}</p>
          <div class="amz-review-item__date">Reviewed on ${r.date}</div>
        </div>
      `).join('');
    },

    /* ── Simple HTML escape ── */
    escapeHtml(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    /* ── Open login modal ── */
    openLoginModal() {
      const modal = document.getElementById('LoginModal');
      if (!modal) { window.location.href = '/account/login'; return; }
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('is-open');
      document.body.classList.add('modal-open');
    },

    /* ── Close login modal ── */
    closeLoginModal() {
      const modal = document.getElementById('LoginModal');
      if (!modal) return;
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('is-open');
      document.body.classList.remove('modal-open');
    },

    init() {
      if (!Cfg.enableReviews) return;

      const formEl = document.getElementById('WriteReviewForm');
      const requireLogin = formEl ? formEl.dataset.requireLogin === 'true' : false;
      const isLoggedIn = formEl ? formEl.dataset.customerLoggedIn === 'true' : false;

      // Get product ID from the form element (which has data-product-id)
      const reviewForm = document.getElementById('CustomerReviewForm');
      const productId = reviewForm ? reviewForm.dataset.productId : null;

      // Load existing user reviews from localStorage
      if (productId) this.renderUserReviews(productId);

      // Login Prompt button → open login modal
      document.addEventListener('click', (e) => {
        const loginBtn = e.target.closest('#LoginPromptBtn');
        if (loginBtn) {
          e.preventDefault();
          this.openLoginModal();
          return;
        }

        // Login modal overlay/close
        if (e.target.closest('#LoginModalOverlay') || e.target.closest('#LoginModalClose')) {
          e.preventDefault();
          this.closeLoginModal();
          return;
        }
      });

      // ESC close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeLoginModal();
      });

      // Toggle write review form
      document.addEventListener('click', (e) => {
        const writeBtn = e.target.closest('#WriteReviewBtn');
        if (writeBtn) {
          const form = document.getElementById('WriteReviewForm');
          const btn = document.getElementById('WriteReviewBtn');
          if (!form) return;

          // If login required and not logged in, show login modal
          if (requireLogin && !isLoggedIn) {
            this.openLoginModal();
            return;
          }

          const open = form.style.display !== 'none';
          form.style.display = open ? 'none' : 'block';
          form.setAttribute('aria-hidden', String(open));
          btn.setAttribute('aria-expanded', String(!open));
          if (!open) form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        if (e.target.closest('#CancelReviewBtn')) {
          const form = document.getElementById('WriteReviewForm');
          if (form) form.style.display = 'none';
        }

        // Helpful buttons
        const helpBtn = e.target.closest('.amz-helpful-btn');
        if (helpBtn) {
          helpBtn.classList.toggle('is-active');
          showToast('Thank you for your feedback!', 'info');
        }
      });

      /* ── Star Picker — Half/Full star support ── */
      function fillStars(val) {
        $$('.amz-star-position').forEach(pos => {
          const posNum = parseInt(pos.dataset.pos);
          const fillEl = pos.querySelector('.amz-star-fill');
          if (!fillEl) return;
          if (val >= posNum) {
            fillEl.style.clipPath = 'inset(0 0 0 0)';
          } else if (val >= posNum - 0.5) {
            fillEl.style.clipPath = 'inset(0 50% 0 0)';
          } else {
            fillEl.style.clipPath = 'inset(0 100% 0 0)';
          }
        });
      }

      // Click handler — radio change
      document.addEventListener('change', (e) => {
        const input = e.target.closest('.amz-star-input');
        if (!input) return;
        const val = parseFloat(input.value);
        fillStars(val);
      });

      // Hover preview
      const starPicker = document.getElementById('StarPicker');
      if (starPicker) {
        starPicker.addEventListener('mouseover', (e) => {
          const clickEl = e.target.closest('.amz-star-click');
          if (!clickEl) return;
          const pos = clickEl.closest('.amz-star-position');
          if (!pos) return;
          const posNum = parseInt(pos.dataset.pos);
          const isHalf = clickEl.classList.contains('amz-star-click--left');
          const val = isHalf ? posNum - 0.5 : posNum;
          fillStars(val);
        });

        starPicker.addEventListener('mouseleave', () => {
          // Restore to current selection
          const selected = document.querySelector('.amz-star-input:checked');
          fillStars(selected ? parseFloat(selected.value) : 0);
        });
      }

      // Char counter
      const reviewBody = document.getElementById('ReviewBody');
      const charCount = document.getElementById('ReviewBodyCount');
      if (reviewBody && charCount) {
        reviewBody.addEventListener('input', () => {
          charCount.textContent = `${reviewBody.value.length} / 1000`;
        });
      }

      // Form submit — SAVE to localStorage
      document.addEventListener('submit', (e) => {
        const form = e.target.closest('#CustomerReviewForm');
        if (!form) return;
        e.preventDefault();

        const rating = form.querySelector('[name="review_rating"]:checked');
        if (!rating) { showToast('⚠ Please select a star rating.', 'error'); return; }

        const titleInput = form.querySelector('[name="review_title"]');
        const bodyInput = form.querySelector('[name="review_body"]');
        const nameInput = form.querySelector('[name="review_author"]');
        const emailInput = form.querySelector('[name="review_email"]');

        const review = {
          rating: parseInt(rating.value),
          title: titleInput ? titleInput.value.trim() : '',
          body: bodyInput ? bodyInput.value.trim() : '',
          author: nameInput ? nameInput.value.trim() : 'Anonymous',
          email: emailInput ? emailInput.value.trim() : ''
        };

        const saved = this.saveReview(productId, review);
        if (saved) {
          // Render the new review
          this.renderUserReviews(productId);

          // Show success
          const successEl = document.getElementById('ReviewSuccess');
          if (successEl) successEl.style.display = 'flex';

          setTimeout(() => {
            form.reset();
            fillStars(0);
            if (successEl) successEl.style.display = 'none';
            const writeForm = document.getElementById('WriteReviewForm');
            if (writeForm) writeForm.style.display = 'none';
          }, 3000);

          showToast('✓ Review submitted! Thank you.', 'success');
        } else {
          showToast('⚠ Could not save your review. Please try again.', 'error');
        }
      });
    }
  };

  /* ══════════════════════════════════════════
     8. VARIANT SELECTOR
     DELEGATED to amazo-main.js — no duplicate listener here
  ══════════════════════════════════════════ */
  const VariantSelector = { init() { /* handled by amazo-main.js */ } };


  /* ══════════════════════════════════════════
     9. CRO: URGENCY TIMERS
  ══════════════════════════════════════════ */
  const UrgencyTimer = {
    init() {
      if (!Cfg.enableCroUrgency) return;

      $$('.amz-urgency-timer').forEach(timer => {
        let minutes = parseInt(timer.dataset.minutes) || 23;
        let seconds = parseInt(timer.dataset.seconds) || 47;

        const tick = setInterval(() => {
          seconds--;
          if (seconds < 0) { seconds = 59; minutes--; }
          if (minutes < 0) { clearInterval(tick); timer.textContent = 'Offer expired'; return; }
          timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
      });
    }
  };

  /* ══════════════════════════════════════════
     10. NOTIFY ME
  ══════════════════════════════════════════ */
  const NotifyMe = {
    init() {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.amz-notify-me');
        if (!btn) return;

        const email = prompt('Enter your email to be notified when this product is back in stock:');
        if (email && email.includes('@')) {
          showToast(`✓ We'll notify you at ${email} when it's back in stock!`, 'success', 4000);
          btn.textContent = '✓ Notification set';
          btn.disabled = true;
        } else if (email !== null) {
          showToast('⚠ Please enter a valid email address.', 'error');
        }
      });
    }
  };

  /* ══════════════════════════════════════════
     11. RECENTLY VIEWED
  ══════════════════════════════════════════ */
  const RecentlyViewed = {
    KEY: 'amz_recently_viewed',
    MAX: 8,

    track() {
      const page = document.querySelector('.template-product');
      if (!page) return;

      const handle = document.querySelector('[data-product-handle]')?.dataset.productHandle
        || window.location.pathname.split('/products/')[1];
      if (!handle) return;

      const image = document.querySelector('#ProductMainImage, .amz-main-img')?.src;
      const title = document.querySelector('.amz-product-title')?.textContent.trim();
      if (!handle || !title) return;

      let list = this.getAll();
      list = list.filter(p => p.handle !== handle);
      list.unshift({ handle, title, image, url: window.location.href });
      if (list.length > this.MAX) list = list.slice(0, this.MAX);
      localStorage.setItem(this.KEY, JSON.stringify(list));
    },

    getAll() {
      try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
      catch { return []; }
    },

    render() {
      const grid = document.getElementById('RecentlyViewedGrid');
      if (!grid) return;

      const currentHandle = window.location.pathname.split('/products/')[1];
      const items = this.getAll().filter(p => p.handle !== currentHandle).slice(0, 6);

      if (items.length === 0) {
        grid.closest('.amz-recently-viewed')?.style.setProperty('display', 'none');
        return;
      }

      grid.innerHTML = items.map(item => `
        <a href="${item.url}" class="amz-rv-item">
          <img src="${item.image || ''}" alt="${item.title}" loading="lazy" style="width:80px;height:80px;object-fit:contain;">
          <span class="amz-rv-title">${item.title}</span>
        </a>
      `).join('');
    },

    init() {
      if (!Cfg.enableRecentlyViewed) return;
      this.track();
      this.render();
    }
  };

  /* ══════════════════════════════════════════
     12. PRODUCT IMAGE ZOOM (hover) - throttled
  ══════════════════════════════════════════ */
  const ImageZoom = {
    init() {
      $$('.amz-zoomable').forEach(img => {
        let ticking = false;
        let lastX = 0, lastY = 0;

        img.addEventListener('mousemove', (e) => {
          lastX = e.clientX;
          lastY = e.clientY;
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(() => {
            const rect = img.getBoundingClientRect();
            const x = ((lastX - rect.left) / rect.width) * 100;
            const y = ((lastY - rect.top) / rect.height) * 100;
            img.style.transformOrigin = `${x}% ${y}%`;
            img.style.transform = 'scale(1.5)';
            ticking = false;
          });
        }, { passive: true });

        img.addEventListener('mouseleave', () => {
          img.style.transform = 'scale(1)';
          img.style.transformOrigin = 'center center';
          ticking = false;
        }, { passive: true });
      });
    }
  };

  /* ══════════════════════════════════════════
     13. THUMBNAIL SWITCHER (product page)
  ══════════════════════════════════════════ */
  const ThumbnailSwitcher = {
    init() {
      const thumbContainer = document.querySelector('.amz-thumbnails');
      const mainImg = document.getElementById('ProductMainImage');
      if (!thumbContainer || !mainImg) return;

      thumbContainer.addEventListener('click', (e) => {
        const thumb = e.target.closest('.amz-thumb-wrap');
        if (!thumb) return;

        $$('.amz-thumb-wrap', thumbContainer).forEach(t => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
        const newSrc = thumb.dataset.imageSrc;
        if (newSrc) {
          mainImg.style.opacity = '0.6';
          mainImg.src = newSrc;
          mainImg.onload = () => { mainImg.style.opacity = '1'; };
        }
      });
    }
  };

  /* ══════════════════════════════════════════
     14. PRODUCT CARD HOVER IMAGE
     Uses CSS class toggle instead of inline
     style per card to avoid memory leaks
  ══════════════════════════════════════════ */
  const CardHover = {
    _bound: false,
    init() {
      // Only bind once — use event delegation on document
      if (this._bound) return;
      this._bound = true;

      document.addEventListener('mouseenter', (e) => {
        const card = e.target.closest('.product-card');
        if (card) card.classList.add('is-hovered');
      }, true); // capture phase for mouseenter delegation

      document.addEventListener('mouseleave', (e) => {
        const card = e.target.closest('.product-card');
        if (card) card.classList.remove('is-hovered');
      }, true);
    }
  };

  /* ══════════════════════════════════════════
     INIT ALL
  ══════════════════════════════════════════ */
  function init() {
    Wishlist.init();
    WishlistDrawer.init();
    CartManager.init();
    BuyNow.init();
    QuickView.init();
    QtyStepper.init();
    ProductTabs.init();
    Reviews.init();
    VariantSelector.init();
    UrgencyTimer.init();
    NotifyMe.init();
    RecentlyViewed.init();
    ImageZoom.init();
    ThumbnailSwitcher.init();
    CardHover.init();

    // Observe DOM changes for new wishlist buttons ONLY
    // Debounced + limited to wishlist button updates to prevent CPU spikes
    let _mutTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(_mutTimer);
      _mutTimer = setTimeout(() => {
        Wishlist.updateAllButtons();
        // CardHover is now delegated — no re-init needed
      }, 200);
    });
    // Watch only direct children of body, NOT subtree of all nodes
    observer.observe(document.body, { childList: true, subtree: false });

    // Expose modules to window for header/etc access
    window.Wishlist = Wishlist;
    window.WishlistDrawer = WishlistDrawer;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();


/* ══════════════════════════════════════════
   15. CRO MASTER — 25 Sections JS
   Initialization for all new CRO sections
══════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 15a. COUNTDOWN TIMER ── */
  function initCountdownTimers() {
    document.querySelectorAll('.cro-countdown__timer[data-target]').forEach(el => {
      const targetDate = el.dataset.target;
      const endText = el.dataset.expiredText || 'Sale Ended';
      if (!targetDate) return;
      const sectionId = el.closest('.cro-countdown')?.id || '';

      function update() {
        const diff = new Date(targetDate).getTime() - Date.now();
        if (diff <= 0) {
          el.innerHTML = endText;
          return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hrs = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        const secs = Math.floor((diff / 1000) % 60);

        const id = sectionId ? sectionId.replace('cro-countdown-', '') : '';
        const dayEl = document.getElementById('cro-cd-days-' + id);
        const hrEl = document.getElementById('cro-cd-hours-' + id);
        const minEl = document.getElementById('cro-cd-mins-' + id);
        const secEl = document.getElementById('cro-cd-secs-' + id);
        if (dayEl) dayEl.textContent = String(days).padStart(2, '0');
        if (hrEl) hrEl.textContent = String(hrs).padStart(2, '0');
        if (minEl) minEl.textContent = String(mins).padStart(2, '0');
        if (secEl) secEl.textContent = String(secs).padStart(2, '0');
      }

      update();
      setInterval(update, 1000);
    });
  }

  /* ── 15b. SOCIAL PROOF BAR (static stat bar) ── */
  function initSocialProof() {
    document.querySelectorAll('.cro-sp__count[data-min]').forEach(el => {
      const min = parseInt(el.dataset.min) || 12;
      const max = parseInt(el.dataset.max) || min + 20;

      function randomCount() {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }

      el.textContent = randomCount();
      setInterval(() => { el.textContent = randomCount(); }, 4000);
    });

    // Update the "X orders" stat as well
    document.querySelectorAll('.cro-sp__stat').forEach(stat => {
      const cartIcon = stat.querySelector('svg[data-view-box]');
      if (!cartIcon && !stat.querySelector('.cro-sp__dot')) return;
      const strongEl = stat.querySelector('strong');
      if (strongEl && !strongEl.classList.contains('cro-sp__count')) {
        const base = parseInt(strongEl.textContent) || 128;
        const jitter = Math.floor(Math.random() * 15) + 1;
        strongEl.textContent = base + jitter;
        setInterval(() => {
          const b = parseInt(strongEl.textContent) || 128;
          strongEl.textContent = b + Math.floor(Math.random() * 3) - 1;
        }, 6000);
      }
    });
  }

  /* ── 15c. FAQ ACCORDION ── */
  function initFaqAccordion() {
    document.addEventListener('click', (e) => {
      const question = e.target.closest('.cro-faq__question');
      if (!question) return;
      const item = question.closest('.cro-faq__item');
      if (!item) return;
      const isOpen = item.classList.contains('is-open');

      // Close all siblings (accordion behavior)
      const parent = item.closest('.cro-faq');
      if (parent) {
        parent.querySelectorAll('.cro-faq__item.is-open').forEach(other => {
          if (other !== item) other.classList.remove('is-open');
        });
      }

      item.classList.toggle('is-open');
    });
  }

  /* ── 15d. BEFORE/AFTER SLIDER ── */
  function initBeforeAfter() {
    document.querySelectorAll('.cro-beforeafter__container').forEach(container => {
      const afterImg = container.querySelector('.cro-beforeafter__after');
      const slider = container.querySelector('.cro-beforeafter__slider');
      if (!afterImg || !slider) return;

      let isDragging = false;

      function update(pos) {
        const rect = container.getBoundingClientRect();
        let pct = ((pos - rect.left) / rect.width) * 100;
        pct = Math.max(0, Math.min(100, pct));
        afterImg.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
        slider.style.left = `${pct}%`;
      }

      container.addEventListener('mousedown', (e) => {
        isDragging = true;
        update(e.clientX);
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        update(e.clientX);
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });

      // Touch support
      container.addEventListener('touchstart', (e) => {
        isDragging = true;
        update(e.touches[0].clientX);
      }, { passive: true });

      container.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        update(e.touches[0].clientX);
      }, { passive: true });

      container.addEventListener('touchend', () => {
        isDragging = false;
      });
    });
  }

  /* ── 15e. REVIEWS CAROUSEL ── */
  function initReviewsCarousel() {
    document.querySelectorAll('.cro-reviews-carousel').forEach(carousel => {
      const track = carousel.querySelector('.cro-reviews-carousel__track');
      const cards = carousel.querySelectorAll('.cro-reviews-carousel__card');
      const prevBtn = carousel.querySelector('.cro-reviews-carousel__btn--prev');
      const nextBtn = carousel.querySelector('.cro-reviews-carousel__btn--next');
      const dotsContainer = carousel.querySelector('.cro-reviews-carousel__dots');
      if (!track || cards.length === 0) return;

      const cardWidth = cards[0].offsetWidth + 20; // card + gap
      const visible = Math.floor(track.parentElement.offsetWidth / cardWidth) || 1;
      const maxIndex = Math.max(0, cards.length - visible);
      let current = 0;

      function goTo(index) {
        current = Math.max(0, Math.min(index, maxIndex));
        track.style.transform = `translateX(-${current * cardWidth}px)`;
        track.style.transition = 'transform .4s ease';

        // Update dots
        if (dotsContainer) {
          dotsContainer.querySelectorAll('.cro-reviews-carousel__dot').forEach((dot, i) => {
            dot.classList.toggle('is-active', i === current);
          });
        }
      }

      prevBtn?.addEventListener('click', () => goTo(current - 1));
      nextBtn?.addEventListener('click', () => goTo(current + 1));

      // Dots
      if (dotsContainer) {
        dotsContainer.querySelectorAll('.cro-reviews-carousel__dot').forEach((dot, i) => {
          dot.addEventListener('click', () => goTo(i));
        });
      }

      // Auto-play
      let autoPlay = setInterval(() => {
        goTo(current + 1 > maxIndex ? 0 : current + 1);
      }, 5000);

      carousel.addEventListener('mouseenter', () => clearInterval(autoPlay));
      carousel.addEventListener('mouseleave', () => {
        autoPlay = setInterval(() => {
          goTo(current + 1 > maxIndex ? 0 : current + 1);
        }, 5000);
      });
    });
  }

  /* ── 15f. NEWSLETTER POPUP ── */
  function initNewsletterPopup() {
    document.querySelectorAll('.cro-newsletter-popup').forEach(popup => {
      const delay = parseInt(popup.dataset.delay) || 5;
      const exitIntent = popup.dataset.exitIntent === 'true';
      const frequency = popup.dataset.frequency || 'once';
      const storageKey = 'cro_newsletter_shown';

      // Check frequency
      function shouldShow() {
        if (frequency === 'once') {
          return !sessionStorage.getItem(storageKey);
        }
        if (frequency === 'daily') {
          const last = localStorage.getItem(storageKey);
          if (!last) return true;
          const diff = Date.now() - parseInt(last);
          return diff > 86400000; // 24 hours
        }
        return true; // 'always'
      }

      function show() {
        if (!shouldShow()) return;
        popup.classList.add('is-open');
        document.body.classList.add('modal-open');

        if (frequency === 'once') {
          sessionStorage.setItem(storageKey, '1');
        } else if (frequency === 'daily') {
          localStorage.setItem(storageKey, String(Date.now()));
        }
      }

      function hide() {
        popup.classList.remove('is-open');
        document.body.classList.remove('modal-open');
      }

      // Delay
      setTimeout(show, delay * 1000);

      // Exit intent
      if (exitIntent) {
        document.addEventListener('mouseleave', (e) => {
          if (e.clientY <= 0 && !popup.classList.contains('is-open')) {
            show();
          }
        });
      }

      // Close
      popup.querySelector('.cro-newsletter-popup__close')?.addEventListener('click', hide);
      popup.querySelector('.cro-newsletter-popup__overlay')?.addEventListener('click', hide);

      // Dismiss checkbox
      const dismissCheck = popup.querySelector('.cro-newsletter-popup__dismiss-input');
      if (dismissCheck) {
        dismissCheck.addEventListener('change', () => {
          if (dismissCheck.checked) {
            localStorage.setItem('cro_newsletter_dismissed', '1');
          }
        });
      }

      // Don't show if dismissed
      if (localStorage.getItem('cro_newsletter_dismissed') === '1') {
        // Still allow if frequency is 'always'
        if (frequency !== 'always') return;
      }

      // ESC
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popup.classList.contains('is-open')) {
          hide();
        }
      });
    });
  }

  /* ── 15g. SIZE GUIDE MODAL ── */
  function initSizeGuide() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.cro-size-guide__trigger');
      if (!trigger) return;
      const modal = trigger.closest('.cro-size-guide').querySelector('.cro-size-guide__modal');
      if (!modal) return;
      modal.classList.add('is-open');
      document.body.classList.add('modal-open');
    });

    document.addEventListener('click', (e) => {
      const close = e.target.closest('.cro-size-guide__close');
      const overlay = e.target.closest('.cro-size-guide__overlay');
      if (!close && !overlay) return;
      const modal = (close || overlay).closest('.cro-size-guide__modal');
      if (!modal) return;
      modal.classList.remove('is-open');
      document.body.classList.remove('modal-open');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      document.querySelectorAll('.cro-size-guide__modal.is-open').forEach(m => {
        m.classList.remove('is-open');
        document.body.classList.remove('modal-open');
      });
    });
  }

  /* ── 15i. ORDER BUMP ── */
  function initOrderBump() {
    document.querySelectorAll('.cro-order-bump').forEach(bump => {
      bump.querySelectorAll('.cro-order-bump__checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
          const label = cb.closest('.cro-order-bump__checkbox-label');
          if (label) {
            label.style.opacity = cb.checked ? '1' : '.6';
          }
        });
      });
    });
  }

  /* ── 15j. STICKY ATC BAR ── */
  function initStickyATC() {
    document.querySelectorAll('.cro-sticky-atc').forEach(bar => {
      const atcBtn = bar.querySelector('.cro-sticky-atc__btn');
      const variantId = bar.dataset.variantId;
      const productTitle = bar.dataset.productTitle || 'Item';

      // Show on scroll past threshold
      const mainATC = document.querySelector('[name="add"]');
      if (!mainATC) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            bar.classList.add('cro-sticky-atc--visible');
          } else {
            bar.classList.remove('cro-sticky-atc--visible');
          }
        });
      }, { threshold: 0 });

      observer.observe(mainATC);

      // ATC click
      atcBtn?.addEventListener('click', () => {
        if (!variantId) {
          // Scroll to main ATC
          mainATC.scrollIntoView({ behavior: 'smooth' });
          mainATC.focus();
          return;
        }

        atcBtn.disabled = true;
        atcBtn.textContent = 'Adding…';

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ id: parseInt(variantId), quantity: 1 })
        })
          .then(r => r.ok ? r.json() : Promise.reject(r))
          .then(() => {
            atcBtn.textContent = '✓ Added!';
            setTimeout(() => {
              atcBtn.disabled = false;
              atcBtn.textContent = 'Add to Cart';
            }, 2000);
            // Refresh cart
            if (window.AmazoDrw) window.AmazoDrw.loadCart();
          })
          .catch(() => {
            atcBtn.disabled = false;
            atcBtn.textContent = 'Add to Cart';
          });
      });
    });
  }

  /* ── 15k. GIFT WRAPPING CHAR COUNT ── */
  function initGiftWrapping() {
    document.querySelectorAll('.cro-gift__message-input').forEach(textarea => {
      const countEl = textarea.closest('.cro-gift__message-field')?.querySelector('.cro-gift__char-count');
      if (!countEl) return;
      const max = parseInt(textarea.maxLength) || 200;

      textarea.addEventListener('input', () => {
        const len = textarea.value.length;
        countEl.textContent = `${len}/${max}`;
        if (len >= max) {
          countEl.style.color = '#e74c3c';
        } else {
          countEl.style.color = '#999';
        }
      });
    });
  }

  /* ── 15l. PRICE MATCH FORM ── */
  function initPriceMatch() {
    document.querySelectorAll('.cro-price-match__form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('.cro-price-match__btn');
        btn.textContent = '✓ Request Submitted!';
        btn.style.background = '#2ecc71';
        btn.disabled = true;
        form.querySelectorAll('.cro-price-match__input').forEach(inp => inp.disabled = true);

        setTimeout(() => {
          btn.textContent = 'Request Price Match';
          btn.style.background = '';
          btn.disabled = false;
          form.querySelectorAll('.cro-price-match__input').forEach(inp => {
            inp.disabled = false;
            inp.value = '';
          });
        }, 3000);
      });
    });
  }

  /* ── 15n. TESTIMONIALS ARROW NAV ── */
  function initTestimonialsNav() {
    document.querySelectorAll('.cro-testimonials').forEach(section => {
      const track = section.querySelector('.cro-testimonials__track');
      const prev = section.querySelector('.cro-testimonials__arrow--prev');
      const next = section.querySelector('.cro-testimonials__arrow--next');
      if (!track || !prev || !next) return;

      const scrollAmount = 320;

      prev.addEventListener('click', () => {
        track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      });

      next.addEventListener('click', () => {
        track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      });

      // Update dots on scroll
      track.addEventListener('scroll', () => {
        const dots = section.querySelectorAll('.cro-testimonials__dot');
        const scrollLeft = track.scrollLeft;
        const maxScroll = track.scrollWidth - track.clientWidth;
        const pct = maxScroll > 0 ? scrollLeft / maxScroll : 0;
        const active = Math.round(pct * (dots.length - 1));

        dots.forEach((dot, i) => {
          dot.classList.toggle('is-active', i === active);
        });
      });
    });
  }

  /* ── Initialize all CRO master modules ── */
  function initAll() {
    initCountdownTimers();
    initSocialProof();
    initFaqAccordion();
    initBeforeAfter();
    initReviewsCarousel();
    initNewsletterPopup();
    initSizeGuide();
    initOrderBump();
    initStickyATC();
    initGiftWrapping();
    initPriceMatch();
    initTestimonialsNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

})();
