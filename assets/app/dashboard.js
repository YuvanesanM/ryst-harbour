// RYST Harbour — owner operations dashboard (the signed-in view of login.html).
//
// Answers, on one screen: how much did I make, how occupied is the villa, who
// arrives or leaves today, and is anything wrong. It only reads what the
// module pages already read (same endpoints, same role/module rules), and
// every number follows the Reports page and the owner report on Telegram:
//   revenue    invoices by check-in date, plus the advance on confirmed
//              quotes not yet invoiced, plus food orders placed
//   occupancy  nights held by a real booking or an OTA calendar hold (a guest's
//              booking whose details aren't in yet); manual blocks aren't stays
// Caretakers get their own day view (check-in, check-out, checklists, issues,
// inventory). Nothing here writes data: every action opens the module page.
(function () {
  'use strict';

  var PROXY = 'https://data.ryst.in';
  var doc = document;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };
  var inr = function (n) { return '₹' + Math.round(num(n)).toLocaleString('en-IN'); };
  var t = function (s) { return window.rystT ? window.rystT(s) : s; };
  var ls = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };

  // ── Dates (the device's own day, as the checklist page does) ──────────
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function nightsBetween(a, b) { return (a && b) ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000)) : 0; }
  function monthStart(iso, back) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7) - (back || 0); while (m < 1) { m += 12; y--; } return y + '-' + pad(m) + '-01'; }
  function nextMonth(start) { var y = +start.slice(0, 4), m = +start.slice(5, 7) + 1; if (m > 12) { m = 1; y++; } return y + '-' + pad(m) + '-01'; }
  function fmtDay(iso) { return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); }
  function monthName(start, style) { return new Date(start + 'T00:00:00Z').toLocaleDateString('en-IN', { month: style || 'long', timeZone: 'UTC' }); }
  function ago(ms) { var h = Math.round((Date.now() - ms) / 3600e3); return h < 1 ? 'just now' : h < 24 ? h + 'h ago' : Math.round(h / 24) + 'd ago'; }
  // Check-in forms save "2:00 PM"; older entries may be 24-hour "14:00".
  function time12(v) {
    var s = String(v || '').trim(), m = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i.exec(s); if (!m) return s;
    if (m[3]) return (+m[1]) + ':' + m[2] + ' ' + m[3].toUpperCase();
    var h = +m[1]; return ((h % 12) || 12) + ':' + m[2] + ' ' + (h < 12 ? 'AM' : 'PM');
  }

  // ── Same rules as owner-report.js / reports.html ──────────────────────
  var typeOf = function (s) { return s.type || 'invoice'; };
  var grandTotal = function (s) { return Math.max(0, (s.items || []).reduce(function (a, it) { return a + num(it.rate) * num(it.qty); }, 0) - num(s.discount)); };
  var committed = function (s) { return typeOf(s) === 'invoice' || (typeOf(s) === 'quote' && num(s.advance) > 0); };
  function isConverted(q, stays) {
    if (typeOf(q) !== 'quote') return false;
    var email = String(q.email || '').trim().toLowerCase(), guest = String(q.guest || '').trim().toLowerCase();
    return stays.some(function (s) {
      return s !== q && typeOf(s) === 'invoice' && s.checkin === q.checkin && s.checkout === q.checkout &&
        (email ? String(s.email || '').trim().toLowerCase() === email : (guest && String(s.guest || '').trim().toLowerCase() === guest));
    });
  }
  function otaName(label) {
    var l = String(label || '').toLowerCase();
    return l.indexOf('airbnb') >= 0 ? 'Airbnb' : l.indexOf('booking') >= 0 ? 'Booking.com' : l.indexOf('agoda') >= 0 ? 'Agoda'
      : l.indexOf('makemytrip') >= 0 || l.indexOf('mmt') >= 0 ? 'MakeMyTrip' : (l.indexOf('vrbo') >= 0 || l.indexOf('homeaway') >= 0) ? 'VRBO' : 'OTA';
  }
  // Calendar-sync imports carry source:<feedId> (no "OTA-…"); "Block dates"
  // entries (maintenance, owner use) have neither and are not bookings.
  function isOtaEntry(s) { return typeOf(s) === 'block' && (!!s.source || String(s.no || '').indexOf('OTA-') === 0); }
  // Closed dates on an OTA (not a guest): still blocked, never a stay.
  function isOtaClosure(s) { return isOtaEntry(s) && (!!s.otaClosed || !!s.notBooking); }
  // An OTA hold: a guest's booking whose details aren't in yet.
  function isOtaBlock(s) { return isOtaEntry(s) && !isOtaClosure(s); }
  // An OTA hold the owner turned into a booking (block.claimedBy = that booking's number).
  // The booking carries the dates, so the hold is left out — but only while the booking exists.
  function claimedHold(s, all) { return typeOf(s) === 'block' && !!s.claimedBy && all.some(function (x) { return x.no === s.claimedBy && typeOf(x) !== 'block'; }); }
  function nightsIn(stays, start, end) {
    var booked = {}, bookedN = 0, otaNights = {}, ota = 0;
    stays.forEach(function (s) {
      if (!s.checkin || !s.checkout) return;
      var n = Math.min(nightsBetween(s.checkin, s.checkout), 400), isBlock = typeOf(s) === 'block';
      if (isBlock && (!isOtaBlock(s) || claimedHold(s, stays))) return;
      if (!isBlock && (!committed(s) || isConverted(s, stays))) return;
      for (var i = 0; i < n; i++) {
        var d = addDays(s.checkin, i);
        if (d < start || d >= end) continue;
        if (isBlock) otaNights[d] = 1; else booked[d] = 1;
      }
    });
    // An OTA hold's nights count as booked; `ota` is how many came only from holds.
    Object.keys(otaNights).forEach(function (d) { if (!booked[d]) ota++; });
    bookedN = Object.keys(booked).length + ota;
    return { booked: bookedN, ota: ota };
  }
  function metrics(stays, orders, expenses, start, end) {
    var inv = stays.filter(function (s) { return typeOf(s) === 'invoice' && s.checkin >= start && s.checkin < end; });
    var food = orders.filter(function (o) { return o.status !== 'cancelled' && o.date >= start && o.date < end; });
    // Confirmed quotes not yet invoiced count the advance received.
    var adv = stays.filter(function (s) { return typeOf(s) === 'quote' && num(s.advance) > 0 && s.checkin >= start && s.checkin < end && !isConverted(s, stays); })
      .reduce(function (a, s) { return a + num(s.advance); }, 0);
    var revenue = inv.reduce(function (a, s) { return a + grandTotal(s); }, 0) + adv + food.reduce(function (a, o) { return a + num(o.total); }, 0);
    var collected = inv.reduce(function (a, s) { return a + num(s.advance); }, 0) + adv + food.filter(function (o) { return o.status === 'settled'; }).reduce(function (a, o) { return a + num(o.total); }, 0);
    var spent = expenses.filter(function (e) { return e.type === 'expense' && e.date >= start && e.date < end; }).reduce(function (a, e) { return a + num(e.amount); }, 0);
    var days = nightsBetween(start, end) || 1, n = nightsIn(stays, start, end);
    return { revenue: revenue, collected: collected, expenses: spent, days: days, nights: n.booked, ota: n.ota, occupancy: n.booked / days * 100 };
  }

  // ── Who may see what (mirrors login.html's applyRoleView + server hasModule) ─
  var ROLE = 'owner', MODS = [], NO_CARETAKER_PLAN = false;
  function readAccess() {
    ROLE = ls('ryst_user_role') || 'owner';
    try { MODS = JSON.parse(ls('ryst_user_modules') || 'null'); } catch (e) { MODS = null; }
    if (!Array.isArray(MODS)) MODS = ROLE === 'caretaker' ? ['petty-cash', 'inventory', 'checklist', 'guestRegister'] : [];
  }
  function can(mod) {
    if (mod === 'checklist' && NO_CARETAKER_PLAN) return false;
    return ROLE === 'owner' || MODS.indexOf(mod) >= 0;
  }

  // ── Data ──────────────────────────────────────────────────────────────
  var D = {}, ERR = {}, TODAY = todayISO();
  function get(path, key) {
    return fetch(PROXY + path, { headers: { 'X-Token': ls('ryst_proxy_token') || '' }, cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status === 403 ? 'No access' : 'Could not load (' + r.status + ')'); return r.json(); })
      .then(function (j) { D[key] = j; }, function (e) { ERR[key] = e.message || 'Could not load'; })
      .then(render);
  }
  // refresh: keep what's on screen until the new figures arrive (no flash of
  // loading placeholders each time the app comes back to the foreground).
  function load(refresh) {
    if (!refresh) D = {};
    ERR = {}; TODAY = todayISO();
    var jobs = [];
    if (can('bookings') || can('reports')) jobs.push(get('/stays', 'stays'));
    else if (can('guestRegister')) jobs.push(get('/guest-register', 'reg'));
    if (can('restaurant') && (can('bookings') || can('reports'))) jobs.push(get('/restaurant', 'rs'));
    if (can('petty-cash')) jobs.push(get('/petty-cash', 'pc'));
    if (can('checklist')) { jobs.push(get('/issues', 'issues')); jobs.push(get('/checklist', 'cl')); }
    if (can('inventory')) jobs.push(get('/inventory', 'inv'));
    if (can('bookings') || can('settings')) jobs.push(get('/ota-status', 'ota'));
    render();
    return Promise.all(jobs);
  }

  // Bookings in one shape, from /stays (owner) or /guest-register (staff).
  function stayList() {
    if (D.stays) {
      var all = Array.isArray(D.stays.stays) ? D.stays.stays : [];
      return all.filter(function (s) { return s && s.checkin && s.checkout && ((isOtaBlock(s) && !claimedHold(s, all)) || (typeOf(s) !== 'block' && committed(s) && !isConverted(s, all))); })
        .map(function (s) {
          var block = typeOf(s) === 'block', total = grandTotal(s), paid = num(s.advance), ci = s.checkinInfo || null;
          return { no: s.no, block: block, guest: block ? otaName(s.guest) + ' booking' : (s.guest || 'Guest'), guests: s.guests || '', bedrooms: s.bedrooms || '',
            checkin: s.checkin, checkout: s.checkout, channel: block ? otaName(s.guest) : (s.channel || (s.mode === 'Razorpay' ? 'Website' : '')),
            total: total, paid: paid, due: block ? 0 : Math.max(0, total - paid), checkedIn: !!ci, arrival: ci ? ci.arrivalTime : '',
            otaGone: !!s.otaHoldGone, otaMoved: s.otaHoldMoved || null };
        });
    }
    if (D.reg) {
      return (Array.isArray(D.reg.entries) ? D.reg.entries : []).filter(function (e) { return e.stayStatus !== 'unconfirmed'; }).map(function (e) {
        return { no: e.no, block: false, guest: e.guest || 'Guest', guests: e.guests || e.checkinGuestsCount || '', bedrooms: e.bedrooms || '', checkin: e.checkin, checkout: e.checkout,
          channel: e.channel || (e.mode === 'Razorpay' ? 'Website' : ''), total: num(e.stayTotal), paid: num(e.stayPaid), due: num(e.stayDue),
          checkedIn: !!e.checkedIn, arrival: e.arrivalTime || '' };
      });
    }
    return null;
  }
  // Manual blocks ("Block dates") holding the villa today — shown as a note, never as a stay.
  function manualBlocksToday() {
    var all = D.stays && Array.isArray(D.stays.stays) ? D.stays.stays : [];
    return all.filter(function (s) { return s && typeOf(s) === 'block' && !isOtaEntry(s) && s.checkin <= TODAY && s.checkout > TODAY; });
  }
  function runFor(stayNo, type, day) {
    var runs = D.cl && Array.isArray(D.cl.runs) ? D.cl.runs : [];
    if (type === 'daily') return runs.filter(function (r) { return r.type === 'daily' && r.date === TODAY; })[0] || null;
    var linked = runs.filter(function (r) { return r.stayNo === stayNo && r.type === type; })[0];
    if (linked || !day) return linked || null;
    // A checklist started by hand from the Checklists page has no booking
    // number — count it for the stay whose check-in/out it was done on.
    var byDay = runs.filter(function (r) { return !r.stayNo && r.type === type && r.date === day; });
    return byDay.filter(function (r) { return r.status === 'completed'; })[0] || byDay[0] || null;
  }
  function runForStay(s, type) { return runFor(s.no, type, type === 'checkin' ? s.checkin : s.checkout); }
  function checklistHref(type, s) {
    return 'checklist.html?start=' + type + (s ? '&stay=' + encodeURIComponent(s.no) + '&guest=' + encodeURIComponent(s.block ? s.channel : s.guest) : '');
  }
  // An OTA hold has only dates — "Add guest details" opens the booking form pre-filled from it.
  function stayHref(s) { return s.block ? (can('bookings') ? 'stay.html?hold=' + encodeURIComponent(s.no) : 'guest-register.html') : !can('bookings') ? 'guest-register.html' : 'stay.html?open=' + encodeURIComponent(s.no); }
  function openIssues() { return (D.issues && Array.isArray(D.issues.issues) ? D.issues.issues : []).filter(function (i) { return i.status !== 'fixed'; })
    .sort(function (a, b) { return (b.urgency === 'urgent') - (a.urgency === 'urgent') || b.reportedAt - a.reportedAt; }); }
  function lowStock() { return (D.inv && Array.isArray(D.inv.items) ? D.inv.items : []).filter(function (i) { return num(i.threshold) > 0 && num(i.quantity) <= num(i.threshold); }); }

  // ── Small render helpers ──────────────────────────────────────────────
  var ICON = function (id) { return '<svg class="i" aria-hidden="true"><use href="#d-' + id + '"/></svg>'; };
  function payPill(s) {
    if (s.block) return '<span class="pill">' + esc(t('Paid via')) + ' ' + esc(s.channel) + '</span>';
    if (s.due <= 0) return '<span class="pill pill--good">' + esc(t('Paid')) + '</span>';
    if (s.paid > 0) return '<span class="pill pill--warn">' + inr(s.due) + ' ' + esc(t('due')) + '</span>';
    return '<span class="pill pill--bad">' + esc(t('Unpaid')) + ' ' + inr(s.due) + '</span>';
  }
  function chPill(s) { return s.channel ? '<span class="pill pill--teal">' + esc(s.channel) + '</span>' : '<span class="pill">' + esc(t('Direct')) + '</span>'; }
  function guestsTxt(s) {
    if (!s.guests) return '—';
    return esc(s.guests) + ' ' + esc(t(+s.guests === 1 ? 'guest' : 'guests')) + (s.bedrooms ? ' · ' + esc(s.bedrooms) + ' ' + esc(t(+s.bedrooms === 1 ? 'bedroom' : 'bedrooms')) : '');
  }
  function setHTML(id, html) { var el = doc.getElementById(id); if (el) el.innerHTML = html; }
  function loading(key) { return !(key in D) && !(key in ERR); }
  function errBox(key) { return '<p class="note">' + esc(ERR[key]) + '</p>'; }
  function show(el, on) { if (el) el.hidden = !on; }

  // ── Owner: KPIs ───────────────────────────────────────────────────────
  function setKpi(id, value, sub, alert) {
    var el = doc.getElementById(id); if (!el) return;
    el.classList.toggle('kpi--alert', !!alert);
    var v = $('.kpi__v', el), s = $('.kpi__s', el);
    v.className = 'kpi__v'; s.className = 'kpi__s';
    v.innerHTML = value; s.innerHTML = sub;
  }
  function renderKpis(list) {
    var ms = monthStart(TODAY), me = nextMonth(ms), pms = monthStart(TODAY, 1);
    var stays = D.stays && Array.isArray(D.stays.stays) ? D.stays.stays : null;
    var orders = D.rs && Array.isArray(D.rs.orders) ? D.rs.orders : [];
    var exps = D.pc && Array.isArray(D.pc.entries) ? D.pc.entries : [];
    show($('#kRevenue'), !!stays || loading('stays'));
    show($('#kOcc'), !!stays || loading('stays'));
    if (stays) {
      var cur = metrics(stays, orders, exps, ms, me), prev = metrics(stays, orders, exps, pms, ms);
      var d = prev.revenue ? Math.round((cur.revenue - prev.revenue) / prev.revenue * 100) : null;
      // In the first week a month has barely started — a percentage against
      // all of last month would read as a collapse. Show both figures instead.
      if (+TODAY.slice(8, 10) <= 7 && d !== null) setKpi('kRevenue', inr(cur.revenue), esc(t('Booked for')) + ' ' + esc(monthName(ms)) + ' · ' + esc(monthName(pms)) + ' ' + inr(prev.revenue));
      else setKpi('kRevenue', inr(cur.revenue), d === null ? esc(monthName(ms)) + ' · ' + inr(cur.collected) + ' received'
        : '<span class="' + (d >= 0 ? 'up' : 'down') + '">' + (d >= 0 ? '↑ ' : '↓ ') + Math.abs(d) + '%</span> vs ' + esc(monthName(pms)));
      setKpi('kOcc', Math.round(cur.occupancy) + '%', cur.nights + ' of ' + cur.days + ' nights' + (cur.ota ? ' · ' + cur.ota + ' via OTAs' : ''));
    }
    show($('#kArr'), !!list || loading('stays') || loading('reg'));
    if (list) {
      var arr = list.filter(function (s) { return s.checkin === TODAY; }), dep = list.filter(function (s) { return s.checkout === TODAY; });
      var next = list.filter(function (s) { return s.checkin > TODAY; }).sort(function (a, b) { return a.checkin.localeCompare(b.checkin); })[0];
      setKpi('kArr', String(arr.length), arr.length ? esc(arr[0].guest) + (arr.length > 1 ? ' +' + (arr.length - 1) : '') + (dep.length ? ' · ' + dep.length + ' out' : '')
        : (dep.length ? dep.length + ' checking out' : next ? 'Next: ' + esc(fmtDay(next.checkin)) : 'None coming up'));
    }
    show($('#kIssues'), can('checklist'));
    var kp = $('.kpis'); if (kp) kp.setAttribute('data-n', $$('.kpi', kp).filter(function (k) { return !k.hidden && k.style.display !== 'none'; }).length);
    if (D.issues) {
      var open = openIssues(), urgent = open.filter(function (i) { return i.urgency === 'urgent'; }).length;
      setKpi('kIssues', String(open.length), urgent ? '<span class="down">' + urgent + ' urgent</span>' : open.length ? 'None urgent' : 'All clear', urgent > 0);
    } else if (ERR.issues) setKpi('kIssues', '—', esc(ERR.issues));
  }

  // ── Owner: Today ──────────────────────────────────────────────────────
  function todayRow(s, type) {
    var run = can('checklist') && D.cl ? runForStay(s, type) : null;
    var clLabel = run ? (run.status === 'completed' ? 'Checklist ✓' : 'Continue') : 'Checklist';
    var status = [payPill(s)];
    if (type === 'checkin' && !s.block) status.push(s.checkedIn ? '<span class="pill pill--good">' + esc(t('Checked in online')) + '</span>' : '<span class="pill">' + esc(t('Check-in form pending')) + '</span>');
    return '<div class="trow">'
      + '<div class="trow__g"><b>' + esc(s.guest) + '</b><small>' + (s.arrival && type === 'checkin' ? esc(t('Arriving')) + ' ' + esc(time12(s.arrival)) + ' · ' : '') + esc(s.block ? t('From calendar sync') : s.no) + '</small></div>'
      + '<div class="trow__n">' + guestsTxt(s) + '</div>'
      + '<div class="trow__c">' + chPill(s) + '</div>'
      + '<div class="trow__p">' + status.join(' ') + '</div>'
      + '<div class="trow__act">'
      + (can('checklist') ? '<a class="btn btn--sm' + (run && run.status === 'completed' ? '' : ' btn--primary') + '" href="' + esc(checklistHref(type, s)) + '">' + esc(t(clLabel)) + '</a>' : '')
      + '<a class="btn btn--sm' + (s.block && can('bookings') ? ' btn--primary' : '') + '" href="' + esc(stayHref(s)) + '">' + esc(t(s.block && can('bookings') ? 'Add guest details' : s.due > 0 && can('bookings') ? 'Collect' : 'Open')) + '</a>'
      + '</div></div>';
  }
  function renderToday(list) {
    if (!list) { setHTML('todayBody', loading('stays') || loading('reg') ? '<div class="sk sk--row"></div><div class="sk sk--row"></div>' : errBox(ERR.stays ? 'stays' : 'reg')); return; }
    var arr = list.filter(function (s) { return s.checkin === TODAY; }), dep = list.filter(function (s) { return s.checkout === TODAY; });
    var inHouse = list.filter(function (s) { return s.checkin < TODAY && s.checkout > TODAY; });
    var html = '';
    if (arr.length) html += '<div class="day-group"><p class="day-group__t">' + ICON('in') + esc(t('Checking in')) + ' · ' + arr.length + '</p>' + arr.map(function (s) { return todayRow(s, 'checkin'); }).join('') + '</div>';
    if (dep.length) html += '<div class="day-group"><p class="day-group__t">' + ICON('out') + esc(t('Checking out')) + ' · ' + dep.length + '</p>' + dep.map(function (s) { return todayRow(s, 'checkout'); }).join('') + '</div>';
    if (!html) {
      var next = list.filter(function (s) { return s.checkin > TODAY; }).sort(function (a, b) { return a.checkin.localeCompare(b.checkin); })[0];
      html = '<div class="empty">' + ICON('ok') + '<span>' + esc(t('No check-ins or check-outs today.')) + (next ? ' ' + esc(t('Next arrival')) + ': <b>' + esc(next.guest) + '</b>, ' + esc(fmtDay(next.checkin)) + '.' : '') + '</span></div>';
    }
    var held = manualBlocksToday();
    if (held.length) html += '<p class="note">' + esc(t('Blocked today')) + ': ' + held.map(function (s) { var last = addDays(s.checkout, -1); return esc(s.guest || 'Blocked') + (last > TODAY ? ' (' + esc(t('until')) + ' ' + esc(fmtDay(last)) + ')' : ''); }).join(', ') + '</p>';
    if (inHouse.length) html += '<p class="note">' + esc(t('In house')) + ': ' + inHouse.map(function (s) { return esc(s.guest) + ' (' + esc(t('leaves')) + ' ' + esc(fmtDay(s.checkout)) + ')'; }).join(', ') + '</p>';
    setHTML('todayBody', html);
  }


  // ── Channels: is each OTA calendar still syncing? ──────────────────────
  // Three missed rounds is worth a flag (the server says how often it checks: every 10 minutes, or 3 hours on older servers).
  function staleH() { var m = (D.ota && D.ota.everyMinutes) || 180; return Math.max(1, 3 * m / 60); }
  function hoursSince(iso) { var t0 = iso ? Date.parse(iso) : NaN; return isNaN(t0) ? null : (Date.now() - t0) / 3600e3; }
  function agoIso(iso) { var t0 = iso ? Date.parse(iso) : NaN; return isNaN(t0) ? '' : ago(t0); }
  // One verdict per channel: lvl is '' (fine), 'warn' or 'bad'.
  function chanState(c) {
    var h = hoursSince(c.lastRunAt);
    if (c.kind === 'failing') return { lvl: 'bad', label: 'Failing', why: c.error || 'The last check could not read this calendar.' };
    if (c.kind === 'format') return { lvl: 'bad', label: 'Can’t read', why: c.error || 'The link does not return a calendar.' };
    if (c.kind === 'held') return { lvl: 'warn', label: 'Empty — rechecking', why: c.error || 'The calendar came back empty; rechecking before clearing holds.' };
    if (c.kind === 'unknown' || !c.lastRunAt) return { lvl: '', label: 'Waiting for first check', why: '' };
    if (h != null && h > staleH()) return { lvl: 'warn', label: 'Not checked for ' + Math.round(h) + 'h', why: 'The automatic check has not run recently.' };
    return { lvl: 'good', label: 'In sync', why: '' };
  }
  function channelProblems() {
    var chans = D.ota && Array.isArray(D.ota.channels) ? D.ota.channels : [];
    return chans.map(function (c) { return { c: c, st: chanState(c) }; }).filter(function (x) { return x.st.lvl === 'bad' || x.st.lvl === 'warn'; });
  }

  // ── Attention required (also feeds the bell and the Tasks badge) ──────
  function attentionItems(list) {
    var items = [];
    // A new villa's admin: until the address and WhatsApp number are in, point back to setup.
    var villa = window.RYST_VILLA || '', pr = window.PROPERTY || {};
    if (villa && villa !== 'ryst-109a' && ls('ryst_user_admin') === 'true' && ls('ryst_demo') !== '1' && (!pr.address || !pr.whatsapp))
      items.push({ lvl: 'warn', icon: 'gear', title: 'Finish setting up your villa', meta: 'Add your address, WhatsApp number, rates and team', href: 'settings.html?welcome=1' });
    if (can('bookings') || can('settings')) channelProblems().forEach(function (x) {
      items.push({ lvl: x.st.lvl, icon: 'cal', title: x.c.label + ' calendar: ' + x.st.label.toLowerCase(), meta: x.st.why, href: 'settings.html#ota' });
    });
    openIssues().slice(0, 4).forEach(function (i) {
      var urgent = i.urgency === 'urgent';
      items.push({ lvl: urgent ? 'bad' : 'warn', icon: 'tool', title: i.title || 'Issue', meta: (urgent ? 'Urgent · ' : '') + (i.area ? i.area + ' · ' : '') + 'reported ' + ago(i.reportedAt), href: 'issues.html' });
    });
    var more = openIssues().length - 4;
    if (more > 0) items.push({ lvl: 'warn', icon: 'tool', title: '+' + more + ' more open issue' + (more === 1 ? '' : 's'), meta: 'Issues & Maintenance', href: 'issues.html' });
    var low = lowStock();
    if (low.length === 1) items.push({ lvl: 'warn', icon: 'box', title: low[0].name + ' running low', meta: num(low[0].quantity) + ' ' + (low[0].unit || '') + ' left · restock at ' + num(low[0].threshold), href: 'inventory.html' });
    else if (low.length > 1) items.push({ lvl: 'warn', icon: 'box', title: low.length + ' items low on stock', meta: low.slice(0, 3).map(function (i) { return i.name; }).join(', ') + (low.length > 3 ? '…' : ''), href: 'inventory.html' });
    if (D.cl && list) {
      list.forEach(function (s) {
        [['checkin', s.checkin], ['checkout', s.checkout]].forEach(function (p) {
          if (p[1] !== TODAY) return;
          var run = runForStay(s, p[0]);
          if (!run || run.status !== 'completed') items.push({ lvl: '', icon: 'check', title: (p[0] === 'checkin' ? 'Check-in' : 'Check-out') + ' checklist ' + (run ? 'in progress' : 'not started'), meta: s.guest, href: checklistHref(p[0], s) });
        });
      });
    }
    if (D.cl && (D.cl.templates && (D.cl.templates.daily || []).length)) {
      var daily = runFor('', 'daily'), dl = D.cl.templates.daily;
      if (!daily || daily.status !== 'completed') items.push({ lvl: '', icon: 'check', title: 'Daily rounds ' + (daily ? 'in progress' : 'not done yet'), meta: dl.slice(0, 3).join(', ') + (dl.length > 3 ? '…' : ''), href: checklistHref('daily') });
    }
    if (list && can('bookings')) {
      // OTA bookings: holds that still need a guest, and captured bookings whose hold changed on the OTA.
      var needs = list.filter(function (s) { return s.block && s.checkout > TODAY && s.checkin <= addDays(TODAY, 21); }).sort(function (a, b) { return a.checkin.localeCompare(b.checkin); });
      needs.slice(0, 3).forEach(function (s) { var n = nightsBetween(s.checkin, s.checkout); items.push({ lvl: 'warn', icon: 'cal', title: s.channel + ' booking needs guest details', meta: fmtDay(s.checkin) + ' · ' + n + ' night' + (n === 1 ? '' : 's') + ' — add the guest\'s name, phone and amount', href: stayHref(s) }); });
      if (needs.length > 3) items.push({ lvl: 'warn', icon: 'cal', title: '+' + (needs.length - 3) + ' more OTA bookings need guest details', meta: 'Calendar', href: 'bookings.html' });
      list.filter(function (s) { return !s.block && s.otaGone && s.checkout >= TODAY; }).forEach(function (s) { items.unshift({ lvl: 'bad', icon: 'cal', title: s.guest + ' is no longer on ' + (s.channel || 'the OTA') + '\'s calendar', meta: 'Cancelled? Check it there · ' + fmtDay(s.checkin), href: stayHref(s) }); });
      list.filter(function (s) { return !s.block && s.otaMoved && s.checkout >= TODAY; }).forEach(function (s) { items.unshift({ lvl: 'warn', icon: 'cal', title: s.guest + ' moved on ' + (s.channel || 'the OTA') + '\'s calendar', meta: 'Now ' + fmtDay(s.otaMoved.checkin) + ' → ' + fmtDay(s.otaMoved.checkout) + ' · update the dates', href: stayHref(s) }); });
      // Money to collect: stays already over with a balance, and arrivals in
      // the next three days not yet paid in full (today's are on the Today card).
      var after = list.filter(function (s) { return !s.block && s.due > 0 && s.checkout <= TODAY && s.checkout >= addDays(TODAY, -60) && s.checkin < TODAY; })
        .sort(function (a, b) { return b.checkout.localeCompare(a.checkout); });
      var before = list.filter(function (s) { return !s.block && s.due > 0 && s.checkin > TODAY && s.checkin <= addDays(TODAY, 3); })
        .sort(function (a, b) { return a.checkin.localeCompare(b.checkin); });
      after.slice(0, 3).forEach(function (s) { items.push({ lvl: 'warn', icon: 'rupee', title: inr(s.due) + ' still due', meta: s.guest + ' · checked out ' + fmtDay(s.checkout), href: stayHref(s) }); });
      if (after.length > 3) items.push({ lvl: 'warn', icon: 'rupee', title: '+' + (after.length - 3) + ' more balances to collect', meta: inr(after.slice(3).reduce(function (a, s) { return a + s.due; }, 0)) + ' in all', href: 'guest-register.html?f=unpaid' });
      before.forEach(function (s) { items.push({ lvl: '', icon: 'rupee', title: inr(s.due) + ' due before arrival', meta: s.guest + ' · arrives ' + fmtDay(s.checkin), href: stayHref(s) }); });
      // The same night held by two bookings or OTA calendars (next 60 days).
      var nights = {};
      list.forEach(function (s) {
        for (var d = s.checkin < TODAY ? TODAY : s.checkin; d < s.checkout && d < addDays(TODAY, 60); d = addDays(d, 1)) (nights[d] = nights[d] || []).push(s);
      });
      var seen = {};
      Object.keys(nights).sort().forEach(function (d) {
        var h = nights[d]; if (h.length < 2) return;
        var key = h.map(function (s) { return s.no; }).sort().join('|'); if (seen[key]) return; seen[key] = 1;
        items.unshift({ lvl: 'bad', icon: 'cal', title: fmtDay(d) + ' is held twice', meta: h.map(function (s) { return s.block ? s.channel : s.guest; }).join(' and ') + ' — check it isn’t a double booking', href: 'bookings.html' });
      });
    }
    if (D.rs && Array.isArray(D.rs.orders) && can('restaurant')) {
      var bills = D.rs.orders.filter(function (o) { return o.status === 'open' && o.date && o.date < addDays(TODAY, -1); });
      var billAmt = bills.reduce(function (a, o) { return a + num(o.total); }, 0);
      if (billAmt > 0) items.push({ lvl: 'warn', icon: 'food', title: inr(billAmt) + ' in food bills not settled', meta: bills.length + ' order' + (bills.length === 1 ? '' : 's') + ' since ' + fmtDay(bills.map(function (o) { return o.date; }).sort()[0]), href: 'restaurant.html' });
    }
    if (D.pc && Array.isArray(D.pc.entries)) {
      var pend = D.pc.entries.filter(function (e) { return e.type === 'expense' && e.status === 'pending'; });
      var amt = pend.reduce(function (a, e) { return a + num(e.amount); }, 0);
      if (amt > 0) items.push({ lvl: '', icon: 'wallet', title: inr(amt) + ' petty cash to reimburse', meta: pend.length + ' expense' + (pend.length === 1 ? '' : 's') + ' waiting', href: 'petty-cash.html' });
    }
    return items;
  }
  function attHTML(items) {
    return items.map(function (a) {
      return '<a class="att' + (a.lvl ? ' att--' + a.lvl : '') + '" href="' + esc(a.href) + '"><span class="att__ic">' + ICON(a.icon) + '</span>'
        + '<span><span class="att__t">' + esc(a.title) + '</span><span class="att__m">' + esc(a.meta) + '</span></span>' + ICON('chev') + '</a>';
    }).join('');
  }
  function renderAttention(list) {
    var pending = ['issues', 'cl', 'inv', 'pc'].some(function (k) { var need = { issues: 'checklist', cl: 'checklist', inv: 'inventory', pc: 'petty-cash' }[k]; return can(need) && loading(k); });
    var items = attentionItems(list);
    var allClear = '<div class="empty">' + ICON('ok') + '<span>' + esc(t('All clear — nothing needs you right now.')) + '</span></div>';
    setHTML('attnBody', items.length ? attHTML(items) : pending ? '<div class="sk sk--row"></div><div class="sk sk--row"></div>' : allClear);
    var c = $('#attnCount'); c.textContent = items.length; c.hidden = !items.length;
    setHTML('bellList', items.length ? '<div class="pop__stack">' + attHTML(items) + '</div>' : '<div style="padding:12px 14px">' + allClear + '</div>');
    var b = $('#bellCount'); b.textContent = items.length; b.hidden = !items.length;
    var tc = $('#tasksCount'); tc.textContent = items.length; tc.hidden = !items.length;
    var attn = can('checklist') || can('inventory') || can('petty-cash') || can('bookings');
    show($('#cAttn'), attn);
    var grid = $('#cAttn') && $('#cAttn').parentElement; if (grid) grid.classList.toggle('no-attn', !attn);
    renderTasks(items);
  }

  // ── Upcoming stays ────────────────────────────────────────────────────
  function renderUpcoming(list) {
    if (!list) { setHTML('upBody', loading('stays') || loading('reg') ? '<div class="sk sk--row"></div><div class="sk sk--row"></div>' : errBox(ERR.stays ? 'stays' : 'reg')); return; }
    var up = list.filter(function (s) { return s.checkin > TODAY; }).sort(function (a, b) { return a.checkin.localeCompare(b.checkin); }).slice(0, 5);
    if (!up.length) { setHTML('upBody', '<div class="empty">' + ICON('cal') + '<span>' + esc(t('Nothing booked after today yet.')) + '</span></div>'); return; }
    setHTML('upBody', '<table class="utable"><thead><tr><th scope="col">Dates</th><th scope="col">Guest</th><th scope="col">Guests</th><th scope="col">Channel</th><th scope="col">Payment</th></tr></thead><tbody>'
      + up.map(function (s) {
        var n = nightsBetween(s.checkin, s.checkout);
        return '<tr data-href="' + esc(stayHref(s)) + '">'
          + '<td class="u-dates"><b>' + esc(fmtDay(s.checkin)) + '</b><small>' + n + ' night' + (n === 1 ? '' : 's') + ' · to ' + esc(fmtDay(s.checkout)) + '</small></td>'
          + '<td class="u-guest"><a href="' + esc(stayHref(s)) + '"><b>' + esc(s.guest) + '</b></a><small>' + esc(s.block ? (can('bookings') ? t('From calendar sync — add guest details') : t('From calendar sync')) : s.no) + '</small></td>'
          + '<td class="u-n">' + guestsTxt(s) + '</td><td class="u-ch">' + chPill(s) + '</td><td class="u-bal">' + payPill(s) + '</td></tr>';
      }).join('') + '</tbody></table>');
  }

  // ── Caretaker day view ────────────────────────────────────────────────
  function careStay(list, type) {
    if (!can('guestRegister') && !can('bookings')) return '<p class="note">' + esc(t('Ask the owner for Guest Register access to see arrivals here.')) + '</p>';
    if (!list) return loading('reg') || loading('stays') ? '<div class="sk sk--row"></div>' : errBox(ERR.reg ? 'reg' : 'stays');
    var today = list.filter(function (s) { return (type === 'checkin' ? s.checkin : s.checkout) === TODAY; });
    if (!today.length) return '<div class="empty">' + ICON('ok') + '<span>' + esc(t(type === 'checkin' ? 'No check-in today' : 'No check-out today')) + '</span></div>';
    return today.map(function (s) {
      var run = D.cl ? runForStay(s, type) : null, done = run && run.status === 'completed';
      return '<div class="stay-card"><b data-no-i18n>' + esc(s.guest) + '</b><div class="stay-card__meta"><span>' + guestsTxt(s) + '</span>'
        + (type === 'checkin' && s.arrival ? '<span><span>' + esc(t('Arriving')) + '</span> <span data-no-i18n>' + esc(time12(s.arrival)) + '</span></span>' : '')
        + (type === 'checkin' && !s.block ? (s.checkedIn ? '<span class="pill pill--good">' + esc(t('Checked in online')) + '</span>' : '<span class="pill">' + esc(t('Check-in form pending')) + '</span>') : '') + '</div>'
        + (can('checklist') ? '<a class="btn' + (done ? '' : ' btn--primary') + '" href="' + esc(checklistHref(type, s)) + '">' + esc(t(done ? 'Done ✓' : run ? 'Continue' : (type === 'checkin' ? 'Start check-in checklist' : 'Start check-out checklist'))) + '</a>' : '')
        + '</div>';
    }).join('');
  }
  function renderCare(list) {
    setHTML('careIn', careStay(list, 'checkin'));
    setHTML('careOut', careStay(list, 'checkout'));
    if (can('checklist')) {
      if (!D.cl) setHTML('careCl', ERR.cl ? errBox('cl') : '<div class="sk sk--row"></div>');
      else {
        var daily = runFor('', 'daily'), hasDaily = (D.cl.templates && (D.cl.templates.daily || []).length);
        var progress = (D.cl.runs || []).filter(function (r) { return r.status !== 'completed' && r.type !== 'daily'; });
        setHTML('careCl', (hasDaily ? '<div class="mini"><span><b>' + esc(t('Daily rounds')) + '</b><small>' + esc(t(daily ? (daily.status === 'completed' ? 'Done today' : 'In progress') : 'Not done yet today')) + '</small></span><a class="btn btn--sm' + (daily && daily.status === 'completed' ? '' : ' btn--primary') + '" href="checklist.html?start=daily">' + esc(t(daily ? (daily.status === 'completed' ? 'View' : 'Continue') : 'Start')) + '</a></div>' : '')
          + progress.slice(0, 3).map(function (r) { return '<div class="mini"><span><b data-no-i18n>' + esc(r.guest || r.stayNo || '') + '</b><small>' + esc(t(r.type === 'checkout' ? 'Check-out' : 'Check-in')) + ' · ' + esc(t('In progress')) + '</small></span><a class="btn btn--sm" href="checklist.html">' + esc(t('Continue')) + '</a></div>'; }).join('')
          + (!hasDaily && !progress.length ? '<div class="empty">' + ICON('ok') + '<span>' + esc(t('Nothing in progress')) + '</span></div>' : ''));
      }
      if (!D.issues) setHTML('careIs', ERR.issues ? errBox('issues') : '<div class="sk sk--row"></div>');
      else {
        var open = openIssues();
        setHTML('careIs', (open.length ? open.slice(0, 3).map(function (i) { return '<div class="mini"><span><b data-no-i18n>' + esc(i.title) + '</b><small><span data-no-i18n>' + esc(i.area || '') + '</span></small></span>' + (i.urgency === 'urgent' ? '<span class="pill pill--bad">' + esc(t('Urgent')) + '</span>' : '<span class="pill pill--warn">' + esc(t('Open')) + '</span>') + '</div>'; }).join('')
          : '<div class="empty">' + ICON('ok') + '<span>' + esc(t('No open issues')) + '</span></div>')
          + '<a class="btn btn--primary care-cta" href="issues.html#report">' + ICON('plus') + esc(t('Report a problem')) + '</a>');
      }
    }
    if (can('inventory')) {
      if (!D.inv) setHTML('careInv', ERR.inv ? errBox('inv') : '<div class="sk sk--row"></div>');
      else {
        var low = lowStock();
        setHTML('careInv', low.length ? low.slice(0, 4).map(function (i) { return '<div class="mini"><span><b data-no-i18n>' + esc(i.name) + '</b><small><span data-no-i18n>' + num(i.quantity) + ' ' + esc(i.unit || '') + '</span> · ' + esc(t('restock at')) + ' ' + num(i.threshold) + '</small></span><span class="pill pill--warn">' + esc(t('Low')) + '</span></div>'; }).join('')
          : '<div class="empty">' + ICON('ok') + '<span>' + esc(t('Everything is stocked')) + '</span></div>');
      }
    }
  }

  // ── Sheets: Record payment, Tasks (phones), More (phones) ──────────────
  function renderPaySheet(list) {
    if (!list) { setHTML('payList', '<p class="note" style="padding:8px 10px">Loading bookings…</p>'); return; }
    var due = list.filter(function (s) { return !s.block && s.due > 0 && s.checkout >= addDays(TODAY, -60); }).sort(function (a, b) { return a.checkin.localeCompare(b.checkin); });
    setHTML('payList', due.length ? due.slice(0, 8).map(function (s) {
      return '<a class="pop__item" href="' + esc('stay.html?open=' + encodeURIComponent(s.no)) + '">' + ICON('rupee') + '<span style="flex:1;min-width:0"><b style="display:block">' + esc(s.guest) + '</b><small style="color:var(--muted)">' + esc(fmtDay(s.checkin)) + ' · ' + esc(s.no) + '</small></span><span class="pill pill--warn">' + inr(s.due) + ' due</span></a>';
    }).join('') : '<p class="note" style="padding:8px 10px">No balances due. <a href="stay.html" style="color:var(--teal-ink);font-weight:600">Open Quotes &amp; Invoices</a></p>');
  }
  function renderTasks(items) {
    var rows = [];
    var lc = function (href, icon, label, sub, mod) { if (can(mod)) rows.push('<a class="pop__item" href="' + href + '">' + ICON(icon) + '<span style="flex:1">' + esc(t(label)) + '</span><small style="color:var(--muted)">' + esc(sub) + '</small></a>'); };
    var open = openIssues().length, low = lowStock().length;
    lc('checklist.html', 'check', 'Checklists', items.filter(function (i) { return i.icon === 'check'; }).length ? items.filter(function (i) { return i.icon === 'check'; }).length + ' to do' : '', 'checklist');
    lc('issues.html', 'tool', 'Issues & Maintenance', open ? open + ' open' : '', 'checklist');
    lc('inventory.html', 'box', 'Inventory', low ? low + ' low' : '', 'inventory');
    lc('petty-cash.html', 'wallet', 'Petty Cash', '', 'petty-cash');
    setHTML('tasksList', rows.join('') || '<p class="note" style="padding:8px 10px">No task modules are enabled for you.</p>');
  }
  function refreshNav() {
    readAccess();
    // More (phones): every sidebar destination this person can open.
    if (window.rystShell) window.rystShell.refresh();
    var more = $$('.hsb__link').filter(function (a) { return !a.hidden && a.style.display !== 'none' && a.getAttribute('aria-current') !== 'page'; });
    setHTML('moreList', (window.rystMoreTop ? window.rystMoreTop() : '') + '<div class="pop__stack">' + more.map(function (a) { return '<a class="pop__item" href="' + esc(a.getAttribute('href')) + '">' + a.innerHTML + '</a>'; }).join('') + '</div>');
    var bnIssues = $('#bnIssues'), bnCal = $('#bnCal');
    if (bnIssues && bnCal) { var cal = can('bookings'); bnCal.hidden = !cal; bnIssues.hidden = cal || !can('checklist'); }
    var nb = $('.tb__new'), plus = $('.bn__plus');
    var anyNew = $$('#newMenu .pop__item').some(function (a) { return a.style.display !== 'none'; });
    if (nb) nb.hidden = !anyNew; if (plus) plus.style.visibility = anyNew ? '' : 'hidden';
  }

  // ── Popovers: desktop dropdowns, phone bottom sheets ───────────────────
  var desktop = window.matchMedia('(min-width: 1024px)');
  var openPop = null, openerBtn = null;
  function closePop() {
    if (!openPop) return;
    openPop.hidden = true; $('#scrim').hidden = true;
    $$('.tb--pop').forEach(function (t) { t.classList.remove('tb--pop'); });
    $$('[data-pop]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    var back = openerBtn; openPop = null; openerBtn = null;
    if (back && doc.activeElement && doc.activeElement !== doc.body && !back.contains(doc.activeElement)) back.focus();
  }
  function openPopFor(id, btn) {
    var pop = doc.getElementById(id); if (!pop) return;
    if (openPop === pop) { closePop(); return; }
    closePop();
    if (id === 'paySheet') renderPaySheet(stayList());
    pop.style.top = pop.style.right = pop.style.left = '';
    if (desktop.matches && (pop.classList.contains('pop--new') || pop.classList.contains('pop--sheet'))) {
      var r = btn.getBoundingClientRect();
      pop.style.top = (r.bottom + 8) + 'px'; pop.style.right = Math.max(12, window.innerWidth - r.right) + 'px'; pop.style.left = 'auto';
    }
    pop.hidden = false; openPop = pop; openerBtn = btn;
    // A menu inside the sticky top bar is capped by the bar's own stacking
    // level — lift the bar over the scrim and bottom nav while it's open.
    var bar = pop.closest('.tb'); if (bar) bar.classList.add('tb--pop');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    $('#scrim').hidden = desktop.matches;
    var first = $('a,button', pop); if (first) first.focus();
  }
  doc.addEventListener('click', function (e) {
    var trig = e.target.closest('[data-pop]');
    if (trig && trig.closest('#homeView')) { e.preventDefault(); openPopFor(trig.getAttribute('data-pop'), trig); return; }
    if (e.target.closest('#recordPayBtn')) { var anchor = $('.tb__new .btn') || $('.bn__plus'); var btn = desktop.matches ? anchor : $('.bn__plus'); closePop(); openPopFor('paySheet', btn); return; }
    var row = e.target.closest('.utable tr[data-href]');
    if (row && !e.target.closest('a')) { location.href = row.getAttribute('data-href'); return; }
    if (openPop && !e.target.closest('.pop') ) closePop();
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });
  desktop.addEventListener('change', closePop);


  // ── Phone widgets (RYST Harbour Android app 1.3+) ─────────────────────
  // The app keeps a read-only widget key (POST /widget/token); this page hands
  // it over with an intent link the app's WidgetSetupActivity answers. If the
  // app isn't installed, Android offers it on the Play Store instead.
  var ANDROID = /Android/i.test(navigator.userAgent);
  function widgetNote(msg, bad) { var n = $('#wNote'); if (n) { n.textContent = t(msg); n.classList.toggle('wnote--bad', !!bad); } }
  function appLink(path) { return 'intent://' + path + '#Intent;scheme=rystwidget;package=in.ryst.staff;end'; }
  function widgetCall(method) {
    return fetch(PROXY + '/widget/token', { method: method, headers: { 'X-Token': ls('ryst_proxy_token') || '' } })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Could not reach RYST Harbour'); return j; }); });
  }
  doc.addEventListener('click', function (e) {
    if (e.target.closest('#wConnect')) {
      var b = e.target.closest('#wConnect'); b.disabled = true;
      widgetCall('POST').then(function (j) {
        widgetNote('Opening the RYST Harbour app…');
        location.href = appLink('setup?k=' + encodeURIComponent(j.key));
      }, function (err) { widgetNote(err.message, true); }).then(function () { b.disabled = false; });
    }
    if (e.target.closest('#wDisconnect')) {
      var d = e.target.closest('#wDisconnect'); d.disabled = true;
      widgetCall('DELETE').then(function () {
        widgetNote('Widgets disconnected on all your phones.');
        if (ANDROID) location.href = appLink('disconnect');
      }, function (err) { widgetNote(err.message, true); }).then(function () { d.disabled = false; });
    }
  });
  function wireWidgets() {
    var btn = $('#widgetBtn'); if (btn) btn.hidden = !ANDROID || ls('ryst_demo') === '1';
    // The widget's "Tap to connect" opens login.html#widget.
    if (location.hash === '#widget' && ANDROID) setTimeout(function () { openPopFor('widgetSheet', $('.avatar')); }, 400);
  }
  window.addEventListener('hashchange', function () { if (location.hash === '#widget' && ANDROID && started) openPopFor('widgetSheet', $('.avatar')); });

  // ── Notifications on this device (Web Push; the server mirrors Telegram alerts) ──
  var PUSH_OK = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  function b64ToBytes(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var r = atob(s), a = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; }
  function pushReg() { return navigator.serviceWorker.register('/staff-sw.js').then(function () { return navigator.serviceWorker.ready; }); }
  function pushPost(path, body) {
    return fetch(PROXY + path, { method: 'POST', headers: { 'X-Token': ls('ryst_proxy_token') || '', 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Could not reach RYST Harbour'); return j; }); });
  }
  function notifState(msg, on) {
    var st = $('#nStatus'); if (st) st.textContent = t(msg);
    show($('#nOn'), !on); show($('#nTest'), !!on); show($('#nOff'), !!on);
  }
  function refreshNotif() {
    if (!PUSH_OK) return;
    if (Notification.permission === 'denied') return notifState('Notifications are blocked for RYST Harbour on this device. Allow them in the phone or browser settings, then try again.', false);
    pushReg().then(function (reg) { return reg.pushManager.getSubscription(); })
      .then(function (sub) { notifState(sub ? 'On for this device.' : 'Off for this device.', !!sub); }, function () { notifState('Off for this device.', false); });
  }
  doc.addEventListener('click', function (e) {
    var on = e.target.closest('#nOn'), off = e.target.closest('#nOff'), test = e.target.closest('#nTest');
    if (!on && !off && !test) return;
    var b = on || off || test; b.disabled = true;
    var done = function () { b.disabled = false; };
    if (on) {
      Notification.requestPermission().then(function (p) {
        if (p !== 'granted') { notifState('Notifications weren’t allowed. Allow them in the phone or browser settings, then try again.', false); return; }
        return Promise.all([pushReg(), fetch(PROXY + '/push/key').then(function (r) { return r.json(); })]).then(function (x) {
          var reg = x[0], key = x[1].key;
          return reg.pushManager.getSubscription().then(function (old) {
            return old || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
          });
        }).then(function (sub) {
          var j = sub.toJSON(); j.device = (navigator.userAgentData && navigator.userAgentData.platform) || (/Android/i.test(navigator.userAgent) ? 'Android' : /iPhone|iPad/i.test(navigator.userAgent) ? 'iPhone' : 'Browser');
          return pushPost('/push/subscribe', j);
        }).then(function () { notifState('On for this device.', true); return pushPost('/push/test'); });
      }).catch(function (err) { notifState(err.message || 'Could not turn notifications on.', false); }).then(done);
    } else if (test) {
      pushPost('/push/test').then(function (j) { notifState(j.sent ? 'Test sent — it should arrive in a few seconds.' : 'On for this device.', true); }, function (err) { notifState(err.message, true); }).then(done);
    } else {
      pushReg().then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
        if (!sub) return;
        var ep = sub.endpoint;
        return sub.unsubscribe().then(function () { return pushPost('/push/unsubscribe', { endpoint: ep }); });
      }).then(function () { notifState('Off for this device.', false); }, function (err) { notifState(err.message, false); }).then(done);
    }
  });
  function wireNotif() {
    var btn = $('#notifBtn'); if (btn) btn.hidden = !PUSH_OK || ls('ryst_demo') === '1';
    if (PUSH_OK && ls('ryst_demo') !== '1') refreshNotif();
    if (location.hash === '#notifications' && PUSH_OK) setTimeout(function () { openPopFor('notifSheet', $('.avatar')); }, 400);
  }

  // ── Delete account (Google Play: an in-app way to ask; harbour.ryst.in/delete-account.html) ──
  function delState(req) {
    var st = $('#delStatus'), go = $('#delGo');
    if (req) {
      var by = new Date(new Date(req.at).getTime() + 30 * 864e5).toLocaleDateString(window.RYST_LANG === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      if (st) { st.className = 'wnote'; st.textContent = t('Requested. We’ll complete it by') + ' ' + by + '. ' + t('To cancel the request, email info@dreamour.in.'); }
      show(go, false); show($('#delReason'), false); show($('#delReasonLbl'), false);
    } else { if (st) st.textContent = ''; show(go, true); show($('#delReason'), true); show($('#delReasonLbl'), true); }
  }
  function wireDelete() {
    var btn = $('#delBtn'); if (btn) btn.hidden = ls('ryst_demo') === '1';
    var owner = ROLE === 'owner' && ls('ryst_user_admin') === 'true';
    show($('#delWhatOwner'), owner); show($('#delWhatStaff'), !owner);
    var who = $('#delWho'); if (who) who.textContent = ls('ryst_user_email') || '';
    if (ls('ryst_demo') === '1') return;
    fetch(PROXY + '/account/delete-request', { headers: { 'X-Token': ls('ryst_proxy_token') || '' }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j) delState(j.request); }).catch(function () {});
    if (location.hash === '#delete-account') setTimeout(function () { openPopFor('deleteSheet', $('.avatar')); }, 400);
  }
  doc.addEventListener('click', function (e) {
    var go = e.target.closest('#delGo'); if (!go) return;
    var owner = ROLE === 'owner' && ls('ryst_user_admin') === 'true';
    if (!window.confirm(t(owner ? 'Close this villa’s RYST Harbour account and delete its data?' : 'Delete your RYST Harbour account for this villa?'))) return;
    go.disabled = true;
    pushPost('/account/delete-request', { reason: ($('#delReason') || {}).value || '' })
      .then(function (j) { delState(j.request); }, function (err) { var st = $('#delStatus'); if (st) { st.className = 'wnote wnote--bad'; st.textContent = t(err.message); } })
      .then(function () { go.disabled = false; });
  });
  window.addEventListener('hashchange', function () { if (location.hash === '#delete-account' && started && $('#deleteSheet').hidden) openPopFor('deleteSheet', $('.avatar')); });

  function renderChannels() {
    var card = $('#cChan'); if (!card) return;
    var on = can('bookings') || can('settings');
    show(card, on); if (!on) return;
    var body = $('#chanBody'), sync = $('#chanSync');
    if (loading('ota')) { body.innerHTML = '<div class="sk sk--row"></div>'; return; }
    if (ERR.ota) { body.innerHTML = errBox('ota'); show(sync, false); return; }
    var chans = Array.isArray(D.ota.channels) ? D.ota.channels : [];
    show(sync, can('settings') && chans.length > 0);
    if (!chans.length) {
      body.innerHTML = '<div class="empty">' + ICON('cal') + '<span>' + esc(t('Connect your OTA calendars so Airbnb, Booking.com, Agoda and MakeMyTrip bookings block your dates automatically.')) + ' <a href="settings.html#ota">' + esc(t('Set up calendars')) + '</a></span></div>';
      return;
    }
    body.innerHTML = chans.map(function (c) {
      var st = chanState(c), pillCls = st.lvl ? ' pill--' + st.lvl : '';
      var checked = c.lastRunAt ? t('Checked') + ' ' + agoIso(c.lastRunAt) : '';
      var needHref = can('bookings') ? 'bookings.html' : 'settings.html#ota';
      var upLine = c.upcoming ? esc(c.upcoming + ' ' + t('upcoming')) : esc(t('No upcoming bookings'));
      var needs = c.needsGuest ? '<a href="' + needHref + '">' + esc(c.needsGuest + ' ' + t('need guest details')) + '</a>' : '';
      var gone = c.gone ? '<span class="down">' + esc(c.gone + ' ' + t('no longer on the OTA')) + '</span>' : '';
      var read;
      if (!c.theyReadOursAt) read = '<small>' + esc(t('Not yet read — paste our calendar link into the OTA')) + '</small>';
      else { var rh = hoursSince(c.theyReadOursAt); read = '<small' + (rh != null && rh > 48 ? ' style="color:var(--warn-ink,#9a6700)"' : '') + '>' + esc(t('Reads our calendar') + ': ' + agoIso(c.theyReadOursAt)) + (rh != null && rh > 48 ? ' — ' + esc(t('check the link in the OTA')) : '') + '</small>'; }
      return '<div class="chan">'
        + '<div class="chan__n"><b>' + esc(c.label) + '</b>' + (checked ? '<small>' + esc(checked) + '</small>' : '') + '</div>'
        + '<div class="chan__s"><span class="pill' + pillCls + '">' + esc(t(st.label.indexOf('Not checked for') === 0 ? 'Not checked' : st.label)) + '</span>' + (st.why ? '<small>' + esc(st.why) + '</small>' : '') + '</div>'
        + '<div class="chan__b">' + upLine + (needs ? '<small>' + needs + '</small>' : '') + gone + '</div>'
        + '<div class="chan__r">' + read + '</div></div>';
    }).join('') + '<p class="chan-note">' + esc(t(((D.ota && D.ota.everyMinutes) || 180) <= 10 ? 'Calendars are checked every 10 minutes.' : 'Calendars are checked every 3 hours.')) + '</p>';
  }
  var syncing = false;
  function checkNow() {
    if (syncing) return; syncing = true;
    var b = $('#chanSync'); if (b) { b.disabled = true; b.textContent = t('Checking…'); }
    fetch(PROXY + '/ical-import', { method: 'POST', headers: { 'X-Token': ls('ryst_proxy_token') || '' } })
      .catch(function () {})
      .then(function () { return get('/ota-status', 'ota'); })
      .then(function () { return get('/stays', 'stays'); })
      .then(function () { syncing = false; if (b) { b.disabled = false; b.textContent = t('Check now'); } });
  }
  doc.addEventListener('click', function (e) { if (e.target && e.target.id === 'chanSync') checkNow(); });

  // ── Header bits ───────────────────────────────────────────────────────
  function renderHeader() {
    var h = new Date().getHours(), name = ls('ryst_user_name') || '';
    var greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    var first = String(name).trim().split(/\s+/)[0] || '';
    setHTML('dGreet', '<span>' + esc(t(greet)) + '</span>' + (first ? '<span data-no-i18n>, ' + esc(first) + '</span>' : ''));
    var date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    var dd = $('#dDate'); if (dd) { dd.textContent = date; dd.setAttribute('data-no-i18n', ''); }
    var email = ls('ryst_user_email') || '';
    if (window.rystAvatarInner) $$('[data-rh-av]').forEach(function (el) { el.innerHTML = window.rystAvatarInner(); });
    else $('#dInitial').textContent = (name || email || 'R').trim().charAt(0).toUpperCase();
    var lv = $('#dLangVal'); if (lv) lv.textContent = window.RYST_LANG === 'ta' ? 'தமிழ்' : 'English';
    $('#dUserName').textContent = name || email.split('@')[0] || 'Signed in';
    $('#dUserEmail').textContent = email;
    $('#dUserRole').textContent = t(ROLE.charAt(0).toUpperCase() + ROLE.slice(1));
    doc.body.classList.toggle('has-demo-bar', ls('ryst_demo') === '1');
    fitDemoBar(); setTimeout(fitDemoBar, 400);
  }

  // Demo mode's banner sits at the bottom; keep the bottom nav just above it.
  function fitDemoBar() { var bar = doc.getElementById('rystDemoBar'); if (bar) doc.body.style.setProperty('--demo-h', bar.offsetHeight + 'px'); }
  window.addEventListener('load', function () { fitDemoBar(); setTimeout(fitDemoBar, 300); });
  window.addEventListener('resize', fitDemoBar);

  // ── Render everything from whatever has arrived so far ─────────────────
  function render() {
    var caretaker = ROLE === 'caretaker';
    show($('#dashOwner'), !caretaker); show($('#dashCare'), caretaker);
    var list = stayList();
    if (caretaker) { renderCare(list); renderAttention(list); return; }
    renderKpis(list); renderToday(list); renderAttention(list); renderUpcoming(list); renderChannels();
    show($('#cToday'), can('bookings') || can('guestRegister'));
    show($('#cUp'), can('bookings') || can('guestRegister'));
  }

  // A new name or photo from Edit profile: greeting, avatars and menus follow.
  doc.addEventListener('rh-profile', function () { if (started) { renderHeader(); refreshNav(); } });

  var started = false;
  function start() {
    readAccess(); renderHeader(); refreshNav(); wireWidgets(); wireNotif(); wireDelete();
    if (started) return;
    started = true;
    load();
  }
  doc.addEventListener('plan-features', function (e) {
    if (Array.isArray(e.detail) && e.detail.indexOf('caretaker') < 0) { NO_CARETAKER_PLAN = true; if (started) { refreshNav(); render(); } }
  });
  // Come back to fresh numbers when the app returns to the foreground.
  doc.addEventListener('visibilitychange', function () { if (started && doc.visibilityState === 'visible' && !$('#homeView').hidden) { TODAY = todayISO(); renderHeader(); load(true); } });

  window.rystDashboard = { start: start, refreshNav: refreshNav };
  if (window.RYST_DASH_PENDING) start();
})();
