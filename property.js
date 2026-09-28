// Property profile for RYST Harbour pages (staff app + guest pages).
// Every villa-specific name, address, link and logo comes from the proxy's
// public GET /property (Settings → Stay → Property profile) instead of being
// written into the page. Renders instantly from the last copy this browser
// saw (or the RYST 109A defaults below), then refreshes in the background.
//
// Markup hooks, applied on load and again after each refresh:
//   data-prop="name"            → textContent (any profile key, plus websiteHost)
//   data-prop-split="name"      → "RYST <span>109A</span>" two-tone wordmark
//   data-prop-tpl="Welcome to {name}" → textContent with {key} filled in
//   data-prop-alt="name"        → alt attribute
//   data-prop-href="mapLink"    → href
//   data-prop-src="logoUrl"     → src (only when it differs from RYST 109A's,
//                                 so RYST 109A keeps its local optimised logo)
//   data-prop-if="instagram"      → hidden while that field is empty
//   <title data-title="Petty Cash · {name}">
// Scripts read window.PROPERTY at the moment they build text (receipts,
// messages), and can listen for the 'property-updated' event.
//
// Staff pages load it as <script src="/property.js" data-staff>: they send
// the signed-in token, so each villa's staff see their own villa's profile
// (the proxy picks the villa from the token). Guest pages never send it and
// always get the villa the site belongs to.
(function(){
  var me = document.currentScript;
  var staff = !!(me && me.hasAttribute('data-staff'));
  var DEFAULTS = {
    name: 'RYST 109A', fullName: 'RYST 109A Beach Villa', restaurantName: 'Casa de RYST',
    address: '109A, Pearl Beach Site, Parmankeni, Cheyyur - 603305, Tamil Nadu',
    mapLink: 'https://maps.app.goo.gl/taBGtjLgbcMWL6mUA', website: 'https://stay.ryst.in',
    whatsapp: '918122209109', instagram: 'stay.ryst', signatory: 'YUVANESAN M',
    typeLabel: 'Beach Villa', tagline: 'Private coastal retreat',
    receiptNote: 'Thank you for dining with us — a table beside the pool.',
    logoUrl: 'https://stay.ryst.in/assets/stay-logo.png',
    coverUrl: 'https://stay.ryst.in/assets/hero-bg.webp',
    latitude: 12.3698373, longitude: 80.0782188,
    googlePlaceQuery: 'RYST 109A Pearl Beach Villa, ECR, Cheyyur'
  };
  var demo = false, token = '', villa = '';
  try { demo = localStorage.getItem('ryst_demo') === '1'; } catch (e) {}
  if (staff && !demo) {
    try {
      token = localStorage.getItem('ryst_proxy_token') || '';
      var b = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
      villa = String(JSON.parse(decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4))))).tenant || '');
    } catch (e) { villa = ''; }
    if (!/^[a-z0-9-]{2,40}$/.test(villa)) villa = '';
  } else if (!staff && !demo && window.RYST_VILLA) {
    villa = window.RYST_VILLA; // guest page opened from another villa's link (villa.js sends it as X-Villa)
  }
  // Another villa's staff: never start from RYST 109A's own details.
  var RYST_DEFAULTS = DEFAULTS;
  if (villa && villa !== 'ryst-109a') {
    DEFAULTS = { name: 'Villa', fullName: 'Villa', restaurantName: '', address: '', mapLink: '', website: '', whatsapp: '', instagram: '',
      signatory: '', typeLabel: 'Villa', tagline: '', receiptNote: '', logoUrl: 'https://harbour.ryst.in/assets/staff-icon-512.png', coverUrl: '', latitude: null, longitude: null, googlePlaceQuery: '' };
  }
  var KEY = demo ? 'ryst_property_demo' : (villa && villa !== 'ryst-109a' ? 'ryst_property_' + villa : 'ryst_property');
  window.PROPERTY_CACHE_KEY = KEY;
  window.RYST_VILLA = window.RYST_VILLA || villa;
  // Where this villa's guest pages live: RYST 109A's own site, or the
  // product's address for every other villa (same pages on both).
  window.guestSiteUrl = function(){ return villa && villa !== 'ryst-109a' ? 'https://harbour.ryst.in' : 'https://stay.ryst.in'; };
  // "&v=<villa>" for guest links built on a staff page of another villa.
  if (!window.villaLinkParam) window.villaLinkParam = function(){ return villa && villa !== 'ryst-109a' ? '&v=' + encodeURIComponent(villa) : ''; };
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}

  function derive(p){
    p.websiteHost = String(p.website || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    p.addressLine = String(p.address || '').replace(/\s*\n\s*/g, ', ');
    p.instagramUrl = p.instagram ? 'https://www.instagram.com/' + String(p.instagram).replace(/^@/, '') : '';
    p.instagramHandle = p.instagram ? '@' + String(p.instagram).replace(/^@/, '') : '';
    return p;
  }
  var P = derive(Object.assign({}, DEFAULTS, cached || {}));
  window.PROPERTY = P;
  window.PROPERTY_DEFAULTS = DEFAULTS;

  function fill(tpl){ return String(tpl).replace(/\{(\w+)\}/g, function(_, k){ return P[k] != null ? P[k] : ''; }); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
  function each(root, sel, fn){ var list = (root || document).querySelectorAll(sel); for (var i = 0; i < list.length; i++) fn(list[i]); }
  function apply(root){
    each(root, '[data-prop]', function(el){ el.textContent = P[el.getAttribute('data-prop')] || ''; });
    each(root, '[data-prop-split]', function(el){
      var v = String(P[el.getAttribute('data-prop-split')] || '').trim(), i = v.lastIndexOf(' ');
      el.innerHTML = i > 0 ? esc(v.slice(0, i)) + ' <span>' + esc(v.slice(i + 1)) + '</span>' : esc(v);
    });
    each(root, '[data-prop-tpl]', function(el){ el.textContent = fill(el.getAttribute('data-prop-tpl')); });
    each(root, '[data-prop-alt]', function(el){ el.setAttribute('alt', P[el.getAttribute('data-prop-alt')] || ''); });
    each(root, '[data-prop-href]', function(el){ var v = P[el.getAttribute('data-prop-href')]; if (v) el.setAttribute('href', v); else el.removeAttribute('href'); });
    each(root, '[data-prop-src]', function(el){ var k = el.getAttribute('data-prop-src'); if (P[k] && P[k] !== RYST_DEFAULTS[k]) el.setAttribute('src', P[k]); });
    each(root, '[data-prop-if]', function(el){ el.hidden = !P[el.getAttribute('data-prop-if')]; });
    var t = document.querySelector('title[data-title]');
    if (t) document.title = fill(t.getAttribute('data-title'));
  }
  window.applyProperty = apply;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ apply(document); });
  else apply(document);

  // Staff pages of a billed villa: a thin notice when the free trial is
  // nearly over, payment is overdue, or the villa has gone read-only.
  function billingBanner(b){
    if (!staff || demo || !b || !b.effective) return;
    var admin = false; try { admin = localStorage.getItem('ryst_user_admin') === 'true'; } catch (e) {}
    var n = b.daysLeft, days = n === 1 ? '1 day' : n + ' days', msg = '', tone = '#8a5a00', bg = '#fff4d6';
    if (b.effective === 'trial' && n != null && n <= 5) msg = 'Your free trial ends in ' + days + '.' + (admin ? ' Choose a plan to keep going.' : ' Ask your villa admin to choose a plan.');
    else if (b.effective === 'grace') msg = 'Payment is due — ' + days + ' left before this villa becomes read-only.' + (admin ? '' : ' Ask your villa admin to renew.');
    else if (b.effective === 'lapsed') { msg = 'This villa is read-only: the RYST Harbour subscription has lapsed.' + (admin ? '' : ' Ask your villa admin to renew.'); tone = '#8a1c1c'; bg = '#fde7e5'; }
    if (!msg) return;
    var show = function(){
      if (document.getElementById('rystBillingBar')) return;
      var bar = document.createElement('div');
      bar.id = 'rystBillingBar'; bar.setAttribute('role', 'status');
      bar.style.cssText = 'position:sticky;top:0;z-index:2147482000;background:' + bg + ';color:' + tone + ';font:600 13px/1.4 system-ui,-apple-system,Roboto,sans-serif;padding:8px 14px;text-align:center;border-bottom:1px solid rgba(0,0,0,.08)';
      bar.textContent = msg + ' ';
      if (admin) { var a = document.createElement('a'); a.href = '/settings.html#subscription'; a.textContent = b.effective === 'trial' ? 'See plans' : 'Renew now'; a.style.cssText = 'color:inherit;text-decoration:underline'; bar.appendChild(a); }
      document.body.insertBefore(bar, document.body.firstChild);
    };
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  }

  fetch('https://data.ryst.in/property', token ? { cache: 'no-cache', headers: { 'X-Token': token } } : { cache: 'no-cache' })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(d){
      if (!d || typeof d !== 'object' || !d.name) return;
      billingBanner(d._billing);
      if (staff && d._billing && Array.isArray(d._billing.features)) {
        window.RYST_FEATURES = d._billing.features;
        try { document.dispatchEvent(new CustomEvent('plan-features', { detail: d._billing.features })); } catch (e) {}
      }
      delete d._billing;
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
      var before = JSON.stringify(P);
      Object.keys(P).forEach(function(k){ delete P[k]; });
      derive(Object.assign(P, DEFAULTS, d));
      if (JSON.stringify(P) === before) return;
      apply(document);
      try { document.dispatchEvent(new CustomEvent('property-updated', { detail: P })); } catch (e) {}
    })
    .catch(function(){});
})();
