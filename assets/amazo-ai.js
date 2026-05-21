/* ============================================================
   AMAZO AI Shopping Assistant v1.0
   NLP-powered product search + smart FAQ via Shopify Search API
   ============================================================ */
(function () {
  'use strict';

  var cfg = window.AMZ_AI_CONFIG || {};
  var STORE_NAME   = cfg.storeName   || 'our store';
  var GREETING     = cfg.greeting    || 'Hi! I\'m your AI Shopping Assistant. How can I help you today?';
  var CURRENCY_SYM = cfg.currency    || '₹';

  /* ── Intent patterns ── */
  var INTENTS = [
    {
      pattern: /\b(hi|hello|hey|namaste|hii|helo)\b/i,
      type: 'greeting'
    },
    {
      pattern: /\b(ship|deliver|delivery|courier|dispatch|tracking)\b/i,
      type: 'shipping'
    },
    {
      pattern: /\b(return|refund|exchange|replace|money back|cancel)\b/i,
      type: 'return'
    },
    {
      pattern: /\b(pay|payment|cod|cash|upi|card|emi|checkout)\b/i,
      type: 'payment'
    },
    {
      pattern: /\b(offer|discount|coupon|promo|sale|deal|off|percent)\b/i,
      type: 'offers'
    },
    {
      pattern: /\b(contact|support|help|agent|human|call|email|phone|whatsapp)\b/i,
      type: 'contact'
    },
    {
      pattern: /\b(thank|thanks|thankyou|shukriya|dhanyawad)\b/i,
      type: 'thanks'
    },
    {
      pattern: /\b(size|fit|measure|chart|small|medium|large|xl)\b/i,
      type: 'size'
    },
    {
      pattern: /\b(ingredient|content|suitable|skin type|vegan|cruelty|natural|organic|paraben|sulfate)\b/i,
      type: 'ingredient'
    },
  ];

  var FAQ_RESPONSES = {
    greeting: function() {
      return {
        text: 'Hello! 👋 Welcome to ' + STORE_NAME + '. I can help you find products, answer questions about shipping, returns, and more!\n\nWhat are you looking for today?',
        chips: ['Find products', 'Shipping info', 'Return policy', 'Offers & deals']
      };
    },
    shipping: function() {
      return {
        text: '🚚 **Shipping Information:**\n\n• Free delivery on orders above ₹499\n• Standard delivery: 3–7 business days\n• Express delivery: 1–2 business days (extra charge)\n• Orders are dispatched within 24 hours\n• You\'ll receive a tracking link via SMS/email',
        chips: ['Track my order', 'Return policy', 'Talk to support']
      };
    },
    return: function() {
      return {
        text: '↩️ **Return & Refund Policy:**\n\n• Easy 7-day returns from delivery date\n• Items must be unused and in original packaging\n• Refund processed in 5–7 business days\n• Free return pickup available\n\nTo initiate a return, please contact our support team.',
        chips: ['Contact support', 'Shipping info', 'Find products']
      };
    },
    payment: function() {
      return {
        text: '💳 **Payment Options:**\n\n• UPI (Google Pay, PhonePe, Paytm)\n• Credit / Debit Cards\n• Net Banking\n• Cash on Delivery (COD)\n• EMI available on select cards\n\nAll payments are 100% secure & encrypted.',
        chips: ['Shipping info', 'Return policy', 'Find products']
      };
    },
    offers: function() {
      return {
        text: '🎉 **Current Offers:**\n\n• Use code **FIRST10** for 10% off your first order\n• Free shipping on orders above ₹499\n• Check our Deals of the Day section for up to 55% off!\n\nWant me to show you the best deals?',
        chips: ['Show deals', 'Find products', 'Shipping info']
      };
    },
    contact: function() {
      return {
        text: '📞 **Contact & Support:**\n\n• Email: support@' + window.location.hostname + '\n• WhatsApp: Available on site\n• Response time: Within 24 hours\n\nOr browse our Help Center for instant answers.',
        chips: ['Shipping info', 'Return policy', 'Find products']
      };
    },
    thanks: function() {
      return {
        text: 'You\'re welcome! 😊 Is there anything else I can help you with?',
        chips: ['Find products', 'Shipping info', 'View offers']
      };
    },
    size: function() {
      return {
        text: '📏 **Size Guide:**\n\nSize charts are available on each product page. Just scroll down to the "Size Guide" section.\n\nNeed help finding the right size for a specific product? Just tell me the product name!',
        chips: ['Find products', 'Return policy']
      };
    },
    ingredient: function() {
      return {
        text: '🌿 **Product Ingredients:**\n\nFull ingredient lists are available on each product page under the "Details" section.\n\nWant me to find a specific type of product for you? (e.g., "paraben-free moisturizer")',
        chips: ['Find products', 'Contact support']
      };
    }
  };

  /* ── Shopify Search API ── */
  function searchProducts(query, callback) {
    var url = '/search/suggest.json?q=' + encodeURIComponent(query)
      + '&resources[type]=product&resources[limit]=4';

    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var products = (data.resources && data.resources.results && data.resources.results.products) || [];
        callback(null, products);
      })
      .catch(function(e) { callback(e, []); });
  }

  /* ── Detect intent ── */
  function detectIntent(text) {
    for (var i = 0; i < INTENTS.length; i++) {
      if (INTENTS[i].pattern.test(text)) return INTENTS[i].type;
    }
    return null;
  }

  /* ── Format money ── */
  function formatMoney(cents) {
    return CURRENCY_SYM + (cents / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* ── UI helpers ── */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }

  /* ── Build product card HTML ── */
  function buildProductCard(p) {
    var img = p.image ? p.image.url : 'https://via.placeholder.com/52';
    var price = p.price ? formatMoney(parseInt(p.price, 10)) : '';
    return '<a href="' + p.url + '" class="amz-ai-product-card" target="_self">'
      + '<img src="' + img + '" alt="' + (p.title || '') + '" loading="lazy">'
      + '<div class="amz-ai-product-card__info">'
      + '<div class="amz-ai-product-card__title">' + (p.title || '') + '</div>'
      + (price ? '<div class="amz-ai-product-card__price">' + price + '</div>' : '')
      + '</div>'
      + '<svg class="amz-ai-product-card__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>'
      + '</a>';
  }

  /* ── Build chips HTML ── */
  function buildChips(chips) {
    if (!chips || !chips.length) return '';
    return '<div class="amz-ai-chips">'
      + chips.map(function(c) {
          return '<button class="amz-ai-chip" data-text="' + c + '">' + c + '</button>';
        }).join('')
      + '</div>';
  }

  /* ── Main widget ── */
  function AiAssistant() {
    this.isOpen    = false;
    this.history   = [];
    this.container = null;
    this.init();
  }

  AiAssistant.prototype.init = function() {
    this.render();
    this.bindEvents();
    setTimeout(this.showGreeting.bind(this), 800);
  };

  AiAssistant.prototype.render = function() {
    var el = document.createElement('div');
    el.innerHTML = [
      /* Launcher */
      '<button class="amz-ai-launcher" id="AmzAiLauncher" aria-label="Open AI Assistant" aria-expanded="false">',
        '<svg class="amz-ai-launcher__open" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><circle cx="9" cy="10" r="1" fill="#ff9900" stroke="none"/><circle cx="12" cy="10" r="1" fill="#ff9900" stroke="none"/><circle cx="15" cy="10" r="1" fill="#ff9900" stroke="none"/></svg>',
        '<svg class="amz-ai-launcher__close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        '<span class="amz-ai-badge" id="AmzAiBadge">1</span>',
      '</button>',

      /* Chat window */
      '<div class="amz-ai-window" id="AmzAiWindow" role="dialog" aria-label="AI Shopping Assistant" aria-hidden="true">',
        '<div class="amz-ai-header">',
          '<div class="amz-ai-avatar">',
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9900" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9" stroke-width="3" stroke-linecap="round"/><line x1="15" y1="9" x2="15.01" y2="9" stroke-width="3" stroke-linecap="round"/></svg>',
          '</div>',
          '<div class="amz-ai-header__info">',
            '<div class="amz-ai-header__name">AMAZO Assistant</div>',
            '<div class="amz-ai-header__status">Online — replies instantly</div>',
          '</div>',
          '<button class="amz-ai-clear-btn" id="AmzAiClear" title="Clear chat">Clear</button>',
        '</div>',

        '<div class="amz-ai-messages" id="AmzAiMessages"></div>',

        '<div class="amz-ai-input-area">',
          '<textarea class="amz-ai-input" id="AmzAiInput" placeholder="Ask me anything…" rows="1" maxlength="300"></textarea>',
          '<button class="amz-ai-send-btn" id="AmzAiSend" aria-label="Send">',
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
          '</button>',
        '</div>',
        '<div class="amz-ai-footer">Powered by AMAZO AI</div>',
      '</div>'
    ].join('');

    document.body.appendChild(el);
    this.container  = el;
    this.launcher   = qs('#AmzAiLauncher');
    this.window     = qs('#AmzAiWindow');
    this.messages   = qs('#AmzAiMessages');
    this.input      = qs('#AmzAiInput');
    this.sendBtn    = qs('#AmzAiSend');
    this.badge      = qs('#AmzAiBadge');
    this.clearBtn   = qs('#AmzAiClear');
  };

  AiAssistant.prototype.bindEvents = function() {
    var self = this;

    this.launcher.addEventListener('click', function() { self.toggle(); });

    this.sendBtn.addEventListener('click', function() { self.handleSend(); });

    this.input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        self.handleSend();
      }
    });

    this.input.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 80) + 'px';
    });

    this.clearBtn.addEventListener('click', function() {
      self.messages.innerHTML = '';
      self.history = [];
      self.showGreeting();
    });

    /* Chip clicks — delegated */
    this.messages.addEventListener('click', function(e) {
      var chip = e.target.closest('.amz-ai-chip');
      if (chip) {
        var text = chip.dataset.text;
        self.input.value = text;
        self.handleSend();
      }
    });
  };

  AiAssistant.prototype.toggle = function() {
    this.isOpen = !this.isOpen;
    this.launcher.classList.toggle('is-open', this.isOpen);
    this.window.classList.toggle('is-open', this.isOpen);
    this.launcher.setAttribute('aria-expanded', this.isOpen);
    this.window.setAttribute('aria-hidden', !this.isOpen);

    if (this.isOpen) {
      this.badge.style.display = 'none';
      this.input.focus();
      this.scrollBottom();
    }
  };

  AiAssistant.prototype.showGreeting = function() {
    this.addBotMessage(GREETING, ['Find products', 'Shipping info', 'Return policy', 'Offers & deals']);
    if (!this.isOpen) this.badge.style.display = 'flex';
  };

  AiAssistant.prototype.addBotMessage = function(text, chips) {
    var div = document.createElement('div');
    div.className = 'amz-ai-msg amz-ai-msg--bot';

    /* convert **bold** */
    var html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    div.innerHTML = '<div class="amz-ai-msg__icon">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff9900" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9" stroke-width="3" stroke-linecap="round"/><line x1="15" y1="9" x2="15.01" y2="9" stroke-width="3" stroke-linecap="round"/></svg>'
      + '</div>'
      + '<div>'
      + '<div class="amz-ai-msg__bubble">' + html + '</div>'
      + buildChips(chips)
      + '</div>';

    this.messages.appendChild(div);
    this.scrollBottom();
  };

  AiAssistant.prototype.addUserMessage = function(text) {
    var div = document.createElement('div');
    div.className = 'amz-ai-msg amz-ai-msg--user';
    div.innerHTML = '<div class="amz-ai-msg__bubble">' + this.escHtml(text) + '</div>';
    this.messages.appendChild(div);
    this.scrollBottom();
  };

  AiAssistant.prototype.addProductsMessage = function(intro, products) {
    var div = document.createElement('div');
    div.className = 'amz-ai-msg amz-ai-msg--bot';

    var cards = products.map(buildProductCard).join('');
    div.innerHTML = '<div class="amz-ai-msg__icon">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff9900" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9" stroke-width="3" stroke-linecap="round"/><line x1="15" y1="9" x2="15.01" y2="9" stroke-width="3" stroke-linecap="round"/></svg>'
      + '</div>'
      + '<div>'
      + '<div class="amz-ai-msg__bubble">' + this.escHtml(intro) + '</div>'
      + '<div class="amz-ai-products">' + cards + '</div>'
      + buildChips(['Search again', 'Shipping info', 'Add to wishlist'])
      + '</div>';

    this.messages.appendChild(div);
    this.scrollBottom();
  };

  AiAssistant.prototype.showTyping = function() {
    var div = document.createElement('div');
    div.className = 'amz-ai-msg amz-ai-msg--bot amz-ai-typing';
    div.id = 'AmzAiTyping';
    div.innerHTML = '<div class="amz-ai-msg__icon">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff9900" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'
      + '</div>'
      + '<div class="amz-ai-msg__bubble">'
      + '<span class="amz-ai-dot"></span><span class="amz-ai-dot"></span><span class="amz-ai-dot"></span>'
      + '</div>';
    this.messages.appendChild(div);
    this.scrollBottom();
  };

  AiAssistant.prototype.hideTyping = function() {
    var el = document.getElementById('AmzAiTyping');
    if (el) el.remove();
  };

  AiAssistant.prototype.scrollBottom = function() {
    var m = this.messages;
    requestAnimationFrame(function() { m.scrollTop = m.scrollHeight; });
  };

  AiAssistant.prototype.escHtml = function(str) {
    return str.replace(/[&<>"']/g, function(c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  };

  AiAssistant.prototype.handleSend = function() {
    var text = this.input.value.trim();
    if (!text) return;

    this.addUserMessage(text);
    this.input.value = '';
    this.input.style.height = 'auto';
    this.sendBtn.disabled = true;
    this.history.push({ role: 'user', content: text });

    this.showTyping();
    this.processMessage(text);
  };

  AiAssistant.prototype.processMessage = function(text) {
    var self = this;
    var delay = 700 + Math.random() * 400;

    /* 1. Check FAQ intents first */
    var intent = detectIntent(text);
    if (intent && FAQ_RESPONSES[intent]) {
      setTimeout(function() {
        self.hideTyping();
        var resp = FAQ_RESPONSES[intent]();
        self.addBotMessage(resp.text, resp.chips);
        self.sendBtn.disabled = false;
      }, delay);
      return;
    }

    /* 2. Product search intent */
    var searchTriggers = /\b(find|search|show|looking|want|need|buy|get|recommend|suggest|best|top|cheap|affordable|under|skincare|cream|serum|moisturizer|cleanser|product|item)\b/i;
    var isProductSearch = searchTriggers.test(text) || text.split(' ').length <= 4;

    if (isProductSearch) {
      searchProducts(text, function(err, products) {
        setTimeout(function() {
          self.hideTyping();
          if (!err && products.length > 0) {
            self.addProductsMessage(
              'Here\'s what I found for "' + text + '":',
              products
            );
          } else {
            self.addBotMessage(
              'I searched for "' + text + '" but couldn\'t find matching products. Try different keywords or browse our collection!',
              ['Browse all products', 'Contact support', 'Try again']
            );
          }
          self.sendBtn.disabled = false;
        }, delay);
      });
      return;
    }

    /* 3. Fallback */
    setTimeout(function() {
      self.hideTyping();
      self.addBotMessage(
        'I\'m not sure I understand. Let me help you with:',
        ['Find products', 'Shipping info', 'Return policy', 'Talk to support']
      );
      self.sendBtn.disabled = false;
    }, delay);
  };

  /* ── Init on DOM ready ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { new AiAssistant(); });
  } else {
    new AiAssistant();
  }

})();
