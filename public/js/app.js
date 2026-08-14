/* ÉCRU front-end interactions.
   Progressive enhancement only: every control works without this file,
   it just works more gracefully with it. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------------------------------------------------------- Toasts */

  function toast(message) {
    var host = $('.toast-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    var el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">' +
      '<path d="M3 8.5l3.2 3.2L13 5"/></svg><span></span>';
    el.querySelector('span').textContent = message;
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-visible'); });
    setTimeout(function () {
      el.classList.remove('is-visible');
      setTimeout(function () { el.remove(); }, 400);
    }, 3200);
  }
  window.ecruToast = toast;

  /* ------------------------------------------------------- Sticky nav state */

  var nav = $('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('is-stuck', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------ Mobile menu */

  var menu = $('.menu');
  var menuOpen = $('[data-menu-open]');
  var menuClose = $('[data-menu-close]');

  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (menuOpen) menuOpen.setAttribute('aria-expanded', String(open));
    if (open) { var first = $('a, button', menu); if (first) first.focus(); }
  }
  if (menuOpen) menuOpen.addEventListener('click', function () { setMenu(true); });
  if (menuClose) menuClose.addEventListener('click', function () { setMenu(false); });

  /* ----------------------------------------------------------- Search panel */

  var searchbar = $('.searchbar');
  var searchToggle = $('[data-search-toggle]');
  if (searchToggle && searchbar) {
    searchToggle.addEventListener('click', function () {
      var open = !searchbar.classList.contains('is-open');
      searchbar.classList.toggle('is-open', open);
      searchToggle.setAttribute('aria-expanded', String(open));
      if (open) { var input = $('input', searchbar); if (input) setTimeout(function () { input.focus(); }, 220); }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (menu && menu.classList.contains('is-open')) setMenu(false);
    if (searchbar && searchbar.classList.contains('is-open')) {
      searchbar.classList.remove('is-open');
      if (searchToggle) searchToggle.setAttribute('aria-expanded', 'false');
    }
  });

  /* ------------------------------------------------------- Reveal on scroll */

  var revealables = $$('.reveal');
  if (revealables.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealables.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealables.forEach(function (el) { io.observe(el); });
    }
  }

  /* --------------------------------------------------------------- Wishlist */
  /* Client-side only. The schema has no wishlist table. Swap the read/write
     helpers for fetch() calls once a /wishlist endpoint exists. */

  var WISH_KEY = 'ecru:wishlist';

  function readWishlist() {
    try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; }
    catch (err) { return []; }
  }
  function writeWishlist(ids) {
    try { localStorage.setItem(WISH_KEY, JSON.stringify(ids)); } catch (err) { /* private mode */ }
  }
  function syncWishCount() {
    var badge = $('[data-wish-count]');
    if (!badge) return;
    var n = readWishlist().length;
    badge.textContent = n;
    badge.classList.toggle('is-visible', n > 0);
  }

  function paintWishButtons() {
    var ids = readWishlist();
    $$('.wish').forEach(function (btn) {
      var on = ids.indexOf(btn.dataset.wish) !== -1;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
      var label = btn.querySelector('.visually-hidden');
      if (label) label.textContent = (on ? 'Remove from' : 'Add to') + ' wishlist';
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.wish') : null;
    if (!btn) return;
    e.preventDefault();
    var id = btn.dataset.wish;
    var ids = readWishlist();
    var i = ids.indexOf(id);
    if (i === -1) { ids.push(id); toast('Saved to wishlist'); }
    else { ids.splice(i, 1); toast('Removed from wishlist'); }
    writeWishlist(ids);
    paintWishButtons();
    syncWishCount();
    document.dispatchEvent(new CustomEvent('ecru:wishlist', { detail: { ids: ids } }));
  });

  paintWishButtons();
  syncWishCount();

  /* Wishlist page: hide anything not saved */
  var wishGrid = $('[data-wishlist-grid]');
  if (wishGrid) {
    var wishEmpty = $('[data-wishlist-empty]');
    var renderWishlist = function () {
      var ids = readWishlist();
      var shown = 0;
      $$('[data-product-id]', wishGrid).forEach(function (card) {
        var on = ids.indexOf(card.dataset.productId) !== -1;
        card.hidden = !on;
        if (on) shown++;
      });
      wishGrid.hidden = shown === 0;
      if (wishEmpty) wishEmpty.hidden = shown > 0;
    };
    renderWishlist();
    document.addEventListener('ecru:wishlist', renderWishlist);
  }

  /* ------------------------------------------------------ Quantity steppers */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.qty__btn') : null;
    if (!btn) return;
    var input = $('.qty__input', btn.parentElement);
    if (!input) return;
    var step = btn.dataset.step === 'down' ? -1 : 1;
    var min = parseInt(input.min, 10) || 1;
    var max = parseInt(input.max, 10) || 999;
    var next = Math.min(max, Math.max(min, (parseInt(input.value, 10) || min) + step));
    input.value = next;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* -------------------------------------------------------------- Accordion */

  $$('.accordion__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (panel) panel.classList.toggle('is-open', !open);
    });
  });

  /* ---------------------------------------------------------------- Gallery */

  var galleryMain = $('[data-gallery-main]');
  if (galleryMain) {
    $$('[data-gallery-thumb]').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        $$('[data-gallery-thumb]').forEach(function (t) {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        thumb.classList.add('is-active');
        thumb.setAttribute('aria-selected', 'true');
        if (reduceMotion) {
          galleryMain.innerHTML = thumb.innerHTML;
          return;
        }
        galleryMain.style.opacity = '0';
        setTimeout(function () {
          galleryMain.innerHTML = thumb.innerHTML;
          galleryMain.style.opacity = '1';
        }, 160);
      });
    });
    galleryMain.style.transition = 'opacity 160ms ease';
  }

  /* --------------------------------------------------------------- Variants */

  $$('[data-variant-group]').forEach(function (group) {
    group.addEventListener('click', function (e) {
      var opt = e.target.closest ? e.target.closest('.variant, .swatch') : null;
      if (!opt || !group.contains(opt)) return;
      $$('.variant, .swatch', group).forEach(function (o) {
        o.classList.remove('is-active');
        o.setAttribute('aria-checked', 'false');
      });
      opt.classList.add('is-active');
      opt.setAttribute('aria-checked', 'true');
      var out = $('[data-variant-value]', group.closest('.variants') || group);
      if (out) out.textContent = opt.dataset.value || opt.textContent.trim();
    });
  });

  /* ------------------------------------------------- Sticky mobile buy bar */

  var buyBar = $('.buy-bar');
  var buyAnchor = $('[data-buy-anchor]');
  if (buyBar && buyAnchor && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      buyBar.classList.toggle('is-visible', !entries[0].isIntersecting);
    }, { rootMargin: '-120px 0px 0px 0px' }).observe(buyAnchor);
  }

  /* ------------------------------------------------ Cart-count optimisation */
  /* Bump the header badge immediately on submit so the interaction feels
     instant; the server-rendered count is authoritative on the next load. */

  $$('form[data-cart-form]').forEach(function (form) {
    form.addEventListener('submit', function () {
      var badge = $('[data-cart-count]');
      if (!badge) return;
      var qtyInput = $('.qty__input', form) || $('[name="quantity"]', form);
      var add = Math.max(1, parseInt(qtyInput && qtyInput.value, 10) || 1);
      var next = (parseInt(badge.textContent, 10) || 0) + add;
      badge.textContent = next;
      badge.classList.add('is-visible');
      badge.animate
        && !reduceMotion
        && badge.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }],
          { duration: 420, easing: 'cubic-bezier(0.16,1,0.3,1)' }
        );
    });
  });

  /* --------------------------------------------------------- Sort & filters */

  var sortSelect = $('[data-sort]');
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      var url = new URL(window.location.href);
      if (sortSelect.value) url.searchParams.set('sort', sortSelect.value);
      else url.searchParams.delete('sort');
      window.location.href = url.toString();
    });
  }

  var filtersToggle = $('[data-filters-toggle]');
  var filtersPanel = $('.filters');
  if (filtersToggle && filtersPanel) {
    filtersToggle.addEventListener('click', function () {
      var open = !filtersPanel.classList.contains('is-open');
      filtersPanel.classList.toggle('is-open', open);
      filtersToggle.setAttribute('aria-expanded', String(open));
    });
  }
})();
