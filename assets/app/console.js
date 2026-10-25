// The Harbour console: RYST Harbour's own business — the CEO's dashboard,
// the sales pipeline and growth tools, revenue, plans, customers (villas),
// reports, the Harbour team and its activity log. Its own Google sign-in
// (/auth/platform), kept apart from any villa's; what each person sees follows
// their Harbour role (the server checks every request too). The session token
// is the only thing kept in this browser (harbour_console_token).
'use strict';
const PROXY = 'https://data.ryst.in';
const SITE = 'https://harbour.ryst.in';
const GOOGLE_CLIENT_ID = '717827758789-99ugj40a6j2rr4r7db26shn0hivq0vv0.apps.googleusercontent.com';
const KEY = 'harbour_console_token';
const $ = id => document.getElementById(id);
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDay = v => v ? new Date(typeof v === 'number' ? v : (String(v).length === 10 ? v + 'T00:00:00' : v)).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fmtShort = v => v ? new Date(typeof v === 'number' ? v : (String(v).length === 10 ? v + 'T00:00:00' : v)).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
const fmtWhen = t => t ? new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
const rs = n => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
const rsK = n => { n = Math.round(Number(n || 0)); return n >= 1e7 ? '₹' + (n / 1e7).toFixed(n >= 1e8 ? 0 : 1) + ' Cr' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(n >= 1e6 ? 0 : 1) + ' L' : rs(n); };
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const dayPlus = n => new Date(Date.now() + 5.5 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const cap = s => String(s || '').replace(/^./, c => c.toUpperCase());
const ago = t => { if (!t) return ''; const h = (Date.now() - t) / 3600e3; return h < 1 ? Math.max(1, Math.round(h * 60)) + ' min ago' : h < 48 ? Math.round(h) + ' h ago' : Math.round(h / 24) + ' days ago'; };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const waNum = p => String(p || '').replace(/\D/g, '').replace(/^0+/, '').replace(/^(\d{10})$/, '91$1');
let token = ''; try { token = localStorage.getItem(KEY) || ''; } catch (e) {}
let ME = { perms: [] }, page = '';
const can = p => ME.perms.includes(p);
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2800); }

async function api(method, path, body) {
  const r = await fetch(PROXY + path, { method, headers: Object.assign({ 'X-Token': token }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { signOut(d.error); throw new Error(d.error || 'Signed out'); }
  if (!r.ok) throw new Error(d.error || ('Error ' + r.status));
  return d;
}

// ── sign-in ──
function showSignin(err) {
  $('app').hidden = true; $('signin').hidden = false; $('signinErr').textContent = err || '';
  const draw = () => { if (!window.google || !google.accounts || !google.accounts.id) return setTimeout(draw, 200);
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onGoogle, auto_select: false });
    google.accounts.id.renderButton($('gbtn'), { theme: 'outline', size: 'large', width: Math.min(320, $('gbtn').clientWidth || 300), text: 'signin_with' }); };
  draw();
}
async function onGoogle(resp) {
  $('signinErr').textContent = 'Checking…';
  try {
    const r = await fetch(PROXY + '/auth/platform', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ googleIdToken: resp.credential }) });
    const d = await r.json().catch(() => ({}));
    if (!d.ok || !d.token) { $('signinErr').textContent = d.error || 'Access denied.'; return; }
    token = d.token; try { localStorage.setItem(KEY, token); } catch (e) {}
    $('signinErr').textContent = ''; start();
  } catch (e) { $('signinErr').textContent = 'Cannot reach the server — check your connection.'; }
}
function signOut(err) { token = ''; try { localStorage.removeItem(KEY); } catch (e) {} showSignin(err); }
$('signOut').addEventListener('click', () => signOut());

