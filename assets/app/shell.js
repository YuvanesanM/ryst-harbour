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
  // Collapsed to an icon rail? Remembered per browser; set now so there's no jump.
  if (ls('ryst_sidebar') === 'collapsed') doc.documentElement.classList.add('hsb-collapsed');
  var collapsed = function () { return doc.documentElement.classList.contains('hsb-collapsed'); };
  // The Harbour colour scheme applies to every staff page (and the sign-in screen).
  if (manual || ls('ryst_proxy_token')) doc.documentElement.classList.add('hth');
  // Which staff page this is (pg-bookings, pg-issues, …) for the few page-specific theme rules.
  doc.documentElement.classList.add('pg-' + ((location.pathname.split('/').pop() || 'login.html').replace(/\.html$/, '') || 'login'));

  var ICONS = {
    home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    villa: '<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-5h6v5"/>',
    lang: '<path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c0 4-3 7-7 8M13 21l4-9 4 9M14.5 18h5"/>',
    out: '<path d="M14 7l5 5-5 5M19 12H7M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15.5 10l-2 2 2 2"/>',
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
    team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 11.5l2 2 4-4"/>',
    star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  };

  // [href, icon, label, module] — module mirrors MODULES in the proxy's server.js
  // ('owner': owners only, like the proxy's /team).
  var NAV = [
    { items: [['login.html', 'home', 'Dashboard'], ['bookings.html', 'cal', 'Calendar', 'bookings'],
      ['guest-register.html', 'list', 'Bookings', 'guestRegister'], ['guest-register.html?f=inhouse', 'users', 'Guests', 'guestRegister']] },
    { label: 'Operations', items: [['checklist.html', 'check', 'Checklists', 'checklist'], ['issues.html', 'tool', 'Issues & Maintenance', 'checklist'],
      ['inventory.html', 'box', 'Inventory', 'inventory'], ['petty-cash.html', 'wallet', 'Petty Cash', 'petty-cash'],
      ['caretakers.html', 'team', 'Caretakers', 'owner']] },
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
    if (mod === 'owner') return acc.role === 'owner';
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
    if (s === '{restaurantName}') return (window.PROPERTY && window.PROPERTY.restaurantName) || t('Restaurant');
    return t(s);
  }

  function build() {
    var acc = modules(), cur = currentHref();
    var svg = function (i) { return '<svg class="hsb__i" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[i] + '</svg>'; };
    var html = NAV.map(function (g) {
      var links = g.items.map(function (i) {
        return '<a class="hsb__link" href="' + i[0] + '" title="' + esc(label(i[2])) + '"' + (i[3] ? ' data-module="' + i[3] + '"' : '') + (i[0] === cur ? ' aria-current="page"' : '')
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
    aside.id = 'hsb';
    aside.innerHTML = '<div class="hsb__top"><a class="hsb__brand" href="login.html">RYST HARBOUR</a>'
      + '<button type="button" class="hsb__toggle" aria-controls="hsb" aria-expanded="' + !collapsed() + '" aria-label="' + (collapsed() ? 'Expand sidebar' : 'Collapse sidebar') + '" title="' + (collapsed() ? 'Expand sidebar' : 'Collapse sidebar') + '">' + svg('panel') + '</button></div>'
      + '<nav class="hsb__nav" aria-label="Modules">' + html + '</nav>'
      + '<div class="hsb__foot" data-no-i18n><b data-hsb-villa>' + esc(villa) + '</b>' + esc(email) + '</div>';
    if (!aside.parentNode) doc.body.insertBefore(aside, doc.body.firstChild);
    $toggle(aside);
    // Animate only user toggles, never the first paint.
    setTimeout(function () { doc.documentElement.classList.add('hsb-ready'); }, 50);
    doc.body.classList.toggle('hsb-demo', ls('ryst_demo') === '1');
  }
  // ── Top bar for module pages: the dashboard's header (property, date,
  // "+ New", notifications, account). Each page keeps its own title and
  // action buttons in its header, just below.
  var NEW = [['stay.html?new=invoice', 'cal', 'New booking', 'bookings'], ['stay.html?new=quote', 'doc', 'New quote', 'bookings'],
    ['guest-register.html?f=unpaid', 'rupee', 'Record payment', 'guestRegister'], ['issues.html#report', 'tool', 'Report issue', 'checklist'],
    ['petty-cash.html#add', 'wallet', 'Add expense', 'petty-cash'], ['inventory.html#add', 'box', 'Add inventory', 'inventory']];
  function buildTopbar() {
    if (manual || doc.querySelector('.htb')) return;
    var acc = modules(), svg = function (i) { return '<svg class="htb__i" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[i] + '</svg>'; };
    var p = window.PROPERTY || {}, email = ls('ryst_user_email') || '', name = ls('ryst_user_name') || '';
    var role = acc.role.charAt(0).toUpperCase() + acc.role.slice(1);
    var news = NEW.filter(function (n) { return allowed(n[3], acc); });
    var date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    var bar = doc.createElement('header');
    bar.className = 'htb';
    bar.innerHTML = '<a class="htb__brand" href="login.html">RYST HARBOUR</a>'
      + '<span class="htb__prop" title="Signed in to this property">' + svg('villa') + '<span data-hsb-villa2>' + esc(p.name || '') + '</span></span>'
      + '<span class="htb__date" data-no-i18n>' + esc(date) + '</span>'
      + '<div class="htb__act">'
      + (news.length ? '<div class="htb__wrap"><button type="button" class="htb__new" aria-haspopup="true" aria-expanded="false" aria-controls="htbNew" aria-label="' + esc(t('New')) + '">' + svg('plus') + '<span>' + esc(t('New')) + '</span></button>'
        + '<div class="htb__menu" id="htbNew" hidden><div class="htb__list">' + news.map(function (n) { return '<a class="htb__item" href="' + n[0] + '">' + svg(n[1]) + '<span>' + esc(t(n[2])) + '</span></a>'; }).join('') + '</div></div></div>' : '')
      + '<a class="htb__icon" href="login.html" title="' + esc(t('Needs attention')) + '" aria-label="' + esc(t('Needs attention')) + ' — ' + esc(t('Dashboard')) + '">' + svg('bell') + '</a>'
      + '<div class="htb__wrap"><button type="button" class="htb__avatar" aria-haspopup="true" aria-expanded="false" aria-controls="htbMe" aria-label="Your account">' + esc((name || email || 'R').charAt(0).toUpperCase()) + '</button>'
      + '<div class="htb__menu" id="htbMe" hidden><div class="htb__head" data-no-i18n><b>' + esc(name || email.split('@')[0] || 'Signed in') + '</b><span>' + esc(email) + '</span><span class="htb__role">' + esc(t(role)) + '</span></div>'
      + '<div class="htb__list">' + (window.rystSetLang ? '<button type="button" class="htb__item" data-htb-lang>' + svg('lang') + '<span data-no-i18n>' + (window.RYST_LANG === 'ta' ? 'English' : 'தமிழ்') + '</span></button>' : '')
      + '<a class="htb__item" href="/privacy.html">' + svg('lock') + '<span>' + esc(t('Privacy & terms')) + '</span></a>'
      + '<a class="htb__item" href="login.html#delete-account">' + svg('trash') + '<span>' + esc(t('Delete account')) + '</span></a>'
      + '<button type="button" class="htb__item htb__item--danger" data-htb-out>' + svg('out') + '<span>' + esc(t('⎋ Log out').replace(/^⎋\s*/, '')) + '</span></button></div></div></div>'
      + '</div>';
    var aside = doc.querySelector('.hsb');
    doc.body.insertBefore(bar, aside ? aside.nextSibling : doc.body.firstChild);
    var open = null;
    var close = function () { if (!open) return; open.menu.hidden = true; open.btn.setAttribute('aria-expanded', 'false'); open = null; };
    bar.querySelectorAll('[aria-controls]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var menu = doc.getElementById(btn.getAttribute('aria-controls')), was = open && open.menu === menu;
        close(); if (was) return;
        menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); open = { menu: menu, btn: btn };
        var first = menu.querySelector('a,button'); if (first) first.focus();
      });
    });
    doc.addEventListener('click', function (e) { if (open && !open.menu.contains(e.target)) close(); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) { var b = open.btn; close(); b.focus(); } });
    var lang = bar.querySelector('[data-htb-lang]');
    if (lang) lang.addEventListener('click', function () { window.rystSetLang(window.RYST_LANG === 'ta' ? 'en' : 'ta'); });
    bar.querySelector('[data-htb-out]').addEventListener('click', function () {
      if (ls('ryst_demo') === '1' && window.rystExitDemo) { window.rystExitDemo(); return; }
      ['ryst_proxy_token', 'ryst_user_email', 'ryst_user_role', 'ryst_user_admin', 'ryst_user_modules', 'ryst_user_name'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
      location.href = 'login.html';
    });
  }
  // ── Bottom navigation for phones: Home / Calendar / + / Tasks / More,
  // the same as the dashboard's. Menus open as bottom sheets.
  var TASKS = [['checklist.html', 'check', 'Checklists', 'checklist'], ['issues.html', 'tool', 'Issues & Maintenance', 'checklist'],
    ['inventory.html', 'box', 'Inventory', 'inventory'], ['petty-cash.html', 'wallet', 'Petty Cash', 'petty-cash']];
  function buildBottomNav() {
    if (manual || doc.querySelector('.hbn')) return;
    var acc = modules(), cur = currentHref(), svg = function (i) { return '<svg class="htb__i" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[i] + '</svg>'; };
    var second = allowed('bookings', acc) ? ['bookings.html', 'cal', 'Calendar'] : allowed('checklist', acc) ? ['issues.html', 'tool', 'Issues']
      : allowed('guestRegister', acc) ? ['guest-register.html', 'list', 'Bookings'] : null;
    var tasks = TASKS.filter(function (x) { return allowed(x[3], acc); });
    var more = []; NAV.forEach(function (g) { g.items.forEach(function (i) { if (i[0] !== 'login.html' && allowed(i[3], acc)) more.push(i); }); });
    var news = NEW.filter(function (n) { return allowed(n[3], acc); });
    var inTasks = tasks.some(function (x) { return x[0] === cur; }) && !(second && second[0] === cur);
    var here = function (on) { return on ? ' aria-current="page"' : ''; };
    var nav = doc.createElement('nav');
    nav.className = 'hbn';
    nav.setAttribute('aria-label', 'Quick navigation');
    nav.innerHTML = '<a class="hbn__i" href="login.html">' + svg('home') + '<span>' + esc(t('Home')) + '</span></a>'
      + (second ? '<a class="hbn__i" href="' + second[0] + '"' + here(second[0] === cur) + '>' + svg(second[1]) + '<span>' + esc(t(second[2])) + '</span></a>' : '<span></span>')
      + '<button type="button" class="hbn__plus" data-sheet="new" aria-haspopup="dialog" aria-label="' + esc(t('New')) + '"' + (news.length ? '' : ' style="visibility:hidden"') + '>' + svg('plus') + '</button>'
      + (tasks.length ? '<button type="button" class="hbn__i" data-sheet="tasks" aria-haspopup="dialog"' + here(inTasks) + '>' + svg('check') + '<span>' + esc(t('Tasks')) + '</span></button>' : '<span></span>')
      + '<button type="button" class="hbn__i" data-sheet="more" aria-haspopup="dialog"' + here(!inTasks && !(second && second[0] === cur) && !!cur) + '>' + svg('more') + '<span>' + esc(t('More')) + '</span></button>';
    var list = function (rows) {
      return '<div class="hbs__list">' + rows.map(function (i) { return '<a class="hbs__item" href="' + i[0] + '"' + here(i[0] === cur) + '>' + svg(i[1]) + '<span>' + esc(label(i[2])) + '</span></a>'; }).join('') + '</div>';
    };
    var SHEETS = { 'new': ['New', news], tasks: ['Tasks', tasks], more: ['More', more] };
    var scrim = doc.createElement('div'); scrim.className = 'hbs-scrim';
    var sheet = doc.createElement('div'); sheet.className = 'hbs'; sheet.setAttribute('role', 'dialog');
    // A spacer at the end of the page keeps its last lines clear of the nav,
    // even on pages whose content overflows a fixed-height body.
    var space = doc.createElement('div'); space.className = 'hbn-space'; space.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(space); doc.body.appendChild(nav); doc.body.appendChild(scrim); doc.body.appendChild(sheet);
    var opener = null;
    var close = function () { if (!sheet.classList.contains('is-open')) return; sheet.classList.remove('is-open'); scrim.classList.remove('is-open'); if (opener) { opener.setAttribute('aria-expanded', 'false'); opener.focus(); } opener = null; };
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sheet]'); if (!b) return;
      var def = SHEETS[b.getAttribute('data-sheet')], was = opener === b;
      close(); if (was) return;
      sheet.setAttribute('aria-label', t(def[0]));
      sheet.innerHTML = '<p class="hbs__head">' + esc(t(def[0])) + '</p>' + list(def[1]);
      sheet.classList.add('is-open'); scrim.classList.add('is-open');
      opener = b; b.setAttribute('aria-expanded', 'true');
      var first = sheet.querySelector('a'); if (first) first.focus();
    });
    scrim.addEventListener('click', close);
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }
  // "+ New → Add expense/inventory, Report issue" open the form through a
  // #hash the page reads on load. Already on that page, a hash alone
  // wouldn't reload it, so reload explicitly.
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.hbs a[href*="#"], .htb__menu a[href*="#"]');
    if (!a || a.pathname !== location.pathname || a.search !== location.search) return;
    e.preventDefault(); location.hash = a.hash; location.reload();
  });
  // Demo mode's banner sits at the very bottom; keep the nav above it.
  function fitDemoBar() { var bar = doc.getElementById('rystDemoBar'); doc.documentElement.style.setProperty('--demo-h', bar ? bar.offsetHeight + 'px' : '0px'); }
  window.addEventListener('load', function () { fitDemoBar(); setTimeout(fitDemoBar, 300); });
  window.addEventListener('resize', fitDemoBar);

  function $toggle(aside) {
    var b = aside.querySelector('.hsb__toggle');
    b.addEventListener('click', function () {
      var c = !collapsed();
      doc.documentElement.classList.toggle('hsb-collapsed', c);
      try { localStorage.setItem('ryst_sidebar', c ? 'collapsed' : 'open'); } catch (e) {}
      b.setAttribute('aria-expanded', String(!c));
      b.setAttribute('aria-label', c ? 'Expand sidebar' : 'Collapse sidebar');
      b.title = c ? 'Expand sidebar' : 'Collapse sidebar';
      try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    });
  }
  function refreshProperty() {
    var p = window.PROPERTY || {};
    var r = doc.querySelector('[data-hsb-rest]'); if (r && p.restaurantName) r.textContent = p.restaurantName;
    var v = doc.querySelector('[data-hsb-villa]'); if (v && p.name) v.textContent = p.name;
    var v2 = doc.querySelector('[data-hsb-villa2]'); if (v2 && p.name) v2.textContent = p.name;
  }

  function mount() {
    mounted = true;
    doc.documentElement.classList.add('has-hsb');
    if (!manual) { doc.documentElement.classList.add('has-htb'); doc.documentElement.classList.add('has-hbn'); }
    var go = function () { build(); buildTopbar(); buildBottomNav(); fitDemoBar(); };
    if (doc.body) go(); else doc.addEventListener('DOMContentLoaded', go);
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
