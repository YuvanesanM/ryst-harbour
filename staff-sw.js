// Service worker for the installable "RYST Harbour" app (staff.webmanifest).
// Deliberately caches nothing but one offline screen: every staff page reads
// live data from data.ryst.in, so a cached page would only ever show stale
// bookings/cash. Page loads go straight to the network; only when that
// fails (phone offline) does the app show the offline screen instead of
// Chrome's error page. Requests other than page navigations are untouched.
const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0e2420"><title>Offline — RYST Harbour</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0e2420;color:#f6f1e6;font:16px/1.5 system-ui,-apple-system,Roboto,sans-serif;text-align:center;padding:24px}
h1{font-size:20px;margin:0 0 8px}p{margin:0 0 20px;opacity:.8}button{background:#e3c486;color:#1a2c33;border:0;border-radius:12px;padding:12px 26px;font:600 15px system-ui,sans-serif}</style></head>
<body><div><h1>You're offline</h1><p>RYST Harbour needs an internet connection to show live bookings and records.</p><button onclick="location.reload()">Try again</button></div></body></html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() =>
    new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