// ── navigation (what a role may open) ──
const ICON = {
  ceo: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>', crm: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
  grow: '<path d="M12 21V9"/><path d="M12 9c0-3 2-5 6-5 0 4-2 6-6 6"/><path d="M12 13c0-3-2-5-6-5 0 4 2 6 6 6"/>', funnel: '<path d="M3 4h18l-7 9v6l-4 2v-8z"/>',
  revenue: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>', plans: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
  customers: '<path d="M3 21V9l9-6 9 6v12H3z"/><path d="M9 21v-6h6v6"/>', invites: '<path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/>',
  reports: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>', team: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>', activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/>', wa: '<path d="M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-4-1z"/>', plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
const PAGES = [
  { key: 'ceo', label: 'CEO dashboard', perm: 'overview', group: 'Command' },
  { key: 'crm', label: 'Pipeline', perm: 'crm', group: 'Sell' }, { key: 'grow', label: 'Growth tools', perm: 'crm', group: 'Sell' }, { key: 'funnel', label: 'Conversion', perm: 'crm', group: 'Sell' },
  { key: 'revenue', label: 'Revenue', perm: 'revenue', group: 'Money' }, { key: 'plans', label: 'Plans & pricing', perm: 'plans', group: 'Money' },
  { key: 'customers', label: 'Villas', perm: 'customers', group: 'Customers' }, { key: 'invites', label: 'Add & invite', perm: 'invites', group: 'Customers' },
  { key: 'reports', label: 'Reports', perm: 'overview', group: 'Company' }, { key: 'team', label: 'Harbour team', perm: 'overview', group: 'Company' }, { key: 'activity', label: 'Activity', perm: 'activity', group: 'Company' }
];
function drawNav() {
  let g = '', h = '';
  PAGES.filter(p => can(p.perm)).forEach(p => {
    if (p.group !== g) { g = p.group; h += `<div class="navgrp">${esc(g)}</div>`; }
    const n = p.key === 'crm' ? ME.dueCount : 0;
    h += `<button class="nav" type="button" data-page="${p.key}"${p.key === page ? ' aria-current="page"' : ''}>${svg(p.key)}${esc(p.label)}${n ? `<span class="count">${n}</span>` : ''}</button>`;
  });
  $('navList').innerHTML = h;
}
$('navList').addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b) go(b.dataset.page); });
const VIEWS = {};
function go(p, opts) {
  if (p === 'overview') p = 'ceo';
  if (!PAGES.some(x => x.key === p && can(x.perm))) p = 'ceo';
  page = p; closeDrawer(); try { history.replaceState(null, '', '#' + p); } catch (e) {}
  drawNav(); $('main').innerHTML = '<div class="card"><div class="skel" style="width:40%"></div><div class="skel"></div><div class="skel" style="width:70%"></div></div>'; window.scrollTo(0, 0);
  VIEWS[p](opts || {}).catch(e => { $('main').innerHTML = `<div class="card"><div class="msg err">${esc(e.message)}</div><button class="btn sm" type="button" onclick="go(page)">Try again</button></div>`; });
}
const head = (title, sub, actions) => `<div class="head"><h1>${esc(title)}</h1>${actions ? `<div class="act no-print">${actions}</div>` : ''}${sub ? `<p>${sub}</p>` : ''}</div>`;
const kpi = (n, l, sub) => `<div class="kpi"><span class="l">${esc(l)}</span><b>${n}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
const delta = (cur, prev, fmt) => {
  if (prev == null || cur == null) return '';
  const d = cur - prev; if (!d) return '<span class="delta flat">same as last month</span>';
  return `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${(fmt || String)(Math.abs(d))}</span> <span class="meta">vs last month</span>`;
};
const download = (name, rows) => {
  const csv = rows.map(r => r.map(v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
};
const copyText = async (t, label) => { try { await navigator.clipboard.writeText(t); toast((label || 'Copied') + ' ✓'); } catch (e) { toast('Select it and copy'); } };

async function start() {
  $('signin').hidden = true; $('app').hidden = false;
  try { const t = await api('GET', '/platform/team'); ME = { email: t.me, role: t.role, perms: t.perms, roles: t.roles, team: t.team }; }
  catch (e) { return signOut(e.message); }
  const m = (ME.team || []).find(x => x.email === ME.email) || {};
  ME.name = m.name || '';
  $('meName').textContent = m.name || ME.email; $('meEmail').textContent = m.name ? ME.email : '';
  $('meRole').textContent = ((ME.roles || []).find(r => r.key === ME.role) || {}).label || ME.role;
  $('topNew').hidden = !can('crm');
  route();
}
function route() {
  const h = (location.hash || '').slice(1);
  const lead = /^lead=([\w-]+)$/.exec(h);
  if (lead && can('crm')) return go('crm', { lead: lead[1] });
  go(h || 'ceo');
}

// ── charts: one series per axis, hover tooltips, nothing on a second scale ──
function barChart(el, rows, valueKey, fmt) {
  const W = Math.max(300, el.clientWidth || 600), H = 200, L = 56, R = 6, T = 10, B = 24, max = Math.max(1, ...rows.map(r => r[valueKey] || 0));
  const p10 = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / p10) * p10, step = (W - L - R) / rows.length, bw = Math.max(6, Math.min(44, step - 8));
  const y = v => T + (H - T - B) * (1 - v / top);
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart">${[0, top / 2, top].map(v => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 3.5}" text-anchor="end">${esc(fmt(v))}</text>`).join('')}
    ${rows.map((r, i) => { const x = L + i * step + (step - bw) / 2, yy = y(r[valueKey] || 0), h = y(0) - yy, rr = Math.min(4, h, bw / 2);
      return `${h > 0 ? `<path fill="var(--bar)" d="M${x},${y(0)} V${yy + rr} q0,-${rr} ${rr},-${rr} H${x + bw - rr} q${rr},0 ${rr},${rr} V${y(0)} Z"/>` : ''}<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${esc(r.label)}</text><rect data-i="${i}" x="${L + i * step}" y="${T}" width="${step}" height="${H - T - B}" fill="transparent"/>`; }).join('')}</svg><div class="tip"></div>`;
  const s = el.querySelector('svg'), tip = el.querySelector('.tip');
  s.addEventListener('pointermove', e => { const h = e.target.closest('rect[data-i]'); if (!h) return; const r = rows[+h.dataset.i], b = s.getBoundingClientRect();
    tip.textContent = `${r.full || r.label}: ${fmt(r[valueKey] || 0)}`; tip.style.left = ((L + (+h.dataset.i + .5) * step) / W * b.width) + 'px'; tip.style.top = (y(r[valueKey] || 0) / H * b.height) + 'px'; tip.style.opacity = 1; });
  s.addEventListener('pointerleave', () => { tip.style.opacity = 0; });
}
// A line over months; months with no reading are left as a gap (never drawn as zero).
function lineChart(el, rows, valueKey, fmt) {
  const got = rows.filter(r => r[valueKey] != null);
  if (got.length < 2) { el.innerHTML = `<div class="empty big"><b>${got.length ? fmt(got[0][valueKey]) + ' today' : 'Nothing recorded yet'}</b>The line appears once there are two months of readings.</div>`; return; }
  const W = Math.max(300, el.clientWidth || 600), H = 210, L = 56, R = 10, T = 12, B = 24, vals = rows.map(r => r[valueKey]).filter(v => v != null);
  const max = Math.max(1, ...vals), p10 = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / p10) * p10, step = (W - L - R) / Math.max(1, rows.length - 1);
  const x = i => L + i * step, y = v => T + (H - T - B) * (1 - v / top);
  let d = '', pen = false; rows.forEach((r, i) => { const v = r[valueKey]; if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i)},${y(v)} `; pen = true; });
  const area = (() => { const pts = rows.map((r, i) => r[valueKey] == null ? null : [x(i), y(r[valueKey])]).filter(Boolean); return pts.length > 1 ? `M${pts[0][0]},${y(0)} ` + pts.map(p => `L${p[0]},${p[1]}`).join(' ') + ` L${pts[pts.length - 1][0]},${y(0)} Z` : ''; })();
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart">${[0, top / 2, top].map(v => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 3.5}" text-anchor="end">${esc(fmt(v))}</text>`).join('')}
    ${area ? `<path d="${area}" fill="var(--bar)" opacity=".1"/>` : ''}<path d="${d}" fill="none" stroke="var(--bar)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${rows.map((r, i) => r[valueKey] == null ? '' : `<circle cx="${x(i)}" cy="${y(r[valueKey])}" r="3.5" fill="var(--bar)" stroke="var(--panel)" stroke-width="2"/>`).join('')}
    ${rows.map((r, i) => i % (rows.length > 8 ? 2 : 1) ? '' : `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(r.label)}</text>`).join('')}
    <line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--muted2)" stroke-dasharray="3 3" opacity="0"/>
    <rect x="${L - step / 2}" y="${T}" width="${W - L - R + step}" height="${H - T - B}" fill="transparent"/></svg><div class="tip"></div>`;
  const s = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = s.querySelector('.xh');
  s.addEventListener('pointermove', e => { const b = s.getBoundingClientRect(), px = (e.clientX - b.left) / b.width * W, i = Math.max(0, Math.min(rows.length - 1, Math.round((px - L) / step))), r = rows[i];
    xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('opacity', 1);
    tip.textContent = `${r.full || r.label}: ${r[valueKey] == null ? 'not tracked' : fmt(r[valueKey])}`; tip.style.left = (x(i) / W * b.width) + 'px'; tip.style.top = ((r[valueKey] == null ? T + 20 : y(r[valueKey])) / H * b.height) + 'px'; tip.style.opacity = 1; });
  s.addEventListener('pointerleave', () => { tip.style.opacity = 0; xh.setAttribute('opacity', 0); });
}
const monLabel = m => new Date(m + '-01T00:00:00').toLocaleDateString(undefined, { month: 'short' });
const monFull = m => new Date(m + '-01T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const stageLabel = s => ({ new: 'New', contacted: 'Contacted', demo: 'Demo', invited: 'Invited', trial: 'On trial', won: 'Won', lost: 'Lost' })[s] || s;
const sourceLabel = s => ({ website: 'Website form', whatsapp: 'WhatsApp', instagram: 'Instagram', referral: 'Referral', event: 'Event', call: 'Call', other: 'Other' })[s] || cap(s);

// ── WhatsApp scripts the rep sends from their own WhatsApp (nothing is sent from here) ──
const SCRIPTS = [
  { key: 'first', stage: ['new'], label: 'First reply to a demo request', text: 'Hi {name}, this is {me} from RYST Harbour. Thanks for asking about a demo for {villa}! Would today or tomorrow suit for a 20-minute video call? I\'ll show you bookings, guest check-in, WhatsApp replies and payments running live at RYST 109A on ECR.' },
  { key: 'nudge', stage: ['new', 'contacted'], label: 'No reply yet', text: 'Hi {name}, just following up on the Harbour demo for {villa}. You can also try the demo app yourself any time: ' + SITE + '/login.html?demo=1 — happy to walk you through it whenever suits.' },
  { key: 'afterdemo', stage: ['demo'], label: 'After the demo', text: 'Thanks for your time today, {name}! As promised, here\'s Harbour: ' + SITE + ' . Shall I set up {villa} for a free trial? It takes about 10 minutes and I can do it with you on a call.' },
  { key: 'invite', stage: ['invited'], label: 'Invite sent — help them start', text: 'Hi {name}, your link to set up {villa} on Harbour is ready. Sign in with your Google account and it walks you through. Want me to join a quick call while you do it?' },
  { key: 'trial', stage: ['trial'], label: 'Trial check-in', text: 'Hi {name}, how is {villa} finding Harbour so far? If anything is unclear I can help you set it up — and pick the right plan before the trial ends.' },
  { key: 'winback', stage: ['lost'], label: 'Win back', text: 'Hi {name}, {me} from RYST Harbour here. We\'ve added a lot since we last spoke — would a 10-minute look be useful for {villa} this season?' },
  { key: 'referral', stage: ['won'], label: 'Ask a happy customer for a referral', text: 'Hi {name}, glad Harbour is working well for {villa}! Do you know another villa owner who\'d benefit? Here\'s a link you can share: {ref}' }
];
const fillScript = (t, l) => t.replace(/\{name\}/g, (l.name || '').split(' ')[0] || 'there').replace(/\{villa\}/g, l.villaName || 'your villa').replace(/\{me\}/g, (ME.name || '').split(' ')[0] || 'the Harbour team')
  .replace(/\{ref\}/g, SITE + '/?ref=' + encodeURIComponent(l.villaSlug || 'customer') + '#demo');
const waLink = (l, text) => `https://wa.me/${waNum(l.phone)}${text ? '?text=' + encodeURIComponent(text) : ''}`;
const scriptFor = l => SCRIPTS.find(s => s.stage.includes(l.stage)) || SCRIPTS[0];

// ── CEO dashboard ──
VIEWS.ceo = async () => {
  const d = await api('GET', '/platform/ceo');
  const S = d.sales, R = d.revenue, G = d.goals || {};
  ME.dueCount = S ? S.overdue.length + S.uncontacted.length : 0; drawNav();
  const hr = new Date(Date.now() + 5.5 * 3600e3).getUTCHours(), hello = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const first = (ME.name || '').split(' ')[0];
  let h = head(`${hello}${first ? ', ' + first : ''}`, `${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · RYST Harbour at a glance — what's growing, what needs you today.`,
    can('team') ? '<button class="btn" id="setGoals" type="button">Set targets</button>' : '');
  // north-star numbers
  const weighted = S ? S.pipeline.reduce((t, p) => t + p.weighted, 0) : 0;
  h += '<div class="kpis">';
  if (R) h += kpi(rs(R.mrr), 'Monthly recurring revenue', R.mrrLastMonthEnd != null ? delta(R.mrr, R.mrrLastMonthEnd, rs) : `ARR ${rsK(R.arr)}`);
  h += kpi(d.villas.paying, 'Paying villas', G.paying ? `target ${G.paying}` : `${plural(d.villas.trials, 'villa')} on trial`);
  if (S) {
    h += kpi(S.newThisMonth, 'New leads this month', delta(S.newThisMonth, S.newLastMonth));
    h += kpi(S.demosThisMonth, 'Demos this month', delta(S.demosThisMonth, S.demosLastMonth));
    h += kpi(S.wonThisMonth, 'Won this month', delta(S.wonThisMonth, S.wonLastMonth));
    h += kpi(rs(weighted) + '<span class="meta">/mo</span>', 'Weighted pipeline', `${plural(S.open, 'open lead')}`);
    h += kpi(S.winRate != null ? S.winRate + '%' : '—', 'Win rate', S.closed ? `of ${S.closed} closed` : 'no closed leads yet');
    h += kpi(S.speedToLeadHours != null ? (S.speedToLeadHours < 1 ? Math.round(S.speedToLeadHours * 60) + ' min' : S.speedToLeadHours + ' h') : '—', 'Speed to lead', 'median, new lead → first contact');
  }
  if (R) h += kpi(rs(R.collectedThisMonth), 'Collected this month', delta(R.collectedThisMonth, R.collectedLastMonth, rs));
  h += '</div>';

  h += '<div class="grid2">';
  // targets
  h += `<div class="card"><h2>Targets${G.by ? `<span class="r meta">by ${esc(fmtDay(G.by))}</span>` : ''}</h2>`;
  if (!G.mrr && !G.paying) h += `<div class="empty big"><b>No targets yet</b>Set an MRR and paying-villa target and this card shows your pace, what's needed each month, and how many leads that takes.${can('team') ? '<div style="margin-top:10px"><button class="btn primary sm" type="button" data-set-goals>Set targets</button></div>' : ''}</div>`;
  else {
    const months = G.by ? Math.max(0.5, (Date.parse(G.by) - Date.now()) / (30.4 * 864e5)) : null;
    const meter = (cur, tgt, fmt, what) => { const pct = Math.min(100, tgt ? cur / tgt * 100 : 0), need = Math.max(0, tgt - cur);
      return `<div class="goal"><div class="gl"><span>${what}</span><span><b>${fmt(cur)}</b> of ${fmt(tgt)}</span></div><div class="meter"><i style="width:${pct.toFixed(1)}%"></i></div>
        <small>${need ? `${fmt(need)} to go${months ? ` · about <b>${fmt(Math.ceil(need / months))}</b> a month` : ''}` : 'Reached ✓'}</small></div>`; };
    if (G.mrr && R) h += meter(R.mrr, G.mrr, rs, 'Monthly recurring revenue');
    if (G.paying) h += meter(d.villas.paying, G.paying, n => String(Math.round(n)), 'Paying villas');
    if (G.paying && S && months) {
      const need = Math.max(0, G.paying - d.villas.paying), perMonth = Math.ceil(need / months), rate = S.winRate ? S.winRate / 100 : null;
      h += `<p class="hint" style="margin:6px 0 0">${need ? `To add ${plural(perMonth, 'paying villa')} a month you need about <b>${rate ? plural(Math.ceil(perMonth / rate), 'new lead') : '— (no win rate yet)'}</b> a month${rate ? ` at your ${S.winRate}% win rate` : ''}.` : ''}
        ${G.leadsPerMonth ? ` Leads this month: <b>${S.newThisMonth}</b> of ${G.leadsPerMonth}.` : ''}${G.demosPerMonth ? ` Demos: <b>${S.demosThisMonth}</b> of ${G.demosPerMonth}.` : ''}</p>`;
    }
  }
  h += '</div>';
  // today's actions
  if (S || R || d.trialsEnding.length) {
    const items = [];
    (S ? S.uncontacted : []).forEach(l => items.push({ tag: 'hot', t: 'New', l, why: `asked ${ago(l.createdAt)} — not contacted yet` }));
    (S ? S.overdue : []).filter(l => !(S.uncontacted || []).some(u => u.id === l.id)).forEach(l => items.push({ tag: 'due', t: l.nextFollowUp < d.today ? 'Overdue' : 'Today', l, why: `follow-up ${fmtShort(l.nextFollowUp)} · ${stageLabel(l.stage)}` }));
    d.trialsEnding.forEach(v => items.push({ tag: 'money', t: 'Trial', v, why: `trial ends in ${plural(v.daysLeft, 'day')} · ${plural(v.bookings, 'booking')}, ${plural(v.users, 'user')}` }));
    (R ? R.atRisk : []).forEach(v => items.push({ tag: 'hot', t: v.state === 'lapsed' ? 'Lapsed' : 'Due', v, why: v.state === 'lapsed' ? `read-only — ${rs(v.mrr)}/mo at stake` : `payment due, ${plural(v.daysLeft || 0, 'day')} grace` }));
    (R ? R.renewals : []).forEach(v => items.push({ tag: 'money', t: 'Renewal', v, why: `paid until ${fmtShort(v.paidUntil)} · ${rs(v.mrr)}/mo` }));
    (S ? S.stale : []).forEach(l => items.push({ tag: 'cold', t: 'Cold', l, why: `no contact ${l.lastTouchAt ? ago(l.lastTouchAt) : 'yet'} · ${stageLabel(l.stage)}` }));
    h += `<div class="card inbox"><h2>Today's actions<span class="r meta">${items.length ? plural(items.length, 'item') : ''}</span></h2><p class="hint">New leads first — the first hour decides most deals.</p>`;
    h += items.length ? items.slice(0, 14).map(it => it.l ? `<div class="row"><span class="tag ${it.tag}">${it.t}</span><div class="grow"><b>${esc(it.l.villaName || it.l.name)}</b><div class="meta">${esc(it.why)}${it.l.city ? ' · ' + esc(it.l.city) : ''}</div></div>
        <div class="acts">${it.l.phone ? `<a class="btn sm icon" href="tel:${esc(it.l.phone)}" aria-label="Call">${svg('phone')}</a><a class="btn sm icon" href="${esc(waLink(it.l, fillScript(scriptFor(it.l).text, it.l)))}" target="_blank" rel="noopener" aria-label="WhatsApp">${svg('wa')}</a>` : ''}<button class="btn sm" type="button" data-open-lead="${esc(it.l.id)}">Open</button></div></div>`
      : `<div class="row"><span class="tag ${it.tag}">${it.t}</span><div class="grow"><b>${esc(it.v.name)}</b><div class="meta">${esc(it.why)}</div></div>${can('customers') ? '<button class="btn sm" type="button" data-go="customers">Villas</button>' : ''}</div>`).join('')
      : '<div class="empty big"><b>All clear ✓</b>No new, overdue or cold leads, and no trials, renewals or payments needing you.</div>';
    h += '</div>';
  }
  h += '</div>';

  // trend + pipeline
  h += '<div class="grid2">';
  h += `<div class="card"><h2>${R ? 'MRR' : 'Paying villas'} by month</h2><p class="hint">${d.trackedSince ? `Recorded daily since ${esc(fmtDay(d.trackedSince))}; earlier months weren't tracked.` : 'Recorded daily from today.'}</p><div class="chart" id="chTrend"></div></div>`;
  if (S) h += `<div class="card"><h2>Pipeline</h2><p class="hint">Open leads by stage. Worth = plan price a month (the plan they're interested in, else Growth); weighted by a fixed chance per stage: ${Object.entries(d.odds).map(([k, v]) => `${stageLabel(k)} ${Math.round(v * 100)}%`).join(' · ')}.</p>
    <div class="legend"><span><i style="background:var(--bar2)"></i>Worth if all win</span><span><i style="background:var(--bar)"></i>Weighted</span></div>
    ${(() => { const mx = Math.max(1, ...S.pipeline.map(p => p.value)); return S.pipeline.map(p => `<div class="hbar"><span>${stageLabel(p.stage)} <span class="meta">${p.count}</span></span><div class="track"><div class="fill soft" style="width:${(p.value / mx * 100).toFixed(1)}%"></div><div class="fill" style="position:relative;width:${(p.weighted / mx * 100).toFixed(1)}%"></div></div><span class="n">${rs(p.weighted)} <span class="meta">of ${rs(p.value)}</span></span></div>`).join(''); })()}</div>`;
  h += '</div>';

  if (S) {
    h += '<div class="grid3">';
    h += `<div class="card"><h2>Team this week</h2>${S.team.length ? `<table><thead><tr><th>Rep</th><th class="n">Contacts</th><th class="n">Open</th><th class="n">Overdue</th><th class="n">Won</th></tr></thead><tbody>${S.team.sort((a, b) => b.touches7d - a.touches7d).map(m => `<tr><td>${esc(m.name || m.email.split('@')[0])}</td><td class="n">${m.touches7d}</td><td class="n">${m.open}</td><td class="n">${m.overdue ? `<span class="pill err">${m.overdue}</span>` : 0}</td><td class="n">${m.wonThisMonth}</td></tr>`).join('')}</tbody></table><p class="hint" style="margin:8px 0 0">Contacts = calls, WhatsApps, emails and demos logged in 7 days. Won = this month.</p>` : '<div class="empty">No leads assigned yet.</div>'}</div>`;
    h += `<div class="card"><h2>Where customers come from</h2>${S.bySource.length ? `<table><thead><tr><th>Source</th><th class="n">Leads</th><th class="n">Won</th><th class="n">MRR won</th></tr></thead><tbody>${S.bySource.sort((a, b) => b.leads - a.leads).map(s => `<tr><td>${esc(sourceLabel(s.source))}</td><td class="n">${s.leads}</td><td class="n">${s.won}</td><td class="n">${rs(s.mrrWon)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">No leads yet. Growth tools has campaign links and the demo form.</div>'}</div>`;
    h += `<div class="card"><h2>Why we lose</h2>${S.lostReasons.length ? S.lostReasons.map(r => `<div class="row"><div class="grow">${esc(cap(r.reason))}</div><span class="pill mute">${r.count}</span></div>`).join('') : '<div class="empty">No lost leads yet.</div>'}${S.noFollowUp ? `<p class="hint" style="margin:10px 0 0"><b>${plural(S.noFollowUp, 'open lead')}</b> ${S.noFollowUp === 1 ? 'has' : 'have'} no follow-up date.</p>` : ''}</div>`;
    h += '</div>';
  }
  // customers
  if (d.customers.length || can('customers')) {
    h += `<div class="card"><h2>Customers<span class="r meta">${plural(d.villas.customers, 'villa')} besides RYST 109A</span></h2>`;
    h += d.customers.length ? `<div class="scroll"><table><thead><tr><th>Villa</th><th>State</th><th class="n">Bookings</th><th class="n">Users</th><th class="n">MRR</th><th>Since</th></tr></thead><tbody>${d.customers.map(v => `<tr><td><b>${esc(v.name)}</b></td><td><span class="pill ${v.state === 'lapsed' ? 'err' : v.state === 'grace' ? 'warn' : v.state === 'trial' ? 'info' : ''}">${esc(cap(v.state))}${v.tier && v.state !== 'trial' ? ' · ' + esc(cap(v.tier)) : ''}</span></td><td class="n">${v.bookings}</td><td class="n">${v.users}</td><td class="n">${rs(v.mrr)}</td><td>${esc(fmtShort(v.created_at))}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty big"><b>No customer villas yet</b>Your first one starts with a lead: share the demo form, then invite them from the pipeline.${can('crm') ? '<div style="margin-top:10px"><button class="btn sm" type="button" data-go="grow">Open growth tools</button></div>' : ''}</div>`;
    h += '</div>';
  }
  $('main').innerHTML = h;
  const tr = d.trend.map(m => ({ label: monLabel(m.month), full: monFull(m.month), mrr: m.mrr, paying: m.paying }));
  if (R) lineChart($('chTrend'), tr, 'mrr', rsK); else lineChart($('chTrend'), tr, 'paying', v => String(Math.round(v)));
  bindCommon($('main'));
  const sg = () => goalsDrawer(G, d);
  if ($('setGoals')) $('setGoals').addEventListener('click', sg);
  $('main').querySelectorAll('[data-set-goals]').forEach(b => b.addEventListener('click', sg));
};
function bindCommon(root) {
  root.querySelectorAll('[data-open-lead]').forEach(b => b.addEventListener('click', async () => { await loadLeads(); openLead(b.dataset.openLead); }));
  root.querySelectorAll('[data-new-lead]').forEach(b => b.addEventListener('click', async () => { await loadLeads(); openLead(null); }));
  root.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
}
function goalsDrawer(G, d) {
  $('drawerPanel').innerHTML = `<div class="head"><h1 style="font-size:19px">Targets</h1><div class="act"><button class="btn sm" id="gClose" type="button">Close</button></div><p>What the CEO dashboard tracks you against. Everyone on the Harbour team sees them; only admins change them.</p></div>
    <div class="fields"><label class="f"><span>MRR target (₹ a month)</span><input id="gMrr" type="number" min="0" inputmode="numeric" value="${G.mrr || ''}" placeholder="${d.revenue ? Math.max(10000, Math.round(d.revenue.mrr * 3 / 1000) * 1000) : ''}"></label>
    <label class="f"><span>Paying villas</span><input id="gPaying" type="number" min="0" inputmode="numeric" value="${G.paying || ''}"></label>
    <label class="f"><span>By</span><input id="gBy" type="date" value="${esc(G.by || '')}"></label>
    <label class="f"><span>New leads a month</span><input id="gLeads" type="number" min="0" inputmode="numeric" value="${G.leadsPerMonth || ''}"></label>
    <label class="f"><span>Demos a month</span><input id="gDemos" type="number" min="0" inputmode="numeric" value="${G.demosPerMonth || ''}"></label></div>
    ${G.setBy ? `<p class="hint">Last set by ${esc(G.setBy)} · ${esc(fmtWhen(G.setAt))}</p>` : ''}
    <button class="btn primary" id="gSave" type="button">Save targets</button><div class="msg" id="gMsg"></div>`;
  $('drawer').hidden = false;
  $('gClose').addEventListener('click', closeDrawer);
  $('gSave').addEventListener('click', async e => {
    e.currentTarget.disabled = true;
    try { await api('PUT', '/platform/goals', { mrr: Number($('gMrr').value) || 0, paying: Number($('gPaying').value) || 0, by: $('gBy').value, leadsPerMonth: Number($('gLeads').value) || 0, demosPerMonth: Number($('gDemos').value) || 0 });
      toast('Targets saved'); closeDrawer(); go('ceo'); } catch (err) { $('gMsg').className = 'msg err'; $('gMsg').textContent = err.message; e.currentTarget.disabled = false; }
  });
}

// ── Pipeline (CRM) ──
let LEADS = null, crmView = 'board', crmOwner = 'all', crmSource = '';
async function loadLeads() { LEADS = await api('GET', '/platform/crm'); return LEADS; }
const lastTouch = l => Math.max(l.lastTouchAt || 0, ...(l.history || []).filter(h => h.stage !== 'new').map(h => h.at || 0), 0);
const isOpen = l => !['won', 'lost'].includes(l.stage);
const leadFlags = l => {
  const f = [];
  if (!isOpen(l)) return f;
  if (l.stage === 'new' && !lastTouch(l)) f.push(['hot', 'Not contacted']);
  if (l.nextFollowUp && l.nextFollowUp < today()) f.push(['hot', 'Overdue']); else if (l.nextFollowUp === today()) f.push(['due', 'Today']);
  if (l.stage !== 'new' && (lastTouch(l) || l.createdAt) < Date.now() - 14 * 864e5 && !(l.nextFollowUp && l.nextFollowUp > today())) f.push(['cold', 'Cold']);
  if (!l.nextFollowUp) f.push(['cold', 'No follow-up']);
  return f;
};
VIEWS.crm = async opts => {
  await loadLeads();
  const draw = () => {
    const q = ($('crmQ') && $('crmQ').value || '').trim().toLowerCase();
    const leads = LEADS.leads.filter(l => (!q || [l.name, l.villaName, l.email, l.phone, l.city].join(' ').toLowerCase().includes(q))
      && (crmOwner === 'all' || (crmOwner === 'me' ? l.owner === ME.email : crmOwner === 'none' ? !l.owner : l.owner === crmOwner)) && (!crmSource || (l.source || 'other') === crmSource));
    const card = l => `<div class="lead" draggable="true" tabindex="0" role="button" data-lead="${esc(l.id)}"><b>${esc(l.villaName || l.name || 'Lead')}</b><small>${esc([l.name && l.villaName ? l.name : '', l.city, sourceLabel(l.source || 'other')].filter(Boolean).join(' · '))}</small>
      ${l.nextFollowUp && isOpen(l) ? `<small class="${l.nextFollowUp <= today() ? 'due' : ''}">Follow up ${esc(fmtShort(l.nextFollowUp))}</small>` : ''}${l.villa ? `<small>Villa: ${esc(l.villa.slug)} · ${esc(l.villa.state)}</small>` : ''}
      ${leadFlags(l).length ? `<div class="flags">${leadFlags(l).map(f => `<span class="tag ${f[0]}">${f[1]}</span>`).join('')}</div>` : ''}
      ${l.phone && isOpen(l) ? `<div class="qa"><a href="tel:${esc(l.phone)}" data-stop>Call</a><a href="${esc(waLink(l, fillScript(scriptFor(l).text, l)))}" target="_blank" rel="noopener" data-stop>WhatsApp</a><button type="button" data-log="${esc(l.id)}">Log</button></div>` : ''}</div>`;
    const price = l => ((PLAN_PRICES || {})[l.planInterest] || (PLAN_PRICES || {}).growth || 0);
    $('crmBody').innerHTML = crmView === 'board'
      ? `<div class="board">${LEADS.stages.map(st => { const ls = leads.filter(l => l.stage === st); return `<div class="col" data-stage="${st}"><h3><span>${stageLabel(st)}</span><span>${ls.length}</span></h3><div class="worth">${PLAN_PRICES && isOpen({ stage: st }) && ls.length ? rs(ls.reduce((t, l) => t + price(l), 0)) + '/mo if all win' : '&nbsp;'}</div>${ls.map(card).join('') || '<div class="empty" style="padding:4px">—</div>'}</div>`; }).join('')}</div><p class="hint no-print" style="margin-top:6px">Drag a card to another column to move it. Call and WhatsApp open on your phone — nothing is sent from here.</p>`
      : `<div class="card scroll"><table><thead><tr><th>Villa / person</th><th>Stage</th><th>Source</th><th>Follow-up</th><th>Last contact</th><th>Owner</th><th>Added</th></tr></thead><tbody>${leads.map(l => `<tr class="click" data-lead="${esc(l.id)}"><td><b>${esc(l.villaName || l.name)}</b><div class="meta">${esc(l.name && l.villaName ? l.name : '')} ${esc(l.phone || '')}</div></td><td><span class="pill ${l.stage === 'lost' ? 'mute' : l.stage === 'won' ? '' : 'warn'}">${stageLabel(l.stage)}</span> ${leadFlags(l).map(f => `<span class="tag ${f[0]}">${f[1]}</span>`).join(' ')}</td><td>${esc(sourceLabel(l.source || 'other'))}</td><td>${esc(fmtShort(l.nextFollowUp))}</td><td>${esc(lastTouch(l) ? ago(lastTouch(l)) : '—')}</td><td>${esc(((LEADS.team || []).find(m => m.email === l.owner) || {}).name || l.owner || '—')}</td><td>${esc(fmtShort(l.createdAt))}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No leads match.</td></tr>'}</tbody></table></div>`;
    if (crmView === 'board') bindBoard();
  };
  const owners = (LEADS.team || []).map(m => `<option value="${esc(m.email)}">${esc(m.name || m.email)}</option>`).join('');
  $('main').innerHTML = head('Pipeline', `Villa owners you're talking to, from first contact to a paying villa. A lead goes to "On trial" by itself when its villa signs up with the same email, and to "Won" at its first payment. Demo requests from ${esc(SITE.replace('https://', ''))} arrive here on their own.`,
      `<button class="btn" id="crmImport" type="button">Import</button><button class="btn" id="crmExport" type="button">${svg('dl')}Export</button>`)
    + `<div class="toolbar no-print"><input class="in sm" id="crmQ" placeholder="Search leads" style="min-width:200px;flex:1;max-width:320px">
      <select class="in sm" id="crmOwner" aria-label="Owner"><option value="all">Everyone's</option><option value="me">Mine</option><option value="none">Unassigned</option>${owners}</select>
      <select class="in sm" id="crmSrc" aria-label="Source"><option value="">All sources</option>${LEADS.sources.map(s => `<option value="${s}">${esc(sourceLabel(s))}</option>`).join('')}</select>
      <span class="seg" style="margin-left:auto"><button type="button" data-view="board" aria-pressed="${crmView === 'board'}">Board</button><button type="button" data-view="list" aria-pressed="${crmView === 'list'}">List</button></span></div>
    <div id="crmBody"></div>`;
  $('crmOwner').value = crmOwner; $('crmSrc').value = crmSource;
  await loadPlanPrices();
  draw();
  $('crmQ').addEventListener('input', draw);
  $('crmOwner').addEventListener('change', e => { crmOwner = e.target.value; draw(); });
  $('crmSrc').addEventListener('change', e => { crmSource = e.target.value; draw(); });
  $('main').querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { crmView = b.dataset.view; $('main').querySelectorAll('[data-view]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); }));
  $('crmBody').addEventListener('click', e => {
    if (e.target.closest('[data-stop]')) return;
    const lg = e.target.closest('[data-log]'); if (lg) { e.stopPropagation(); openLead(lg.dataset.log, { log: true }); return; }
    const t = e.target.closest('[data-lead]'); if (t) openLead(t.dataset.lead);
  });
  $('crmBody').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.lead')) { e.preventDefault(); openLead(e.target.dataset.lead); } });
  $('crmExport').addEventListener('click', () => exportLeads(LEADS.leads));
  $('crmImport').addEventListener('click', importDrawer);
  VIEWS.crm.redraw = draw;
  if (opts.lead) openLead(opts.lead);
};
let PLAN_PRICES = null;
async function loadPlanPrices() {
  if (PLAN_PRICES) return PLAN_PRICES;
  try { const r = await fetch(PROXY + '/harbour/plans'); const d = await r.json(); PLAN_PRICES = {}; (d.plans || []).forEach(p => { PLAN_PRICES[p.key] = p.monthly; }); PLAN_PRICES._trialDays = d.trialDays; } catch (e) { PLAN_PRICES = {}; }
  return PLAN_PRICES;
}
function bindBoard() {
  let dragId = null;
  $('crmBody').querySelectorAll('.lead').forEach(c => {
    c.addEventListener('dragstart', e => { dragId = c.dataset.lead; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch (x) {} });
    c.addEventListener('dragend', () => c.classList.remove('dragging'));
  });
  $('crmBody').querySelectorAll('.col').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', async e => {
      e.preventDefault(); col.classList.remove('over');
      const l = LEADS.leads.find(x => x.id === dragId), stage = col.dataset.stage; if (!l || l.stage === stage) return;
      const body = { id: l.id, stage };
      if (stage === 'lost') { const why = prompt(`Why was ${l.villaName || l.name} lost? (helps the "Why we lose" report)`, l.lostReason || ''); if (why === null) return; body.lostReason = why; }
      const was = l.stage; l.stage = stage; VIEWS.crm.redraw();
      try { await api('PUT', '/platform/crm', body); toast(`${l.villaName || l.name} → ${stageLabel(stage)}`); await loadLeads(); VIEWS.crm.redraw(); }
      catch (err) { l.stage = was; VIEWS.crm.redraw(); toast(err.message); }
    });
  });
}
function exportLeads(leads) {
  const team = new Map((LEADS && LEADS.team || []).map(m => [m.email, m.name || m.email]));
  download(`harbour-leads-${today()}.csv`, [['Villa', 'Contact', 'Phone', 'Email', 'City', 'Rooms', 'Stage', 'Source', 'Plan interest', 'Owner', 'Next follow-up', 'Last contact', 'Added', 'Lost reason', 'Villa ID']]
    .concat(leads.map(l => [l.villaName, l.name, l.phone, l.email, l.city, l.rooms, stageLabel(l.stage), sourceLabel(l.source || 'other'), l.planInterest, team.get(l.owner) || l.owner, l.nextFollowUp, lastTouch(l) ? new Date(lastTouch(l)).toISOString().slice(0, 10) : '', l.createdAt ? new Date(l.createdAt).toISOString().slice(0, 10) : '', l.lostReason, l.villaSlug])));
}
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
    if (c === '"') q = true; else if (c === ',' || c === '\t') { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim()));
}
function importDrawer() {
  $('drawerPanel').innerHTML = `<div class="head"><h1 style="font-size:19px">Import prospects</h1><div class="act"><button class="btn sm" id="iClose" type="button">Close</button></div>
    <p>Paste a list (from a spreadsheet, or a CSV file) of villas you want to approach. The first row names the columns: <b>villa</b>, <b>name</b>, <b>phone</b>, <b>email</b>, <b>city</b>, <b>rooms</b>, <b>source</b>, <b>note</b> — any order, others ignored. Anyone already in the pipeline (same phone or email) is skipped. Up to 500 at a time.</p></div>
    <label class="f"><span>CSV file</span><input id="iFile" type="file" accept=".csv,text/csv,text/plain"></label>
    <label class="f"><span>…or paste</span><textarea id="iText" style="min-height:160px;font-size:13px" placeholder="villa,name,phone,city&#10;Sea Shell Villa,Arun,9840000000,ECR"></textarea></label>
    <div id="iPrev" class="hint"></div>
    <button class="btn primary" id="iGo" type="button" disabled>Import</button><div class="msg" id="iMsg"></div>`;
  $('drawer').hidden = false;
  let rows = [];
  const MAP = { villa: 'villaName', 'villa name': 'villaName', property: 'villaName', name: 'name', contact: 'name', owner: 'name', phone: 'phone', mobile: 'phone', whatsapp: 'phone', email: 'email', city: 'city', location: 'city', rooms: 'rooms', bedrooms: 'rooms', source: 'source', note: 'note', notes: 'note' };
  const prep = () => {
    const all = parseCsv($('iText').value), hdr = (all[0] || []).map(h => MAP[h.trim().toLowerCase()] || '');
    rows = hdr.some(Boolean) ? all.slice(1).map(r => { const o = {}; hdr.forEach((k, i) => { if (k && r[i] != null) o[k] = r[i].trim(); }); return o; }).filter(o => o.villaName || o.name) : [];
    $('iPrev').innerHTML = !all.length ? '' : !hdr.some(Boolean) ? '<span class="msg err">The first row needs column names like villa, name, phone.</span>' : `${plural(rows.length, 'row')} ready${rows.length > 500 ? ' — only the first 500 will be imported' : ''}. First: <b>${esc((rows[0] || {}).villaName || (rows[0] || {}).name || '')}</b>`;
    $('iGo').disabled = !rows.length;
  };
  $('iText').addEventListener('input', prep);
  $('iFile').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { $('iText').value = String(r.result || ''); prep(); }; r.readAsText(f); });
  $('iClose').addEventListener('click', closeDrawer);
  $('iGo').addEventListener('click', async e => {
    e.currentTarget.disabled = true;
    try { const d = await api('POST', '/platform/crm/import', { rows: rows.slice(0, 500) }); toast(`Imported ${d.added}`); $('iMsg').className = 'msg'; $('iMsg').textContent = `${plural(d.added, 'prospect')} added, ${d.skipped} already in the pipeline${d.bad ? `, ${d.bad} without a name or with a bad email` : ''}.`; if (page === 'crm') { await loadLeads(); VIEWS.crm.redraw(); } }
    catch (err) { $('iMsg').className = 'msg err'; $('iMsg').textContent = err.message; e.currentTarget.disabled = false; }
  });
}
function closeDrawer() { $('drawer').hidden = true; }
$('drawer').addEventListener('click', e => { if (e.target === $('drawer')) closeDrawer(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('pal').hidden) closePal(); else if (!$('drawer').hidden) closeDrawer(); } });
function openLead(id, o) {
  o = o || {};
  const l = id ? (LEADS.leads.find(x => x.id === id) || null) : { stage: 'new', source: 'other' };
  if (!l) { toast('That lead is no longer in the pipeline'); return; }
  const opt = (arr, cur, lab) => arr.map(v => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(lab ? lab(v) : cap(v))}</option>`).join('');
  const timeline = id ? [].concat((l.notes || []).map(n => ({ at: n.at, cls: '', html: `${esc(n.text)}<small>${esc(n.by)} · ${esc(fmtWhen(n.at))}</small>` })),
    (l.touches || []).map(t => ({ at: t.at, cls: 'touch', html: `<b>${esc(cap(t.type))}</b>${t.outcome ? ' — ' + esc(t.outcome) : ''}<small>${esc(t.by)} · ${esc(fmtWhen(t.at))}</small>` })),
    (l.history || []).map(h => ({ at: h.at, cls: 'stage', html: `Moved to <b>${esc(stageLabel(h.stage))}</b><small>${esc(h.by)} · ${esc(fmtWhen(h.at))}</small>` }))).sort((a, b) => b.at - a.at) : [];
  const scripts = SCRIPTS.slice().sort((a, b) => (b.stage.includes(l.stage) ? 1 : 0) - (a.stage.includes(l.stage) ? 1 : 0));
  $('drawerPanel').innerHTML = `<div class="head" style="margin-bottom:10px"><h1 style="font-size:19px">${id ? esc(l.villaName || l.name) : 'New lead'}</h1><div class="act"><button class="btn sm" type="button" id="dClose">Close</button></div>
      <p>${id ? `${esc(stageLabel(l.stage))} · added ${esc(fmtDay(l.createdAt))}${l.createdBy ? ' by ' + esc(l.createdBy) : ''}${l.villa ? ` · villa <b>${esc(l.villa.slug)}</b> (${esc(l.villa.state)})` : ''}${l.utm && l.utm.campaign ? ` · campaign ${esc(l.utm.campaign)}` : ''}` : 'Someone interested in running their villa on RYST Harbour.'}</p></div>
    ${id ? `<div class="logbox" id="logBox"><b style="font-size:13.5px">Log what happened</b>
      <div class="chips" style="margin:8px 0" id="lType">${['call', 'whatsapp', 'demo', 'meeting', 'email'].map((t, i) => `<button type="button" class="chip" data-t="${t}" aria-pressed="${i === 0}">${cap(t === 'whatsapp' ? 'WhatsApp' : t)}</button>`).join('')}</div>
      <input class="in" id="lOutcome" maxlength="300" placeholder="What was said / what's next" style="margin-bottom:8px">
      <div class="chips" id="lNextChips"><span class="meta" style="align-self:center">Next follow-up:</span>${[[1, 'Tomorrow'], [3, 'In 3 days'], [7, 'In a week'], [14, 'In 2 weeks']].map(([n, t]) => `<button type="button" class="chip" data-n="${n}" aria-pressed="${n === 3}">${t}</button>`).join('')}</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn primary sm" id="lLog" type="button">Log it</button>
        ${l.phone ? `<a class="btn sm" href="tel:${esc(l.phone)}">${svg('phone')}Call</a>` : ''}</div></div>` : ''}
    <div class="fields">
      <label class="f"><span>Villa name</span><input id="lVilla" value="${esc(l.villaName || '')}" maxlength="120"></label>
      <label class="f"><span>Contact name</span><input id="lName" value="${esc(l.name || '')}" maxlength="100"></label>
      <label class="f"><span>Phone / WhatsApp</span><input id="lPhone" value="${esc(l.phone || '')}" inputmode="tel" maxlength="20"></label>
      <label class="f"><span>Email (their Google account)</span><input id="lEmail" type="email" value="${esc(l.email || '')}" maxlength="200" autocapitalize="none"></label>
      <label class="f"><span>City</span><input id="lCity" value="${esc(l.city || '')}" maxlength="60"></label>
      <label class="f"><span>Rooms</span><input id="lRooms" type="number" min="0" value="${esc(l.rooms || '')}" inputmode="numeric"></label>
      <label class="f"><span>Stage</span><select id="lStage">${opt(LEADS.stages, l.stage, stageLabel)}</select></label>
      <label class="f"><span>Source</span><select id="lSource">${opt(LEADS.sources, l.source || 'other', sourceLabel)}</select></label>
      <label class="f"><span>Plan interest</span><select id="lPlan"><option value="">—</option>${opt(['starter', 'growth', 'pro'], l.planInterest)}</select></label>
      <label class="f"><span>Owner</span><select id="lOwner"><option value="">Unassigned</option>${(LEADS.team || []).map(m => `<option value="${esc(m.email)}"${m.email === (id ? l.owner : ME.email) ? ' selected' : ''}>${esc(m.name || m.email)}</option>`).join('')}</select></label>
      <label class="f"><span>Next follow-up</span><input id="lNext" type="date" value="${esc(l.nextFollowUp || (id ? '' : dayPlus(1)))}"></label>
      <label class="f" id="lLostWrap"${l.stage === 'lost' ? '' : ' hidden'}><span>Why lost</span><input id="lLost" value="${esc(l.lostReason || '')}" maxlength="200" list="lostList"></label>
    </div>
    <datalist id="lostList"><option value="Price"><option value="Using another software"><option value="Not ready yet"><option value="No reply"><option value="Too small (1 villa, self-managed)"><option value="Missing a feature"></datalist>
    <label class="f"><span>${id ? 'Add a note' : 'Note'}</span><textarea id="lNote" maxlength="1000" placeholder="What was said, what's next…"></textarea></label>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="lSave" type="button">${id ? 'Save' : 'Add lead'}</button>
      ${id && can('invites') && !l.villa ? '<button class="btn" id="lInvite" type="button">Send an invite link</button>' : ''}
      ${id ? '<button class="btn danger" id="lDel" type="button" style="margin-left:auto">Delete</button>' : ''}</div>
    <div class="msg" id="lMsg"></div>
    ${id && l.phone ? `<h2 style="font-size:14px;margin-top:18px">WhatsApp scripts</h2><p class="hint" style="margin-bottom:6px">Opens WhatsApp on your phone with the message ready to edit — you send it.</p>
      <select class="in" id="lScript">${scripts.map(s => `<option value="${s.key}">${esc(s.label)}${s.stage.includes(l.stage) ? ' · suggested' : ''}</option>`).join('')}</select>
      <div class="script" id="lScriptText"></div><div style="display:flex;gap:8px"><a class="btn sm primary" id="lScriptGo" target="_blank" rel="noopener">${svg('wa')}Open in WhatsApp</a><button class="btn sm" id="lScriptCopy" type="button">Copy</button></div>` : ''}
    ${id ? `<h2 style="font-size:14px;margin-top:18px">Timeline</h2><div class="tl">${timeline.map(t => `<div class="ev ${t.cls}">${t.html}</div>`).join('') || '<div class="empty">Nothing yet.</div>'}</div>` : ''}`;
  $('drawer').hidden = false;
  (o.log && $('lOutcome') ? $('lOutcome') : $('lVilla')).focus();
  $('dClose').addEventListener('click', closeDrawer);
  $('lStage').addEventListener('change', e => { $('lLostWrap').hidden = e.target.value !== 'lost'; });
  const after = async msg => { toast(msg); await loadLeads(); if (page === 'crm' && VIEWS.crm.redraw) VIEWS.crm.redraw(); else if (page === 'ceo') go('ceo'); };
  if (id) {
    const pick = (box, attr) => box.addEventListener('click', e => { const c = e.target.closest('[' + attr + ']'); if (!c) return; box.querySelectorAll('[' + attr + ']').forEach(x => x.setAttribute('aria-pressed', String(x === c))); });
    pick($('lType'), 'data-t'); pick($('lNextChips'), 'data-n');
    $('lLog').addEventListener('click', async e => {
      const type = $('lType').querySelector('[aria-pressed="true"]').dataset.t, n = Number(($('lNextChips').querySelector('[aria-pressed="true"]') || {}).dataset.n || 3);
      e.currentTarget.disabled = true;
      try { await api('PUT', '/platform/crm', { id, touch: { type, outcome: $('lOutcome').value.trim() }, snoozeDays: n }); closeDrawer(); after(`Logged — follow up ${fmtShort(dayPlus(n))}`); }
      catch (err) { $('lMsg').className = 'msg err'; $('lMsg').textContent = err.message; e.currentTarget.disabled = false; }
    });
    if ($('lScript')) {
      const sync = () => { const s = SCRIPTS.find(x => x.key === $('lScript').value), t = fillScript(s.text, l); $('lScriptText').textContent = t; $('lScriptGo').href = waLink(l, t); };
      $('lScript').addEventListener('change', sync); sync();
      $('lScriptCopy').addEventListener('click', () => copyText($('lScriptText').textContent));
    }
  }
  $('lSave').addEventListener('click', async e => {
    const body = { villaName: $('lVilla').value, name: $('lName').value, phone: $('lPhone').value, email: $('lEmail').value, city: $('lCity').value, rooms: $('lRooms').value,
      stage: $('lStage').value, source: $('lSource').value, planInterest: $('lPlan').value, owner: $('lOwner').value, nextFollowUp: $('lNext').value, lostReason: $('lLost').value, note: $('lNote').value.trim() };
    if (id) body.id = id;
    e.currentTarget.disabled = true;
    try { await api(id ? 'PUT' : 'POST', '/platform/crm', body); closeDrawer(); after(id ? 'Saved' : 'Lead added'); }
    catch (err) { $('lMsg').className = 'msg err'; $('lMsg').textContent = err.message; e.currentTarget.disabled = false; }
  });
  if ($('lInvite')) $('lInvite').addEventListener('click', async () => {
    const email = $('lEmail').value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Enter their Google account email first'); return; }
    try { const d = await api('POST', '/platform/invites', { email, days: 14, leadId: id });
      $('lMsg').className = 'msg'; $('lMsg').innerHTML = `Invite link (valid until ${esc(fmtDay(d.expires))}) — the lead is now "Invited". Send it to them yourself:<div class="copy" style="margin-top:6px"><input readonly value="${esc(d.link)}"><button class="btn sm" type="button" id="lInvCopy">Copy</button>${l.phone ? `<a class="btn sm" target="_blank" rel="noopener" href="${esc(waLink(l, fillScript(SCRIPTS.find(s => s.key === 'invite').text, l) + '\n' + d.link))}">WhatsApp</a>` : ''}</div>`;
      $('lInvCopy').addEventListener('click', () => copyText(d.link, 'Invite link copied'));
      await loadLeads();
    } catch (err) { toast(err.message); }
  });
  if ($('lDel')) $('lDel').addEventListener('click', async () => { if (!confirm('Delete this lead and its notes?')) return; try { await api('DELETE', '/platform/crm', { id }); closeDrawer(); after('Deleted'); } catch (err) { toast(err.message); } });
}

// ── Growth tools ──
VIEWS.grow = async () => {
  const [ceo, villas] = await Promise.all([api('GET', '/platform/ceo').catch(() => ({})), can('customers') ? api('GET', '/platform/villas').catch(() => ({ villas: [] })) : Promise.resolve({ villas: [] })]);
  const inbound = ceo.sales ? (ceo.sales.bySource.find(s => s.source === 'website') || { leads: 0 }).leads : 0;
  let h = head('Growth tools', 'Everything that brings villa owners into the pipeline: the demo form, tracked links for each channel, referral links for happy customers, and ready WhatsApp scripts.');
  h += `<div class="grid2"><div class="card"><h2>The demo form</h2><p class="hint">On ${esc(SITE.replace('https://', ''))}: a villa owner leaves their name, villa and phone, it lands in the pipeline as a new lead due today (assigned to the sales rep with the fewest open leads), and the Harbour team gets a Telegram and phone alert. Nothing is sent to the owner automatically — call them.</p>
      <div class="kpis" style="margin:0 0 10px">${kpi(inbound, 'Leads from the form so far')}${ceo.sales ? kpi(ceo.sales.speedToLeadHours != null ? ceo.sales.speedToLeadHours + ' h' : '—', 'Median time to first contact') : ''}</div>
      <div class="copy"><input readonly value="${SITE}/#demo"><button class="btn sm" type="button" data-copy="${SITE}/#demo">Copy link</button><a class="btn sm" href="${SITE}/#demo" target="_blank" rel="noopener">Open</a></div></div>
    <div class="card"><h2>Campaign links</h2><p class="hint">Use a different link in each place you promote Harbour; leads from it show their source and campaign, and the CEO dashboard counts them.</p>
      <div class="fields"><label class="f"><span>Where it's posted</span><select id="cSrc"><option value="instagram">Instagram</option><option value="whatsapp">WhatsApp (status, groups)</option><option value="event">Event / expo</option><option value="google">Google ads</option><option value="facebook">Facebook</option><option value="email">Email</option><option value="other">Other</option></select></label>
      <label class="f"><span>Campaign name</span><input id="cName" maxlength="60" placeholder="e.g. diwali-offer, ecr-owners-meet"></label></div>
      <div class="copy"><input readonly id="cOut"><button class="btn sm" type="button" id="cCopy">Copy</button></div></div></div>`;
  const vs = (villas.villas || []).filter(v => !v.isDefault);
  h += `<div class="card"><h2>Referral links</h2><p class="hint">Villa owners trust other villa owners. Give each happy customer their own link — demo requests through it are marked as referrals from that villa.</p>
    ${vs.length ? vs.map(v => { const link = `${SITE}/?ref=${encodeURIComponent(v.slug)}#demo`; return `<div class="row"><div class="grow"><b>${esc(v.name)}</b><div class="meta">${esc(link)}</div></div><button class="btn sm" type="button" data-copy="${esc(link)}">Copy</button></div>`; }).join('') : '<div class="empty">Referral links appear here for each customer villa.</div>'}</div>`;
  h += `<div class="card"><h2>WhatsApp scripts</h2><p class="hint">Proven openers for each stage. In a lead, they fill in the name and villa and open in your WhatsApp ready to send.</p>
    ${SCRIPTS.map(s => `<div style="margin-bottom:10px"><b style="font-size:13.5px">${esc(s.label)}</b> <span class="meta">· ${s.stage.map(stageLabel).join(', ')}</span><div class="script">${esc(s.text.replace(/\{me\}/g, (ME.name || '').split(' ')[0] || 'the Harbour team'))}</div></div>`).join('')}</div>`;
  h += `<div class="card"><h2>Prospect lists</h2><p class="hint">Got a list of villas from Airbnb, a directory or an event? Import it into the pipeline and work it with call and WhatsApp buttons.</p><button class="btn" type="button" id="gImport">Import prospects</button></div>`;
  $('main').innerHTML = h;
  const sync = () => { const src = $('cSrc').value, camp = $('cName').value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
    $('cOut').value = `${SITE}/?utm_source=${src}&utm_medium=${src === 'google' ? 'cpc' : 'social'}${camp ? '&utm_campaign=' + camp : ''}#demo`; };
  $('cSrc').addEventListener('change', sync); $('cName').addEventListener('input', sync); sync();
  $('cCopy').addEventListener('click', () => copyText($('cOut').value, 'Link copied'));
  $('main').querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copyText(b.dataset.copy, 'Link copied')));
  $('gImport').addEventListener('click', async () => { await loadLeads(); importDrawer(); });
};

