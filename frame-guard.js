// Refuse to run inside another site's frame (clickjacking) — for pages that
// don't load property.js, which carries the same guard.
(function () {
  try { if (window.top === window.self || window.top.location.origin === location.origin) return; } catch (e) {}
  document.documentElement.style.display = 'none';
  try { window.top.location.replace(location.href); } catch (e) {}
})();
