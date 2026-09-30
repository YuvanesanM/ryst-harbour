// RYST Harbour marketing site — progressive enhancement only. Every section
// reads and works without this file; it adds the tabs, the mobile menu, the
// calculator, live pricing and the small in-view animations.
(function () {
  'use strict';

  var doc = document;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WA = 'https://wa.me/918608008608?text=';

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function inr(n) { return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // Animates el the first time it scrolls into view. The observer's first
  // report says whether el starts on screen: if so it is left exactly as the
  // HTML shows it (no flash); if not, it is armed (hidden) until it arrives.
  // No layout is read here, so start-up never forces a reflow.
  function onceInView(el, arm, fire, margin) {
    if (reduced || !('IntersectionObserver' in window)) return;
    var first = true, armed = false;
    var io = new IntersectionObserver(function (entries) {
      var e = entries[entries.length - 1];
      if (first) {
        first = false;
        if (e.boundingClientRect.top < window.innerHeight && e.boundingClientRect.bottom > 0) { io.disconnect(); return; }
        arm(el); armed = true;
      }
      if (armed && e.isIntersecting) { io.disconnect(); fire(el); }
    }, { rootMargin: margin || '0px 0px -12% 0px' });
    io.observe(el);
  }

  /* ── Navigation: scrolled state + mobile drawer ──────────────────────── */
  var nav = $('#nav'), toggle = $('.nav__toggle'), drawer = $('#drawer');
  function onScrollNav() { nav.classList.toggle('is-scrolled', window.scrollY > 8); }
  function setDrawer(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    drawer.classList.toggle('is-open', open);
    doc.body.classList.toggle('is-locked', open);
    if (open) { var first = $('a', drawer); if (first) first.focus(); }
  }
  toggle.addEventListener('click', function () { setDrawer(toggle.getAttribute('aria-expanded') !== 'true'); });
  drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setDrawer(false); });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) { setDrawer(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 981px)').addEventListener('change', function (m) { if (m.matches) setDrawer(false); });

  /* ── Tabs (WAI-ARIA tabs, automatic activation) ──────────────────────── */
  $$('[data-tabs]').forEach(function (group) {
    var list = $('[role="tablist"]', group);
    var tabs = $$('[role="tab"]', list);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab, panel = doc.getElementById(t.getAttribute('aria-controls'));
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (!panel) return;
        if (on && panel.hidden) {
          panel.hidden = false;
          if (!reduced) {
            panel.classList.add('is-entering');
            panel.addEventListener('animationend', function done() { panel.classList.remove('is-entering'); panel.removeEventListener('animationend', done); });
          }
          $$('[data-inview]', panel).forEach(countUp);
        } else if (!on) panel.hidden = true;
      });
      if (focus) tab.focus();
      // Keep the chosen tab visible when the tab row scrolls sideways (mobile).
      if (list.scrollWidth > list.clientWidth) {
        var left = tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2;
        list.scrollTo({ left: left, behavior: reduced ? 'auto' : 'smooth' });
      }
    }
    list.addEventListener('click', function (e) { var t = e.target.closest('[role="tab"]'); if (t) select(t); });
    list.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(doc.activeElement); if (i < 0) return;
      var next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next == null) return;
      e.preventDefault();
      select(tabs[(next + tabs.length) % tabs.length], true);
    });
  });

  /* ── Count-up numbers and bars in the dashboard mock ─────────────────── */
  function fmt(el, v) {
    return (el.dataset.format === 'inr' ? inr(v) : Math.round(v).toLocaleString('en-IN')) + (el.dataset.suffix || '');
  }
  function countUp(scope) {
    scope.classList.remove('is-pending');
    $$('[data-count]', scope).forEach(function (el) {
      var to = Number(el.dataset.count), t0 = null;
      if (reduced) { el.textContent = fmt(el, to); return; }
      requestAnimationFrame(function step(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(el, to * e);
        if (p < 1) requestAnimationFrame(step);
      });
      setTimeout(function () { el.textContent = fmt(el, to); }, 1300);
    });
  }
  $$('.dash[data-inview]').forEach(function (dash) {
    onceInView(dash, function (d) {
      d.classList.add('is-pending');
      $$('[data-count]', d).forEach(function (el) { el.textContent = fmt(el, 0); });
    }, countUp);
  });

  /* ── Reveal on scroll ────────────────────────────────────────────────── */
  $$('.reveal').forEach(function (el) {
    onceInView(el, function (x) { x.classList.add('is-pending'); }, function (x) { x.classList.remove('is-pending'); }, '0px 0px -8% 0px');
  });

  /* ── WhatsApp conversation plays message by message ──────────────────── */
  $$('[data-chat]').forEach(function (chat) {
    var steps = $$('[data-step]', chat);
    onceInView(chat, function (c) { c.classList.add('is-armed'); }, function () {
      var i = 0;
      (function next() {
        if (i >= steps.length) return;
        var s = steps[i++];
        s.classList.add('is-shown');
        if (s.classList.contains('typing')) setTimeout(function () { s.classList.remove('is-shown'); next(); }, 900);
        else setTimeout(next, s.classList.contains('wa-msg') ? 1000 : 450);
      })();
    }, '0px 0px -20% 0px');
  });

  /* ── Caretaker app: English / Tamil ──────────────────────────────────── */
  $$('[data-lang-set]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.dataset.langSet;
      $$('[data-lang-set]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      $$('[data-lang-pane]').forEach(function (p) { p.hidden = p.dataset.langPane !== lang; });
    });
  });

  /* ── Scroll-linked: hero parallax, timeline progress, sticky dock ────── */
  var heroImg = $('[data-parallax]'), timeline = $('[data-timeline]');
  var line = timeline && $('.timeline__line', timeline), steps = timeline ? $$('.step', timeline) : [];
  var dock = $('#dock'), heroCtas = $('.hero__ctas'), finalCta = $('#contact'), ticking = false;
  var vertical = window.matchMedia('(max-width: 900px)');

  function onScroll() {
    ticking = false;
    var vh = window.innerHeight;
    onScrollNav();
    if (heroImg && !reduced) {
      var r = heroImg.parentNode.parentNode.getBoundingClientRect();
      if (r.bottom > 0) heroImg.style.transform = 'translate3d(0,' + (-Math.min(1, Math.max(0, -r.top / r.height)) * 10).toFixed(2) + '%,0)';
    }
    if (timeline) {
      var tr = timeline.getBoundingClientRect(), mark = vh * 0.62;
      var p = reduced ? 1 : Math.min(1, Math.max(0, (mark - tr.top) / (tr.height * (vertical.matches ? 0.92 : 0.6))));
      line.style.setProperty('--p', p.toFixed(3));
      steps.forEach(function (s) { s.classList.toggle('is-on', reduced || $('.step__dot', s).getBoundingClientRect().top < mark); });
    }
    if (dock && heroCtas) {
      var past = heroCtas.getBoundingClientRect().bottom < 0;
      var atEnd = finalCta && finalCta.getBoundingClientRect().top < vh;
      dock.classList.toggle('is-shown', past && !atEnd);
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  requestAnimationFrame(onScroll);

  /* ── ROI calculator ──────────────────────────────────────────────────── */
  var roi = $('[data-roi]');
  if (roi) {
    var inputs = {}, outs = {};
    $$('[data-in]', roi).forEach(function (el) { inputs[el.dataset.in] = el; });
    $$('[data-out]', roi).forEach(function (el) { outs[el.dataset.out] = el; });
    var calc = function () {
      var v = {};
      Object.keys(inputs).forEach(function (k) {
        var el = inputs[k];
        v[k] = Number(el.value);
        el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
        var txt = k === 'rev' ? inr(v[k]) : v[k] + '%';
        el.setAttribute('aria-valuetext', txt);
        outs[k].textContent = txt;
      });
      var paid = v.rev * v.ota / 100 * v.com / 100, save = paid * v.move / 100;
      outs.paid.textContent = inr(paid);
      outs.save.textContent = inr(save);
      outs.month.textContent = inr(save / 12);
    };
    roi.addEventListener('input', calc);
    calc();
  }

  /* ── Pricing: published prices, replaced by the live plans when they load
        (Settings → Billing settings is the source of truth). ───────────── */
  var plansEl = $('#plans');
  if (plansEl) {
    var FEATURES = { calendar: 'Channel calendar sync', bookingSite: 'Direct booking website', dashboard: 'Owner dashboard', whatsapp: 'WhatsApp automation', caretaker: 'Caretaker app', gstInvoices: 'GST invoices', prioritySupport: 'Priority support' };
    var data = { gstPercent: 18, pricesIncludeGst: false, annualMonths: 10, minTermMonths: 6, noticeDays: 30, trialDays: 7, plans: [
      { key: 'starter', name: 'Starter', monthly: 3499, annual: 34990, setup: 9999, features: ['calendar', 'bookingSite', 'dashboard'] },
      { key: 'growth', name: 'Growth', monthly: 5499, annual: 54990, setup: 19999, features: ['calendar', 'bookingSite', 'dashboard', 'whatsapp', 'caretaker'] },
      { key: 'pro', name: 'Pro', monthly: 7499, annual: 74990, setup: 29999, features: ['calendar', 'bookingSite', 'dashboard', 'whatsapp', 'caretaker', 'gstInvoices', 'prioritySupport'] } ] };
    var cycle = 'monthly';
    var tick = '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>';
    var renderPlans = function () {
      var tax = data.pricesIncludeGst ? 'incl. GST' : '+ GST';
      var featured = data.plans.length > 2 ? data.plans[1].key : null;
      plansEl.innerHTML = data.plans.map(function (p, i) {
        var prev = i ? data.plans[i - 1] : null;
        var feats = (p.features || []).filter(function (f) { return !prev || (prev.features || []).indexOf(f) < 0; });
        var pop = p.key === featured;
        return '<article class="plan' + (pop ? ' plan--featured' : '') + '">'
          + '<h3 class="plan__name">' + esc(p.name) + (pop ? ' <span class="plan__badge">Popular</span>' : '') + '</h3>'
          + '<p class="plan__price"><b>' + inr(cycle === 'annual' ? p.annual : p.monthly) + '</b><span>/ ' + (cycle === 'annual' ? 'year' : 'month') + ' ' + tax + '</span></p>'
          + (cycle === 'annual' && p.monthly ? '<p class="plan__note">≈ ' + inr(p.annual / 12) + ' / month · save ' + inr(p.monthly * 12 - p.annual) + ' a year</p>' : '')
          + '<p class="plan__setup">+ ' + inr(p.setup) + ' one-time setup</p>'
          + '<ul>' + (prev ? '<li>' + tick + 'Everything in ' + esc(prev.name) + '</li>' : '') + feats.map(function (f) { return '<li>' + tick + esc(FEATURES[f] || f) + '</li>'; }).join('') + '</ul>'
          + '<a class="btn' + (pop ? '' : ' btn--secondary') + '" href="' + WA + encodeURIComponent('Hi, I\'m interested in the RYST Harbour ' + p.name + ' plan for my villa.') + '" target="_blank" rel="noopener">Book a demo <span class="btn__arrow" aria-hidden="true">→</span></a>'
          + '</article>';
      }).join('');
      // Side-by-side comparison, built from the same plan data as the cards.
      var table = $('#ptable');
      if (table) {
        var keys = Object.keys(FEATURES);
        data.plans.forEach(function (p) { (p.features || []).forEach(function (f) { if (keys.indexOf(f) < 0) keys.push(f); }); });
        var yes = '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg><span class="sr-only">Included</span>';
        var no = '<span class="ptable__no" aria-hidden="true">—</span><span class="sr-only">Not included</span>';
        var row = function (label, cells) { return '<tr><th scope="row">' + label + '</th>' + cells.join('') + '</tr>'; };
        var cls = function (p) { return p.key === featured ? ' class="is-featured"' : ''; };
        table.innerHTML = '<caption class="sr-only">Compare plans</caption><thead><tr><td></td>'
          + data.plans.map(function (p) { return '<th scope="col"' + cls(p) + '>' + esc(p.name) + '</th>'; }).join('') + '</tr></thead><tbody>'
          + row('Monthly', data.plans.map(function (p) { return '<td' + cls(p) + '>' + inr(p.monthly) + '</td>'; }))
          + row('Annual', data.plans.map(function (p) { return '<td' + cls(p) + '>' + inr(p.annual) + '</td>'; }))
          + row('One-time setup', data.plans.map(function (p) { return '<td' + cls(p) + '>' + inr(p.setup) + '</td>'; }))
          + keys.map(function (f) { return row(esc(FEATURES[f] || f), data.plans.map(function (p) { return '<td' + cls(p) + '>' + ((p.features || []).indexOf(f) >= 0 ? yes : no) + '</td>'; })); }).join('')
          + '</tbody>';
      }
      var free = 12 - data.annualMonths;
      $('#terms').textContent = 'Per villa. ' + (data.pricesIncludeGst ? 'Prices include GST. ' : 'GST extra (' + data.gstPercent + '%). ')
        + 'Annual billing gets ' + free + ' months free. ' + (data.minTermMonths ? data.minTermMonths + '-month minimum term, ' : '') + (data.noticeDays ? data.noticeDays + ' days\' notice. ' : '')
        + 'Domain and payment gateway fees are paid directly by the owner. Every plan starts with a ' + data.trialDays + '-day free trial.';
      $$('[data-trial]').forEach(function (el) { el.textContent = data.trialDays + '-day'; });
      $$('[data-free]').forEach(function (el) { el.textContent = free + ' months'; });
      $$('[data-cycle]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cycle === cycle)); });
    };
    $$('[data-cycle]').forEach(function (b) { b.addEventListener('click', function () { cycle = b.dataset.cycle; renderPlans(); }); });
    renderPlans();
    fetch('https://data.ryst.in/harbour/plans', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && Array.isArray(d.plans) && d.plans.length) { data = d; renderPlans(); } })
      .catch(function () {});
  }

  /* ── Testimonials appear only once real quotes are added ─────────────── */
  var stories = $('[data-testimonials]');
  if (stories && $('.quote', stories)) stories.hidden = false;

  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