// ── Conversion ──
VIEWS.funnel = async () => {
  const d = await api('GET', '/platform/funnel');
  const first = d.steps[0] ? d.steps[0].count : 0;
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
  const st = k => (d.steps.find(s => s.stage === k) || {}).count || 0;
  let h = head('Conversion', 'How leads become paying villas — counted from the pipeline\'s stage history and the villas\' own billing.');
  h += `<div class="kpis">${kpi(d.total, 'Leads')}${kpi(pct(st('demo'), first), 'Lead → demo')}${kpi(pct(st('trial'), first), 'Lead → trial')}${kpi(pct(st('won'), st('trial')), 'Trial → won')}${kpi(d.avgDays.leadToTrial != null ? d.avgDays.leadToTrial + ' d' : '—', 'Avg. lead → trial')}${kpi(d.avgDays.trialToWon != null ? d.avgDays.trialToWon + ' d' : '—', 'Avg. trial → won')}</div>`;
  h += `<div class="grid2"><div class="card"><h2>Funnel</h2><p class="hint">Leads that reached each stage (including those that moved past it). ${d.lost} lost.</p>${d.steps.map((s, i) => `<div class="hbar"><span>${stageLabel(s.stage)}</span><div class="track"><div class="fill" style="width:${first ? Math.max(2, s.count / first * 100) : 0}%"></div></div><span class="n">${s.count}${i ? ' · ' + pct(s.count, d.steps[i - 1].count) : ''}</span></div>`).join('')}</div>
    <div class="card"><h2>By source</h2><p class="hint">Where leads came from, and how many were won.</p>${d.bySource.length ? `<table><thead><tr><th>Source</th><th class="n">Leads</th><th class="n">Won</th><th class="n">Rate</th></tr></thead><tbody>${d.bySource.map(s => `<tr><td>${esc(sourceLabel(s.source))}</td><td class="n">${s.leads}</td><td class="n">${s.won}</td><td class="n">${pct(s.won, s.leads)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">No leads yet.</div>'}</div></div>`;
  h += `<div class="grid2"><div class="card"><h2>New leads per month</h2><div class="chart" id="chLeads"></div></div><div class="card"><h2>Won per month</h2><div class="chart" id="chWon"></div></div></div>`;
  h += `<div class="card"><h2>Villas</h2><p class="hint">Every villa that has signed up, from the pipeline or not.</p><div class="kpis" style="margin:0">${kpi(d.villas.signedUp, 'Signed up')}${kpi(d.villas.onTrial, 'On trial now')}${kpi(d.villas.paying, 'Paying now')}${kpi(d.villas.trialToPaid != null ? d.villas.trialToPaid + '%' : '—', 'Paying, of all signed up')}</div></div>`;
  $('main').innerHTML = h;
  const rows = k => d.monthly.map(m => ({ label: monLabel(m.month), full: monFull(m.month), v: m[k] }));
  barChart($('chLeads'), rows('leads'), 'v', v => String(Math.round(v))); barChart($('chWon'), rows('won'), 'v', v => String(Math.round(v)));
};

// ── Revenue ──
VIEWS.revenue = async () => {
  const d = await api('GET', '/platform/revenue');
  const canPay = can('billing'), tax = d.pricesIncludeGst ? 'incl. GST' : `excl. ${d.gstPercent}% GST`;
  let h = head('Revenue', `Recurring revenue at list prices (${tax}); trials and complimentary plans count as ₹0. Collected = payments recorded from Razorpay and by hand.`, `<button class="btn" id="revCsv" type="button">${svg('dl')}Payments CSV</button>${canPay ? `<button class="btn primary" id="payAdd" type="button">${svg('plus')}Record a payment</button>` : ''}`);
  h += `<div class="kpis">${kpi(rs(d.mrr), 'Monthly recurring (MRR)')}${kpi(rsK(d.arr), 'Annual run-rate (ARR)')}${kpi(d.paying, 'Paying villas')}${kpi(d.paying ? rs(d.mrr / d.paying) : '—', 'Average per paying villa')}${kpi(rs(d.collected.total), 'Collected, all time')}${kpi(d.trials, 'On trial')}</div>`;
  h += `<div class="card"><h2>Collected per month</h2><p class="hint">Last 12 months.</p><div class="chart" id="chRev"></div></div>`;
  h += `<div class="grid2"><div class="card"><h2>By plan</h2><table><thead><tr><th>Plan</th><th class="n">Villas</th><th class="n">MRR</th></tr></thead><tbody>${d.byPlan.map(p => `<tr><td>${esc(p.name)}</td><td class="n">${p.villas}</td><td class="n">${rs(p.mrr)}</td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h2>Renewals in the next 30 days</h2>${d.renewals.length ? d.renewals.map(r => `<div class="row"><div class="grow"><b>${esc(r.name)}</b><div class="meta">${esc(cap(r.tier))} · ${rs(r.mrr)}/mo</div></div><span class="pill">${esc(fmtDay(r.paidUntil))}</span></div>`).join('') : '<div class="empty">None.</div>'}</div>
    <div class="card"><h2>At risk</h2><p class="hint">Payment due (in grace) or read-only.</p>${d.atRisk.length ? d.atRisk.map(r => `<div class="row"><div class="grow"><b>${esc(r.name)}</b><div class="meta">${esc(cap(r.tier))}</div></div><span class="pill ${r.state === 'lapsed' ? 'err' : 'warn'}">${r.state === 'lapsed' ? 'Read-only' : 'Due, ' + (r.daysLeft || 0) + ' d grace'}</span></div>`).join('') : '<div class="empty">None. ✓</div>'}</div>
    <div class="card"><h2>Trials ending in 7 days</h2>${d.trialsEnding.length ? d.trialsEnding.map(r => `<div class="row"><div class="grow"><b>${esc(r.name)}</b></div><span class="pill warn">${esc(fmtDay(r.trialEndsAt))}</span></div>`).join('') : '<div class="empty">None.</div>'}</div></div>`;
  h += `<div class="card"><h2>Payments</h2><div class="scroll"><table><thead><tr><th>Date</th><th>Villa</th><th>Kind</th><th>Source</th><th>Note</th><th class="n">Amount</th>${canPay ? '<th></th>' : ''}</tr></thead><tbody>${d.payments.map(p => `<tr><td>${esc(fmtDay(p.at))}</td><td>${esc(p.slug)}</td><td>${esc(cap(p.kind || 'subscription'))}</td><td>${esc(p.source === 'razorpay' ? 'Razorpay' : 'By hand' + (p.by ? ' (' + p.by + ')' : ''))}</td><td>${esc(p.note || '')}</td><td class="n">${rs(p.amount)}</td>${canPay ? `<td>${p.source === 'manual' ? `<button class="btn sm danger" data-del-pay="${esc(p.id)}">Remove</button>` : ''}</td>` : ''}</tr>`).join('') || `<tr><td colspan="7" class="empty">No payments recorded yet.</td></tr>`}</tbody></table></div></div>`;
  h += `<div class="card"><h2>All villas</h2><div class="scroll"><table><thead><tr><th>Villa</th><th>Plan</th><th>State</th><th>Paid to</th><th class="n">MRR</th></tr></thead><tbody>${d.villas.map(v => `<tr><td>${esc(v.name)}</td><td>${esc(cap(v.tier || ''))}${/-annual$/.test(v.plan) ? ' (annual)' : ''}</td><td>${esc(cap(v.state))}</td><td>${esc(fmtDay(v.paidUntil))}</td><td class="n">${rs(v.mrr)}</td></tr>`).join('')}</tbody></table></div></div>`;
  $('main').innerHTML = h;
  barChart($('chRev'), d.collected.monthly.map(m => ({ label: monLabel(m.month), full: monFull(m.month), v: m.amount })), 'v', v => rsK(v));
  $('revCsv').addEventListener('click', () => paymentsCsv());
  $('main').querySelectorAll('[data-del-pay]').forEach(b => b.addEventListener('click', async () => { if (!confirm('Remove this payment record?')) return; try { await api('DELETE', '/platform/payments', { id: b.dataset.delPay }); toast('Removed'); go('revenue'); } catch (e) { toast(e.message); } }));
  if ($('payAdd')) $('payAdd').addEventListener('click', () => {
    $('drawerPanel').innerHTML = `<div class="head"><h1 style="font-size:19px">Record a payment</h1><div class="act"><button class="btn sm" id="pClose" type="button">Close</button></div><p>A payment received outside Razorpay (bank transfer, UPI, cheque). To also extend a villa's paid period, use Villas → Billing → Record payment.</p></div>
      <div class="fields"><label class="f"><span>Villa</span><select id="pSlug">${d.villas.filter(v => !v.isDefault).map(v => `<option value="${esc(v.slug)}">${esc(v.name)}</option>`).join('')}</select></label>
      <label class="f"><span>Amount (₹)</span><input id="pAmt" type="number" min="1" inputmode="decimal"></label>
      <label class="f"><span>Kind</span><select id="pKind"><option value="subscription">Subscription</option><option value="setup">Setup fee</option></select></label>
      <label class="f"><span>Date received</span><input id="pDate" type="date" value="${today()}"></label></div>
      <label class="f"><span>Note</span><input id="pNote" maxlength="200" placeholder="e.g. NEFT ref 1234"></label>
      <button class="btn primary" id="pSave" type="button">Save</button><div class="msg" id="pMsg"></div>`;
    $('drawer').hidden = false;
    $('pClose').addEventListener('click', closeDrawer);
    $('pSave').addEventListener('click', async () => { try { await api('POST', '/platform/payments', { slug: $('pSlug').value, amount: Number($('pAmt').value), kind: $('pKind').value, date: $('pDate').value, note: $('pNote').value }); toast('Payment recorded'); closeDrawer(); go('revenue'); } catch (e) { $('pMsg').className = 'msg err'; $('pMsg').textContent = e.message; } });
  });
};
async function paymentsCsv(from, to) {
  const d = await api('GET', '/platform/payments');
  const items = (d.items || []).filter(p => { const day = new Date(p.at + 5.5 * 3600e3).toISOString().slice(0, 10); return (!from || day >= from) && (!to || day <= to); });
  download(`harbour-payments-${today()}.csv`, [['Date', 'Villa', 'Kind', 'Source', 'Recorded by', 'Note', 'Amount (₹)']].concat(items.map(p => [new Date(p.at + 5.5 * 3600e3).toISOString().slice(0, 10), p.slug, p.kind || 'subscription', p.source, p.by || '', p.note || '', p.amount])));
}

// ── Plans & pricing ──
VIEWS.plans = async () => {
  const c = await api('GET', '/platform/billing');
  const feats = Object.entries(c.featureCatalog || {});
  const ceo = can('revenue') ? await api('GET', '/platform/revenue').catch(() => null) : null;
  let h = head('Plans & pricing', 'What each plan includes, its price and how it reads on the website. Changes apply to every villa on that plan straight away (trials always get the top plan). A new price makes a new Razorpay plan for new subscribers; existing subscribers keep theirs.',
    `<a class="btn" href="${SITE}/#pricing" target="_blank" rel="noopener">See it on the website</a><button class="btn primary" id="bSave" type="button">Save plans</button>`);
  h += `<div class="card"><h2>Payments</h2><div class="hint" style="margin:0">Razorpay: <b>${c.razorpayConfigured ? 'connected (' + esc(c.razorpayMode) + ' mode)' : 'not set — STUDIO_RAZORPAY_KEY_ID and _SECRET on Render'}</b> · Subscription webhook: <b>${c.webhookConfigured ? 'secret set' : 'not set'}</b> — ${esc(c.webhookUrl)} with the subscription.* events</div></div>`;
  h += '<div class="plans">' + c.plans.map(p => `<div class="plan${p.highlight ? ' hl' : ''}" data-plan="${p.key}">
    <div style="display:flex;gap:8px;align-items:center"><input class="in" data-name="${p.key}" value="${esc(p.name)}" maxlength="40" aria-label="Plan name" style="font-weight:600;font-size:16px">
      <label class="feat" style="white-space:nowrap" title="Shown as the recommended plan"><input type="checkbox" data-hl="${p.key}"${p.highlight ? ' checked' : ''}>Popular</label></div>
    <div class="price" data-price="${p.key}"></div>
    <div class="fields" style="margin-top:8px"><label class="f"><span>Monthly (₹)</span><input type="number" min="0" data-m="${p.key}" value="${p.monthly}"></label><label class="f"><span>One-time setup (₹)</span><input type="number" min="0" data-s="${p.key}" value="${p.setup}"></label></div>
    <label class="f"><span>Description</span><input data-d="${p.key}" value="${esc(p.description || '')}" maxlength="200" placeholder="Short line under the name"></label>
    <div class="f"><span>Includes</span></div>${feats.map(([f, label]) => `<label class="feat"><input type="checkbox" data-f="${p.key}" value="${esc(f)}"${p.features.includes(f) ? ' checked' : ''}>${esc(label)}</label>`).join('')}
    ${ceo ? `<p class="meta" style="margin-top:8px">${plural((ceo.byPlan.find(x => x.tier === p.key) || {}).villas || 0, 'paying villa')} on it today</p>` : ''}</div>`).join('') + '</div>';
  h += `<div class="grid2"><div class="card"><h2>Terms</h2><div class="fields">
    <label class="f"><span>Prices</span><select id="bGstMode"><option value="excl">Exclude GST (added at checkout)</option><option value="incl">Include GST</option></select></label>
    <label class="f"><span>GST (%)</span><input id="bGstPct" type="number" min="0" max="28" value="${c.gstPercent}"></label>
    <label class="f"><span>Annual = monthly × months</span><input id="bAnnual" type="number" min="1" max="12" value="${c.annualMonths}"></label>
    <label class="f"><span>Minimum term (months)</span><input id="bMinTerm" type="number" min="0" max="36" value="${c.minTermMonths}"></label>
    <label class="f"><span>Notice to cancel (days)</span><input id="bNotice" type="number" min="0" max="180" value="${c.noticeDays}"></label>
    <label class="f"><span>Free trial (days)</span><input id="bTrial" type="number" min="1" max="365" value="${c.trialDays}"></label>
    <label class="f"><span>Grace (days)</span><input id="bGrace" type="number" min="0" max="60" value="${c.graceDays}"></label>
    <label class="f"><span>Business name on invoices</span><input id="bBiz" maxlength="120" value="${esc(c.businessName || '')}"></label>
    <label class="f"><span>GSTIN</span><input id="bGstin" maxlength="15" value="${esc(c.gstin || '')}"></label></div></div>
    <div class="card"><h2>Revenue planner</h2><p class="hint">Try a customer mix at the prices above (not saved). Annual plans are billed at the "annual = monthly × months" above.</p>
      <div class="fields">${c.plans.map(p => `<label class="f"><span>Villas on ${esc(p.name)}</span><input type="number" min="0" data-sim="${p.key}" value="${ceo ? ((ceo.byPlan.find(x => x.tier === p.key) || {}).villas || 0) : 0}" inputmode="numeric"></label>`).join('')}
      <label class="f"><span>Share on annual (%)</span><input type="number" min="0" max="100" id="simAnnual" value="0" inputmode="numeric"></label></div>
      <div class="kpis" style="margin:0" id="simOut"></div></div></div>`;
  $('main').innerHTML = h;
  $('bGstMode').value = c.pricesIncludeGst ? 'incl' : 'excl';
  const val = (sel) => Number((document.querySelector(sel) || {}).value) || 0;
  const recalc = () => {
    const annual = val('#bAnnual') || 12, gst = val('#bGstPct'), incl = $('bGstMode').value === 'incl';
    c.plans.forEach(p => { const m = val(`[data-m="${p.key}"]`), s = val(`[data-s="${p.key}"]`);
      document.querySelector(`[data-price="${p.key}"]`).innerHTML = `${rs(m)}<small>/month ${incl ? 'incl.' : '+ ' + gst + '%'} GST</small><div class="meta" style="font-size:12.5px;font-weight:400">${rs(m * annual)} a year on annual (${12 - annual > 0 ? (12 - annual) + ' month' + (12 - annual === 1 ? '' : 's') + ' free' : 'no discount'}) · setup ${s ? rs(s) : 'free'}</div>`;
      document.querySelector(`[data-plan="${p.key}"]`).classList.toggle('hl', document.querySelector(`[data-hl="${p.key}"]`).checked); });
    const share = Math.min(100, val('#simAnnual')) / 100;
    let mrr = 0, n = 0, setup = 0;
    c.plans.forEach(p => { const k = val(`[data-sim="${p.key}"]`), m = val(`[data-m="${p.key}"]`); n += k; setup += k * val(`[data-s="${p.key}"]`); mrr += k * (m * (1 - share) + m * annual / 12 * share); });
    $('simOut').innerHTML = kpi(rs(mrr), 'MRR') + kpi(rsK(mrr * 12), 'ARR') + kpi(n ? rs(mrr / n) : '—', 'Per villa a month') + kpi(rsK(setup), 'Setup fees (one-time)');
  };
  $('main').addEventListener('input', recalc); $('main').addEventListener('change', recalc); recalc();
  $('bSave').addEventListener('click', async e => {
    const tiers = {}; c.plans.forEach(p => { tiers[p.key] = { name: document.querySelector(`[data-name="${p.key}"]`).value.trim() || p.name, monthly: val(`[data-m="${p.key}"]`),
      setup: val(`[data-s="${p.key}"]`), highlight: document.querySelector(`[data-hl="${p.key}"]`).checked, description: document.querySelector(`[data-d="${p.key}"]`).value.trim(),
      features: [...document.querySelectorAll(`[data-f="${p.key}"]:checked`)].map(i => i.value) }; });
    const changed = c.plans.filter(p => tiers[p.key].monthly !== p.monthly).map(p => `${p.name}: ${rs(p.monthly)} → ${rs(tiers[p.key].monthly)}`);
    if (!confirm(`Save plans? Every villa on a plan gets its new package straight away.${changed.length ? '\n\nPrice changes (new subscribers only):\n' + changed.join('\n') : ''}`)) return;
    const num = id => Number($(id).value); e.currentTarget.disabled = true;
    try { await api('PUT', '/platform/billing', { tiers, pricesIncludeGst: $('bGstMode').value === 'incl', gstPercent: num('bGstPct'), annualMonths: num('bAnnual'), minTermMonths: num('bMinTerm'), noticeDays: num('bNotice'), trialDays: num('bTrial') || 14, graceDays: num('bGrace'), businessName: $('bBiz').value.trim(), gstin: $('bGstin').value.trim().toUpperCase() });
      PLAN_PRICES = null; toast('Plans saved'); go('plans'); } catch (err) { toast(err.message); e.currentTarget.disabled = false; }
  });
};

// ── Villas (customers) ──
function billPill(b) {
  if (!b) return '<span class="pill warn">not billed</span>';
  if (b.complimentary) return `<span class="pill">${esc(cap(b.tier))} · complimentary</span>`;
  const d = n => n === 1 ? '1 day' : n + ' days';
  const m = { trial: [`Trial${b.daysLeft != null ? ', ' + d(b.daysLeft) + ' left' : ''}`, 'info'], active: [`${cap(b.tier)}${b.paidUntil ? ' · to ' + fmtDay(b.paidUntil) : ''}`, ''], grace: [`${cap(b.tier)} · due, ${d(b.daysLeft || 0)} grace`, 'warn'], lapsed: ['Read-only', 'err'] }[b.effective] || [b.effective, ''];
  return `<span class="pill ${m[1]}">${esc(m[0])}</span>`;
}
VIEWS.customers = async () => {
  const [d, ready] = await Promise.all([api('GET', '/platform/villas'), api('GET', '/platform/villas/readiness').catch(() => ({ villas: [] }))]);
  const rd = new Map((ready.villas || []).map(v => [v.slug, v]));
  const canBill = can('billing');
  $('main').innerHTML = head('Villas', 'Every villa on RYST Harbour, with its plan and setup progress. RYST 109A is a customer here like any other.', `<input class="in sm" id="custQ" placeholder="Search villas" style="min-width:200px"><button class="btn" id="custCsv" type="button">${svg('dl')}CSV</button>`)
    + `<div class="card" id="custList">${(d.villas || []).map(v => { const r = rd.get(v.slug), missing = r ? r.steps.filter(s => !s.done && !s.optional).map(s => s.label) : [];
      return `<div class="row" data-q="${esc((v.name + ' ' + v.slug).toLowerCase())}"><div class="grow"><b>${esc(v.name)}</b> <span class="meta">${esc(v.slug)} · ${plural(v.bookings, 'booking')} · ${plural(v.users, 'user')}${v.created_at ? ' · since ' + esc(fmtDay(v.created_at)) : ''}</span>
        ${r ? `<div class="meta">Setup ${r.done}/${r.total}${missing.length ? ' — still to do: ' + esc(missing.join(' · ')) : ' ✓ ready'}</div>` : ''}${v.billing && v.billing.note ? `<div class="meta">${esc(v.billing.note)}</div>` : ''}</div>
        ${billPill(v.billing)}
        ${canBill && !v.isDefault ? `<select class="in sm" data-bill="${esc(v.slug)}" aria-label="Billing action for ${esc(v.name)}"><option value="">Billing…</option><option value="extend-trial">Extend trial</option><option value="mark-paid">Record payment / mark paid</option><option value="waive-setup">${v.billing && v.billing.setupWaived ? 'Charge setup fee' : 'Waive setup fee'}</option>${v.billing && v.billing.locked ? '<option value="restore">Unlock</option>' : '<option value="read-only">Make read-only</option>'}</select>` : ''}</div>`; }).join('') || '<div class="empty">No villas yet.</div>'}</div>`;
  $('custQ').addEventListener('input', e => { const q = e.target.value.trim().toLowerCase(); $('custList').querySelectorAll('[data-q]').forEach(r => r.hidden = q && !r.dataset.q.includes(q)); });
  $('custCsv').addEventListener('click', () => download(`harbour-villas-${today()}.csv`, [['Villa', 'ID', 'Plan', 'State', 'Paid until', 'Trial ends', 'Bookings', 'Users', 'Since', 'Setup done']]
    .concat(d.villas.map(v => { const b = v.billing || {}, r = rd.get(v.slug); return [v.name, v.slug, b.tier || '', b.complimentary ? 'complimentary' : b.trial ? 'trial' : b.effective || '', b.paidUntil || '', b.trialEndsAt || '', v.bookings, v.users, v.created_at ? String(v.created_at).slice(0, 10) : '', r ? `${r.done}/${r.total}` : '']; }))));
  $('custList').addEventListener('change', async e => {
    const s = e.target.closest('[data-bill]'); if (!s || !s.value) return;
    const slug = s.dataset.bill, action = s.value, v = d.villas.find(x => x.slug === slug), body = { slug, action }; s.value = '';
    if (action === 'extend-trial') { const n = prompt('Extend the free trial by how many days?', '14'); if (!n) return; body.days = Number(n); }
    if (action === 'mark-paid') {
      const tier = (prompt('Which plan? starter, growth or pro', 'growth') || '').trim().toLowerCase(); if (!tier) return; body.tier = tier;
      const n = prompt('Paid for how many months?', '1'); if (!n) return; body.months = Number(n);
      const amt = prompt('Amount received (₹) — recorded in Revenue. Leave empty if none.', ''); if (amt) body.amount = Number(amt.replace(/[^\d.]/g, ''));
      body.setupPaid = confirm('Was the one-time setup fee paid too? (OK = yes, Cancel = no)');
      const note = prompt('Note (e.g. "Paid by bank transfer on 1 Oct")', ''); if (note != null) body.note = note; }
    if (action === 'waive-setup') body.waive = !(v.billing && v.billing.setupWaived);
    if (action === 'read-only' && !confirm(`Make ${slug} read-only now? Its staff can still view everything but can't change anything until you unlock it.`)) return;
    try { await api('POST', '/platform/villas/billing', body); toast('Updated'); go('customers'); } catch (err) { toast(err.message); }
  });
};

