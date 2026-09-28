// Which villa a guest page (check-in, guest portal, feedback) belongs to.
// Guest links for every villa except the original one carry ?v=<villa>; this
// remembers it for the rest of the visit (same tab) and adds it as an
// X-Villa header on every call to the server, which uses it only to pick the
// villa for guest routes — the link's own token still has to match that
// villa. A fresh link without ?v= (a RYST 109A link) resets to the default.
// Load before property.js and the page's own scripts.
(function(){
  var RE = /^[a-z0-9-]{2,40}$/, KEY = 'ryst_guest_villa';
  var q = new URLSearchParams(location.search), v = (q.get('v') || '').toLowerCase();
  try {
    if (RE.test(v)) sessionStorage.setItem(KEY, v);
    else if (q.has('no') || q.has('t')) { v = ''; sessionStorage.removeItem(KEY); }
    else v = sessionStorage.getItem(KEY) || '';
  } catch (e) { if (!RE.test(v)) v = ''; }
  if (!RE.test(v) || v === 'ryst-109a') v = '';
  window.RYST_VILLA = v;
  if (!v) return;

  var PROXY = 'https://data.ryst.in/';
  var realFetch = window.fetch;
  window.fetch = function(input, init){
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf(PROXY) === 0) {
      init = Object.assign({}, init || {});
      var h = new Headers(init.headers || (typeof input !== 'string' && input.headers) || {});
      if (!h.has('X-Villa')) h.set('X-Villa', v);
      init.headers = h;
    }
    return realFetch.call(this, input, init);
  };

  // Links to the other guest pages keep the villa (e.g. portal → feedback);
  // links into RYST 109A's own website (data-ryst-only) are hidden.
  function tag(root){
    var own = (root || document).querySelectorAll('[data-ryst-only]');
    for (var j = 0; j < own.length; j++) own[j].style.display = 'none';
    var list = (root || document).querySelectorAll('a[href]');
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      try {
        var u = new URL(a.getAttribute('href'), location.href);
        if (u.origin !== location.origin || !/\/(checkin|guest|feedback)\.html$/.test(u.pathname) || u.searchParams.has('v')) continue;
        u.searchParams.set('v', v);
        a.setAttribute('href', u.pathname + u.search + u.hash);
      } catch (e) {}
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ tag(document); });
  else tag(document);
  window.villaLinkParam = function(){ return '&v=' + encodeURIComponent(v); };
})();
