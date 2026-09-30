// RYST Harbour — the staff sidebar, one definition for the dashboard and
// every module page. Load it in <head> (not deferred): it marks <html> at
// once so the page reserves the sidebar's space before first paint, then
// builds the sidebar as soon as <body> exists.
//
// Links follow the same access rules as the dashboard and the server: owners
// see everything; coordinators and caretakers see the modules granted to them
// in Settings → Team (a caretaker with no saved list gets the server's
// default); a plan without the caretaker app hides Checklists and Issues.
(function () {
  'use strict';
  var doc = document;
  var ls = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  // login.html is the sign-in screen as well as the dashboard: it opts out of
  // the automatic sidebar (data-hsb-manual) and mounts it once signed in.
  var manual = doc.documentElement.hasAttribute('data-hsb-manual');
  var mounted = false;

  var ICONS = {
    home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    cal: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    check: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
    doc: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    rupee: '<path d="M7 4h10M7 8.5h10M14 20l-7-7h2.5a4.5 4.5 0 0 0 0-9"/>',
    chart: '<path d="M3 3v18h18"/><path d="M8 17v-4M13 17V8M18 17v-7"/>',
    food: '<path d="M7 2v20M4 2v6a3 3 0 0 0 6 0V2M17 2c-2 0-3 2-3 6s1 5 3 5v9"/>',
    star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  };

  // [href, icon, label, module] — module mirrors MODULES in the proxy's server.js.
  var NAV = [
    { items: [['login.html', 'home', 'Dashboard'], ['bookings.html', 'cal', 'Calendar', 'bookings'],
      ['guest-register.html', 'list', 'Bookings', 'guestRegister'], ['guest-register.html?f=inhouse', 'users', 'Guests', 'guestRegister']] },
    { label: 'Operations', items: [['checklist.html', 'check', 'Checklists', 'checklist'], ['issues.html', 'tool', 'Issues & Maintenance', 'checklist'],
      ['inventory.html', 'box', 'Inventory', 'inventory'], ['petty-cash.html', 'wallet', 'Petty Cash', 'petty-cash']] },
    { label: 'Finance', items: [['stay.html', 'doc', 'Quotes & Invoices', 'bookings'], ['guest-register.html?f=unpaid', 'rupee', 'Payments', 'guestRegister'],
      ['reports.html', 'chart', 'Profit & Loss', 'reports']] },
    { label: 'Property', items: [['restaurant.html', 'food', '{restaurantName}', 'restaurant'], ['reviews.html', 'star', 'Guest Feedback', 'feedback']] },
    { label: 'System', items: [['settings.html', 'gear', 'Settings', 'settings']] }
  ];

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var t = function (s) { return window.rystT ? window.rystT(s) : s; };
  var noCaretakerPlan = false;

  function modules() {
    var role = ls('ryst_user_role') || 'owner', mods;
    try { mods = JSON.parse(ls('ryst_user_modules') || 'null'); } catch (e) { mods = null; }
    if (!Array.isArray(mods)) mods = role === 'caretaker' ? ['petty-cash', 'inventory', 'checklist', 'guestRegister'] : [];
    return { role: role, mods: mods };
  }
  function allowed(mod, acc) {
    if (!mod) return true;
    if (mod === 'checklist' && noCaretakerPlan) return false;
    return acc.role === 'owner' || acc.mods.indexOf(mod) >= 0;
  }
  // The current page: an exact match (with its ?f= filter) wins, else the bare file.
  function currentHref() {
    var file = (location.pathname.split('/').pop() || 'login.html').toLowerCase();
    var f = new URLSearchParams(location.search).get('f');
    var exact = file + (f ? '?f=' + f : '');
    var all = []; NAV.forEach(function (g) { g.items.forEach(function (i) { all.push(i[0]); }); });
    return all.indexOf(exact) >= 0 ? exact : (all.indexOf(file) >= 0 ? file : '');
  }
  function label(s) {
    if (s === '{restaurantName}') return (window.PROPERTY && window.PROPERTY.restaurantName) || 'Casa de RYST';
    return t(s);
  }

  function build() {
    var acc = modules(), cur = currentHref();
    var svg = function (i) { return '<svg class="hsb__i" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[i] + '</svg>'; };
    var html = NAV.map(function (g) {
      var links = g.items.map(function (i) {
        return '<a class="hsb__link" href="' + i[0] + '"' + (i[3] ? ' data-module="' + i[3] + '"' : '') + (i[0] === cur ? ' aria-current="page"' : '')
          + (allowed(i[3], acc) ? '' : ' hidden') + '>' + svg(i[1]) + '<span' + (i[2] === '{restaurantName}' ? ' data-hsb-rest' : '') + '>' + esc(label(i[2])) + '</span></a>';
      }).join('');
      if (!g.label) return links;
      var any = g.items.some(function (i) { return allowed(i[3], acc); });
      return '<div class="hsb__group"' + (any ? '' : ' hidden') + '><p class="hsb__label">' + esc(t(g.label)) + '</p>' + links + '</div>';
    }).join('');
    var villa = (window.PROPERTY && window.PROPERTY.name) || '', email = ls('ryst_user_email') || '';
    var aside = doc.querySelector('.hsb') || doc.createElement('aside');
    aside.className = 'hsb';
    aside.setAttribute('aria-label', 'Harbour');
    aside.innerHTML = '<a class="hsb__brand" href="login.html">RYST HARBOUR</a><nav class="hsb__nav" aria-label="Modules">' + html + '</nav>'
      + '<div class="hsb__foot" data-no-i18n><b data-hsb-villa>' + esc(villa) + '</b>' + esc(email) + '</div>';
    if (!aside.parentNode) doc.body.insertBefore(aside, doc.body.firstChild);
    doc.body.classList.toggle('hsb-demo', ls('ryst_demo') === '1');
  }
  function refreshProperty() {
    var p = window.PROPERTY || {};
    var r = doc.querySelector('[data-hsb-rest]'); if (r && p.restaurantName) r.textContent = p.restaurantName;
    var v = doc.querySelector('[data-hsb-villa]'); if (v && p.name) v.textContent = p.name;
  }

  function mount() {
    mounted = true;
    doc.documentElement.classList.add('has-hsb');
    if (doc.body) build(); else doc.addEventListener('DOMContentLoaded', build);
  }
  function unmount() {
    mounted = false;
    doc.documentElement.classList.remove('has-hsb');
    var a = doc.querySelector('.hsb'); if (a) a.remove();
  }
  // Module pages: signed-out visitors are sent to login.html by the page itself.
  if (!manual && ls('ryst_proxy_token')) mount();
  doc.addEventListener('property-updated', refreshProperty);
  doc.addEventListener('plan-features', function (e) {
    if (Array.isArray(e.detail) && e.detail.indexOf('caretaker') < 0) { noCaretakerPlan = true; if (mounted && doc.body) build(); }
  });
  window.rystShell = { mount: mount, unmount: unmount, refresh: function () { if (mounted && doc.body) build(); } };
})();