// ── Add & invite ──
VIEWS.invites = async () => {
  const leads = can('crm') ? (await loadLeads().catch(() => null)) : null;
  const open = leads ? leads.leads.filter(l => !l.villa && isOpen(l) && l.stage !== 'trial') : [];
  $('main').innerHTML = head('Add & invite', 'Bring a villa onto RYST Harbour: send the owner an invite link, or set the villa up yourself.')
    + `<div class="grid2"><div class="card"><h2>Invite a villa owner</h2><p class="hint">They open the link, sign in with Google and set up their own villa. The link works only for the Google account below. Send it to them yourself.</p>
      ${open.length ? `<label class="f"><span>For a lead (optional)</span><select id="invLead"><option value="">—</option>${open.map(l => `<option value="${esc(l.id)}" data-email="${esc(l.email || '')}">${esc(l.villaName || l.name)}</option>`).join('')}</select></label>` : ''}
      <label class="f"><span>Their Google account email</span><input id="invEmail" type="email" maxlength="200" autocomplete="off" autocapitalize="none" spellcheck="false"></label>
      <label class="f"><span>Link valid for (days)</span><input id="invDays" type="number" min="1" max="60" value="14" inputmode="numeric"></label>
      <button class="btn primary" id="invBtn" type="button">Create invite link</button><div class="msg" id="invOut"></div></div>
    <div class="card"><h2>Add a villa yourself</h2><p class="hint">For a villa you set up on the owner's behalf. Its admin signs in with the email below. The villa ID can't be changed later.</p>
      <label class="f"><span>Villa name</span><input id="vName" maxlength="120" autocomplete="off"></label>
      <label class="f"><span>Villa ID</span><input id="vSlug" maxlength="40" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="e.g. sea-breeze"></label>
      <label class="f"><span>Admin email</span><input id="vAdmin" type="email" maxlength="200" autocomplete="off" autocapitalize="none" spellcheck="false"></label>
      <button class="btn primary" id="vAdd" type="button">Add villa</button><div class="msg" id="vOut"></div></div></div>`;
  if ($('invLead')) $('invLead').addEventListener('change', e => { const o = e.target.selectedOptions[0]; if (o && o.dataset.email) $('invEmail').value = o.dataset.email; });
  $('invBtn').addEventListener('click', async e => {
    const email = $('invEmail').value.trim().toLowerCase(), days = Number($('invDays').value) || 14, out = $('invOut');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Enter their Google account email'); return; }
    e.currentTarget.disabled = true;
    try { const d = await api('POST', '/platform/invites', Object.assign({ email, days }, $('invLead') && $('invLead').value ? { leadId: $('invLead').value } : {}));
      out.className = 'msg'; out.innerHTML = `Invite for ${esc(d.email)}, valid until ${esc(fmtDay(d.expires))}:<div class="copy" style="margin-top:6px"><input readonly value="${esc(d.link)}"><button class="btn sm" type="button" id="invCopy">Copy link</button></div>`;
      $('invCopy').addEventListener('click', () => copyText(d.link, 'Invite link copied'));
    } catch (err) { out.className = 'msg err'; out.textContent = err.message; }
    e.currentTarget.disabled = false;
  });
  $('vName').addEventListener('input', e => { const s = $('vSlug'); if (s.dataset.edited) return; s.value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); });
  $('vSlug').addEventListener('input', e => { e.target.dataset.edited = '1'; });
  $('vAdd').addEventListener('click', async e => {
    const name = $('vName').value.trim(), slug = $('vSlug').value.trim().toLowerCase(), adminEmail = $('vAdmin').value.trim().toLowerCase(), out = $('vOut');
    if (!name) { toast('Enter the villa name'); return; }
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) { toast('Villa ID: 2–40 lowercase letters, numbers or dashes'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) { toast('Enter a valid admin email'); return; }
    if (!confirm(`Add "${name}" (${slug})?\n\n${adminEmail} will be its admin and can sign in right away. The villa ID can't be changed later.`)) return;
    e.currentTarget.disabled = true;
    try { await api('POST', '/platform/villas', { slug, name, adminEmail }); out.className = 'msg'; out.textContent = `${name} added — ${adminEmail} can sign in now.`;
      ['vName', 'vSlug', 'vAdmin'].forEach(id => { $(id).value = ''; delete $(id).dataset.edited; });
    } catch (err) { out.className = 'msg err'; out.textContent = err.message; }
    e.currentTarget.disabled = false;
  });
};

