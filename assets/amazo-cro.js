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

    has(id) {
      return this.getAll().some(p => String(p.id) === String(id));
    },

    add(item) {
      const list = this.getAll();
      if (!this.has(item.id)) {
        list.push(item);
        this.save(list);
      }
    },

    remove(id) {
      const list = this.getAll().filter(p => String(p.id) !== String(id));
      this.save(list);
    },

    toggle(item) {
      if (this.has(item.id)) {
        this.remove(item.id);
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
        if (!id) return;
        const active = this.has(id);
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
          image: btn.dataset.productImage
        };

        const added = this.toggle(item);
        this.updateAllButtons();

        showToast(
          added
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="#cc0c39"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> <strong>${item.title}</strong> added to wishlist`
            : `Removed from wishlist`,
          added ? 'success' : 'info'
        );
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
      if (!Cfg.enableQuickView) return;
      this.modal = document.getElementById('QuickViewModal');
      this.overlay = document.getElementById('QuickViewOverlay');
      if (!this.modal) return;

      // Open triggers
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.amz-quickview-btn');
        if (!btn) return;
        e.preventDefault();
        const handle = btn.dataset.productHandle;
        if (handle) this.open(handle, btn.dataset.productId);
      });

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
     7. REVIEWS
  ══════════════════════════════════════════ */
  const Reviews = {
    init() {
      if (!Cfg.enableReviews) return;

      // Toggle write review form
      document.addEventListener('click', (e) => {
        if (e.target.closest('#WriteReviewBtn')) {
          const form = document.getElementById('WriteReviewForm');
          const btn = document.getElementById('WriteReviewBtn');
          if (!form) return;
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

      // Star picker
      document.addEventListener('click', (e) => {
        const label = e.target.closest('.amz-star-pick');
        if (!label) return;
        const input = label.querySelector('input[type="radio"]');
        if (input) {
          input.checked = true;
          const val = parseInt(input.value);
          $$('.amz-star-pick').forEach((l, idx) => {
            const svg = l.querySelector('.amz-star-svg polygon');
            if (svg) svg.setAttribute('fill', idx < val ? '#ff9900' : 'none');
          });
        }
      });

      // Char counter
      const reviewBody = document.getElementById('ReviewBody');
      const charCount = document.getElementById('ReviewBodyCount');
      if (reviewBody && charCount) {
        reviewBody.addEventListener('input', () => {
          charCount.textContent = `${reviewBody.value.length} / 1000`;
        });
      }

      // Form submit
      document.addEventListener('submit', (e) => {
        const form = e.target.closest('#CustomerReviewForm');
        if (!form) return;
        e.preventDefault();

        const rating = form.querySelector('[name="review_rating"]:checked');
        if (!rating) { showToast('⚠ Please select a star rating.', 'error'); return; }

        const successEl = document.getElementById('ReviewSuccess');
        if (successEl) successEl.style.display = 'flex';

        setTimeout(() => {
          form.reset();
          $$('.amz-star-svg polygon', form).forEach(p => p.setAttribute('fill', 'none'));
          if (successEl) successEl.style.display = 'none';
          const writeForm = document.getElementById('WriteReviewForm');
          if (writeForm) writeForm.style.display = 'none';
        }, 3000);

        showToast('✓ Review submitted! Thank you.', 'success');
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
