// RYST Harbour — AI Operations Command Centre (agents.html).
// Everything shown comes from the proxy: GET /agents (drafts, agents' real state, KPIs, events)
// and GET /agents/events?since=N, polled every 10 s while the page is open (the server keeps an
// append-only event log with sequence numbers, so nothing is missed or counted twice).
// Movement on the diagram happens only when a new event arrives; a "running" agent is one the
// server says is running right now. Sending is never decided here — POST /agents/execute checks
// mode, approval, exact content and replays on the server.
(function () {
  const PROXY = 'https://data.ryst.in';
  const TOKEN = localStorage.getItem('ryst_proxy_token') || '';
  if (!TOKEN) { location.href = 'login.html'; return; }
  if ((localStorage.getItem('ryst_user_role') || 'owner') !== 'owner') { location.href = 'login.html'; return; }

  const $ = s => document.querySelector(s);
  const esc = s => (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const t = s => (window.rystT ? window.rystT(s) : s);
  const inr = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
  const hm = ms => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const dt = ms => new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const ago = ms => { if (!ms) return '—'; const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? t('just now') : m < 60 ? m + ' ' + t('min ago') : m < 1440 ? Math.round(m / 60) + ' ' + t('h ago') : dt(ms); };
  const istDay = ms => new Date(ms + 5.5 * 3600e3).toISOString().slice(0, 10);
  const reduceMotion = () => document.documentElement.classList.contains('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Lucide icons (ISC licence), as paths
  const ICON = {
    msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z"/>',
    star: '<path d="M11.5 2.7a.5.5 0 0 1 .9 0l2.3 4.7a2 2 0 0 0 1.5 1.1l5.2.8a.5.5 0 0 1 .3.9l-3.8 3.7a2 2 0 0 0-.6 1.8l.9 5.2a.5.5 0 0 1-.7.5l-4.6-2.4a2 2 0 0 0-1.9 0L5.2 21.4a.5.5 0 0 1-.7-.5l.9-5.2a2 2 0 0 0-.6-1.8L1 10.2a.5.5 0 0 1 .3-.9l5.2-.8a2 2 0 0 0 1.5-1.1z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>',
    trend: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    landmark: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l8 5H4z"/>',
    house: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/>',
    usercheck: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
    send: '<path d="M14.5 21.7a.5.5 0 0 0 .9 0L22 2.6a.5.5 0 0 0-.6-.6L2.3 8.6a.5.5 0 0 0 0 .9l7.9 3.2a2 2 0 0 1 1.1 1.1z"/><path d="m21.9 2.1-10.9 10.9"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/>',
    activity: '<path d="M22 12h-2.5a2 2 0 0 0-1.9 1.5l-2.4 8.4a.3.3 0 0 1-.5 0L9.2 2.1a.3.3 0 0 0-.5 0l-2.4 8.4A2 2 0 0 1 4.5 12H2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4M12 17h.01"/>',
    pencil: '<path d="M21.2 6.8a1 1 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8l-1.3 4.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    play: '<path d="M6 3l14 9-14 9z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  };
  const svgI = (n, cls) => `<svg class="i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n] || ICON.bot}</svg>`;
  const AGENT_ICON = { reservations: 'msg', revenue: 'trend', operations: 'clipboard', guest: 'heart', accounts: 'wallet', creators: 'camera' };
  const HEAD_ICON = { crm: 'users', social: 'megaphone', cfo: 'landmark', coo: 'house' };
  const STATE = { running: 'Running', awaiting: 'Awaiting your review', idle: 'Idle', failed: 'Failed', paused: 'Paused' };
  const STATE_HINT = { running: 'The server is running this agent right now', awaiting: 'Drafts are waiting for your decision', idle: 'Nothing waiting — it will look again at the next run', failed: 'Its last run failed — see the details', paused: 'Paused by you — it makes no drafts' };
  const VERDICT = { pending: 'Waiting for you', agree: 'Approved', edit: 'Approved (edited)', reject: 'Rejected', resolved: 'Handled before review', expired: 'Lapsed' };
  const EXEC = { executing: 'Sending…', sent: 'Sent', failed: 'Failed' };
  const CH = { whatsapp: 'WhatsApp', instagram: 'Instagram DM', telegram: 'Telegram', decision: 'Decision for you', report: 'Report', google: 'Google review reply' };
  const EV = {
    'draft.created': ['New draft', 'file'], 'draft.cleared': ['Handled before review', 'check'], 'draft.lapsed': ['Lapsed', 'clock'],
    'verdict.approved': ['You approved', 'check'], 'verdict.edited': ['You approved with an edit', 'pencil'], 'verdict.rejected': ['You rejected', 'x'], 'verdict.undone': ['Back in your queue', 'clock'],
    'action.blocked': ['Not sent', 'shield'], 'action.executing': ['Sending', 'send'], 'action.sent': ['Sent', 'send'], 'action.failed': ['Send failed', 'alert'],
    'run.finished': ['Agents ran', 'activity'], 'run.failed': ['Run failed', 'alert'], 'brief.sent': ['Brief sent to you', 'file'], 'mode.changed': ['Mode changed', 'gear'],
  };

  let S = null, SEQ = 0, VIEW = 'workflow', SEL = null, FOCUS = '', Q = '', KPI = '', TASK = null, PTAB = 'msg', EDITING = false, BUSY = false;
  const CONN = { state: 'connecting', lastOk: 0, fails: 0, timer: 0 };
  const FRESH = new Set();
  const F = { agent: '', type: '', status: '', from: '', to: '' };

  function toast(msg, err) { const el = $('#toast'); el.textContent = msg; el.className = err ? 'show err' : 'show'; clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 3800); }
  async function api(method, path, body) {
    const res = await fetch(PROXY + path, { method, headers: Object.assign({ 'X-Token': TOKEN }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    if (res.status === 401) { localStorage.removeItem('ryst_proxy_token'); location.href = 'login.html'; throw new Error('Signed out'); }
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(d.error || ('Could not load (' + res.status + ')')); e.data = d; e.status = res.status; throw e; }
    return d;
  }

  // ── data helpers ─────────────────────────────────────────────────────────
  const agent = id => (S.agents || []).find(a => a.id === id) || { id, name: id, title: id };
  const head = id => (S.heads || []).find(h => h.id === id) || null;
  const stat = id => (S.status || []).find(x => x.id === id) || { state: 'idle', pending: 0 };
  const drafts = () => S.drafts || [];
  const pend = () => drafts().filter(d => d.status === 'pending');
  const draft = id => drafts().find(d => d.id === id) || null;
  // where a draft's work started (the record behind it) and where it would go
  function srcOf(d) {
    if (d.agent === 'reservations') return /^msg:/.test(d.key) ? 'msgs' : 'book';
    if (d.agent === 'revenue') return 'cal';
    if (d.agent === 'operations') return 'ops';
    if (d.agent === 'guest') return d.kind === 'review-reply' ? 'rev' : 'book';
    if (d.agent === 'accounts') return 'book';
    if (d.agent === 'creators') return 'crq';
    return 'book';
  }
  function destOf(d) { const c = (d.proposal || {}).channel; return c === 'whatsapp' || c === 'instagram' ? 'o-guests' : c === 'telegram' ? 'o-staff' : c === 'google' ? 'o-public' : ''; }
  const SOURCES = [['msgs', 'Messages', 'WhatsApp · Instagram', 'msg'], ['book', 'Bookings', 'quotes · balances', 'receipt'], ['cal', 'Calendar', 'empty nights · holidays', 'calendar'], ['ops', 'Checklists', 'repairs · stock · rounds', 'wrench'], ['rev', 'Reviews', 'Google · latest 5', 'star'], ['crq', 'Creators', 'collab requests', 'users']];
  // the real routing: which records each agent reads (agents.js on the server)
  const SRC_TO = { msgs: ['reservations'], book: ['reservations', 'operations', 'guest', 'accounts'], cal: ['revenue'], ops: ['operations'], rev: ['guest'], crq: ['creators'] };
  const OUTS = [['o-guests', 'Guests', 'WhatsApp · Instagram', 'msg'], ['o-staff', 'Caretaker', 'Telegram · app', 'send'], ['o-public', 'Public', 'Google · Instagram', 'globe']];
  const matchesQ = d => !Q || (d.title + ' ' + (d.detail || '') + ' ' + d.id + ' ' + agent(d.agent).name + ' ' + agent(d.agent).title).toLowerCase().includes(Q);

  // ── load & live ──────────────────────────────────────────────────────────
  async function load(quiet) {
    try {
      const d = await api('GET', '/agents');
      const first = !S; S = d; SEQ = d.seq || 0;
      if (!d.events) S.events = [];
      CONN.lastOk = Date.now(); CONN.fails = 0; CONN.state = 'live';
      if (first || !TASK || !draft(TASK)) TASK = (pend()[0] || drafts()[0] || {}).id || null;
      renderAll();
    } catch (e) {
      if (!quiet) { $('#graph').innerHTML = `<div class="empty">${esc(e.message)}</div>`; toast(e.message, true); }
      CONN.fails++; CONN.state = CONN.lastOk && Date.now() - CONN.lastOk < 60e3 ? 'reconnecting' : 'offline'; renderHealth();
    }
  }
  // poll "what's new since SEQ"; back off when it fails; pause in the background
  async function poll() {
    clearTimeout(CONN.timer);
    if (document.hidden) return;
    try {
      const r = await api('GET', '/agents/events?since=' + SEQ);
      CONN.lastOk = Date.now(); CONN.fails = 0; CONN.state = 'live';
      const evs = (r.events || []).filter(e => e.seq > SEQ).sort((a, b) => a.seq - b.seq);
      const runningChanged = JSON.stringify(r.running || null) !== JSON.stringify(S && S.running || null);
      if (evs.length || r.gap || runningChanged) {
        evs.forEach(e => FRESH.add(e.seq));
        await load(true);
        animate(evs);
      } else renderHealth();
    } catch (e) {
      CONN.fails++; CONN.state = Date.now() - CONN.lastOk < 60e3 ? 'reconnecting' : 'offline'; renderHealth();
    }
    const wait = CONN.fails ? Math.min(60e3, 10e3 * Math.pow(2, CONN.fails - 1)) : (S && S.running ? 3e3 : 10e3);
    CONN.timer = setTimeout(poll, wait);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  setInterval(renderHealth, 15e3);

  // ── header, KPIs, tabs ───────────────────────────────────────────────────
  function renderAll() { renderHealth(); renderKpis(); renderTabs(); renderView(); }
  function renderHealth() {
    if (!S) return;
    const one = (S.agents || []).filter(a => a.mode === 'approve');
    $('#modeChip').className = 'chip ' + (one.length ? 'teal' : 'amber');
    $('#modeChip').innerHTML = svgI('shield') + (one.length
      ? `<span><b>${t('Approval required')}</b><small>${one.map(a => esc(a.name)).join(', ')} ${t('can send after your OK; the rest only draft')}</small></span>`
      : `<span><b>${t('Shadow mode')}</b><small>${t('Nothing is sent — every agent only drafts')}</small></span>`);
    const h = S.health || {}, conn = CONN.state, upd = CONN.lastOk ? ago(CONN.lastOk) : '—';
    const bad = conn === 'offline' || h.key === 'error', warn = conn === 'reconnecting' || h.key === 'stale' || h.key === 'unknown';
    $('#healthChip').className = 'chip ' + (bad ? 'red' : warn ? 'amber' : 'teal');
    $('#healthChip').innerHTML = `<span class="dot ${bad ? 'bad' : warn ? 'warn' : 'ok'}"></span><span><b>${conn === 'offline' ? t('Not connected — showing data from') + ' ' + esc(upd) : conn === 'reconnecting' ? t('Reconnecting…') : esc(t(h.text || ''))}</b><small>${S.running ? t('A run is going on now') + ' · ' : ''}${t('Agents last ran')} ${esc(ago(S.lastRun))} · ${t('checked')} ${esc(upd)}</small></span>`;
    [$('#liveBadge'), $('#liveBadge2')].forEach(b => { if (!b) return; b.className = 'live' + (conn === 'live' ? '' : conn === 'reconnecting' ? ' warn' : ' bad'); b.innerHTML = `<span class="dot ${conn === 'live' ? 'ok' : conn === 'reconnecting' ? 'warn' : 'bad'}"></span>${conn === 'live' ? t('Live') : conn === 'reconnecting' ? t('Reconnecting') : t('Offline')}`; });
  }
  function renderKpis() {
    const k = S.kpis || {};
    const card = (id, ic, cls, label, val, sub) => `<button type="button" class="kpi" data-kpi="${id}" aria-pressed="${KPI === id}"><span class="ic ${cls}">${svgI(ic)}</span><span style="min-width:0"><span>${esc(t(label))}</span><b>${esc(val)}</b><small>${esc(sub)}</small></span></button>`;
    $('#kpis').innerHTML = [
      card('active', 'bot', '', 'Active agents', `${k.activeAgents || 0} / ${k.totalAgents || 0}`, (k.totalAgents - k.activeAgents) ? `${k.totalAgents - k.activeAgents} ${t('paused or failed')}` : t('all drafting')),
      card('running', 'activity', k.running ? '' : 'idle', 'Running now', k.running || 0, k.running ? t('a run is in progress') : t('runs every 30 min')),
      card('awaiting', 'clock', 'amber', 'Awaiting your review', k.awaiting || 0, (S.totals && S.totals.urgent ? S.totals.urgent + ' ' + t('urgent') + ' · ' : '') + (S.totals && S.totals.valuePending ? inr(S.totals.valuePending) + ' ' + t('at stake') : t('drafts'))),
      card('failed', 'alert', k.failed ? 'red' : 'idle', 'Failed or blocked', k.failed || 0, k.failed ? t('needs a look') : t('none today')),
      card('done', 'check', '', 'Completed today', k.completedToday || 0, t('decided or handled')),
      card('sent', 'send', 'blue', 'Sent today', k.sentToday || 0, S.mode === 'shadow' ? t('shadow mode — none') : t('accepted by the channel')),
    ].join('');
  }
  function renderTabs() {
    const n = pend().length; $('#apprN').hidden = !n; $('#apprN').textContent = n;
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === VIEW)));
    ['workflow', 'agents', 'approvals', 'activity'].forEach(v => { $('#v-' + v).hidden = v !== VIEW; });
    const fn = $('#filterNote');
    const lbl = { active: 'Active agents', running: 'Running now', awaiting: 'Awaiting your review', failed: 'Failed or blocked', done: 'Completed today', sent: 'Sent today' }[KPI];
    fn.hidden = !lbl && !Q; fn.innerHTML = lbl ? `${esc(t('Filter'))}: ${esc(t(lbl))} <button type="button" class="btn ghost" data-clearkpi style="min-height:0;padding:0 4px">✕</button>` : Q ? `${t('Search')}: “${esc(Q)}”` : '';
  }
  function renderView() {
    if (VIEW === 'workflow') { renderGraph(); renderStages(); renderMiniFeed(); renderTask(); }
    if (VIEW === 'agents') renderAgents();
    if (VIEW === 'approvals') renderApprovals();
    if (VIEW === 'activity') renderActivity();
  }

  // ── the workflow diagram ─────────────────────────────────────────────────
  const W = 1360, H = 560, NH = 62;
  const COLS = [{ x: 16, w: 176, lbl: 'YOUR RECORDS' }, { x: 240, w: 196, lbl: 'AI AGENTS' }, { x: 484, w: 196, lbl: 'DEPARTMENT HEADS' }, { x: 744, w: 156, lbl: 'CHIEF OF STAFF' }, { x: 968, w: 164, lbl: 'YOU DECIDE' }, { x: 1196, w: 150, lbl: 'GOES OUT' }];
  let VB = { x: 0, y: 0, w: W, h: H }, NODES = {}, EDGES = [];
  const rowY = (n, i) => { const top = 50, bot = H - 24, gap = (bot - top - n * NH) / (n + 1); return top + gap + i * (NH + gap); };
  function buildModel() {
    const N = {}, E = [], P = pend();
    const cnt = f => P.filter(f).length;
    SOURCES.forEach(([id, l, sub, ic], i) => N[id] = { id, kind: 'src', col: 0, y: rowY(6, i), name: l, role: sub, ic, n: cnt(d => srcOf(d) === id) });
    (S.agents || []).forEach((a, i) => { const st = stat(a.id); N[a.id] = { id: a.id, kind: 'agent', col: 1, y: rowY(6, i), name: a.name, role: a.title, ic: AGENT_ICON[a.id], n: st.pending, state: st.state }; });
    (S.heads || []).forEach((h, i) => N[h.id] = { id: h.id, kind: 'head', col: 2, y: rowY(4, i), name: h.name, role: h.title, ic: HEAD_ICON[h.id], n: (h.stats || {}).pending || 0, state: (h.stats || {}).pending ? 'awaiting' : 'idle' });
    N.chief = { id: 'chief', kind: 'chief', col: 3, y: rowY(1, 0), name: (S.chief || {}).name || 'Aadhya', role: t('Chief of Staff'), ic: 'file', n: P.length };
    N.you = { id: 'you', kind: 'you', col: 4, y: rowY(1, 0), name: t('You'), role: t('Villa owner · review · approve'), ic: 'usercheck', n: P.length };
    const today = istDay(Date.now());
    OUTS.forEach(([id, l, sub, ic], i) => { const sentT = drafts().filter(d => destOf(d) === id && d.exec && d.exec.state === 'sent' && istDay(d.exec.doneAt || 0) === today).length;
      N[id] = { id, kind: 'out', col: 5, y: rowY(3, i), name: l, role: sub, ic, n: sentT, sent: true }; });
    SOURCES.forEach(([s]) => SRC_TO[s].forEach(a => E.push({ f: s, t: a, n: cnt(d => srcOf(d) === s && d.agent === a) })));
    (S.heads || []).forEach(h => h.team.forEach(a => E.push({ f: a, t: h.id, n: ((h.stats || {}).flows || {})[a] || 0, pill: true })));
    (S.heads || []).forEach(h => E.push({ f: h.id, t: 'chief', n: (h.stats || {}).pending || 0 }));
    E.push({ f: 'chief', t: 'you', n: P.length, pill: true });
    OUTS.forEach(([id]) => E.push({ f: 'you', t: id, n: drafts().filter(d => destOf(d) === id && (d.status === 'agree' || d.status === 'edit') && !(d.exec && d.exec.state === 'sent')).length, gate: true }));
    NODES = N; EDGES = E;
  }
  const pos = n => { const c = COLS[n.col]; return { x: c.x, y: n.y, w: c.w }; };
  function edgePath(e) {
    const a = pos(NODES[e.f]), b = pos(NODES[e.t]);
    const x1 = a.x + a.w, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2, dx = Math.max(24, (x2 - x1) * 0.45);
    return { d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`, mx: (x1 + 3 * (x1 + dx) + 3 * (x2 - dx) + x2) / 8, my: (y1 + y2) / 2 };
  }
  function nodeSvg(n) {
    const p = pos(n), st = n.state || '', clip = (s, max) => s.length > max ? s.slice(0, max - 1) + '…' : s;
    const sel = SEL && SEL.id === n.id ? ' sel' : '';
    const stTxt = st ? t(STATE[st] || st) : '', stCol = { running: 'var(--teal)', awaiting: 'var(--amber)', failed: 'var(--red)', paused: 'var(--idle)', idle: 'var(--idle)' }[st] || 'var(--idle)';
    const badge = n.n ? `<g class="badge${n.sent ? ' teal' : ''}" transform="translate(${p.w - 14},14)"><circle r="10"/><text y="3.6">${n.n > 99 ? '99+' : n.n}</text></g>` : '';
    const pulse = st === 'running' && !reduceMotion() ? `<rect class="pulse" x="-3" y="-3" width="${p.w + 6}" height="${NH + 6}" rx="14"><animate attributeName="opacity" values=".7;0;.7" dur="1.6s" repeatCount="indefinite"/></rect>` : '';
    const label = `${n.name}, ${n.role}${stTxt ? ', ' + stTxt : ''}${n.n ? ', ' + n.n + (n.sent ? ' sent today' : ' waiting') : ''}`;
    return `<g class="node ${n.kind}${st ? ' st-' + st : ''}${sel}" data-id="${esc(n.id)}" tabindex="0" role="button" aria-label="${esc(label)}" transform="translate(${p.x},${p.y})">${pulse}
      <rect class="bg" width="${p.w}" height="${NH}" rx="12"/>
      <rect class="icbg" x="10" y="14" width="32" height="32" rx="9"/><g class="ic" transform="translate(16,20) scale(.83)">${ICON[n.ic] || ICON.bot}</g>
      <text class="nm" x="52" y="${st ? 22 : 27}">${esc(clip(n.name, Math.floor((p.w - 62 - (n.n ? 22 : 0)) / 7.2)))}</text>
      <text class="rl" x="52" y="${st ? 37 : 43}">${esc(clip(n.role, Math.floor((p.w - 62) / 5.6)))}</text>
      ${st ? `<g transform="translate(52,44)"><circle cx="4" cy="6" r="3.5" fill="${stCol}"/><text class="stx" x="12" y="9.5" fill="${stCol}">${esc(clip(stTxt, 24))}</text></g>` : ''}
      ${badge}</g>`;
  }
  function renderGraph() {
    buildModel();
    const g = $('#graph');
    const lines = EDGES.map((e, i) => { const p = edgePath(e); return `<path class="edge${e.gate ? ' gate' : e.n ? ' hot' : ''}" id="e${i}" data-f="${e.f}" data-t="${e.t}" d="${p.d}" ${!e.gate && e.n ? `stroke-width="${(1.6 + Math.min(4, e.n * 0.6)).toFixed(1)}"` : ''}/>`; }).join('');
    const pills = EDGES.map(e => { if (!(e.pill || e.label || e.gate) || !e.n) return ''; const p = edgePath(e), txt = e.gate ? '✓ ' + e.n : String(e.n), w = 12 + txt.length * 6.2;
      return `<g class="epill" transform="translate(${p.mx - w / 2},${p.my - 9})"><rect width="${w}" height="18" rx="9"/><text x="${w / 2}" y="12.5">${esc(txt)}</text></g>`; }).join('');
    const gateLbl = S.mode === 'shadow' ? t('only after your OK · off in shadow mode') : t('only after your OK');
    const you = pos(NODES.you);
    g.innerHTML = `<svg id="gsvg" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" role="img" aria-label="${esc($('#graphCap').textContent)}">
      ${COLS.map(c => `<text class="col" x="${c.x + 2}" y="28">${esc(t(c.lbl))}</text>`).join('')}
      <g id="edges">${lines}</g><g>${pills}</g>
      <text x="${W - 14}" y="${NODES['o-guests'].y - 12}" text-anchor="end" style="font-size:11px;font-weight:700;fill:var(--amber)">${esc(gateLbl)}</text>
      <g id="nodes">${Object.values(NODES).map(nodeSvg).join('')}</g><g id="parts"></g></svg>
      <div class="g-legend"><span><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="var(--teal-line)" stroke-width="3"/></svg>${t('drafts waiting')}</span><span><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="var(--amber)" stroke-dasharray="4 4" stroke-width="1.5"/></svg>${t('needs your OK')}</span><span><span class="dot" style="background:var(--teal)"></span>${t('dot moving = a real change just now')}</span></div>`;
    $('#zoomPct').textContent = Math.round(W / VB.w * 100) + '%';
    if (FOCUS) trace(FOCUS);
    if (Q) { const hits = new Set(pend().filter(matchesQ).map(d => d.agent)); g.querySelectorAll('.node.agent').forEach(n => n.classList.toggle('dim', !hits.has(n.dataset.id))); }
  }
  // highlight everything up- and downstream of one node
  function trace(id) {
    const svg = $('#gsvg'); if (!svg) return;
    const edges = [...svg.querySelectorAll('.edge')], nodes = [...svg.querySelectorAll('.node')];
    edges.forEach(e => e.classList.remove('on', 'dim')); nodes.forEach(n => n.classList.remove('dim'));
    if (!id) return;
    const walk = down => { const seen = new Set([id]); let grew = true; while (grew) { grew = false; edges.forEach(e => { const [a, b] = down ? [e.dataset.f, e.dataset.t] : [e.dataset.t, e.dataset.f]; if (seen.has(a) && !seen.has(b)) { seen.add(b); grew = true; } }); } return seen; };
    const dn = walk(true), up = walk(false), on = new Set([...dn, ...up]);
    edges.forEach(e => { const k = (dn.has(e.dataset.f) && dn.has(e.dataset.t)) || (up.has(e.dataset.f) && up.has(e.dataset.t)); e.classList.add(k ? 'on' : 'dim'); });
    nodes.forEach(n => { if (!on.has(n.dataset.id)) n.classList.add('dim'); });
  }
  // a dot along the path a real event took (new draft: record → agent → head; approved/sent: you → destination)
  function animate(evs) {
    if (reduceMotion() || document.hidden || VIEW !== 'workflow') return;
    const svg = $('#gsvg'); if (!svg) return;
    const run = (pairs, cls) => {
      let i = 0;
      const step = () => {
        if (i >= pairs.length) return;
        const [f, to] = pairs[i++], path = svg.querySelector(`.edge[data-f="${f}"][data-t="${to}"]`);
        if (!path) return step();
        const len = path.getTotalLength(), c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('r', '5'); c.setAttribute('class', 'particle' + (cls ? ' ' + cls : '')); svg.querySelector('#parts').appendChild(c);
        const t0 = performance.now(), dur = 900;
        const tick = now => { const k = Math.min(1, (now - t0) / dur), pt = path.getPointAtLength(len * (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)); c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y);
          if (k < 1) requestAnimationFrame(tick); else { c.remove(); arrive(to); step(); } };
        requestAnimationFrame(tick);
      };
      step();
    };
    evs.slice(-6).forEach((e, i) => setTimeout(() => {
      const d = e.draftId ? draft(e.draftId) : null;
      if (e.type === 'draft.created' && d) run([[srcOf(d), d.agent], [d.agent, e.head]]);
      else if (e.type === 'verdict.approved' || e.type === 'verdict.edited') { if (d && destOf(d)) run([['you', destOf(d)]], 'amber'); else arrive('you'); }
      else if (e.type === 'action.sent' && d && destOf(d)) run([['you', destOf(d)]]);
      else if (e.type === 'brief.sent') run([['chief', 'you']]);
    }, i * 450));
  }
  function arrive(id) {
    const n = $(`#gsvg .node[data-id="${id}"] rect.bg`); if (!n || reduceMotion()) return;
    n.animate([{ strokeWidth: 1 }, { strokeWidth: 3 }, { strokeWidth: 1 }], { duration: 600 });
  }
  // zoom, pan, fit
  function setVB(v) { VB = v; const s = $('#gsvg'); if (s) s.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.h}`); $('#zoomPct').textContent = Math.round(W / VB.w * 100) + '%'; }
  function zoom(f, cx, cy) {
    const nw = Math.min(W * 2, Math.max(W / 3, VB.w * f)), nh = nw * H / W;
    cx = cx == null ? VB.x + VB.w / 2 : cx; cy = cy == null ? VB.y + VB.h / 2 : cy;
    setVB({ x: cx - (cx - VB.x) * nw / VB.w, y: cy - (cy - VB.y) * nh / VB.h, w: nw, h: nh });
  }
  function fit() { setVB({ x: 0, y: 0, w: W, h: H }); }
  (function wireGraph() {
    const g = $('#graph'); let drag = null;
    const toSvg = (cx, cy) => { const r = g.getBoundingClientRect(), s = Math.max(VB.w / r.width, VB.h / r.height); const ox = (r.width - VB.w / s) / 2, oy = (r.height - VB.h / s) / 2; return { x: VB.x + (cx - r.left - ox) * s, y: VB.y + (cy - r.top - oy) * s, s }; };
    g.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 40 && !e.deltaMode) { /* trackpad scroll still zooms gently */ } e.preventDefault(); const p = toSvg(e.clientX, e.clientY); zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12, p.x, p.y); }, { passive: false });
    g.addEventListener('pointerdown', e => { if (e.target.closest('.node')) return; drag = { x: e.clientX, y: e.clientY, vb: Object.assign({}, VB), s: toSvg(0, 0).s, moved: false }; g.classList.add('dragging'); g.setPointerCapture(e.pointerId); });
    g.addEventListener('pointermove', e => { if (!drag) return; const dx = (e.clientX - drag.x) * drag.s, dy = (e.clientY - drag.y) * drag.s; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true; setVB({ x: drag.vb.x - dx, y: drag.vb.y - dy, w: VB.w, h: VB.h }); });
    const end = () => { if (drag && !drag.moved) { FOCUS = ''; SEL = null; trace(''); } drag = null; g.classList.remove('dragging'); };
    g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
    g.addEventListener('click', e => { const n = e.target.closest('.node'); if (!n) return; selectNode(n.dataset.id); });
    g.addEventListener('keydown', e => { const n = e.target.closest('.node'); if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectNode(n.dataset.id); } });
    $('#gctl').addEventListener('click', e => { const b = e.target.closest('[data-z]'); if (!b) return; ({ in: () => zoom(1 / 1.2), out: () => zoom(1.2), fit, reset: () => { fit(); FOCUS = ''; SEL = null; renderGraph(); } })[b.dataset.z](); });
  })();
  function selectNode(id) {
    FOCUS = FOCUS === id ? '' : id; SEL = FOCUS ? { kind: 'node', id } : null;
    renderGraph();
    if (!FOCUS) return;
    // the node's most pressing draft becomes the selected task
    const P = pend().filter(d => d.agent === id || d.head === id || srcOf(d) === id || destOf(d) === id || id === 'chief' || id === 'you');
    if (P[0]) { TASK = P[0].id; renderTask(); }
    openInspector({ kind: NODES[id] ? NODES[id].kind : 'node', id });
  }
  // small screens: the same flow as stages
  function renderStages() {
    buildModel();
    const st = (title, ids) => `<div class="stage"><b>${esc(t(title))}</b>${ids.map(id => { const n = NODES[id]; return `<button type="button" data-node="${id}">${svgI(n.ic)}<span class="t"><b>${esc(n.name)}</b><small>${esc(n.role)}${n.state ? ' · ' + esc(t(STATE[n.state])) : ''}</small></span>${n.n ? `<span class="sp ${n.sent ? 'sent' : 'awaiting'}">${n.n}</span>` : ''}</button>`; }).join('')}</div>`;
    $('#stageList').innerHTML = st('Your records', SOURCES.map(s => s[0])) + st('AI agents', (S.agents || []).map(a => a.id)) + st('Department heads', (S.heads || []).map(h => h.id)) + st('Chief of staff → you', ['chief', 'you']) + st('Goes out — only after your OK', OUTS.map(o => o[0]));
  }

  // ── activity feed ────────────────────────────────────────────────────────
  function evRow(e) {
    const [lbl, ic] = EV[e.type] || [e.type, 'activity'], a = e.agent ? agent(e.agent) : null, who = a ? a.name : e.head === 'chief' ? 'Aadhya' : e.source === 'owner' ? t('You') : t('System');
    const d = e.draftId ? draft(e.draftId) : null, stc = d ? (d.exec ? d.exec.state : d.status) : '';
    return `<li class="${FRESH.has(e.seq) ? 'fresh' : ''}" data-ev="${e.seq}" ${e.draftId ? `data-task="${esc(e.draftId)}"` : e.agent ? `data-agentinsp="${esc(e.agent)}"` : ''} tabindex="0">
      <time>${esc(hm(e.at))}</time><span class="who">${svgI(a ? AGENT_ICON[a.id] : ic)}</span>
      <span><b>${esc(who)} · ${esc(t(lbl))}</b><small data-no-i18n>${esc(e.title || '')}${e.via ? ' · ' + esc(e.via) : ''}</small></span>
      ${stc ? `<span class="sp ${esc(stc)}">${esc(t(EXEC[stc] || VERDICT[stc] || stc))}</span>` : ''}</li>`;
  }
  function renderMiniFeed() {
    const evs = (S.events || []).filter(e => e.type !== 'run.finished' || e.made || e.cleared).slice(0, 8);
    $('#feedMini').innerHTML = evs.length ? evs.map(evRow).join('') : `<li class="empty" style="display:block">${t('No activity recorded yet. Events appear here as the agents run and you decide.')}</li>`;
    setTimeout(() => FRESH.clear(), 1800);
  }
  function renderActivity() {
    const ag = $('#fAgent'); if (ag.options.length < 2) (S.agents || []).forEach(a => ag.add(new Option(a.name + ' · ' + a.title, a.id)));
    const ty = $('#fType'); if (ty.options.length < 2) Object.entries(EV).forEach(([k, v]) => ty.add(new Option(t(v[0]), k)));
    const from = F.from ? Date.parse(F.from + 'T00:00:00+05:30') : 0, to = F.to ? Date.parse(F.to + 'T23:59:59+05:30') : Infinity;
    const okStatus = e => { if (!F.status) return true; const d = e.draftId ? draft(e.draftId) : null, s = d ? (d.exec ? d.exec.state : d.status) : '';
      return F.status === 'pending' ? s === 'pending' : F.status === 'approved' ? s === 'agree' || s === 'edit' : F.status === 'rejected' ? s === 'reject' : F.status === 'sent' ? s === 'sent' : /blocked|failed/.test(e.type) || s === 'failed'; };
    const evs = (S.events || []).filter(e => (!F.agent || e.agent === F.agent) && (!F.type || e.type === F.type) && e.at >= from && e.at <= to && okStatus(e) && (!Q || (e.title || '').toLowerCase().includes(Q) || String(e.draftId || '').includes(Q)));
    $('#feedFull').innerHTML = evs.length ? evs.map(evRow).join('') : `<li class="empty" style="display:block">${t('No events match these filters.')}</li>`;
  }
  ['fAgent', 'fType', 'fStatus', 'fFrom', 'fTo'].forEach(id => $('#' + id).addEventListener('change', e => { F[{ fAgent: 'agent', fType: 'type', fStatus: 'status', fFrom: 'from', fTo: 'to' }[id]] = e.target.value; renderActivity(); }));

  // ── the selected task & its preview ──────────────────────────────────────
  function lifecycle(d) {
    const evs = (S.events || []).filter(e => e.draftId === d.id).slice().reverse();
    const at = type => (evs.find(e => e.type === type) || {}).at;
    const h = head(d.head) || {}, a = agent(d.agent), mode = a.mode || 'shadow';
    const briefed = S.briefOn && istDay(d.at) <= S.briefOn;
    const decided = ['agree', 'edit', 'reject'].includes(d.status), closed = ['resolved', 'expired'].includes(d.status);
    const ex = d.exec;
    return [
      { cls: 'done', b: t('Source'), s: (SOURCES.find(x => x[0] === srcOf(d)) || [])[1] || '', at: d.at },
      { cls: 'done', b: `${a.name} · ${t('drafted it')}`, s: d.proposal && d.proposal.ai ? t('written by Claude from your FAQ') : t('from the agent\'s template'), at: at('draft.created') || d.at },
      { cls: 'done', b: `${h.name || '—'} · ${t(h.title || '')}`, s: t('routed on creation') },
      { cls: briefed ? 'done' : 'todo', b: `Aadhya · ${t('Chief of Staff')}`, s: briefed ? t('in the morning brief') : t('in the next morning brief') },
      { cls: decided ? (d.status === 'reject' ? 'bad' : 'done') : closed ? 'todo' : 'wait', b: t('Your decision'), s: decided ? t(VERDICT[d.status]) + (d.decidedBy ? ' · ' + d.decidedBy.split('@')[0] : '') : closed ? t(VERDICT[d.status]) : t('waiting for you'), at: d.decidedAt },
      { cls: ex ? (ex.state === 'failed' ? 'bad' : ex.state === 'sent' ? 'done' : 'wait') : 'todo', b: t('Sending'),
        s: ex ? `${t(EXEC[ex.state] || ex.state)} · ${ex.result || ''}` : !d.delivery ? t('Harbour has no channel for this — act on it yourself') : mode !== 'approve' ? t('Not sent — shadow mode') : (d.status === 'agree' || d.status === 'edit') ? t('approved — ready to send') : t('after your approval'), at: ex && (ex.doneAt || ex.at) },
    ];
  }
  function renderTask() {
    const d = TASK && draft(TASK);
    const box = $('#taskBox'), pv = $('#prevBox');
    if (!d) { box.innerHTML = `<div class="empty">${t('Nothing selected. Click an agent or an activity entry.')}</div>`; pv.innerHTML = ''; $('#taskState').innerHTML = ''; return; }
    const a = agent(d.agent), h = head(d.head) || {}, stc = d.exec ? d.exec.state : d.status;
    $('#taskState').innerHTML = `<span class="sp ${esc(stc)}">${esc(t(EXEC[stc] || VERDICT[stc] || stc))}</span>`;
    box.innerHTML = `<h3 style="font-size:16px;line-height:1.3" data-no-i18n>${esc(d.title)}</h3>
      <p style="font-size:12px;color:var(--muted);margin:3px 0 10px">${t('Task')} ${esc(d.id)} · ${t('created')} ${esc(dt(d.at))}${d.decidedAt ? ' · ' + t('updated') + ' ' + esc(ago(d.decidedAt)) : ''}</p>
      <dl class="kv"><dt>${t('Agent')}</dt><dd>${esc(a.name)} · ${esc(t(a.title))}</dd><dt>${t('Reports to')}</dt><dd>${esc(h.name || '—')} · ${esc(t(h.title || ''))}</dd>
      <dt>${t('Why')}</dt><dd data-no-i18n>${esc(d.detail || '')}</dd>${d.value ? `<dt>${t('At stake')}</dt><dd>${inr(d.value)}</dd>` : ''}
      <dt>${t('Goes to')}</dt><dd>${esc(t(CH[(d.proposal || {}).channel] || '—'))}${(d.proposal || {}).to ? ' · <span data-no-i18n>' + esc(d.proposal.to) + '</span>' : ''}</dd>
      ${d.link ? `<dt>${t('Record')}</dt><dd><a href="${esc(d.link)}">${t('Open the record')} →</a></dd>` : ''}</dl>
      <ul class="trace">${lifecycle(d).map(s => `<li class="${s.cls}"><b>${esc(s.b)}</b>${s.at ? `<time>${esc(hm(s.at))}</time>` : ''}<br><span style="color:var(--muted)">${esc(s.s)}</span></li>`).join('')}</ul>`;
    renderPreview(d);
  }
  // Send is offered only where the server would accept it: one-tap mode, a real channel, this exact version approved, not sent yet
  const sendable = d => agent(d.agent).mode === 'approve' && !!d.delivery && d.approvalCurrent && (d.status === 'agree' || d.status === 'edit') && !(d.exec && ['sent', 'executing'].includes(d.exec.state));
  function renderPreview(d) {
    const p = d.proposal || {}, a = agent(d.agent), mode = a.mode || 'shadow', open = d.status === 'pending' || ((d.status === 'agree' || d.status === 'edit') && !(d.exec && ['sent', 'executing'].includes(d.exec.state)));
    const canSend = sendable(d);
    const text = d.better || p.text || '';
    const tabs = `<div class="ptabs"><button type="button" data-ptab="msg" aria-pressed="${PTAB === 'msg'}">${t('Message')}</button><button type="button" data-ptab="why" aria-pressed="${PTAB === 'why'}">${t('Why & source')}</button>${p.template ? `<button type="button" data-ptab="tpl" aria-pressed="${PTAB === 'tpl'}">${t('Template version')}</button>` : ''}</div>`;
    const body = PTAB === 'why' ? `<div class="preview" data-no-i18n>${esc(d.detail || '')}</div>`
      : PTAB === 'tpl' && p.template ? `<div class="preview" data-no-i18n>${esc(p.template)}</div>`
      : EDITING ? `<textarea class="edit" id="editTxt" aria-label="${esc(t('How you would put it'))}">${esc(text)}</textarea>`
      : `<div class="preview"><div class="via">${esc(t(CH[p.channel] || 'Draft'))}${p.to && !/decision|report/.test(p.channel) ? ' · <span data-no-i18n>' + esc(p.to) + '</span>' : ''}${p.ai ? ' · ' + t('written by Claude') : ''}${d.better ? ' · ' + t('your edit') : ''}</div><span data-no-i18n>${esc(text)}</span></div>`;
    const notes = [];
    if (mode !== 'approve') notes.push(`<div class="warnline">${svgI('shield')}<span>${t('Shadow mode: approving records your decision — nothing is sent.')}</span></div>`);
    else if (!d.delivery) notes.push(`<div class="warnline">${svgI('alert')}<span>${t('Harbour has no channel for this kind of draft yet — approve it, then do it yourself.')}</span></div>`);
    else if (d.status === 'agree' || d.status === 'edit') notes.push(d.approvalCurrent ? `<div class="warnline teal">${svgI('check')}<span>${t('Approved. Sends via')} ${esc(d.delivery)} ${t('only when you press Send.')}</span></div>` : `<div class="warnline red">${svgI('alert')}<span>${t('The content changed after approval — approve it again before sending.')}</span></div>`);
    if (d.exec) notes.push(`<div class="warnline ${d.exec.state === 'sent' ? 'teal' : d.exec.state === 'failed' ? 'red' : ''}">${svgI(d.exec.state === 'failed' ? 'alert' : 'send')}<span><b>${esc(t(EXEC[d.exec.state] || d.exec.state))}</b> · ${esc(d.exec.result || '')} ${d.exec.doneAt ? '· ' + esc(dt(d.exec.doneAt)) : ''}</span></div>`);
    const acts = EDITING ? `<div class="acts"><button class="btn" type="button" data-cancel>${t('Cancel')}</button><span></span><button class="btn primary" type="button" data-saveedit="${d.id}">${svgI('check')}${t('Approve this version')}</button></div>`
      : canSend ? `<div class="acts"><button class="btn" type="button" data-edit="${d.id}">${svgI('pencil')}${t('Edit')}</button><button class="btn danger" type="button" data-v="reject" data-id="${d.id}">${svgI('x')}${t('Reject')}</button><button class="btn primary" type="button" data-send="${d.id}">${svgI('send')}${t('Send now')}</button></div>`
      : d.status === 'pending' ? `<div class="acts"><button class="btn" type="button" data-edit="${d.id}">${svgI('pencil')}${t('Edit')}</button><button class="btn danger" type="button" data-v="reject" data-id="${d.id}">${svgI('x')}${t('Reject')}</button><button class="btn primary" type="button" data-v="agree" data-id="${d.id}">${svgI('check')}${t('Approve')}</button></div>`
      : open || ['agree', 'edit', 'reject'].includes(d.status) && !(d.exec && ['sent', 'executing'].includes(d.exec.state)) ? `<div class="acts"><span></span><span></span><button class="btn" type="button" data-v="pending" data-id="${d.id}">${t('Undo decision')}</button></div>` : '';
    $('#prevBox').innerHTML = tabs + body + notes.join('') + acts;
  }

  // ── agents view ──────────────────────────────────────────────────────────
  function renderAgents() {
    // Claude drafting: whether it's on, this month's use, and the last error if the latest attempt failed
    { const ai = S.ai || {}, err = ai.lastError && (!ai.lastOk || ai.lastError.at > ai.lastOk) ? ai.lastError : null;
      $('#aiLine').innerHTML = !ai.configured ? `${svgI('bot')}<span>${t('Claude drafting is off — the agents use their own templates.')}</span>`
        : `${svgI('bot')}<span><b>${t('Claude drafting on')}</b> · ${ai.calls || 0}/${ai.cap || 0} ${t('drafts this month')}${ai.errors ? ` · ${ai.errors} ${t('failed')}` : ''}</span>${err ? `<span class="bad">· ${t('Last attempt failed')} ${esc(ago(err.at))}: <span data-no-i18n>${esc(err.message)}</span></span>` : ''}`; }
    $('#headCards').innerHTML = (S.heads || []).map(h => { const st = h.stats || {};
      return `<div class="card acard" data-headinsp="${h.id}" tabindex="0" role="button"><div class="top"><span class="av">${svgI(HEAD_ICON[h.id])}</span><span><h3>${esc(h.name)}</h3><div class="role">${esc(t(h.title))}</div></span></div>
        <div class="meta"><span class="sp ${st.pending ? 'awaiting' : 'idle'}">${st.pending ? st.pending + ' ' + t('waiting') : t('Nothing waiting')}</span>${st.value ? `<span>${inr(st.value)} ${t('at stake')}</span>` : ''}${st.accuracy != null ? `<span>${Math.round(st.accuracy * 100)}% ${t('right')}</span>` : ''}</div>
        <div class="meta">${h.team.map(id => esc(agent(id).name)).join(' · ')}</div></div>`; }).join('');
    $('#agentCards').innerHTML = (S.agents || []).filter(a => !Q || (a.name + ' ' + a.title).toLowerCase().includes(Q) || pend().some(d => d.agent === a.id && matchesQ(d))).map(a => {
      const st = stat(a.id), s = a.stats || {}, dec = (s.agree || 0) + (s.edit || 0) + (s.reject || 0), pct = s.accuracy == null ? 0 : Math.round(s.accuracy * 100);
      const need = Math.max(0, ((S.readyAt || {}).reviews || 20) - dec);
      return `<div class="card acard"><div class="top"><span class="av${st.state === 'awaiting' ? ' amber' : ''}">${svgI(AGENT_ICON[a.id])}</span><span style="flex:1;min-width:0"><h3>${esc(a.name)}</h3><div class="role">${esc(t(a.title))}</div></span><span class="sp ${st.state}" title="${esc(t(STATE_HINT[st.state]))}">${esc(t(STATE[st.state]))}</span></div>
        <div class="cur">${st.current ? `<b>${t('Now')}:</b> <span data-no-i18n>${esc(st.current.title)}</span>` : st.state === 'running' ? t('Running now…') : `<span style="color:var(--muted)">${t('No task — idle until the next run')}</span>`}</div>
        <div class="meta"><span>${st.pending || 0} ${t('waiting')}</span><span>${t('Last activity')} ${esc(ago(st.lastActivity))}</span>${a.run ? `<span>${t('Ran')} ${esc(ago(a.run.at))} · ${a.run.made} ${t('new')}</span>` : ''}${a.run && a.run.error ? `<span style="color:var(--red)">${esc(a.run.error)}</span>` : ''}</div>
        <div class="mode" role="group" aria-label="${esc(t('Mode'))}"><button type="button" data-mode="shadow" data-agent="${a.id}" aria-pressed="${a.mode === 'shadow'}">${t('Shadow')}</button><button type="button" data-mode="paused" data-agent="${a.id}" aria-pressed="${a.mode === 'paused'}">${t('Paused')}</button><button type="button" data-mode="approve" data-agent="${a.id}" aria-pressed="${a.mode === 'approve'}" ${s.ready || a.mode === 'approve' ? '' : 'disabled'} title="${esc(t('You approve each one; only then can it be sent. Unlocks at 90% right over 20 reviews.'))}">${s.ready || a.mode === 'approve' ? '' : '🔒 '}${t('One-tap')}</button></div>
        <div class="trust"><div class="tb"><i style="width:${pct}%"></i><em></em></div>${s.ready ? `<b style="color:var(--teal)">${t('Earned one-tap approval')}</b>` : dec ? `${pct}% ${t('right')} · ${need ? need + ' ' + t('more reviews to unlock') : t('needs 90% to unlock')}` : t('No reviews yet')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" data-agentinsp="${a.id}">${t('Details')}</button><button class="btn ghost" type="button" data-run="${a.id}">${svgI('play')}${t('Run now')}</button></div></div>`;
    }).join('') || `<div class="empty">${t('No agent matches.')}</div>`;
  }

  // ── approvals view ───────────────────────────────────────────────────────
  function renderApprovals() {
    const b = S.brief, c = S.chief || {};
    $('#briefBox').innerHTML = b ? `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="av amber">${svgI('file')}</span><span style="flex:1;min-width:200px"><b>${esc(c.name)} · ${esc(t(c.title))}</b><div style="font-size:12px;color:var(--muted)">${t('Your brief, put together from the four heads')}</div></span>
      <span class="tag">${t('Morning brief on Telegram (8:30)')}: <button type="button" class="btn ghost" data-brief="${S.briefOff ? 'on' : 'off'}" style="min-height:0;padding:0 6px">${S.briefOff ? t('Off') : t('On')}</button></span></div>
      <div class="hl">${esc(t(b.headline))}</div><ul>${b.heads.map(r => { const h = head(r.id) || {}; return `<li><b>${esc(h.name)} · ${esc(t(h.title))}</b> — ${r.pending ? r.pending + ' ' + t('waiting') + (r.urgent ? `, <b style="color:var(--red)">${r.urgent} ${t('urgent')}</b>` : '') + (r.value ? ' · ' + inr(r.value) : '') : t('nothing waiting')}</li>`; }).join('')}</ul>` : '';
    const anyApprove = (S.agents || []).some(a => a.mode === 'approve');
    $('#apprMode').textContent = anyApprove ? t('Send only after you approve — checked by the server') : t('Shadow mode — approving records your decision; nothing is sent');
    const list = drafts().filter(d => (d.status === 'pending' || ((d.status === 'agree' || d.status === 'edit') && d.delivery && agent(d.agent).mode === 'approve' && !(d.exec && d.exec.state === 'sent'))) && matchesQ(d) && kpiOk(d))
      .sort((x, y) => (x.priority || 3) - (y.priority || 3) || y.at - x.at);
    $('#apprList').innerHTML = list.length ? list.map(d => { const a = agent(d.agent), h = head(d.head) || {}, p = d.proposal || {};
      const warn = [];
      if (d.value) warn.push(`<span class="tag">${inr(d.value)} ${t('at stake')}</span>`);
      if (p.ai) warn.push(`<span class="tag">${t('written by Claude — check facts')}</span>`);
      if (!d.delivery) warn.push(`<span class="tag">${t('no channel — you act on it')}</span>`);
      if ((d.status === 'agree' || d.status === 'edit') && !d.approvalCurrent) warn.push(`<span class="sp failed">${t('changed after approval')}</span>`);
      return `<div class="row" data-task="${esc(d.id)}"><span class="av${d.priority === 1 ? ' amber' : ''}">${svgI(AGENT_ICON[d.agent])}</span>
        <div style="min-width:0"><h3 data-no-i18n>${esc(d.title)}</h3><div class="sub">${esc(a.name)} → ${esc(h.name || '')} · ${esc(t(CH[p.channel] || ''))}${p.to && !/decision|report/.test(p.channel) ? ' · <span data-no-i18n>' + esc(p.to) + '</span>' : ''} · ${esc(ago(d.at))} · ${t('task')} ${esc(d.id)}</div>
          <div class="sub" data-no-i18n style="color:var(--ink2);white-space:pre-wrap">${esc((d.better || p.text || '').slice(0, 280))}${(d.better || p.text || '').length > 280 ? '…' : ''}</div>
          <div class="tags"><span class="sp ${d.status}">${esc(t(VERDICT[d.status]))}</span>${d.priority === 1 ? `<span class="sp failed">${t('Urgent')}</span>` : ''}${warn.join('')}</div></div>
        <div class="ra"><button class="btn" type="button" data-open="${esc(d.id)}">${t('Review')}</button>${d.status === 'pending' ? `<button class="btn primary" type="button" data-v="agree" data-id="${d.id}">${svgI('check')}${t('Approve')}</button><button class="btn danger" type="button" data-v="reject" data-id="${d.id}">${t('Reject')}</button>` : sendable(d) ? `<button class="btn primary" type="button" data-send="${d.id}">${svgI('send')}${t('Send now')}</button>` : ''}</div></div>`; }).join('')
      : `<div class="empty">${t('Nothing is waiting for your decision.')}</div>`;
  }
  function kpiOk(d) {
    if (!KPI) return true;
    if (KPI === 'awaiting') return d.status === 'pending';
    if (KPI === 'failed') return d.exec && d.exec.state === 'failed';
    if (KPI === 'sent') return d.exec && d.exec.state === 'sent';
    return true;
  }

  // ── inspector ────────────────────────────────────────────────────────────
  function openInspector(sel) {
    SEL = sel; const body = $('#inspBody'); let title = '', html = '';
    const dRow = d => `<button type="button" class="drow" data-open="${esc(d.id)}"><b data-no-i18n>${esc(d.title)}</b><div>${esc(t(VERDICT[d.status] || d.status))} · ${esc(ago(d.at))}</div></button>`;
    if (sel.kind === 'draft') {
      const d = draft(sel.id); if (!d) return;
      title = t('Task') + ' ' + d.id;
      const evs = (S.events || []).filter(e => e.draftId === d.id);
      html = `<div><h3>${t('What')}</h3><p style="font-size:15px;font-weight:650;margin-top:4px" data-no-i18n>${esc(d.title)}</p><p style="font-size:13px;color:var(--muted)" data-no-i18n>${esc(d.detail || '')}</p></div>
        <div><h3>${t('Lifecycle')}</h3><ul class="trace">${lifecycle(d).map(s => `<li class="${s.cls}"><b>${esc(s.b)}</b>${s.at ? `<time>${esc(dt(s.at))}</time>` : ''}<br><span style="color:var(--muted)">${esc(s.s)}</span></li>`).join('')}</ul></div>
        <div><h3>${t('Recorded events')}</h3><ul class="feed">${evs.length ? evs.map(evRow).join('') : `<li class="empty" style="display:block">${t('Created before the event log began — only the fields above are recorded.')}</li>`}</ul></div>
        <div><h3>${t('Record')}</h3><p style="font-size:13px">${d.link ? `<a href="${esc(d.link)}">${t('Open the record')} →</a>` : '—'} · ${t('key')} <code>${esc(d.key)}</code>${d.exec ? `<br>${t('Approved version')} <code>${esc((d.exec.hash || '').slice(0, 12))}</code> · ${t('attempt')} ${d.exec.attempt}` : ''}</p></div>`;
    } else if (sel.kind === 'agent') {
      const a = agent(sel.id), st = stat(sel.id), mine = drafts().filter(d => d.agent === sel.id);
      title = a.name + ' · ' + t(a.title);
      html = `<div><span class="sp ${st.state}">${esc(t(STATE[st.state]))}</span> <span style="font-size:12px;color:var(--muted)">${esc(t(STATE_HINT[st.state]))}</span></div>
        <div><h3>${t('Does')}</h3><p style="font-size:13.5px;line-height:1.5;margin-top:4px">${esc(t(a.does || ''))}</p><p style="font-size:12.5px;color:var(--muted);margin-top:6px">${t('Reads')}: ${Object.entries(SRC_TO).filter(([, v]) => v.includes(a.id)).map(([k]) => esc(t((SOURCES.find(s => s[0] === k) || [])[1]))).join(', ')} · ${t('Reports to')}: ${(S.heads || []).filter(h => h.team.includes(a.id)).map(h => esc(h.name)).join(', ')}</p></div>
        <div><h3>${t('Last run')}</h3><p style="font-size:13px;margin-top:4px">${a.run ? `${esc(dt(a.run.at))} · ${a.run.made} ${t('new')}, ${a.run.resolved} ${t('cleared')} · ${a.run.ms} ms${a.run.error ? `<br><span style="color:var(--red)">${esc(a.run.error)}</span>` : ''}` : t('Not run yet')}</p></div>
        <div><h3>${t('Waiting for you')} (${st.pending || 0})</h3><div style="display:grid;gap:6px;margin-top:6px">${mine.filter(d => d.status === 'pending').slice(0, 12).map(dRow).join('') || `<p style="font-size:13px;color:var(--muted)">${t('Nothing waiting.')}</p>`}</div></div>
        <div><h3>${t('Recent')}</h3><ul class="feed">${(S.events || []).filter(e => e.agent === sel.id).slice(0, 10).map(evRow).join('') || `<li class="empty" style="display:block">${t('No recorded events yet.')}</li>`}</ul></div>`;
    } else {
      const n = NODES[sel.id] || {}, rel = pend().filter(d => d.head === sel.id || srcOf(d) === sel.id || destOf(d) === sel.id || sel.id === 'chief' || sel.id === 'you');
      title = (n.name || sel.id) + (n.role ? ' · ' + n.role : '');
      const h = head(sel.id);
      html = `${h ? `<div><h3>${t('Does')}</h3><p style="font-size:13.5px;line-height:1.5;margin-top:4px">${esc(t(h.does || ''))}</p><p style="font-size:12.5px;color:var(--muted);margin-top:6px">${t('Team')}: ${h.team.map(id => esc(agent(id).name + ' · ' + agent(id).title)).join(', ')}</p></div>` : ''}
        ${sel.id.startsWith('o-') ? `<div class="warnline">${svgI('shield')}<span>${t('Nothing goes out without your approval. In shadow mode nothing goes out at all; with one-tap approval, only what you approve and press Send on.')}</span></div>` : ''}
        <div><h3>${t('Drafts waiting')} (${rel.length})</h3><div style="display:grid;gap:6px;margin-top:6px">${rel.slice(0, 15).map(dRow).join('') || `<p style="font-size:13px;color:var(--muted)">${t('Nothing waiting here.')}</p>`}</div></div>`;
    }
    $('#inspTitle').textContent = title; body.innerHTML = html;
    $('#insp').classList.add('open'); $('#insp').setAttribute('aria-hidden', 'false'); $('#scrim').hidden = false;
    $('#inspClose').focus();
  }
  function closeInspector() { $('#insp').classList.remove('open'); $('#insp').setAttribute('aria-hidden', 'true'); $('#scrim').hidden = true; }
  $('#inspClose').addEventListener('click', closeInspector); $('#scrim').addEventListener('click', closeInspector);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeInspector(); });

  // ── actions ──────────────────────────────────────────────────────────────
  async function review(id, verdict, extra) {
    if (BUSY) return; BUSY = true;
    try { S = await api('POST', '/agents/review', Object.assign({ id, verdict }, extra || {})); SEQ = S.seq || SEQ; EDITING = false; renderAll(); toast({ agree: t('Approved'), edit: t('Approved your version'), reject: t('Rejected'), pending: t('Back in your queue') }[verdict]); }
    catch (e) { toast(e.message, true); }
    finally { BUSY = false; }
  }
  async function send(id) {
    const d = draft(id); if (!d || BUSY) return;
    if (!confirm(t('Send this now?') + '\n\n' + (d.delivery || '') + '\n\n' + (d.better || (d.proposal || {}).text || '').slice(0, 400))) return;
    BUSY = true;
    try { S = await api('POST', '/agents/execute', { id, hash: d.approvedHash || d.hash }); SEQ = S.seq || SEQ; renderAll(); toast(t('Sent — accepted by the channel')); }
    catch (e) { if (e.data && e.data.agents) { S = e.data; SEQ = S.seq || SEQ; renderAll(); } toast(e.message, true); }
    finally { BUSY = false; }
  }
  document.addEventListener('click', async e => {
    const v = e.target.closest('[data-v]'); if (v) return review(v.dataset.id, v.dataset.v);
    const sd = e.target.closest('[data-send]'); if (sd) return send(sd.dataset.send);
    const ed = e.target.closest('[data-edit]'); if (ed) { TASK = ed.dataset.edit; EDITING = true; PTAB = 'msg'; if (VIEW !== 'workflow') { VIEW = 'workflow'; renderAll(); } else renderTask(); const ta = $('#editTxt'); if (ta) ta.focus(); return; }
    if (e.target.closest('[data-cancel]')) { EDITING = false; return renderTask(); }
    const se = e.target.closest('[data-saveedit]'); if (se) return review(se.dataset.saveedit, 'edit', { text: $('#editTxt').value });
    const pt = e.target.closest('[data-ptab]'); if (pt) { PTAB = pt.dataset.ptab; return renderPreview(draft(TASK)); }
    const op = e.target.closest('[data-open]'); if (op) { TASK = op.dataset.open; return openInspector({ kind: 'draft', id: op.dataset.open }); }
    const tk = e.target.closest('[data-task]'); if (tk && !e.target.closest('button')) { TASK = tk.dataset.task; if (VIEW === 'workflow') renderTask(); return openInspector({ kind: 'draft', id: tk.dataset.task }); }
    const ai = e.target.closest('[data-agentinsp]'); if (ai) return openInspector({ kind: 'agent', id: ai.dataset.agentinsp });
    const hi = e.target.closest('[data-headinsp]'); if (hi) return openInspector({ kind: 'head', id: hi.dataset.headinsp });
    const nd = e.target.closest('[data-node]'); if (nd) { const id = nd.dataset.node; return openInspector({ kind: NODES[id] && NODES[id].kind === 'agent' ? 'agent' : 'node', id }); }
    const tb = e.target.closest('[data-view]'); if (tb) { VIEW = tb.dataset.view; EDITING = false; return renderAll(); }
    const go = e.target.closest('[data-goto]'); if (go) { VIEW = go.dataset.goto; return renderAll(); }
    const kp = e.target.closest('[data-kpi]'); if (kp) { KPI = KPI === kp.dataset.kpi ? '' : kp.dataset.kpi;
      if (KPI === 'awaiting' || KPI === 'sent') VIEW = 'approvals'; else if (KPI === 'active' || KPI === 'running') VIEW = 'agents'; else if (KPI === 'failed') { VIEW = 'activity'; F.status = 'failed'; $('#fStatus').value = 'failed'; } else if (KPI === 'done') VIEW = 'activity';
      if (!KPI) { F.status = ''; $('#fStatus').value = ''; } return renderAll(); }
    if (e.target.closest('[data-clearkpi]')) { KPI = ''; F.status = ''; $('#fStatus').value = ''; return renderAll(); }
    const md = e.target.closest('[data-mode]'); if (md && md.getAttribute('aria-pressed') !== 'true' && !md.disabled) {
      if (md.dataset.mode === 'approve' && !confirm(t('One-tap approval: this agent\'s drafts can be sent after you approve each one and press Send. Nothing is sent automatically. Turn it on?'))) return;
      try { S = await api('POST', '/agents/mode', { agent: md.dataset.agent, mode: md.dataset.mode }); SEQ = S.seq || SEQ; renderAll(); } catch (err) { toast(err.message, true); } return; }
    const br = e.target.closest('[data-brief]'); if (br) { try { S = await api('POST', '/agents/mode', { brief: br.dataset.brief === 'on' }); renderAll(); } catch (err) { toast(err.message, true); } return; }
    const rn = e.target.closest('[data-run]'); if (rn) return runNow(rn.dataset.run, rn);
    if (e.target.closest('#openInsp') && TASK) return openInspector({ kind: 'draft', id: TASK });
  });
  document.addEventListener('keydown', e => { const r = e.target.closest && e.target.closest('li[data-task],.row[data-task]'); if (r && (e.key === 'Enter' || e.key === ' ') && e.target === r) { e.preventDefault(); TASK = r.dataset.task; openInspector({ kind: 'draft', id: TASK }); } });
  async function runNow(agentId, btn) {
    const b = btn || $('#runAll'), was = b.innerHTML; b.disabled = true; b.textContent = t('Running…');
    try { const d = await api('POST', '/agents/run', agentId ? { agent: agentId } : {}); const before = SEQ; S = d; SEQ = d.seq || SEQ;
      const evs = (d.events || []).filter(e => e.seq > before).sort((x, y) => x.seq - y.seq); evs.forEach(e => FRESH.add(e.seq)); renderAll(); animate(evs);
      const made = d.summary ? Object.values(d.summary).reduce((a, x) => a + (x.made || 0), 0) : 0;
      toast(d.busy ? t('Already running — showing the latest') : made ? made + ' ' + t(made === 1 ? 'new draft' : 'new drafts') : t('Nothing new — all caught up')); }
    catch (e) { toast(e.message, true); }
    finally { b.disabled = false; b.innerHTML = was; }
  }
  $('#runAll').addEventListener('click', () => runNow('', $('#runAll')));
  let qT = 0; $('#q').addEventListener('input', e => { clearTimeout(qT); qT = setTimeout(() => { Q = e.target.value.trim().toLowerCase(); const hit = Q && drafts().find(d => d.id === Q); if (hit) { TASK = hit.id; } renderTabs(); renderView(); }, 180); });
  // calm: fewer moving parts (a per-viewer preference, nothing sensitive)
  try { if (localStorage.getItem('ryst_cc_calm') === '1') document.documentElement.classList.add('calm'); } catch (x) {}
  $('#calmBtn').setAttribute('aria-pressed', String(document.documentElement.classList.contains('calm')));
  $('#calmBtn').addEventListener('click', () => { const on = document.documentElement.classList.toggle('calm'); $('#calmBtn').setAttribute('aria-pressed', String(on)); try { localStorage.setItem('ryst_cc_calm', on ? '1' : ''); } catch (x) {} if (VIEW === 'workflow') renderGraph(); });

  load().then(() => { CONN.timer = setTimeout(poll, 10e3); });
})();