// ── Reports ──
VIEWS.reports = async () => {
  const m0 = today().slice(0, 7);
  const months = []; for (let i = 0; i < 12; i++) { const d = new Date(m0 + '-01T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() - i); months.push(d.toISOString().slice(0, 7)); }
  const card = (ic, title, text, btn, perm) => !perm || can(perm) ? `<div class="card"><div class="rep"><span class="ic">${svg(ic)}</span><div style="flex:1"><h2>${title}</h2><p class="hint">${text}</p>${btn}</div></div></div>` : '';
  let h = head('Reports', 'Download what you need for the board, the accountant or the sales review. CSV files open in Excel and Google Sheets.');
  h += `<div class="card no-print"><h2>Monthly business review</h2><p class="hint">A one-page summary of a month — growth, sales, revenue and customers — to print or save as PDF.</p>
    <div class="toolbar" style="margin:0"><select class="in sm" id="rMonth">${months.map(m => `<option value="${m}">${esc(monFull(m))}</option>`).join('')}</select><button class="btn primary" id="rBuild" type="button">Build the review</button></div></div><div id="rOut"></div>`;
  h += '<div class="grid2 no-print">';
  h += card('crm', 'Leads', 'Every lead with stage, source, owner, last contact and follow-up.', '<button class="btn sm" type="button" data-r="leads">Download CSV</button>', 'crm');
  h += card('activity', 'Sales activity', 'Every call, WhatsApp, demo and email logged on a lead, by rep — for the weekly sales review.', '<button class="btn sm" type="button" data-r="touches">Download CSV</button>', 'crm');
  h += card('revenue', 'Payments', 'Subscription and setup payments, Razorpay and by hand.', `<div class="toolbar" style="margin:0"><input type="date" class="in sm" id="rFrom" aria-label="From"><input type="date" class="in sm" id="rTo" aria-label="To" value="${today()}"><button class="btn sm" type="button" data-r="payments">Download CSV</button></div>`, 'revenue');
  h += card('customers', 'Villas & billing', 'Every villa with plan, state, paid-until, usage and setup progress.', '<button class="btn sm" type="button" data-r="villas">Download CSV</button>', 'customers');
  h += card('activity', 'Console activity log', 'Who did what in the console — billing, plan changes, invites, pipeline moves.', '<button class="btn sm" type="button" data-r="activity">Download CSV</button>', 'activity');
  h += '</div>';
  $('main').innerHTML = h;
  $('main').querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      const k = b.dataset.r;
      if (k === 'leads') exportLeads((await loadLeads()).leads);
      if (k === 'touches') { const L = await loadLeads(), rows = [['Date', 'Rep', 'Type', 'Villa', 'Contact', 'Stage now', 'Outcome']];
        L.leads.forEach(l => (l.touches || []).forEach(t => rows.push([new Date(t.at + 5.5 * 3600e3).toISOString().slice(0, 16).replace('T', ' '), t.by, t.type, l.villaName, l.name, stageLabel(l.stage), t.outcome])));
        download(`harbour-sales-activity-${today()}.csv`, [rows[0]].concat(rows.slice(1).sort((a, b) => b[0].localeCompare(a[0])))); }
      if (k === 'payments') await paymentsCsv($('rFrom').value, $('rTo').value);
      if (k === 'villas') { const d = await api('GET', '/platform/villas');
        download(`harbour-villas-${today()}.csv`, [['Villa', 'ID', 'Plan', 'State', 'Paid until', 'Trial ends', 'Bookings', 'Users', 'Since']].concat(d.villas.map(v => { const x = v.billing || {}; return [v.name, v.slug, x.tier || '', x.complimentary ? 'complimentary' : x.trial ? 'trial' : x.effective || '', x.paidUntil || '', x.trialEndsAt || '', v.bookings, v.users, v.created_at ? String(v.created_at).slice(0, 10) : '']; }))); }
      if (k === 'activity') { const d = await api('GET', '/platform/activity');
        download(`harbour-activity-${today()}.csv`, [['When', 'Who', 'Action', 'Detail']].concat(d.items.map(a => [new Date(a.at + 5.5 * 3600e3).toISOString().slice(0, 16).replace('T', ' '), a.by, a.action, a.detail]))); }
    } catch (e) { toast(e.message); }
    b.disabled = false;
  }));
  $('rBuild').addEventListener('click', () => buildReview($('rMonth').value));
};
async function buildReview(m) {
  $('rOut').innerHTML = '<div class="card"><div class="skel"></div><div class="skel" style="width:60%"></div></div>';
  const [ceo, leads, pays] = await Promise.all([api('GET', '/platform/ceo'), can('crm') ? loadLeads() : null, can('revenue') ? api('GET', '/platform/payments') : null]);
  const mon = t => new Date(t + 5.5 * 3600e3).toISOString().slice(0, 7);
  const end = ceo.trend.find(x => x.month === m) || {};
  let h = `<div class="card"><div class="head" style="margin-bottom:6px"><h1 style="font-size:20px">RYST Harbour — ${esc(monFull(m))}</h1><div class="act no-print"><button class="btn sm" type="button" onclick="window.print()">Print / save PDF</button></div><p>Business review · prepared ${esc(fmtDay(Date.now()))} by ${esc(ME.name || ME.email)}</p></div><div class="kpis">`;
  if (end.mrr != null) h += kpi(rs(end.mrr), 'MRR at month end'); else if (ceo.revenue && m === today().slice(0, 7)) h += kpi(rs(ceo.revenue.mrr), 'MRR today');
  if (end.paying != null) h += kpi(end.paying, 'Paying villas at month end');
  if (pays) { const ps = pays.items.filter(p => mon(p.at) === m); h += kpi(rs(ps.reduce((t, p) => t + (Number(p.amount) || 0), 0)), 'Collected', plural(ps.length, 'payment')); }
  let L = [];
  if (leads) {
    L = leads.leads;
    const inM = (l, st) => (l.history || []).some(x => x.stage === st && mon(x.at) === m);
    h += kpi(L.filter(l => mon(l.createdAt) === m).length, 'New leads') + kpi(L.filter(l => inM(l, 'demo')).length, 'Demos') + kpi(L.filter(l => inM(l, 'trial')).length, 'Trials started') + kpi(L.filter(l => inM(l, 'won')).length, 'Won') + kpi(L.filter(l => inM(l, 'lost')).length, 'Lost');
    h += kpi(L.reduce((t, l) => t + (l.touches || []).filter(x => mon(x.at) === m).length, 0), 'Sales contacts logged');
  }
  h += '</div>';
  if (leads) {
    const src = {}; L.filter(l => mon(l.createdAt) === m).forEach(l => { const s = l.source || 'other'; src[s] = (src[s] || 0) + 1; });
    const won = L.filter(l => (l.history || []).some(x => x.stage === 'won' && mon(x.at) === m)), lost = L.filter(l => (l.history || []).some(x => x.stage === 'lost' && mon(x.at) === m));
    h += `<div class="grid3" style="margin:0"><div><h2 style="font-size:14px">New leads by source</h2>${Object.keys(src).length ? Object.entries(src).sort((a, b) => b[1] - a[1]).map(([s, n]) => `<div class="row"><div class="grow">${esc(sourceLabel(s))}</div><b>${n}</b></div>`).join('') : '<div class="empty">None.</div>'}</div>
      <div><h2 style="font-size:14px">Won</h2>${won.length ? won.map(l => `<div class="row"><div class="grow">${esc(l.villaName || l.name)}</div><span class="meta">${esc(sourceLabel(l.source || 'other'))}</span></div>`).join('') : '<div class="empty">None.</div>'}</div>
      <div><h2 style="font-size:14px">Lost, and why</h2>${lost.length ? lost.map(l => `<div class="row"><div class="grow">${esc(l.villaName || l.name)}</div><span class="meta">${esc(l.lostReason || 'no reason given')}</span></div>`).join('') : '<div class="empty">None.</div>'}</div></div>`;
  }
  if (end.mrr == null && !(ceo.revenue && m === today().slice(0, 7))) h += `<p class="hint" style="margin-top:10px">MRR and paying villas at month end aren't available for ${esc(monFull(m))} — they're recorded daily from ${esc(fmtDay(ceo.trackedSince) || 'today')}.</p>`;
  $('rOut').innerHTML = h + '</div>';
}

// ── Harbour team ──
VIEWS.team = async () => {
  const d = await api('GET', '/platform/team'), canEdit = d.perms.includes('team');
  const roleOpts = cur => d.roles.map(r => `<option value="${r.key}"${r.key === cur ? ' selected' : ''}>${esc(r.label)}</option>`).join('');
  const permLabel = { overview: 'CEO dashboard & reports', customers: 'Villas', billing: 'Billing actions', crm: 'Pipeline, growth tools & conversion', invites: 'Add & invite', revenue: 'Revenue', plans: 'Plans & pricing', team: 'Team & targets', activity: 'Activity' };
  $('main').innerHTML = head('Harbour team', 'People who run RYST Harbour and can use this console. Separate from any villa\'s staff — being on the team gives no access to a villa\'s bookings or guests. Sales reps get new demo requests in turn.')
    + `<div class="card">${d.team.map(m => `<div class="row"><div class="grow"><b>${esc(m.name || m.email)}</b>${m.name ? ` <span class="meta">${esc(m.email)}</span>` : ''}<div class="meta">${m.fixed ? 'Set on Render (PLATFORM_ADMINS)' : (m.addedBy ? (/@/.test(m.addedBy) ? 'Added by ' + esc(m.addedBy) : esc(cap(m.addedBy))) : '') + (m.addedAt ? ' · ' + esc(fmtDay(m.addedAt)) : '')}</div></div>
      ${m.email === d.me ? '<span class="pill">You</span>' : ''}
      ${canEdit && !m.fixed ? `<select class="in sm" data-role="${esc(m.email)}" aria-label="Role">${roleOpts(m.role)}</select>${m.email !== d.me ? `<button class="btn sm danger" type="button" data-remove="${esc(m.email)}">Remove</button>` : ''}` : `<span class="pill mute">${esc((d.roles.find(r => r.key === m.role) || {}).label || m.role)}</span>`}</div>`).join('')}</div>`
    + `<div class="card"><h2>What each role can do</h2><div class="scroll"><table><thead><tr><th>Role</th><th>Can open</th></tr></thead><tbody>${d.roles.map(r => `<tr><td><b>${esc(r.label)}</b></td><td>${r.perms.map(p => esc(permLabel[p] || p)).join(' · ')}</td></tr>`).join('')}</tbody></table></div></div>`
    + (canEdit ? `<div class="card"><h2>Add someone</h2><div class="fields"><label class="f"><span>Google account email</span><input id="tEmail" type="email" maxlength="200" autocomplete="off" autocapitalize="none" spellcheck="false"></label>
      <label class="f"><span>Name (optional)</span><input id="tName" maxlength="80" autocomplete="off"></label><label class="f"><span>Role</span><select id="tRole">${roleOpts('sales')}</select></label></div>
      <button class="btn primary" id="tAdd" type="button">Add to the team</button></div>` : '');
  if (!canEdit) return;
  $('main').querySelectorAll('[data-role]').forEach(s => s.addEventListener('change', async () => { try { await api('PUT', '/platform/team', { email: s.dataset.role, role: s.value }); toast('Role changed'); } catch (e) { toast(e.message); go('team'); } }));
  $('main').querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm(`Remove ${b.dataset.remove} from the Harbour team? They lose access to this console straight away.`)) return;
    try { await api('DELETE', '/platform/team', { email: b.dataset.remove }); toast('Removed'); go('team'); } catch (e) { toast(e.message); } }));
  $('tAdd').addEventListener('click', async e => {
    const email = $('tEmail').value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Enter their Google account email'); return; }
    e.currentTarget.disabled = true;
    try { await api('POST', '/platform/team', { email, name: $('tName').value.trim(), role: $('tRole').value }); toast('Added — they can sign in here with Google'); go('team'); }
    catch (err) { toast(err.message); e.currentTarget.disabled = false; }
  });
};

// ── Activity ──
VIEWS.activity = async () => {
  const d = await api('GET', '/platform/activity');
  $('main').innerHTML = head('Activity', 'Who did what in the console — billing actions, plan changes, invites, villas added, pipeline moves, targets and team changes. Last 200.')
    + `<div class="card">${d.items.length ? d.items.map(a => `<div class="row"><div class="grow">${esc(a.detail)}<div class="meta">${esc(a.by)} · ${esc(fmtWhen(a.at))}</div></div><span class="pill mute">${esc(a.action)}</span></div>`).join('') : '<div class="empty">Nothing yet.</div>'}</div>`;
};

// ── command palette (⌘K / Ctrl K): jump to a page or a lead ──
let palItems = [], palSel = 0;
async function openPal() {
  $('pal').hidden = false; $('palQ').value = ''; $('palQ').focus();
  if (can('crm') && !LEADS) { try { await loadLeads(); } catch (e) {} }
  drawPal();
}
function closePal() { $('pal').hidden = true; }
function drawPal() {
  const q = $('palQ').value.trim().toLowerCase();
  const acts = [];
  if (can('crm')) acts.push({ label: 'New lead', hint: 'Pipeline', run: async () => { await loadLeads(); openLead(null); } }, { label: 'Import prospects', hint: 'Pipeline', run: async () => { await loadLeads(); importDrawer(); } });
  if (can('billing')) acts.push({ label: 'Record a payment', hint: 'Revenue', run: () => { go('revenue'); setTimeout(() => $('payAdd') && $('payAdd').click(), 600); } });
  PAGES.filter(p => can(p.perm)).forEach(p => acts.push({ label: p.label, hint: 'Go to', run: () => go(p.key) }));
  (LEADS ? LEADS.leads : []).forEach(l => acts.push({ label: l.villaName || l.name, hint: `${stageLabel(l.stage)}${l.city ? ' · ' + l.city : ''}`, extra: [l.name, l.phone, l.email, l.city].join(' '), run: () => openLead(l.id) }));
  palItems = acts.filter(a => !q || (a.label + ' ' + (a.extra || '') + ' ' + a.hint).toLowerCase().includes(q)).slice(0, 12); palSel = 0;
  renderPal();
}
function renderPal() { $('palList').innerHTML = palItems.map((a, i) => `<li role="option" data-i="${i}" aria-selected="${i === palSel}">${esc(a.label)}<small>${esc(a.hint)}</small></li>`).join('') || '<li>No match</li>'; }
$('palQ').addEventListener('input', drawPal);
$('palQ').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { palSel = Math.min(palItems.length - 1, palSel + 1); renderPal(); e.preventDefault(); }
  if (e.key === 'ArrowUp') { palSel = Math.max(0, palSel - 1); renderPal(); e.preventDefault(); }
  if (e.key === 'Enter' && palItems[palSel]) { const a = palItems[palSel]; closePal(); a.run(); }
});
$('palList').addEventListener('click', e => { const li = e.target.closest('[data-i]'); if (li) { const a = palItems[+li.dataset.i]; closePal(); a.run(); } });
$('pal').addEventListener('click', e => { if (e.target === $('pal')) closePal(); });
document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !$('app').hidden) { e.preventDefault(); $('pal').hidden ? openPal() : closePal(); } });
$('topSearch').addEventListener('click', openPal);
$('topNew').addEventListener('click', async () => { await loadLeads(); openLead(null); });

// links like console.html#crm open that section (and back/forward work)
window.addEventListener('hashchange', () => { const p = (location.hash || '').slice(1); if (ME.perms.length && p && p !== page) route(); });
window.go = go;
if (token) start(); else showSignin();
