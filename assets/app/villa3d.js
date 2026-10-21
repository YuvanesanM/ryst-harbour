// RYST Harbour — Villa 3D: an operations view of the villa.
//
// The scene is a conceptual model (LAYOUT below — not a surveyed floor plan;
// edit it to match the real drawings). Everything it shows about the villa
// comes from the data Harbour already keeps, read with the signed-in user's
// own access:
//   /guest-register  bookings: dates, guests, bedrooms, channel, paid / due  (Bookings module)
//   /checklist       check-in, check-out and daily-round checklists, item by item  (Checklists)
//   /issues          maintenance issues: title, area, urgency, status, dates  (Checklists)
//   /inventory       stock below its restock level  (Inventory)
//   /metrics         booked / received / due for the chosen dates — the same
//                    definitions as the dashboard and the Telegram report  (Reports)
// Nothing is changed from here: every action opens the existing page for it.
import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/OrbitControls.js';

const PROXY = 'https://data.ryst.in';
const ls = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const TOKEN = ls('ryst_proxy_token') || '';
if (!TOKEN) location.href = 'login.html';
const ROLE = ls('ryst_user_role') || 'owner';
let MODS = []; try { MODS = JSON.parse(ls('ryst_user_modules') || '[]') || []; } catch (e) {}
const can = mod => ROLE === 'owner' || MODS.includes(mod);
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const t = s => (window.rystT ? window.rystT(s) : s);
const inr = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const todayISO = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmtDay = iso => iso ? new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';
const ago = ms => { const d = Math.floor((Date.now() - ms) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; };
const reduceMotion = () => document.documentElement.classList.contains('v3-still') || matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── The villa, room by room ──────────────────────────────────────────────────
// From the architect's layouts (Dreamour design, "Cheyyur villa": ground floor
// sheet 21 and the first floor), read off at their printed dimensions — metres,
// x east, z south (towards the road), origin near the stair. The second floor
// (Bedroom 4 over the north-east bedroom, the rest terrace) is from the owner.
// Which first-floor bedroom is "2" and which "3" follows west → east.
// `match` decides which checklist items and issues belong to a place (an
// issue's "area" and title are searched, most specific first). `bath` is the
// attached bathroom inside a bedroom; `open` places have no roof; `win` puts
// windows on that side (n/s/e/w).
const FLOOR_H = 3.2, PLINTH = 0.3;
const LAYOUT = [
  // ground floor (+2'6")
  { id: 'kitchen', name: 'Kitchen', floor: 0, x: -5.02, z: -6.19, w: 4.56, d: 3.97, win: 'n', note: 'Fully equipped', match: ['kitchen', 'fridge', 'stove', '\\bgas\\b', 'microwave', 'induction', 'utensil', 'cutlery'] },
  { id: 'dining', name: 'Dining', floor: 0, x: -5.02, z: -2.22, w: 4.56, d: 4.06, win: 'w', note: 'Folding doors to the deck', match: ['dining'] },
  { id: 'bed1', name: 'Bedroom 1', floor: 0, x: -5.02, z: 1.94, w: 4.56, d: 4.99, bath: [-5.02, 1.94, 2.35, 1.66], match: ['bedroom ?1\\b', '\\broom ?1\\b'] },
  { id: 'stairs', name: 'Stairs & lift', floor: 0, x: -0.28, z: -6.1, w: 4.62, d: 5.17, lift: [0.83, -4.43, 2.4, 2.22], note: 'The lift sits inside the stairwell', match: ['\\blift\\b', 'elevator', 'stair'] },
  { id: 'living', name: 'Living room', floor: 0, x: 4.56, z: -6.19, w: 3.47, d: 5.26, win: 'e', note: '65-inch TV', match: ['living', 'television', '\\btv\\b', 'sofa'] },
  { id: 'foyer', name: 'Foyer', floor: 0, x: 1.48, z: -0.65, w: 5.91, d: 1.94, note: 'Entrance', match: ['foyer', 'entrance', 'main door'] },
  { id: 'powder', name: 'Powder room', floor: 0, x: -0.46, z: -0.65, w: 1.75, d: 2.49, match: ['powder room'] },
  { id: 'ebroom', name: 'EB room', floor: 0, x: -0.24, z: 1.94, w: 1.53, d: 2.03, note: 'Electricity board / meters', match: ['\\beb\\b', 'electric(al)? (board|panel|room)', '\\bmeter', '\\bmcb\\b', 'db board'] },
  { id: 'store', name: 'Store room', floor: 0, x: -0.24, z: 4.06, w: 1.53, d: 2.86, match: ['store ?room', '\\bstore\\b'] },
  { id: 'lounge', name: 'Poolside lounge', floor: 0, x: -8.07, z: -6.28, w: 2.9, d: 13.21, note: 'Wood deck under the balcony', open: true, match: ['lounge', 'wood deck', 'verandah', 'sit-?out'] },
  // first floor
  { id: 'bed2', name: 'Bedroom 2', floor: 1, x: -5.17, z: -6.91, w: 4.89, d: 5.67, bath: [-5.17, -6.91, 2.54, 1.78], win: 'n', match: ['bedroom ?2\\b', '\\broom ?2\\b'] },
  { id: 'bed3', name: 'Bedroom 3', floor: 1, x: 4.58, z: -6.91, w: 4.29, d: 5.83, bath: [4.58, -6.91, 2.67, 1.78], win: 'e', match: ['bedroom ?3\\b', '\\broom ?3\\b'] },
  { id: 'stairs1', name: 'Stairs & lift', floor: 1, x: -0.28, z: -6.1, w: 4.62, d: 4.78, same: 'stairs' },
  { id: 'rec', name: 'Recreation room', floor: 1, x: -5.3, z: -1.24, w: 6.8, d: 8.23, win: 's', note: 'Table tennis, foosball, darts, board games', match: ['recreation', 'table tennis', 'foosball', 'dart', 'board game', 'carrom', '\\bgames?\\b'] },
  { id: 'balcony', name: 'Balcony', floor: 1, x: -8.3, z: -6.91, w: 2.92, d: 13.9, open: true, note: 'Along the pool side', match: ['balcony'] },
  { id: 'chess', name: 'Chess terrace', floor: 1, x: 1.5, z: -1.24, w: 7.78, d: 6.32, open: true, note: 'Open to the sky', match: ['chess', 'low terrace'] },
  // second floor
  { id: 'bed4', name: 'Bedroom 4', floor: 2, x: 4.58, z: -6.91, w: 4.29, d: 5.83, bath: [4.58, -6.91, 2.67, 1.78], win: 'e', match: ['bedroom ?4\\b', '\\broom ?4\\b'] },
  { id: 'stairs2', name: 'Stairs & lift', floor: 2, x: -0.28, z: -6.1, w: 4.62, d: 4.78, same: 'stairs' },
  // the rooftop runs west over the balcony to the top of the sloping street wall
  { id: 'terrace', name: 'Roof terrace', floor: 2, x: -8.3, z: -6.91, w: 7.98, d: 13.9, open: true, note: 'Roofs the balcony below', match: ['roof', 'top terrace', '\\bterrace\\b'] },
];
// Outdoors, from the same ground-floor sheet.
const OUTDOOR = [
  { id: 'pool', name: 'Swimming pool', x: -13.39, z: -2.86, w: 3.38, d: 6.65, note: '22 ft long, 1.3 ft to 4.5 ft deep', match: ['\\bpool\\b(?! deck)', 'swim', 'chlorine', 'skimm'] },
  { id: 'jacuzzi', name: 'Jacuzzi', x: -13.3, z: -2.77, w: 1.63, d: 1.57, note: 'North-west corner of the pool', match: ['jacuzzi', 'jaccuzi', '\\bspa\\b'] },
  { id: 'deck', name: 'Pool deck', x: -9.98, z: -3.69, w: 1.9, d: 8.13, note: '225 sq ft', match: ['pool deck', 'lounger', '\\bdeck\\b', 'pool towel', 'ashtray'] },
  { id: 'screen', name: 'Outdoor LED screen', x: -14.41, z: -1.23, w: 0.4, d: 3.4, note: '150-inch, on the west wall of the pool area', match: ['\\bled\\b', 'screen', 'projector'] },
  { id: 'counter', name: 'Food counter', x: -12.65, z: -7.67, w: 3.57, d: 2.77, note: 'Outdoor counter and toilet', match: ['food counter', '\\bbbq\\b', 'barbe', 'grill', 'outdoor toilet'] },
  { id: 'parking', name: 'Parking', x: 1.48, z: 1.29, w: 7.67, d: 8.5, note: 'Partly under the chess terrace; 5 ft and 14 ft gates', match: ['parking', '\\bcar\\b', '\\bgates?\\b', 'vehicle'] },
  { id: 'generator', name: 'Diesel generator', x: 7.76, z: 7.11, w: 1.39, d: 2.59, note: '35 kVA, south-east corner inside the gate', match: ['generator', '\\bd\\.?g\\b', 'diesel', 'genset'] },
  { id: 'garden', name: 'Garden & lawn', x: -14.13, z: 4.53, w: 8.87, d: 5.63, match: ['lawn', 'garden', 'grass', '\\btrees?\\b', 'plants?\\b', 'leaves', 'pebble', 'cactus'] },
];
// Villa-wide systems: issues and checks about the whole house.
const SYSTEMS = { id: 'systems', name: 'Villa systems', note: 'AC, Wi-Fi, power, water', match: ['\\ba\\.?c\\b', 'air ?con', 'wi-?fi', 'internet', 'power', 'inverter', '\\bups\\b', 'water tank', 'motor', 'electric', 'lights?\\b', 'fans?\\b'] };
const ZONES = [...LAYOUT.filter(z => !z.same), ...OUTDOOR, SYSTEMS];
const ZONE = Object.fromEntries(ZONES.map(z => [z.id, z]));
ZONES.forEach(z => { z.re = (z.match || []).map(m => new RegExp(m, 'i')); });
// Most specific first, so "pool deck" isn't the pool and "jacuzzi" isn't the pool.
const MATCH_ORDER = ['deck', 'jacuzzi', 'screen', 'counter', 'generator', 'ebroom', 'bed1', 'bed2', 'bed3', 'bed4', 'powder', 'pool', 'kitchen', 'dining', 'rec', 'living', 'chess', 'balcony', 'terrace', 'lounge', 'foyer', 'store', 'stairs', 'parking', 'garden', 'systems'];
const placeOf = id => LAYOUT.find(z => (z.same || z.id) === id) || OUTDOOR.find(z => z.id === id) || null;
function zoneOfText(text) {
  const s = String(text || '');
  for (const id of MATCH_ORDER) if (ZONE[id].re.some(r => r.test(s))) return id;
  return '';
}
// "Bedroom 2 toilet — …" belongs to Bedroom 2 (its attached bathroom).
function zonesOfItem(text) {
  const s = String(text || ''), out = new Set();
  const bed = /bedroom ?(\d)/i.exec(s); if (bed && ZONE['bed' + bed[1]]) out.add('bed' + bed[1]);
  if (/pool\s*&\s*jacuzzi|pool and jacuzzi/i.test(s)) { out.add('pool'); out.add('jacuzzi'); }
  if (!out.size) { const z = zoneOfText(s); if (z) out.add(z); }
  return [...out];
}

// ── Data ─────────────────────────────────────────────────────────────────────
const D = {}, ERR = {};
async function get(path, key) {
  try {
    const r = await fetch(PROXY + path, { headers: { 'X-Token': TOKEN }, cache: 'no-store' });
    if (r.status === 401) { location.href = 'login.html'; return; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(r.status === 403 ? 'No access' : j.error || 'Could not load (' + r.status + ')');
    D[key] = j; delete ERR[key];
  } catch (e) { ERR[key] = e.message || 'Could not load'; }
}
const RANGE = { kind: 'today', from: todayISO(), to: todayISO() };
let LAYER = 'all';
function setRange(kind, from, to) {
  const T = todayISO();
  RANGE.kind = kind;
  if (kind === 'today') { RANGE.from = T; RANGE.to = T; }
  else if (kind === 'week') { RANGE.from = T; RANGE.to = addDays(T, 6); }
  else if (kind === 'month') { RANGE.from = T.slice(0, 8) + '01'; RANGE.to = addDays(addDays(T.slice(0, 8) + '28', 4).slice(0, 8) + '01', -1); }
  else { RANGE.from = from; RANGE.to = to; }
}
async function loadAll() {
  const jobs = [];
  if (can('guestRegister')) jobs.push(get('/guest-register', 'reg'));
  if (can('checklist')) { jobs.push(get('/checklist', 'cl')); jobs.push(get('/issues', 'issues')); }
  if (can('inventory')) jobs.push(get('/inventory', 'inv'));
  if (ROLE === 'owner') jobs.push(get('/team', 'team')); // caretaker names (owner only)
  jobs.push(loadMetrics());
  await Promise.all(jobs);
  DERIVED = derive();
  renderAll();
}
async function loadMetrics() {
  if (!can('reports')) return;
  await get(`/metrics?from=${RANGE.from}&to=${RANGE.to}`, 'metrics');
}

// Bookings that hold the villa (unpaid quotes are drafts, not stays).
const stays = () => ((D.reg && D.reg.entries) || []).filter(e => e.checkin && e.checkout && e.stayStatus !== 'unconfirmed');
const runs = () => (D.cl && Array.isArray(D.cl.runs) ? D.cl.runs : []);
const openIssues = () => ((D.issues && D.issues.issues) || []).filter(i => i.status !== 'fixed')
  .sort((a, b) => (b.urgency === 'urgent') - (a.urgency === 'urgent') || a.reportedAt - b.reportedAt);
const lowStock = () => ((D.inv && D.inv.items) || []).filter(i => +i.threshold > 0 && +i.quantity <= +i.threshold);
// The checklist run for a booking, matched the way the checklist page links them.
const runFor = (stay, type) => runs().filter(r => r.type === type && (r.stayNo ? r.stayNo === stay.no : r.guest === stay.guest && r.date >= addDays(stay.checkin, -3) && r.date <= stay.checkout))
  .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))[0] || null;
const dailyRun = () => runs().filter(r => r.type === 'daily' && r.date === todayISO()).sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))[0] || null;

let DERIVED = null;
function derive() {
  const T = todayISO(), all = stays();
  const inHouse = all.find(s => s.checkin <= T && s.checkout > T) || null;
  const leavingToday = all.find(s => s.checkout === T) || null;
  const next = all.filter(s => s.checkin > T || (s.checkin === T && s !== inHouse)).sort((a, b) => a.checkin.localeCompare(b.checkin))[0] || (inHouse && inHouse.checkin === T ? inHouse : null);
  const arrivals = all.filter(s => s.checkin >= RANGE.from && s.checkin <= RANGE.to);
  const departures = all.filter(s => s.checkout >= RANGE.from && s.checkout <= RANGE.to);
  const inRange = all.filter(s => s.checkin <= RANGE.to && s.checkout > RANGE.from);
  // housekeeping, place by place: the check-in checklist for the stay being
  // prepared (in house now, or the next arrival), plus today's daily rounds
  const prepFor = inHouse && inHouse.checkin !== T ? null : next;
  const ciRun = prepFor ? runFor(prepFor, 'checkin') : null;
  const coRun = leavingToday ? runFor(leavingToday, 'checkout') : null;
  const daily = dailyRun();
  const hk = {};
  const add = (run, kind) => (run ? run.items || [] : []).forEach(it => zonesOfItem(it.text).forEach(z => { (hk[z] = hk[z] || { checkin: [], daily: [] })[kind].push(it); }));
  add(ciRun, 'checkin'); add(daily, 'daily');
  // issues, place by place (an issue is placed by the words in its area and title)
  const iss = {}, unplaced = [];
  openIssues().forEach(i => { const z = zoneOfText((i.area || '') + ' ' + i.title) || ''; if (z) (iss[z] = iss[z] || []).push(i); else unplaced.push(i); });
  const stock = {};
  const CAT = { 'Pool & Maintenance': 'pool', 'Kitchen & Pantry': 'kitchen', 'Linen & Bedding': 'bed', 'Gas & Fuel': 'kitchen' };
  lowStock().forEach(i => { const z = CAT[i.category] || ''; if (z) (stock[z] = stock[z] || []).push(i); });
  const checklistsDue = arrivals.filter(s => { const r = runFor(s, 'checkin'); return !r || r.status !== 'completed'; });
  return { T, inHouse, leavingToday, next, prepFor, ciRun, coRun, daily, hk, iss, unplaced, stock, arrivals, departures, inRange, checklistsDue };
}

// What we can honestly say about a place right now — each from a named source.
// key: occupied | checkout | preparing | ready | attention | notprepared | idle | untracked
function zoneState(id) {
  const d = DERIVED; if (!d) return { key: 'untracked', label: 'Loading…' };
  const issues = d.iss[id] || [];
  const bed = /^bed\d$/.test(id);
  const hk = d.hk[id];
  const ci = hk && hk.checkin.length ? hk.checkin : null;
  const done = ci ? ci.filter(i => i.checked).length : 0;
  if (issues.some(i => i.urgency === 'urgent')) return { key: 'attention', label: 'Urgent issue open' };
  if (bed && d.inHouse) return { key: 'occupied', label: 'Guests in house' };
  if (bed && d.leavingToday && !(d.coRun && d.coRun.status === 'completed')) return { key: 'checkout', label: 'Check-out today' };
  if (issues.length) return { key: 'attention', label: issues.length + ' open issue' + (issues.length > 1 ? 's' : '') };
  if (ci && d.prepFor) {
    if (done === ci.length) return { key: 'ready', label: 'Ready for ' + fmtDay(d.prepFor.checkin) };
    return { key: 'preparing', label: `Being prepared · ${done}/${ci.length}` };
  }
  if (!can('checklist')) return { key: 'untracked', label: 'Not tracked' };
  if (d.prepFor && (bed || ZONE[id] && hk)) return { key: 'notprepared', label: 'Not prepared yet' };
  const dl = hk && hk.daily.length ? hk.daily : null;
  if (dl) { const dd = dl.filter(i => i.checked).length; return dd === dl.length ? { key: 'ready', label: 'Checked today' } : { key: 'preparing', label: `Daily rounds · ${dd}/${dl.length}` }; }
  if (!d.prepFor && !d.inHouse && bed) return { key: 'idle', label: 'No arrival to prepare' };
  return { key: 'untracked', label: 'No checklist covers it' };
}
const STATE_STYLE = {
  occupied: { color: 0x3c6e8f, text: 'Guests in house', icon: '●' },
  checkout: { color: 0xb07a2a, text: 'Check-out today', icon: '↗' },
  preparing: { color: 0xc49a3e, text: 'Being prepared', icon: '◐' },
  ready: { color: 0x3d8b68, text: 'Ready / checked', icon: '✓' },
  attention: { color: 0xb5503f, text: 'Issue open', icon: '!' },
  notprepared: { color: 0x9b8f7d, text: 'Not prepared yet', icon: '○' },
  idle: { color: 0xb9b2a5, text: 'No arrival to prepare', icon: '–' },
  untracked: { color: 0xc9c3b8, text: 'Not tracked', icon: '?' },
};

// ── Scene ────────────────────────────────────────────────────────────────────
const stage = $('#stage'), labelsEl = $('#labels');
let renderer, scene, camera, controls, clock, VIEW = 'overview', FLOOR = 1, EVENING = false, selected = null;
const pickables = [], tiles = {}, groups = {}, animated = [];
let needRender = true, running = false;

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
}
const M = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o || {}));
const MAT = {
  ground: M(0xe7dcc6), sand: M(0xead9b4), lawn: M(0x9fb48a), path: M(0xd8cfbf), road: M(0x8d8a84),
  wall: M(0xf6f2ea), rail: M(0xb9cdd4, { roughness: 0.15, transparent: true, opacity: 0.28, depthWrite: false }), wallIn: M(0xefe9df), trim: M(0xdedbd3), glass: M(0x9fb8c4, { roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.55 }),
  win: M(0x2c3b45, { roughness: 0.3, emissive: 0x000000 }), gate: M(0x23272b, { roughness: 0.6 }), slab: M(0xe9e4da),
  wood: M(0xa27b56), dark: M(0x3a3f44), fabric: M(0xe3dccf), bed: M(0xf4f1ea), bedHead: M(0x8b7a66), cushion: M(0xc9b79c),
  poolTile: M(0x9cc9cf), water: new THREE.MeshStandardMaterial({ color: 0x3fa3b3, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.82 }),
  sea: new THREE.MeshStandardMaterial({ color: 0x2f8796, roughness: 0.25, transparent: true, opacity: 0.92 }),
  trunk: M(0x8a6a4c), frond: M(0x5f8a52), rock: M(0xa9a59d), screen: M(0x101418, { roughness: 0.2, emissive: 0x0a1a24 }),
  lamp: new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
};
function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  (parent || scene).add(m); return m;
}

function initScene() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  const small = Math.min(innerWidth, innerHeight) < 700;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  stage.insertBefore(renderer.domElement, stage.firstChild);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(26, 1, 1, 400);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.09;
  controls.minDistance = 18; controls.maxDistance = 120; controls.maxPolarAngle = Math.PI * 0.47;
  controls.target.set(0, 1.5, -3);
  controls.addEventListener('change', () => { needRender = true; kick(); });
  clock = new THREE.Clock();
  lights();
  buildSite(); buildHouse(); buildOutdoors();
  setView('overview', true);
  // arrive from high over the sea, swinging round to the road side
  if (!reduceMotion()) { camera.position.set(55, 70, -60); controls.target.set(-2, 0, 1); controls.update(); flyTo(VIEWS.overview.pos, VIEWS.overview.target, false, 2.4); }
  resize();
  new ResizeObserver(resize).observe(stage);
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerleave', () => setHover(null));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  kick();
}
let hemi, sun, fill;
function lights() {
  hemi = new THREE.HemisphereLight(0xfdf6ea, 0xb9a98c, 1.6); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
  sun.position.set(-22, 34, 18); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 5, far: 90 });
  sun.shadow.bias = -0.0006; scene.add(sun);
  fill = new THREE.DirectionalLight(0xdfe9ef, 0.5); fill.position.set(20, 15, -20); scene.add(fill);
  applyLighting();
}
const evenLamps = [];
function applyLighting() {
  scene.background = new THREE.Color(EVENING ? 0x16233a : 0xe9e2d4);
  scene.fog = new THREE.Fog(scene.background, 90, 200);
  hemi.intensity = EVENING ? 0.55 : 1.6; hemi.color.set(EVENING ? 0x8ea3c8 : 0xfdf6ea);
  sun.intensity = EVENING ? 0.35 : 2.4; sun.color.set(EVENING ? 0x9fb3d9 : 0xfff1dc);
  fill.intensity = EVENING ? 0.25 : 0.5;
  MAT.win.emissive.set(EVENING ? 0xffc977 : 0x000000); MAT.win.emissiveIntensity = EVENING ? 0.9 : 0;
  MAT.water.emissive = new THREE.Color(EVENING ? 0x1b6f86 : 0x000000);
  evenLamps.forEach(l => { l.visible = EVENING; });
  needRender = true;
}

const PLOT = { x: -14.41, z: -7.85, w: 24.38, d: 18.1 };
const lvl = f => PLINTH + f * FLOOR_H; // the floor surface of each storey
function buildSite() {
  const g = new THREE.Group(); scene.add(g); groups.site = g;
  const cx = PLOT.x + PLOT.w / 2, cz = PLOT.z + PLOT.d / 2;
  const flat = (w, d, mat, x, z, y) => { const m = box(w, 0.06, d, mat, x, y || 0.03, z, g); m.castShadow = false; return m; };
  box(70, 0.4, 56, MAT.ground, cx + 8, -0.21, cz, g).castShadow = false;
  flat(PLOT.w, PLOT.d, M(0xe9e1d0), cx, cz, 0.0);
  // lawns and the pebble bed, as on the ground-floor sheet
  flat(8.87, 5.63, MAT.lawn, -9.7, 7.35); flat(5.9, 1.2, MAT.lawn, -11.2, -4.3); flat(3.8, 1.5, MAT.lawn, -6.4, -7.1); flat(0.7, 6.65, M(0xc9c0ae), -13.95, 0.47);
  flat(7.67, 8.5, MAT.path, 5.32, 5.54); // paved drive
  flat(1.66, 2.03, MAT.path, 0.09, 8.78); // front steps path
  // road to the south, the coast to the east (Pearl Beach)
  box(90, 0.1, 7, MAT.road, cx + 8, 0.0, 14.4, g).castShadow = false;
  box(90, 0.2, 0.4, MAT.trim, cx + 8, 0.1, 10.8, g).castShadow = false;
  box(14, 0.3, 80, MAT.sand, 30, -0.2, cz, g).castShadow = false;
  const seaGeo = new THREE.PlaneGeometry(70, 110, 24, 30); seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(seaGeo, MAT.sea); sea.position.set(72, -0.3, cz); sea.receiveShadow = true; g.add(sea);
  animated.push({ kind: 'waves', mesh: sea, base: seaGeo.attributes.position.array.slice(), amp: 0.12, speed: 0.6 });
  // compound walls: the perforated screen along the road, the black gates (5 ft and 14 ft)
  box(16.3, 1.3, 0.3, MAT.wall, -6.25, 0.65, 10.1, g);
  const scr = box(16.3, 1.0, 0.1, M(0xf3f0ea, { transparent: true, opacity: 0.8 }), -6.25, 1.8, 10.1, g); scr.castShadow = false;
  box(1.48, 2.2, 0.15, MAT.gate, 2.77, 1.1, 10.2, g); gate14 = box(4.25, 2.2, 0.15, MAT.gate, 6.55, 1.1, 10.2, g); // the 14 ft gate slides open along the road when the guests drive in
  box(0.3, 2.3, 0.3, MAT.wall, 1.85, 1.15, 10.1, g); box(0.3, 2.3, 0.3, MAT.wall, 3.65, 1.15, 10.1, g); box(0.3, 2.3, 0.3, MAT.wall, 9.8, 1.15, 10.1, g);
  box(0.3, 1.6, PLOT.d, MAT.wall, PLOT.x, 0.8, cz, g); box(0.3, 1.6, PLOT.d, MAT.wall, PLOT.x + PLOT.w, 0.8, cz, g); box(PLOT.w, 1.6, 0.3, MAT.wall, cx, 0.8, PLOT.z, g);
  // the name sign and wall lights (evening)
  box(2.2, 0.45, 0.06, MAT.dark, -1.3, 0.9, 10.27, g).castShadow = false;
  [-10, -5.5, -2.5].forEach(x => { const l = box(0.2, 0.12, 0.12, MAT.lamp, x, 1.2, 10.28, g); l.castShadow = false; evenLamps.push(l); });
}
function walls(z, parent, y0, open) {
  // four low walls around a room in the cutaway (railings for open places)
  const { x, w, d } = z, zz = z.z, th = 0.12, H = open ? 1.0 : 1.15, m = open ? MAT.rail : MAT.wallIn;
  box(w, H, th, m, x + w / 2, y0 + H / 2, zz, parent); box(w, H, th, m, x + w / 2, y0 + H / 2, zz + d, parent);
  box(th, H, d, m, x, y0 + H / 2, zz + d / 2, parent); box(th, H, d, m, x + w, y0 + H / 2, zz + d / 2, parent);
}
function furniture(zone, parent, y0) {
  const cx = zone.x + zone.w / 2, cz = zone.z + zone.d / 2;
  if (zone.bath) {
    const [bx, bz, bw, bd] = zone.bath; // attached bathroom
    box(bw, 0.04, bd, M(0xd6e3e6), bx + bw / 2, y0 + 0.04, bz + bd / 2, parent).castShadow = false;
    box(bw, 1.15, 0.1, MAT.wallIn, bx + bw / 2, y0 + 0.58, bz + bd, parent);
    box(0.1, 1.15, bd, MAT.wallIn, bx + bw, y0 + 0.58, bz + bd / 2, parent);
    const by = cz + bd / 2; // the bed below the bathroom
    box(2.0, 0.45, 2.2, MAT.bed, cx + 0.3, y0 + 0.25, by, parent);
    box(0.15, 1.0, 2.1, MAT.bedHead, zone.x + 0.25, y0 + 0.5, by, parent);
    box(0.4, 0.18, 1.6, MAT.cushion, zone.x + 0.6, y0 + 0.55, by, parent);
    box(2.0, 0.45, 2.2, MAT.bed, cx + 0.3, y0 + 0.25, by, parent).rotation.y = Math.PI / 2;
  } else if (zone.id === 'living') {
    box(0.9, 0.5, 3.0, MAT.fabric, cx - 0.6, y0 + 0.3, cz, parent);
    box(0.7, 0.35, 1.2, MAT.wood, cx + 0.4, y0 + 0.2, cz, parent);
    box(0.06, 0.92, 1.6, MAT.screen, zone.x + zone.w - 0.15, y0 + 1.3, cz, parent); // 65" TV
  } else if (zone.id === 'dining') {
    box(1.1, 0.08, 2.6, MAT.wood, cx, y0 + 0.75, cz, parent);
    [-1, -0.35, 0.35, 1].forEach(dz => { box(0.4, 0.5, 0.4, MAT.fabric, cx - 0.85, y0 + 0.25, cz + dz, parent); box(0.4, 0.5, 0.4, MAT.fabric, cx + 0.85, y0 + 0.25, cz + dz, parent); });
  } else if (zone.id === 'kitchen') {
    box(zone.w - 0.6, 0.9, 0.65, MAT.trim, cx, y0 + 0.45, zone.z + 0.45, parent);
    box(0.65, 0.9, zone.d - 1.2, MAT.trim, zone.x + zone.w - 0.45, y0 + 0.45, cz + 0.3, parent);
    box(2.2, 0.9, 0.9, MAT.trim, cx - 0.4, y0 + 0.45, cz + 0.5, parent);
  } else if (zone.id === 'rec') {
    box(2.7, 0.08, 1.5, M(0x2f5f6e), cx - 1.2, y0 + 0.76, cz + 1, parent); // table tennis
    box(0.05, 0.16, 1.5, MAT.trim, cx - 1.2, y0 + 0.88, cz + 1, parent);
    box(1.2, 0.85, 0.7, MAT.wood, cx + 1.8, y0 + 0.43, cz - 2, parent); // foosball
    box(0.05, 0.55, 0.55, M(0x5b3b2e), zone.x + zone.w - 0.1, y0 + 1.5, cz + 2.5, parent); // darts
    box(3.0, 0.45, 0.9, MAT.fabric, cx, y0 + 0.25, zone.z + zone.d - 0.8, parent);
  } else if (zone.id === 'chess') {
    box(0.9, 0.06, 0.9, MAT.wood, cx - 1.5, y0 + 0.7, cz + 1, parent); box(0.12, 0.7, 0.12, MAT.wood, cx - 1.5, y0 + 0.35, cz + 1, parent);
    box(2.6, 0.45, 0.8, MAT.fabric, cx + 1.2, y0 + 0.25, cz + 2.2, parent);
  } else if (zone.id === 'terrace') {
    for (let i = 0; i < 3; i++) box(0.7, 0.3, 1.9, MAT.fabric, zone.x + 1 + i * 1.2, y0 + 0.2, zone.z + zone.d - 3, parent);
  } else if (zone.id === 'lounge') {
    for (let i = 0; i < 3; i++) box(0.8, 0.4, 0.8, MAT.fabric, zone.x + 1.2, y0 + 0.2, zone.z + 3 + i * 3.2, parent);
    box(0.9, 0.35, 0.9, MAT.wood, zone.x + 2.2, y0 + 0.18, zone.z + 6, parent);
  } else if (zone.id === 'powder') {
    box(0.5, 0.8, 0.5, M(0xd6e3e6), cx, y0 + 0.4, zone.z + 0.4, parent);
  } else if (zone.id === 'ebroom') {
    box(0.9, 1.6, 0.25, MAT.dark, cx, y0 + 0.8, zone.z + 0.2, parent);
  } else if (zone.id === 'store') {
    box(0.5, 1.8, zone.d - 0.6, MAT.wood, zone.x + 0.35, y0 + 0.9, cz, parent);
  }
  if (zone.lift) { const [lx, lz, lw, ld] = zone.lift; box(lw - 0.4, FLOOR_H - 0.3, ld - 0.4, MAT.dark, lx + lw / 2, y0 + (FLOOR_H - 0.3) / 2, lz + ld / 2, parent); }
  if (/^stairs/.test(zone.id) || zone.same === 'stairs') { // flights either side of the lift
    for (let i = 0; i < 8; i++) { box(0.9, 0.18 * (i + 1), 0.28, MAT.trim, zone.x + 0.6, y0 + 0.09 * (i + 1), zone.z + zone.d - 0.4 - i * 0.28, parent); box(0.9, 0.18 * (i + 1), 0.28, MAT.trim, zone.x + zone.w - 0.6, y0 + 0.09 * (i + 1), zone.z + zone.d - 0.4 - i * 0.28, parent); }
  }
}
function windowsOn(z, parent, y0) {
  const sides = (z.win || '').split(''), h = 1.5, y = y0 + 1.55;
  sides.forEach(sd => {
    if (sd === 'n') box(z.w * 0.6, h, 0.08, MAT.win, z.x + z.w / 2, y, z.z - 0.03, parent);
    if (sd === 's') box(z.w * 0.6, h, 0.08, MAT.win, z.x + z.w / 2, y, z.z + z.d + 0.03, parent);
    if (sd === 'e') box(0.08, h, z.d * 0.55, MAT.win, z.x + z.w + 0.03, y, z.z + z.d / 2, parent);
    if (sd === 'w') box(0.08, h + 0.5, z.d * 0.6, MAT.win, z.x - 0.03, y - 0.25, z.z + z.d / 2, parent);
  });
}
function buildHouse() {
  const ext = new THREE.Group(), cut = [0, 1, 2].map(() => new THREE.Group());
  scene.add(ext); cut.forEach(c => scene.add(c));
  groups.exterior = ext; groups.cut = cut; groups.slabs = [];
  // ── outside: each enclosed room as a solid block (so the shape follows the
  // plans), roofs, railings on the open places, windows
  LAYOUT.forEach(z => {
    const y0 = lvl(z.floor);
    if (z.open) {
      if (z.floor > 0) { const s = box(z.w, 0.22, z.d, MAT.slab, z.x + z.w / 2, y0 - 0.11, z.z + z.d / 2, ext); s.receiveShadow = true; }
      const rail = z.id === 'lounge' ? null : MAT.rail;
      if (rail) { box(z.w, 1.0, 0.06, rail, z.x + z.w / 2, y0 + 0.5, z.z + z.d, ext); box(0.06, 1.0, z.d, rail, z.id === 'balcony' || z.id === 'terrace' ? z.x : z.x + z.w, y0 + 0.5, z.z + z.d / 2, ext); }
      return;
    }
    if (z.id === 'rec') return; // drawn below with its angled street wall
    box(z.w, FLOOR_H, z.d, MAT.wall, z.x + z.w / 2, y0 + FLOOR_H / 2, z.z + z.d / 2, ext);
    windowsOn(z, ext, y0);
  });
  // the recreation room and the street façade from the photo: one broad white
  // wall rising from the ground to the second-floor roof, its west edge one
  // clean slope out to the end of the extended rooftop, with the lit window band
  const R = ZONE.rec, y1 = lvl(1), T = ZONE.terrace, top = lvl(2) + 0.35;
  box(R.w, FLOOR_H, R.d, MAT.wall, R.x + R.w / 2, y1 + FLOOR_H / 2, R.z + R.d / 2, ext);
  const ang = new THREE.Shape(); ang.moveTo(T.x + 1.7, 0); ang.lineTo(R.x + R.w, 0); ang.lineTo(R.x + R.w, top); ang.lineTo(T.x, top); ang.closePath();
  const ag = new THREE.ExtrudeGeometry(ang, { depth: 1.6, bevelEnabled: false }); ag.translate(0, 0, R.z + R.d - 1.6);
  const am = new THREE.Mesh(ag, MAT.wall); am.castShadow = am.receiveShadow = true; ext.add(am);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(ag, 20), new THREE.LineBasicMaterial({ color: 0xbdb5a6 })); ext.add(edge); // so the slope reads in flat light
  box(R.w * 0.62, 1.5, 0.08, MAT.win, R.x + R.w * 0.45, y1 + 1.5, R.z + R.d + 0.04, ext);
  for (let i = 0; i < 5; i++) box(0.05, 1.5, 0.1, MAT.trim, R.x + R.w * 0.14 + i * (R.w * 0.155), y1 + 1.5, R.z + R.d + 0.06, ext);
  for (let i = 0; i < 4; i++) { const l = box(0.18, 0.08, 0.18, MAT.lamp, R.x + R.w * 0.22 + i * R.w * 0.155, y1 + 2.45, R.z + R.d + 0.08, ext); l.castShadow = false; evenLamps.push(l); }
  // roofs over each storey's rooms (flat; the chess terrace and balcony stay open)
  LAYOUT.filter(z => !z.open && z.floor < 2 && !LAYOUT.some(u => u.floor === z.floor + 1 && !u.open && u.x < z.x + z.w - 0.2 && u.x + u.w > z.x + 0.2 && u.z < z.z + z.d - 0.2 && u.z + u.d > z.z + 0.2))
    .forEach(z => box(z.w + 0.2, 0.2, z.d + 0.2, MAT.slab, z.x + z.w / 2, lvl(z.floor) + FLOOR_H + 0.1, z.z + z.d / 2, ext));
  LAYOUT.filter(z => z.floor === 2 && !z.open).forEach(z => box(z.w + 0.3, 0.25, z.d + 0.3, MAT.slab, z.x + z.w / 2, lvl(2) + FLOOR_H + 0.12, z.z + z.d / 2, ext));
  // carport posts under the chess terrace, and its downlights
  const C = ZONE.chess;
  [[C.x + C.w - 0.2, C.z + C.d - 0.2], [C.x + 3.5, C.z + C.d - 0.2]].forEach(([x, z]) => box(0.3, FLOOR_H, 0.3, MAT.wall, x, PLINTH + FLOOR_H / 2, z, ext));
  [C.x + 2.5, C.x + 4.5, C.x + 6.5].forEach(x => { const l = box(0.25, 0.06, 0.25, MAT.lamp, x, lvl(1) - 0.25, C.z + C.d - 1.5, ext); l.castShadow = false; evenLamps.push(l); });
  // the plinth under the house
  box(14.2, PLINTH, 14.3, MAT.slab, 1.05, PLINTH / 2, -0.6, scene);
  // ── inside, floor by floor (each floor tile is the place you can select)
  LAYOUT.forEach(z => {
    const parent = cut[z.floor], y0 = lvl(z.floor);
    const zone = z.same ? Object.assign({}, z, { id: z.same, lift: ZONE.stairs.lift }) : z;
    const tile = new THREE.Mesh(new THREE.BoxGeometry(z.w - 0.08, 0.08, z.d - 0.08), M(z.open ? 0xd9cdb6 : 0xe6dfd2));
    tile.position.set(z.x + z.w / 2, y0 + 0.04, z.z + z.d / 2); tile.receiveShadow = true;
    tile.userData.zone = zone.id; parent.add(tile); pickables.push(tile);
    (tiles[zone.id] = tiles[zone.id] || []).push(tile);
    if (z.id !== 'lounge') walls(z, parent, y0, z.open);
    furniture(zone, parent, y0);
  });
}
const palms = [];
let car = null, gate14 = null; const CAR_PARK = 3.6, CAR_ROAD = 22, CAR_X = 4.2, GATE_X = 6.55;
function palm(x, z, h, parent) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g); palms.push(g);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, h, 7), MAT.trunk);
  trunk.position.y = h / 2; trunk.rotation.z = 0.06; trunk.castShadow = true; g.add(trunk);
  const crown = new THREE.Group(); crown.position.y = h; g.add(crown);
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.6, 4, 1), MAT.frond);
    f.geometry.translate(0, 1.3, 0); f.rotation.set(1.25, (i / 7) * Math.PI * 2, 0, 'YXZ'); f.castShadow = true; crown.add(f);
  }
  animated.push({ kind: 'sway', obj: crown, phase: Math.random() * 6, amp: 0.05 });
}
function pick(mesh, id) { mesh.userData.zone = id; pickables.push(mesh); return mesh; }
function buildOutdoors() {
  const g = new THREE.Group(); scene.add(g); groups.out = g;
  // pool (22 ft, shallow ledge to the north-east) with the jacuzzi in its north-west corner
  const P = ZONE.pool, J = ZONE.jacuzzi;
  box(P.w + 0.9, 0.35, P.d + 0.9, MAT.trim, P.x + P.w / 2, 0.17, P.z + P.d / 2, g);
  box(P.w, 0.3, P.d, MAT.poolTile, P.x + P.w / 2, 0.2, P.z + P.d / 2, g).castShadow = false;
  const wGeo = new THREE.PlaneGeometry(P.w, P.d, 12, 24); wGeo.rotateX(-Math.PI / 2);
  const water = pick(new THREE.Mesh(wGeo, MAT.water), 'pool'); water.position.set(P.x + P.w / 2, 0.37, P.z + P.d / 2); g.add(water);
  animated.push({ kind: 'waves', mesh: water, base: wGeo.attributes.position.array.slice(), amp: 0.025, speed: 1.4 });
  box(J.w + 0.1, 0.5, 0.15, MAT.trim, J.x + J.w / 2, 0.42, J.z + J.d, g); box(0.15, 0.5, J.d + 0.1, MAT.trim, J.x + J.w, 0.42, J.z + J.d / 2, g);
  const jw = pick(box(J.w - 0.1, 0.05, J.d - 0.1, MAT.water, J.x + J.w / 2, 0.55, J.z + J.d / 2, g), 'jacuzzi'); jw.castShadow = false;
  // pool deck (wood) with loungers
  const Dk = ZONE.deck; pick(box(Dk.w, 0.08, Dk.d, MAT.wood, Dk.x + Dk.w / 2, 0.36, Dk.z + Dk.d / 2, g), 'deck');
  for (let i = 0; i < 3; i++) box(0.7, 0.3, 1.8, MAT.fabric, Dk.x + Dk.w / 2, 0.55, Dk.z + 1.5 + i * 2.2, g);
  // the 150-inch screen between the jacuzzi and the food counter, facing the pool
  // the 150-inch screen on the west wall of the pool area, facing the pool
  const S = ZONE.screen;
  box(0.35, 3.0, S.d + 0.8, MAT.wall, S.x + 0.18, 1.5, S.z + S.d / 2, g);
  pick(box(0.1, 1.9, S.d, MAT.screen, S.x + 0.4, 1.9, S.z + S.d / 2, g), 'screen');
  // food counter and outdoor toilet
  const Fc = ZONE.counter;
  pick(box(Fc.w * 0.5, 2.6, Fc.d, MAT.wall, Fc.x + Fc.w * 0.25, 1.3, Fc.z + Fc.d / 2, g), 'counter');
  pick(box(Fc.w * 0.5, 0.95, 0.7, MAT.trim, Fc.x + Fc.w * 0.75, 0.48, Fc.z + Fc.d - 0.5, g), 'counter');
  box(Fc.w * 0.55, 0.12, Fc.d + 0.3, MAT.slab, Fc.x + Fc.w * 0.72, 2.7, Fc.z + Fc.d / 2, g);
  // parking: drive, a car under the terrace
  const Pk = ZONE.parking; pick(box(Pk.w, 0.04, Pk.d, MAT.path, Pk.x + Pk.w / 2, 0.07, Pk.z + Pk.d / 2, g), 'parking');
  // the guests' car: parked only while a stay is in house (it drives in on check-in day)
  car = new THREE.Group(); g.add(car); car.position.set(CAR_X, 0, CAR_PARK);
  box(1.9, 0.7, 4.2, M(0x5c6870, { roughness: 0.4 }), 0, 0.55, 0, car); box(1.7, 0.55, 2.2, M(0x2a3238, { roughness: 0.3 }), 0, 1.15, -0.2, car);
  [[-0.95, -1.3], [0.95, -1.3], [-0.95, 1.3], [0.95, 1.3]].forEach(([x, z]) => box(0.2, 0.5, 0.5, MAT.dark, x, 0.3, z, car));
  car.visible = false;
  // jacuzzi bubbles
  const BN = 26, bub = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }), BN);
  bub.castShadow = false; g.add(bub);
  animated.push({ kind: 'bubbles', mesh: bub, n: BN, seeds: Array.from({ length: BN }, (_, i) => [J.x + 0.15 + ((i * 53) % 97) / 97 * (J.w - 0.3), J.z + 0.15 + ((i * 31) % 89) / 89 * (J.d - 0.3), ((i * 17) % 23) / 23]) });
  // the 35 kVA diesel generator, south-east corner inside the gate
  const Gn = ZONE.generator;
  pick(box(Gn.w, 1.5, Gn.d, M(0x5d6b5f, { roughness: 0.55 }), Gn.x + Gn.w / 2, 0.8, Gn.z + Gn.d / 2, g), 'generator');
  box(Gn.w * 0.6, 0.1, 0.3, MAT.dark, Gn.x + Gn.w / 2, 1.6, Gn.z + 0.4, g);
  // garden pick area
  const gd = ZONE.garden, gp = new THREE.Mesh(new THREE.BoxGeometry(gd.w, 0.08, gd.d), new THREE.MeshBasicMaterial({ visible: false }));
  gp.position.set(gd.x + gd.w / 2, 0.08, gd.z + gd.d / 2); g.add(pick(gp, 'garden'));
  // palms and shrubs (the hedge along the drive, as drawn)
  [[-13.6, -7, 6.2], [-13.7, 5.2, 5.6], [-12.2, 9.3, 6], [-6.2, -7.3, 5.4], [-13.8, 9.5, 5.8]].forEach(([x, z, h]) => palm(x, z, h, g));
  const pts = [];
  for (let z = 1.6; z < 9.8; z += 0.75) pts.push([9.55, z]);
  for (let x = -4.8; x < -0.6; x += 0.62) pts.push([x, 7.25]);
  [[-11, -4.4], [-12.6, -4.4], [-9.4, -7.2], [-7.6, -7.2]].forEach(p => pts.push(p));
  const shrubs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.42, 0), M(0x6f8f5c), pts.length), m4 = new THREE.Matrix4();
  pts.forEach(([x, z], i) => { const s = 0.85 + ((i * 37) % 10) / 40; m4.compose(new THREE.Vector3(x, 0.35 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); shrubs.setMatrixAt(i, m4); });
  shrubs.castShadow = true; g.add(shrubs);
  // pool lights (evening)
  [[P.x + 0.2, P.z + 2.5], [P.x + 0.2, P.z + 5.5], [P.x + P.w - 0.2, P.z + 2.5], [P.x + P.w - 0.2, P.z + 5.5]].forEach(([x, z]) => { const l = box(0.15, 0.06, 0.15, MAT.lamp, x, 0.37, z, g); l.castShadow = false; evenLamps.push(l); });
  evenLamps.forEach(l => { l.visible = EVENING; });
}

// ── People: the guests in house (as many as the booking says) and the caretaker
// How many guests is real (the check-in count, else the booking's guests);
// where each one is follows the time of day and is illustrative. The caretaker
// goes to the place on the checklist they're working through, if one is open.
const PEOPLE = [];
const peopleRoot = { out: null, floors: [] };
const PG = {}; // shared geometries
const pmats = {};
const pmat = c => pmats[c] || (pmats[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, metalness: 0 }));
const SKIN = [0x8d5524, 0xa0673f, 0xc68642, 0x7a4a2a, 0xb07a4f, 0x6b4226, 0x9a6440];
const HAIR = [0x16110d, 0x221812, 0x2f2118, 0x0e0c0b];
const TOPS = [0xf3f1ec, 0x2b3f5c, 0x6d7a4a, 0x7a2e35, 0xd3a13a, 0x8fb8d8, 0x1f1f22, 0xe8b9a0, 0x2f7d7a, 0x8a8f94, 0xc94f4f, 0xece3cf];
const BOTTOMS = [0x3d5a80, 0xcdbb98, 0x1d1f22, 0xf0ede6, 0x55603d, 0x24324a, 0x6e6259];
const SWIM = [0x1f4e79, 0xc0392b, 0x16a085, 0x2c3e50, 0xe67e22, 0x8e44ad];
function rng(seed) { let a = 0; for (const ch of String(seed)) a = (a * 31 + ch.charCodeAt(0)) | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pickOf = (r, arr) => arr[Math.floor(r() * arr.length)];
function personGeos() {
  if (PG.torso) return;
  PG.torso = new THREE.CapsuleGeometry(0.15, 0.3, 4, 10); PG.pelvis = new THREE.SphereGeometry(0.15, 10, 8);
  PG.thigh = new THREE.CapsuleGeometry(0.068, 0.34, 4, 8); PG.shin = new THREE.CapsuleGeometry(0.054, 0.34, 4, 8);
  PG.upper = new THREE.CapsuleGeometry(0.047, 0.22, 4, 8); PG.fore = new THREE.CapsuleGeometry(0.04, 0.2, 4, 8);
  PG.hand = new THREE.SphereGeometry(0.043, 8, 6); PG.foot = new THREE.BoxGeometry(0.09, 0.06, 0.22);
  PG.head = new THREE.SphereGeometry(0.104, 14, 10); PG.neck = new THREE.CylinderGeometry(0.045, 0.05, 0.1, 8);
  PG.hair = new THREE.SphereGeometry(0.112, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.56);
  PG.long = new THREE.CapsuleGeometry(0.09, 0.2, 4, 8); PG.hit = new THREE.CapsuleGeometry(0.3, 1.2, 2, 6);
  PG.hitMat = new THREE.MeshBasicMaterial({ visible: false });
}
// one person: hips → (torso → neck, head, arms) and (thighs → knees → shins, feet)
function makePerson(look) {
  personGeos();
  const root = new THREE.Group(), hips = new THREE.Group(); root.add(hips); hips.position.y = 0.92;
  const part = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, pmat(mat)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const torso = new THREE.Group(); hips.add(torso);
  part(PG.pelvis, look.bottom, 0, 0.02, 0, torso).scale.set(1.05, 0.7, 0.75);
  part(PG.torso, look.top, 0, 0.3, 0, torso).scale.set(1, 1, 0.66);
  part(PG.neck, look.skin, 0, 0.6, 0, torso);
  const head = new THREE.Group(); head.position.y = 0.73; torso.add(head);
  part(PG.head, look.skin, 0, 0, 0.005, head).scale.set(0.95, 1.12, 1);
  const hair = part(PG.hair, look.hair, 0, 0.012, -0.012, head); hair.rotation.x = -0.25;
  if (look.longHair) part(PG.long, look.hair, 0, -0.1, -0.07, head).scale.set(1.1, 1, 0.55);
  const arm = side => {
    const sh = new THREE.Group(); sh.position.set(side * 0.2, 0.5, 0); torso.add(sh);
    part(PG.upper, look.sleeve, 0, -0.14, 0, sh);
    const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
    part(PG.fore, look.skin, 0, -0.13, 0, el); part(PG.hand, look.skin, 0, -0.28, 0.01, el);
    return { sh, el };
  };
  const leg = side => {
    const hp = new THREE.Group(); hp.position.set(side * 0.09, 0, 0); hips.add(hp);
    part(PG.thigh, look.bottom, 0, -0.22, 0, hp);
    const kn = new THREE.Group(); kn.position.y = -0.45; hp.add(kn);
    part(PG.shin, look.shin, 0, -0.21, 0, kn); part(PG.foot, look.feet, 0, -0.44, 0.05, kn);
    return { hp, kn };
  };
  const P = { root, hips, torso, head, aL: arm(-1), aR: arm(1), lL: leg(-1), lR: leg(1) };
  root.scale.setScalar(look.h / 1.76);
  const hit = new THREE.Mesh(PG.hit, PG.hitMat); hit.position.y = 0.9; root.add(hit); P.hit = hit;
  return P;
}
function lookFor(r, kind, swim) {
  const skin = pickOf(r, SKIN), female = r() < 0.45;
  if (kind === 'caretaker') return { skin, hair: HAIR[0], top: 0x2c4a6e, sleeve: 0x2c4a6e, bottom: 0xf1ede2, shin: 0xf1ede2, feet: 0x3a2a20, h: 1.68, longHair: false };
  const h = female ? 1.52 + r() * 0.16 : 1.64 + r() * 0.18;
  if (swim) { const sw = pickOf(r, SWIM); return { skin, hair: pickOf(r, HAIR), top: female ? sw : skin, sleeve: skin, bottom: sw, shin: skin, feet: skin, h, longHair: female }; }
  const top = pickOf(r, TOPS), shorts = r() < 0.5;
  return { skin, hair: pickOf(r, HAIR), top, sleeve: r() < 0.7 ? top : skin, bottom: pickOf(r, BOTTOMS), shin: shorts ? skin : null, feet: r() < 0.6 ? 0x4a3a2c : skin, h, longHair: female && r() < 0.8 };
}

// Places people can be, from the same plans as the rooms.
function spotsByAct() {
  const L0 = lvl(0), L1 = lvl(1), L2 = lvl(2), S = {};
  const add = (act, o) => (S[act] = S[act] || []).push(Object.assign({ act, floor: null, open: false }, o));
  const R = ZONE.rec, rcx = R.x + R.w / 2, rcz = R.z + R.d / 2;
  const C = ZONE.chess, ccx = C.x + C.w / 2, ccz = C.z + C.d / 2;
  const Dn = ZONE.dining, dcx = Dn.x + Dn.w / 2, dcz = Dn.z + Dn.d / 2;
  const Lv = ZONE.living, lcx = Lv.x + Lv.w / 2, lcz = Lv.z + Lv.d / 2;
  const K = ZONE.kitchen, kcx = K.x + K.w / 2, kcz = K.z + K.d / 2;
  const Dk = ZONE.deck, Lg = ZONE.lounge, T = ZONE.terrace;
  [-12.75, -11.85, -10.95, -10.4].forEach((x, i) => add('swim', { zone: 'pool', x, y: 0.2, z: -0.6 + i * 0.4, lane: [-0.9 + (i % 2) * 0.3, 3.3 - (i % 2) * 0.2] }));
  [[-12.95, -2.4, 0.8], [-12.1, -1.55, -2.4], [-12.95, -1.6, 2.2]].forEach(([x, z, f]) => add('soak', { zone: 'jacuzzi', x, y: 0.4, z, face: f }));
  [0, 1, 2].forEach(i => add('deck', { zone: 'deck', x: Dk.x + Dk.w / 2, y: 0.72, z: Dk.z + 1.5 + i * 2.2, face: Math.PI }));
  [0, 1, 2].forEach(i => add('lounge', { zone: 'lounge', floor: 0, open: true, x: Lg.x + 1.2, y: L0 + 0.4, z: Lg.z + 3 + i * 3.2, face: -Math.PI / 2 }));
  add('chat', { zone: 'lounge', floor: 0, open: true, x: Lg.x + 2.1, y: L0, z: Lg.z + 11.6, face: Math.PI });
  add('chat', { zone: 'lounge', floor: 0, open: true, x: Lg.x + 2.2, y: L0, z: Lg.z + 10.8, face: 0 });
  add('counter', { zone: 'counter', x: -9.75, y: 0, z: -4.45, face: Math.PI }); add('counter', { zone: 'counter', x: -10.55, y: 0, z: -4.4, face: Math.PI * 0.9 });
  const loop = [[-12.8, 5.3], [-7.2, 5.2], [-6.6, 8.9], [-12.4, 9.3]];
  [0, 2, 1].forEach(k => add('walk', { zone: 'garden', x: loop[k][0], y: 0, z: loop[k][1], path: loop, at: k }));
  [-1, -0.35, 0.35, 1].forEach(dz => { add('dine', { zone: 'dining', floor: 0, x: dcx - 0.85, y: L0 + 0.5, z: dcz + dz, face: Math.PI / 2 }); add('dine', { zone: 'dining', floor: 0, x: dcx + 0.85, y: L0 + 0.5, z: dcz + dz, face: -Math.PI / 2 }); });
  [-1, 0, 1].forEach(dz => add('living', { zone: 'living', floor: 0, x: lcx - 0.6, y: L0 + 0.55, z: lcz + dz, face: Math.PI / 2 }));
  add('kitchen', { zone: 'kitchen', floor: 0, x: kcx - 0.4, y: L0, z: kcz + 1.3, face: Math.PI });
  add('tt', { zone: 'rec', floor: 1, x: rcx - 1.2 - 1.8, y: L1, z: rcz + 1, face: Math.PI / 2 }); add('tt', { zone: 'rec', floor: 1, x: rcx - 1.2 + 1.8, y: L1, z: rcz + 1, face: -Math.PI / 2 });
  add('foos', { zone: 'rec', floor: 1, x: rcx + 1.8, y: L1, z: rcz - 2 - 0.62, face: 0 }); add('foos', { zone: 'rec', floor: 1, x: rcx + 1.8, y: L1, z: rcz - 2 + 0.62, face: Math.PI });
  [-1, 0, 1].forEach(dx => add('recsofa', { zone: 'rec', floor: 1, x: rcx + dx, y: L1 + 0.5, z: R.z + R.d - 0.8, face: Math.PI }));
  add('darts', { zone: 'rec', floor: 1, x: R.x + R.w - 2.5, y: L1, z: rcz + 2.5, face: Math.PI / 2 });
  add('chess', { zone: 'chess', floor: 1, open: true, x: ccx - 1.5 - 0.7, y: L1, z: ccz + 1, face: Math.PI / 2 }); add('chess', { zone: 'chess', floor: 1, open: true, x: ccx - 1.5 + 0.7, y: L1, z: ccz + 1, face: -Math.PI / 2 });
  [-0.7, 0.7].forEach(dx => add('chesssofa', { zone: 'chess', floor: 1, open: true, x: ccx + 1.2 + dx, y: L1 + 0.5, z: ccz + 2.2, face: Math.PI }));
  [-2.2, 0.8, 3.6].forEach(z => add('balcony', { zone: 'balcony', floor: 1, open: true, x: -7.95, y: L1, z, face: -Math.PI / 2 }));
  [0, 1, 2].forEach(i => add('terrace', { zone: 'terrace', floor: 2, open: true, x: T.x + 1 + i * 1.2, y: L2 + 0.38, z: T.z + T.d - 3, face: Math.PI }));
  add('terrace', { zone: 'terrace', floor: 2, open: true, x: T.x + 0.4, y: L2, z: T.z + 3, face: -Math.PI / 2, pose: 'lean' });
  // two to a bed, heads to the headboard on the west wall
  LAYOUT.filter(z => z.bath).forEach(z => { const cx = z.x + z.w / 2, by = z.z + z.d / 2 + z.bath[3] / 2; [-0.45, 0.45].forEach(dz => add('sleep', { zone: z.id, floor: z.floor, x: cx + 0.3, y: lvl(z.floor) + 0.52, z: by + dz, face: Math.PI / 2 })); });
  return S;
}
const POSE_OF = { swim: 'swim', soak: 'soak', deck: 'lie', terrace: 'lie', sleep: 'lie', lounge: 'sit', dine: 'sit', living: 'sit', recsofa: 'sit', chesssofa: 'sit', chat: 'chat', counter: 'stand', walk: 'walk', kitchen: 'stand', tt: 'tt', foos: 'foos', darts: 'darts', chess: 'think', balcony: 'lean' };
const ACT_TEXT = { swim: 'Swimming', soak: 'In the jacuzzi', deck: 'On a pool lounger', terrace: 'On the roof terrace', sleep: 'Asleep', lounge: 'In the poolside lounge', dine: 'At the dining table', living: 'In the living room', recsofa: 'In the recreation room', chesssofa: 'On the chess terrace', chat: 'Chatting by the pool', counter: 'At the food counter', walk: 'Walking in the garden', kitchen: 'In the kitchen', tt: 'Playing table tennis', foos: 'Playing foosball', darts: 'Playing darts', chess: 'Playing chess', balcony: 'On the balcony' };
// What a group tends to be doing at each hour (most likely first)
function plan(hour) {
  const r = (a, n) => Array(n).fill(a);
  if (hour >= 23 || hour < 6) return [...r('sleep', 8), ...r('recsofa', 3), ...r('living', 3), ...r('chesssofa', 2)];
  if (hour < 9) return ['walk', 'walk', 'swim', 'kitchen', ...r('dine', 4), 'balcony', 'deck', 'chat', 'chat', ...r('sleep', 8), ...r('living', 3)];
  if (hour >= 13 && hour < 14 || hour >= 19 && hour < 21) return [...r('dine', 8), 'counter', 'counter', 'chat', 'chat', ...r('lounge', 3), ...r('living', 3), ...r('deck', 3), ...r('chesssofa', 2), 'balcony', 'balcony'];
  if (hour >= 21) return ['soak', 'soak', ...r('lounge', 3), 'chess', 'chess', ...r('deck', 3), ...r('living', 3), ...r('recsofa', 3), 'balcony', 'balcony', ...r('chesssofa', 2), ...r('sleep', 8)];
  if (hour >= 17) return ['swim', 'swim', 'soak', 'soak', 'soak', ...r('deck', 3), ...r('lounge', 2), 'chess', 'chess', 'walk', 'walk', 'balcony', 'counter', 'counter', 'tt', 'tt', 'chat', 'chat', ...r('terrace', 3), ...r('living', 3), ...r('recsofa', 3), 'kitchen'];
  return ['swim', 'swim', 'swim', 'soak', 'soak', ...r('deck', 3), 'tt', 'tt', 'foos', 'foos', ...r('lounge', 2), 'chat', 'chat', 'chess', 'chess', ...r('recsofa', 3), 'darts', 'walk', ...r('living', 3), 'balcony', 'balcony', 'counter', ...r('terrace', 3), ...r('chesssofa', 2), ...r('dine', 8), 'kitchen'];
}
const istHour = () => new Date(Date.now() + 5.5 * 3600e3).getUTCHours();
function guestsHere() {
  const d = DERIVED; if (!d) return null;
  // check-out morning: the group is still here until the check-out checklist is done
  const s = d.inHouse || (d.leavingToday && istHour() < 11 && !(d.coRun && d.coRun.status === 'completed') ? d.leavingToday : null);
  if (!s) return null;
  const n = Math.max(0, Math.min(24, parseInt(s.checkinGuestsCount, 10) || parseInt(s.guests, 10) || 0));
  return { s, n, counted: !!parseInt(s.checkinGuestsCount, 10) };
}
// the caretaker: where the open checklist is, else on rounds or by the gate
function caretakerPlan() {
  const team = D.team && D.team.members ? D.team.members.filter(m => m.role === 'caretaker') : [];
  const today = runs().filter(r => r.date === todayISO());
  const open = today.filter(r => r.status !== 'completed').sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))[0] || null;
  const mine = ROLE === 'caretaker';
  if (!team.length && !today.length && !mine) return null;
  const email = open ? open.startedBy : team[0] ? team[0].email : '';
  const tm = team.find(m => m.email === email) || team[0];
  const name = mine ? 'You' : (tm && tm.name) || (email ? who(email) : '');
  if (open) {
    const items = open.items || [], next = items.find(i => !i.checked), done = items.filter(i => i.checked).length;
    const zid = next ? zonesOfItem(next.text)[0] : null;
    const z = zid && zid !== 'systems' ? placeOf(zid) : null;
    const what = `${{ checkin: 'Check-in checklist', checkout: 'Check-out checklist', daily: 'Daily rounds' }[open.type] || 'Checklist'} · ${done}/${items.length}${next ? ' · next: ' + next.text : ''}`;
    if (z) return { name, what, zone: zid, floor: z.floor != null ? z.floor : null, x: z.x + z.w / 2 + (z.bath ? -1.3 : 0.6), y: z.floor != null ? lvl(z.floor) : 0, z: z.z + z.d / 2 + 0.6, pose: 'check', open: !!z.open };
    return { name, what, zone: 'foyer', floor: 0, x: 3.6, y: lvl(0), z: -0.2, pose: 'check' };
  }
  const h = istHour();
  if (h >= 6 && h < 9 && !today.some(r => r.type === 'daily' && r.status === 'completed')) return { name, what: 'Morning rounds (daily rounds not done yet)', zone: 'garden', x: -12.4, y: 0, z: 9.3, pose: 'walk', path: [[-12.4, 9.3], [-6.8, 9.0], [-6.9, 5.4], [-12.6, 5.6]] };
  return { name, what: 'By the gate', zone: 'parking', x: 5.6, y: 0, z: 8.7, face: Math.PI, pose: 'stand' };
}
function clearPeople() {
  PEOPLE.forEach(p => { p.P.root.parent && p.P.root.parent.remove(p.P.root); const i = pickables.indexOf(p.P.hit); if (i >= 0) pickables.splice(i, 1); });
  PEOPLE.length = 0;
}
function buildPeople() {
  if (!renderer) return;
  clearPeople();
  const hour = EVENING && istHour() >= 6 && istHour() < 18 ? 20 : istHour(); // Evening switched on in the day: as at 8 pm
  const g = guestsHere(), S = spotsByAct(), used = {};
  if (g && g.n) {
    const r = rng(g.s.no || g.s.guest || 'stay'), want = plan(hour);
    let k = 0; // through the plan in order: two swimmers means two, then the next thing
    for (let i = 0; i < g.n; i++) {
      while (k < want.length && (used[want[k]] || 0) >= (S[want[k]] || []).length) k++;
      let act = want[k++];
      if (!act) act = ['living', 'recsofa', 'chesssofa', 'lounge', 'dine'].find(a => (used[a] || 0) < S[a].length) || 'walk';
      const spot = S[act][(used[act] = (used[act] || 0) + 1) - 1] || S.walk[0];
      const P = makePerson(lookFor(r, 'guest', act === 'swim' || act === 'soak' || (act === 'deck' && r() < 0.6)));
      addPerson({ P, kind: 'guest', spot, act, label: ACT_TEXT[act], stay: g.s, n: g.n, counted: g.counted, ph: r() * 6 });
    }
  }
  const c = caretakerPlan();
  if (c) addPerson({ P: makePerson(lookFor(rng('caretaker'), 'caretaker')), kind: 'caretaker', spot: Object.assign({ act: c.pose }, c), act: c.pose, label: c.what, name: c.name, ph: 1 });
  syncPeopleVisibility(); posePeople(0, 0);
}
function addPerson(p) {
  const s = p.spot, parent = groups.out; // shown or hidden per view by syncPeopleVisibility
  p.pose = s.pose || POSE_OF[p.act] || p.act;
  p.P.root.position.set(s.x, s.y, s.z); p.P.root.rotation.y = s.face || 0;
  p.base = { x: s.x, y: s.y, z: s.z, face: s.face || 0 };
  if (s.path) { p.path = s.path; p.at = s.at || 0; p.wait = 0; p.speed = 0.75 + (p.ph % 1) * 0.35; }
  if (s.lane) { p.lane = s.lane; p.dir = 1; }
  p.P.hit.userData.zone = s.zone; p.P.hit.userData.person = p;
  pickables.push(p.P.hit); parent.add(p.P.root); PEOPLE.push(p);
}
// Outside you see who's outdoors or on the open terraces; inside, the floors shown.
function syncPeopleVisibility() {
  const ext = isExt();
  PEOPLE.forEach(p => { const f = p.spot.floor; p.P.root.visible = f == null || (ext ? !!p.spot.open : VIEW === 'plan' ? f === FLOOR : f <= FLOOR); });
}
const sin = Math.sin;
function posePeople(T, dt) {
  PEOPLE.forEach(p => {
    const P = p.P, t = T + p.ph;
    // reset
    P.hips.rotation.set(0, 0, 0); P.hips.position.set(0, 0.92, 0); P.torso.rotation.set(0, 0, 0); P.head.rotation.set(0, 0, 0);
    [P.aL, P.aR].forEach((a, i) => { a.sh.rotation.set(0.05, 0, (i ? -1 : 1) * 0.07); a.el.rotation.set(-0.12, 0, 0); });
    [P.lL, P.lR].forEach(l => { l.hp.rotation.set(0, 0, 0); l.kn.rotation.set(0, 0, 0); });
    const breathe = sin(t * 1.6) * 0.012;
    switch (p.pose) {
      case 'walk': {
        if (p.path && dt) {
          if (p.wait > 0) p.wait -= dt;
          else {
            const [tx, tz] = p.path[(p.at + 1) % p.path.length], R0 = P.root.position, dx = tx - R0.x, dz = tz - R0.z, dist = Math.hypot(dx, dz);
            if (dist < 0.1) { p.at = (p.at + 1) % p.path.length; if ((p.ph * 7 + p.at) % 3 < 1) p.wait = 1.5 + (p.ph % 2); }
            else {
              const st = Math.min(dist, p.speed * dt); R0.x += dx / dist * st; R0.z += dz / dist * st;
              const want = Math.atan2(dx, dz); let d = want - P.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); P.root.rotation.y += d * Math.min(1, dt * 5);
            }
          }
        }
        const moving = !(p.wait > 0) && dt, ph = t * (p.speed || 1) * 5.6, a = moving ? 1 : 0;
        P.lL.hp.rotation.x = -sin(ph) * 0.42 * a; P.lR.hp.rotation.x = sin(ph) * 0.42 * a;
        P.lL.kn.rotation.x = Math.max(0, sin(ph - 1.4)) * 0.75 * a + 0.04; P.lR.kn.rotation.x = Math.max(0, -sin(ph - 1.4)) * 0.75 * a + 0.04;
        P.aL.sh.rotation.x = sin(ph) * 0.38 * a; P.aR.sh.rotation.x = -sin(ph) * 0.38 * a;
        P.aL.el.rotation.x = P.aR.el.rotation.x = -0.25;
        P.hips.position.y = 0.92 + Math.abs(Math.cos(ph)) * 0.025 * a; P.torso.rotation.x = 0.04;
        if (!moving) P.head.rotation.y = sin(t * 0.5) * 0.4;
        break;
      }
      case 'sit':
        P.hips.position.y = 0; // the spot is the seat
        P.lL.hp.rotation.x = P.lR.hp.rotation.x = -Math.PI / 2 + 0.08; P.lL.kn.rotation.x = P.lR.kn.rotation.x = Math.PI / 2 - 0.05;
        P.lL.hp.rotation.z = 0.06; P.lR.hp.rotation.z = -0.06;
        P.aL.sh.rotation.x = P.aR.sh.rotation.x = -0.35; P.aL.el.rotation.x = P.aR.el.rotation.x = -0.9;
        P.torso.rotation.x = -0.08 + breathe; P.head.rotation.y = sin(t * 0.35) * 0.5; P.head.rotation.x = sin(t * 0.21) * 0.08;
        if (p.act === 'dine') { P.aR.sh.rotation.x = -0.7 + sin(t * 1.3) * 0.25; P.aR.el.rotation.x = -1.1 + sin(t * 1.3) * 0.35; P.torso.rotation.x = 0.12; }
        break;
      case 'lie':
        P.hips.rotation.x = -Math.PI / 2; P.hips.position.y = 0.08;
        P.aL.sh.rotation.z = 0.18; P.aR.sh.rotation.z = -0.18; P.aL.el.rotation.x = P.aR.el.rotation.x = 0;
        if (p.act === 'sleep') { P.aR.sh.rotation.x = -0.6; P.aR.el.rotation.x = -0.9; P.head.rotation.y = 0.5; } else { P.aL.sh.rotation.x = 0.2; P.aR.sh.rotation.x = -2.6; P.aR.el.rotation.x = -1.2; P.lR.hp.rotation.x = -0.35; P.lR.kn.rotation.x = 0.7; }
        P.torso.rotation.x = breathe;
        break;
      case 'swim': {
        if (p.lane && dt) {
          const R0 = P.root.position; R0.z += p.dir * 0.55 * dt;
          if (R0.z > p.lane[1]) { p.dir = -1; } else if (R0.z < p.lane[0]) { p.dir = 1; }
          const want = p.dir > 0 ? 0 : Math.PI; let d = want - P.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); P.root.rotation.y += d * Math.min(1, dt * 3);
        }
        P.hips.rotation.x = Math.PI / 2 - 0.12; P.hips.position.y = 0.06 + sin(t * 2.2) * 0.02;
        const st = t * 2.4;
        P.aL.sh.rotation.x = -((st % (Math.PI * 2))); P.aR.sh.rotation.x = -(((st + Math.PI) % (Math.PI * 2)));
        P.aL.el.rotation.x = P.aR.el.rotation.x = -0.2;
        P.lL.hp.rotation.x = sin(t * 9) * 0.22; P.lR.hp.rotation.x = -sin(t * 9) * 0.22; P.torso.rotation.y = sin(st) * 0.18;
        break;
      }
      case 'soak':
        P.hips.position.y = 0;
        P.lL.hp.rotation.x = P.lR.hp.rotation.x = -1.2; P.lL.kn.rotation.x = P.lR.kn.rotation.x = 1.0;
        P.aL.sh.rotation.z = 1.25; P.aR.sh.rotation.z = -1.25; P.aL.el.rotation.x = P.aR.el.rotation.x = 0; P.aL.el.rotation.z = -0.3; P.aR.el.rotation.z = 0.3;
        P.torso.rotation.x = -0.18 + breathe; P.head.rotation.y = sin(t * 0.3) * 0.6;
        break;
      case 'lean':
        P.torso.rotation.x = 0.22; P.aL.sh.rotation.x = P.aR.sh.rotation.x = -1.15; P.aL.el.rotation.x = P.aR.el.rotation.x = -0.5;
        P.head.rotation.y = sin(t * 0.25) * 0.5; P.lR.hp.rotation.x = -0.1; P.lR.kn.rotation.x = 0.2;
        break;
      case 'tt': {
        const sx = sin(t * 2.1) * 0.35; P.root.position.x = p.base.x + Math.cos(p.base.face) * sx; P.root.position.z = p.base.z - Math.sin(p.base.face) * sx;
        P.hips.position.y = 0.86; P.lL.hp.rotation.x = P.lR.hp.rotation.x = -0.25; P.lL.kn.rotation.x = P.lR.kn.rotation.x = 0.45; P.lL.hp.rotation.z = 0.15; P.lR.hp.rotation.z = -0.15;
        P.torso.rotation.x = 0.25; P.aR.sh.rotation.x = -0.9 + sin(t * 6.3) * 0.5; P.aR.sh.rotation.z = -0.4 + sin(t * 6.3) * 0.3; P.aR.el.rotation.x = -0.6; P.aL.sh.rotation.x = -0.4;
        break;
      }
      case 'foos':
        P.torso.rotation.x = 0.3; P.aL.sh.rotation.x = P.aR.sh.rotation.x = -1.0; P.aL.el.rotation.x = -0.4 + sin(t * 9) * 0.25; P.aR.el.rotation.x = -0.4 - sin(t * 11) * 0.25;
        P.lL.kn.rotation.x = P.lR.kn.rotation.x = 0.15; P.hips.position.y = 0.9;
        break;
      case 'darts': {
        const k = (t % 4) / 4; P.aR.sh.rotation.x = -1.6 + (k > 0.8 ? (k - 0.8) * 5 : 0) * 0.8; P.aR.el.rotation.x = k > 0.8 ? -0.2 : -1.6; P.torso.rotation.y = -0.15;
        break;
      }
      case 'think':
        P.torso.rotation.x = 0.28; P.aL.sh.rotation.x = -0.5; P.aL.el.rotation.x = -1.9; P.aR.sh.rotation.x = -0.3 + (sin(t * 0.6) > 0.95 ? -0.6 : 0); P.head.rotation.x = 0.35;
        break;
      case 'chat':
        P.aR.sh.rotation.x = -0.5 + sin(t * 2.3) * 0.25; P.aR.el.rotation.x = -1.0 + sin(t * 3.1) * 0.3; P.aR.sh.rotation.z = -0.25;
        P.head.rotation.y = sin(t * 0.7) * 0.25; P.head.rotation.x = sin(t * 1.9) * 0.05; P.torso.rotation.z = sin(t * 0.8) * 0.03;
        break;
      case 'check': // on the phone checklist
        P.aL.sh.rotation.x = -0.75; P.aL.el.rotation.x = -1.3; P.aR.sh.rotation.x = -0.6; P.aR.el.rotation.x = -1.2 + sin(t * 2.5) * 0.12;
        P.head.rotation.x = 0.4 + sin(t * 0.5) * 0.05; P.head.rotation.y = sin(t * 0.3) * 0.3; P.torso.rotation.x = 0.06;
        break;
      default: // stand
        P.torso.rotation.z = sin(t * 0.6) * 0.02; P.head.rotation.y = sin(t * 0.4) * 0.45; P.lR.kn.rotation.x = 0.12; P.lR.hp.rotation.x = -0.06;
    }
  });
}

// ── Views ────────────────────────────────────────────────────────────────────
const VIEWS = {
  // from the south-west: the road façade and the pool side, the sea beyond to the east
  overview: { pos: [-40, 40, 42], target: [-2, 1.5, 1] },
  cutaway: { pos: [-30, 38, 32], target: [-2, 2, 0] },
  // from the road, as in the night photo of the gate
  street: { pos: [0, 2.4, 50], target: [-1.5, 4.2, 0] },
  plan: { pos: [-1.99, 66, 1.5], target: [-2, 0, 1] },
};
function setView(v, instant) {
  VIEW = v;
  const showExt = v === 'overview' || v === 'street';
  groups.exterior.visible = showExt;
  palms.forEach(p => { p.visible = v !== 'plan'; }); // seen from straight above they'd cover the rooms
  groups.cut.forEach((c, i) => { c.visible = !showExt && (v === 'plan' ? i === FLOOR : i <= FLOOR); });
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  $('#floorSw').hidden = showExt;
  controls.maxPolarAngle = v === 'plan' ? 0.02 : v === 'street' ? Math.PI * 0.52 : Math.PI * 0.47;
  controls.minDistance = v === 'street' ? 8 : 18;
  controls.enableRotate = v !== 'plan';
  const tgt = selected && v === 'cutaway' ? focusOf(selected) : null;
  flyTo(tgt ? tgt.pos : VIEWS[v].pos, tgt ? tgt.target : VIEWS[v].target, instant || v === 'plan'); // the plan is always north-up
  syncPeopleVisibility(); updateTiles(); needRender = true; kick();
}
function setFloor(f) {
  FLOOR = f;
  document.querySelectorAll('[data-floor]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.floor === f)));
  setView(isExt() ? 'cutaway' : VIEW, false);
}
const isExt = () => VIEW === 'overview' || VIEW === 'street'; // looking at the outside
let fly = null;
function flyTo(pos, target, instant, dur) {
  const p = new THREE.Vector3(...pos), tg = new THREE.Vector3(...target);
  if (instant || reduceMotion()) {
    fly = null; camera.position.copy(p); controls.target.copy(tg);
    controls.enableDamping = false; controls.update(); controls.enableDamping = true; // no drift left over from a previous move
    needRender = true; kick(); return;
  }
  fly = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p, tg, dur: dur || 0.9 };
  kick();
}
// Where to look when a place is chosen
function focusOf(id) {
  const z = LAYOUT.find(q => (q.same || q.id) === id && q.floor === FLOOR) || placeOf(id);
  if (!z) return null;
  const cx = z.x + z.w / 2, cz = z.z + z.d / 2, y = z.floor != null ? lvl(z.floor) : 0;
  // keep the angle you're looking from; just come closer
  const dir = camera ? camera.position.clone().sub(controls.target).normalize() : new THREE.Vector3(-0.6, 0.55, 0.6).normalize();
  if (dir.y < 0.45) { dir.y = 0.45; dir.normalize(); }
  return { pos: [cx + dir.x * 30, y + dir.y * 30, cz + dir.z * 30], target: [cx, y, cz] };
}

// ── Picking ──────────────────────────────────────────────────────────────────
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let downAt = null;
function onDown(e) { downAt = { x: e.clientX, y: e.clientY }; }
// what's under the pointer: a place, the house (outside), or nothing
let pickedPerson = null;
function pickAt(cx, cy) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const vis = pickables.filter(m => { let o = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; });
  const hit = ray.intersectObjects(vis, false)[0];
  pickedPerson = hit && hit.object.userData.person || null;
  if (hit && hit.object.userData.zone) return hit.object.userData.zone;
  if (isExt() && ray.intersectObject(groups.exterior, true)[0]) return 'house';
  return null;
}
function onUp(e) {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) { downAt = null; return; }
  downAt = null;
  const id = pickAt(e.clientX, e.clientY);
  if (id === 'house') { setView('cutaway'); select('overview'); } // the house itself: look inside
  else if (id) select(id);
}
// Hover (mouse only): the place lights up, its pin opens, and a card says what's there.
const tip = document.createElement('div'); tip.className = 'v3-tip'; tip.hidden = true; tip.setAttribute('role', 'status'); stage.appendChild(tip);
let hoverReq = 0, hoverAt = null, hoverPerson = null;
function personTip(p) {
  if (p.kind === 'caretaker') return `<b>${esc(t('Caretaker'))}${p.name ? ' · ' + esc(p.name) : ''}</b><span>${esc(p.label)}</span><em>${esc(t('From today\'s checklists'))}</em>`;
  return `<b>${esc(t('Guest'))} · ${esc(p.stay.guest || '')}</b><span>${esc(t(p.label))}</span><span>${p.n} ${esc(t(p.counted ? 'guests checked in' : 'guests booked'))}</span><em>${esc(t('The count is real; where each one is, is illustrative'))}</em>`;
}
function onMove(e) {
  if (e.pointerType !== 'mouse' || (downAt && e.buttons)) { if (!tip.hidden) setHover(null); return; }
  hoverAt = { x: e.clientX, y: e.clientY };
  if (!hoverReq) hoverReq = requestAnimationFrame(() => { hoverReq = 0; if (hoverAt && renderer) setHover(pickAt(hoverAt.x, hoverAt.y), hoverAt); });
}
function setHover(id, at) {
  const zid = id === 'house' ? 'overview' : id;
  renderer.domElement.style.cursor = id ? 'pointer' : '';
  const per = id ? pickedPerson : null;
  if (zid !== HOVER || per !== hoverPerson) { HOVER = zid; hoverPerson = per; updateTiles(); tip.innerHTML = per ? personTip(per) : zid ? tipHtml(zid, id === 'house') : ''; }
  tip.hidden = !zid;
  if (zid && at) {
    const r = stage.getBoundingClientRect(), x = at.x - r.left, y = at.y - r.top, tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.transform = `translate(${Math.round(x + 16 + tw > r.width ? x - tw - 12 : x + 16)}px, ${Math.round(y + 14 + th > r.height ? y - th - 10 : y + 14)}px)`;
  }
}
function tipHtml(id, house) {
  if (house) return `<b>RYST 109A</b><span>${esc(t('Click to look inside'))}</span>`;
  const z = ZONE[id]; if (!z) return '';
  const st = zoneState(id), f = factsOf(id), lines = [];
  if (f.size) lines.push(f.size + (f.floor ? ' · ' + f.floor : ''));
  if (f.open) lines.push(`${f.open} open issue${f.open > 1 ? 's' : ''}${f.urgent ? ' · urgent' : ''}`);
  if (f.checked) lines.push('Last checked ' + f.checked);
  return `<b>${esc(t(z.name))}</b><span class="v3-tip__st"><i class="v3-dot s-${st.key}" aria-hidden="true">${STATE_STYLE[st.key].icon}</i>${esc(st.label)}</span>${lines.map(l => `<span>${esc(l)}</span>`).join('')}<em>${esc(t('Click for details'))}</em>`;
}

// ── Render loop (only while something moves) ────────────────────────────────
function kick() { if (!running && renderer) { running = true; requestAnimationFrame(frame); } }
let last = 0, drive = null;
const m4b = new THREE.Matrix4(), tmpS = new THREE.Vector3();
function frame(now) {
  if (document.hidden) { running = false; return; }
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
  let moving = controls.update();
  if (fly) {
    fly.t = Math.min(1, fly.t + dt / fly.dur); const k = 1 - Math.pow(1 - fly.t, 3);
    camera.position.lerpVectors(fly.p0, fly.p, k); controls.target.lerpVectors(fly.t0, fly.tg, k);
    if (fly.t >= 1) fly = null; moving = true;
  }
  const anim = !reduceMotion() && STAGE_VISIBLE;
  if (anim) {
    const T = clock.getElapsedTime();
    animated.forEach(a => {
      if (a.kind === 'sway') a.obj.rotation.z = Math.sin(T * 0.8 + a.phase) * a.amp;
      else if (a.kind === 'waves') {
        const pos = a.mesh.geometry.attributes.position, b = a.base;
        for (let i = 0; i < pos.count; i++) { const x = b[i * 3], z = b[i * 3 + 2]; pos.array[i * 3 + 1] = b[i * 3 + 1] + Math.sin(x * 0.9 + T * a.speed) * a.amp + Math.cos(z * 1.3 + T * a.speed * 0.8) * a.amp; }
        pos.needsUpdate = true;
      } else if (a.kind === 'bubbles') {
        a.seeds.forEach(([x, z, ph], i) => { const k = (T * 0.45 + ph) % 1; m4b.makeTranslation(x + Math.sin(T * 3 + i) * 0.03, 0.5 + k * 0.12, z); m4b.scale(tmpS.setScalar(0.4 + k)); a.mesh.setMatrixAt(i, m4b); });
        a.mesh.instanceMatrix.needsUpdate = true;
      }
    });
    // the chosen place glows softly; a place with an issue breathes red
    posePeople(T, dt);
    PULSE.forEach(p => { const v = 0.5 + 0.5 * Math.sin(T * (p.kind === 'sel' ? 3 : 2.2)); p.mats.forEach(m => { m.emissiveIntensity = p.kind === 'sel' ? 0.22 + 0.2 * v : 0.08 + 0.22 * v; }); });
  }
  if (drive) {
    drive.t = Math.min(1, drive.t + dt / 5.5); const k = 1 - Math.pow(1 - drive.t, 3);
    car.position.z = CAR_ROAD + (CAR_PARK - CAR_ROAD) * k;
    car.position.x = GATE_X + (CAR_X - GATE_X) * Math.max(0, (k - 0.55) / 0.45); // in through the big gate, then over to its spot
    const open = drive.t < 0.3 ? drive.t / 0.3 : drive.t < 0.75 ? 1 : Math.max(0, 1 - (drive.t - 0.75) / 0.25);
    gate14.position.set(GATE_X + 4.1 * open, 1.1, 10.2 + 0.25 * Math.min(1, open * 4)); moving = true;
    if (drive.t >= 1) drive = null;
  }
  if (moving || anim || needRender) { renderer.render(scene, camera); placeLabels(); needRender = false; }
  if (moving || anim || fly || drive) requestAnimationFrame(frame); else running = false;
}
let STAGE_VISIBLE = true;
new IntersectionObserver(es => { STAGE_VISIBLE = es[0].isIntersecting; if (STAGE_VISIBLE) kick(); }).observe(stage);
function resize() {
  if (!renderer) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  measureCtl(); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); needRender = true; kick();
}

// ── Status colours on the floor tiles ───────────────────────────────────────
const PULSE = [];
let HOVER = null;
function updateTiles() {
  PULSE.length = 0;
  Object.keys(tiles).forEach(id => {
    const st = zoneState(id), c = new THREE.Color(STATE_STYLE[st.key].color), base = new THREE.Color(0xe9e2d6);
    const show = LAYER === 'all' || LAYER === 'housekeeping' || (LAYER === 'maintenance' && st.key === 'attention') || (LAYER === 'bookings' && st.key === 'occupied');
    const sel = selected === id, hov = HOVER === id, iss = show && st.key === 'attention';
    tiles[id].forEach(m => {
      m.material.color.copy(show ? base.clone().lerp(c, hov ? 0.75 : 0.55) : base);
      m.material.emissive.set(sel ? 0x5a4520 : iss ? 0x7a2214 : hov ? 0x3a3020 : 0x000000);
      m.material.emissiveIntensity = sel ? 0.35 : iss ? 0.2 : hov ? 0.25 : 0;
    });
    if (sel || iss) PULSE.push({ kind: sel ? 'sel' : 'iss', mats: tiles[id].map(m => m.material) });
  });
  needRender = true; kick();
}
// The guests' car is parked while a stay is in house, and drives in once on its check-in day.
let droveIn = false;
function syncCar() {
  if (!car || !DERIVED) return;
  const d = DERIVED, here = !!d.inHouse;
  car.visible = here;
  if (here && !droveIn && d.inHouse.checkin === d.T && !reduceMotion()) { droveIn = true; car.position.set(GATE_X, 0, CAR_ROAD); drive = { t: 0 }; kick(); }
  else if (!drive) car.position.z = CAR_PARK;
  needRender = true;
}

// ── Floating labels (HTML buttons kept over their 3D spot) ──────────────────
let LABELS = [];
function anchorOf(id) {
  if (id === 'overview') return VIEW === 'plan' ? new THREE.Vector3(-2, 0.5, PLOT.z - 0.6) : new THREE.Vector3(-3.5, lvl(2) + 2.6, 1.5);
  if (id === 'systems') return new THREE.Vector3(2, lvl(3) + 0.4, -3.5);
  if (id === 'bedrooms') return new THREE.Vector3(6.7, lvl(2) + 1.2, -1.1); // on Bedroom 4's south face
  const z = (isExt() ? null : LAYOUT.find(q => (q.same || q.id) === id && q.floor === FLOOR)) || placeOf(id); if (!z) return null;
  const cx = z.x + z.w / 2, cz = z.z + z.d / 2;
  const up = { screen: 3.0, counter: 3.0, generator: 1.9, jacuzzi: 0.9, parking: 0.6, garden: 0.5 }[id];
  // outside: on top of the building; inside: just above that floor
  const y = up != null ? up : z.floor == null ? 1.2 : isExt() ? (z.open ? lvl(z.floor) + 1.2 : lvl(z.floor) + FLOOR_H + 0.5) : lvl(z.floor) + 1.4;
  return new THREE.Vector3(cx, y, cz);
}
// Pins, not a wall of names: every place is a status dot; its name opens when
// there's room (most important first), when hovered, or when chosen. A pin that
// would land on a more important one is hidden — the list in the panel has them all.
const RANK = ['attention', 'checkout', 'occupied', 'preparing', 'notprepared', 'ready', 'idle', 'untracked'];
function buildLabels() {
  if (!renderer) { labelsEl.innerHTML = ''; LABELS = []; return; } // the plan without 3D has its own names
  const d = DERIVED, out = [];
  const hl = d && d.inHouse ? `In house · ${d.inHouse.guests || '?'} guests · out ${fmtDay(d.inHouse.checkout)}`
    : d && d.next ? `Next check-in ${fmtDay(d.next.checkin)}${d.next.guests ? ' · ' + d.next.guests + ' guests' : ''}` : can('guestRegister') ? 'No upcoming stays' : '';
  out.push({ id: 'overview', title: 'RYST 109A', sub: hl, kind: 'main', prio: 1000 });
  const showMT = LAYER === 'all' || LAYER === 'maintenance';
  const issOf = id => (d && d.iss[id]) || [];
  if (isExt() && LAYER !== 'maintenance') {
    // the four bedrooms as one pin here; each room is in the Inside and Plan views
    const ids = ['bed1', 'bed2', 'bed3', 'bed4'], sts = ids.map(zoneState);
    const worst = sts.slice().sort((a, b) => RANK.indexOf(a.key) - RANK.indexOf(b.key))[0];
    const same = sts.every(x => x.key === worst.key), bi = ids.reduce((a, b) => a + issOf(b).length, 0);
    out.push({ id: 'bedrooms', title: 'Bedrooms 1–4', sub: worst.key === 'untracked' ? '' : same ? worst.label : sts.filter(x => x.key === worst.key).length + ' · ' + worst.label, state: worst.key, issues: showMT ? bi : 0, urgent: ids.some(b => issOf(b).some(i => i.urgency === 'urgent')) });
  }
  const visibleIds = isExt() ? ['pool', 'jacuzzi', 'screen', 'parking', 'generator', 'rec', 'chess', 'counter', 'kitchen', 'living', 'garden', 'systems', 'deck', 'balcony', 'dining', 'stairs', 'powder', 'foyer', 'ebroom', 'store', 'lounge', 'terrace'].concat(LAYER === 'maintenance' ? ['bed1', 'bed2', 'bed3', 'bed4'] : [])
    : LAYOUT.filter(z => z.floor === FLOOR && !z.same).map(z => z.id).concat(LAYOUT.some(z => z.same && z.floor === FLOOR) ? ['stairs'] : []).concat(FLOOR === 0 || VIEW === 'cutaway' ? OUTDOOR.map(z => z.id) : []).concat(VIEW === 'plan' ? [] : ['systems']);
  visibleIds.forEach(id => {
    const z = ZONE[id], st = zoneState(id), list = issOf(id), n = list.length;
    // outside, only the main amenities, plus anywhere that needs someone
    if (isExt() && !['pool', 'jacuzzi', 'screen', 'parking', 'generator', 'rec', 'chess'].includes(id) && !(n && showMT)) return;
    if (LAYER === 'maintenance' && !n) return;
    if (LAYER === 'bookings' && !/^bed/.test(id)) return;
    if (LAYER === 'housekeeping' && st.key === 'untracked' && !['pool', 'jacuzzi'].includes(id)) return;
    out.push({ id, title: z.name, sub: showMT && n ? `${n} issue${n > 1 ? 's' : ''}` + (list.some(i => i.urgency === 'urgent') ? ' · urgent' : '') : st.key !== 'untracked' && st.key !== 'idle' ? st.label : '', state: st.key, issues: showMT ? n : 0, urgent: showMT && list.some(i => i.urgency === 'urgent') });
  });
  // places with nothing to report stay quiet: a small dot, named on hover (and in the plan)
  out.forEach(l => { l.quiet = l.kind !== 'main' && !l.issues && (l.state === 'untracked' || l.state === 'idle'); });
  out.forEach(l => { if (l.prio == null) l.prio = (l.urgent ? 300 : 0) + (l.issues ? 200 : 0) + (8 - RANK.indexOf(l.state)) * 10; });
  out.sort((a, b) => b.prio - a.prio);
  labelsEl.innerHTML = out.map((l, i) => `<button type="button" class="v3-lab${l.kind === 'main' ? ' v3-lab--main' : ' v3-pin'}${l.issues ? ' v3-lab--iss' : ''}${l.urgent ? ' v3-lab--urg' : ''}${l.quiet ? ' v3-pin--q' : ''}" style="--i:${i}" data-zone="${esc(l.id)}" aria-label="${esc(t(l.title))}${l.sub ? ': ' + esc(l.sub) : ''}">
    ${l.state ? `<span class="v3-dot s-${l.state}" aria-hidden="true">${STATE_STYLE[l.state].icon}${l.issues ? `<b class="v3-badge">${l.issues}</b>` : ''}</span>` : ''}<span class="v3-lab__t">${esc(t(l.title))}</span>${l.sub ? `<span class="v3-lab__s">${esc(l.sub)}</span>` : ''}</button>`).join('');
  // measure each pin open once, so placing them each frame needs no layout reads
  const els = [...labelsEl.children];
  els.forEach(el => el.classList.add('open', 'full'));
  const sizes = els.map(el => ({ w: el.offsetWidth, h: el.offsetHeight, wt: 0 }));
  els.forEach(el => el.classList.remove('full'));
  els.forEach((el, i) => { sizes[i].wt = el.offsetWidth; el.classList.remove('open'); });
  LABELS = out.map((l, i) => ({ id: l.id, kind: l.kind, quiet: l.quiet, el: els[i], at: anchorOf(l.id), size: sizes[i] }));
  measureCtl();
  labelsEl.classList.remove('v3-in'); void labelsEl.offsetWidth; labelsEl.classList.add('v3-in'); // the pins drop in
  placeLabels();
}
const tmpV = new THREE.Vector3();
let CTL_RECTS = [];
function measureCtl() {
  const sr = stage.getBoundingClientRect();
  CTL_RECTS = [...stage.querySelectorAll('.v3-ctl .v3-seg, .v3-legend')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height }; });
}
function placeLabels() {
  if (!camera) return;
  const w = stage.clientWidth, h = stage.clientHeight, rects = CTL_RECTS.slice(); // the buttons over the model are taken
  const hit = r => rects.some(q => r.x < q.x + q.w + 4 && r.x + r.w + 4 > q.x && r.y < q.y + q.h + 3 && r.y + r.h + 3 > q.y);
  // the chosen and hovered places claim their room first
  const order = LABELS.filter(L => L.id === selected || L.id === HOVER || L.id === hoverOf(selected)).concat(LABELS.filter(L => !(L.id === selected || L.id === HOVER || L.id === hoverOf(selected))));
  order.forEach(L => {
    if (!L.at) { L.el.hidden = true; return; }
    tmpV.copy(L.at).project(camera);
    let x = (tmpV.x * 0.5 + 0.5) * w; const y = (-tmpV.y * 0.5 + 0.5) * h;
    if (tmpV.z > 1 || x < -40 || x > w + 40 || y < -20 || y > h + 20) { L.el.hidden = true; return; }
    const focus = L.kind === 'main' || L.id === selected || L.id === HOVER || L.id === hoverOf(selected);
    if (focus || !L.quiet || VIEW === 'plan') x = Math.max(L.size.w / 2 + 6, Math.min(w - L.size.w / 2 - 6, x)); // named labels stay inside the frame
    const full = { x: x - L.size.w / 2, y: y - L.size.h - 6, w: L.size.w, h: L.size.h };
    const named = { x: x - L.size.wt / 2, y: y - L.size.h - 6, w: L.size.wt, h: L.size.h };
    const dot = L.quiet ? { x: x - 8, y: y - 22, w: 16, h: 16 } : { x: x - 13, y: y - 32, w: 26, h: 26 };
    let mode = focus ? 'full' : (!L.quiet || VIEW === 'plan') && !hit(named) ? 'open' : !hit(dot) ? 'pin' : 'off';
    L.el.hidden = mode === 'off';
    L.el.classList.toggle('open', mode === 'open' || mode === 'full');
    L.el.classList.toggle('full', mode === 'full');
    L.el.classList.toggle('on', L.id === selected || L.id === hoverOf(selected));
    if (mode === 'off') return;
    rects.push(mode === 'full' ? full : mode === 'open' ? named : dot);
    L.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
  });
}
const hoverOf = id => /^bed\d$/.test(id || '') && isExt() ? 'bedrooms' : null; // outside, a bedroom is the Bedrooms pin
labelsEl.addEventListener('click', e => { const b = e.target.closest('[data-zone]'); if (b) select(b.dataset.zone); });
labelsEl.addEventListener('pointerover', e => { const b = e.target.closest('[data-zone]'); if (b && renderer && b.dataset.zone !== HOVER && b.dataset.zone !== 'bedrooms') { HOVER = b.dataset.zone; tip.hidden = true; updateTiles(); } });
labelsEl.addEventListener('pointerout', e => { const b = e.target.closest('[data-zone]'); if (b && !b.contains(e.relatedTarget) && HOVER === b.dataset.zone) { HOVER = null; updateTiles(); } });

// ── Facts about a place, each from Harbour's own records ──────────────────
const FLOOR_NAME = ['Ground floor', 'First floor', 'Second floor'];
const allIssues = () => (D.issues && D.issues.issues) || [];
const issuesHere = id => allIssues().filter(i => zoneOfText((i.area || '') + ' ' + i.title) === id);
const who = e => String(e || '').split('@')[0];
const dayOf = ms => ms ? fmtDay(new Date(ms + 5.5 * 3600e3).toISOString().slice(0, 10)) : '';
function factsOf(id) {
  const z = placeOf(id), f = {};
  if (z && id !== 'systems') {
    const m2 = z.w * z.d;
    f.size = id === 'screen' ? '' : `${Math.round(m2)} m² · ${Math.round(m2 * 10.764)} sq ft`;
    f.floor = id === 'stairs' ? 'All floors' : z.floor != null ? FLOOR_NAME[z.floor] : 'Outdoors';
  }
  if (can('checklist')) {
    // the last finished checklist with an item for this place
    const last = runs().filter(r => r.status === 'completed' && (r.items || []).some(it => zonesOfItem(it.text).includes(id)))
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0];
    if (last) { f.checked = dayOf(last.completedAt) || fmtDay(last.date); f.checkedBy = who(last.completedBy); f.checkedType = { checkin: 'check-in checklist', checkout: 'check-out checklist', daily: 'daily rounds' }[last.type] || 'checklist'; }
    const here = issuesHere(id), since = Date.now() - 90 * 864e5;
    const fixed = here.filter(i => i.status === 'fixed' && i.fixedAt >= since).sort((a, b) => b.fixedAt - a.fixedAt);
    f.open = here.filter(i => i.status !== 'fixed').length; f.urgent = here.some(i => i.status !== 'fixed' && i.urgency === 'urgent');
    f.fixed90 = fixed.length; f.lastFix = fixed[0] || null; f.everReported = here.length;
  }
  return f;
}
function factsHtml(id) {
  const f = factsOf(id), rows = [];
  if (f.size) rows.push(['Size', f.size]);
  if (f.floor) rows.push(['Where', f.floor]);
  if (can('checklist')) {
    rows.push(['Last checked', f.checked ? `${f.checked} · ${f.checkedType}${f.checkedBy ? ' · ' + f.checkedBy : ''}` : 'No finished checklist covers it']);
    rows.push(['Fixed · 90 days', f.fixed90 ? `${f.fixed90} · last ${dayOf(f.lastFix.fixedAt)}` : 'None']);
  }
  return rows.length ? `<dl class="v3-facts">${rows.map(([k, v]) => `<div><dt>${esc(t(k))}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';
}
// The next 14 nights at a glance: who holds each night (from the bookings).
function nightsStrip() {
  const T = todayISO(), all = stays(), cells = [];
  for (let i = 0; i < 14; i++) {
    const day = addDays(T, i), s = all.find(x => x.checkin <= day && x.checkout > day);
    const wd = new Date(day + 'T00:00:00Z').getUTCDay(), lbl = fmtDay(day);
    const cls = s ? (s.type === 'ota' ? 'ota' : 'bk') + (s.checkin === day ? ' first' : '') : 'free';
    const title = s ? `${lbl} · ${s.guest || 'Booked'}` : `${lbl} · free`;
    cells.push(s ? `<a class="v3-n ${cls}" href="${esc(stayHref(s))}" title="${esc(title)}" style="--i:${i}"><span>${new Date(day + 'T00:00:00Z').getUTCDate()}</span></a>`
      : `<span class="v3-n free${wd === 0 || wd === 6 ? ' we' : ''}" title="${esc(title)}" style="--i:${i}"><span>${new Date(day + 'T00:00:00Z').getUTCDate()}</span></span>`);
  }
  const booked = cells.filter(c => !c.includes('free')).length;
  return `<h3>Next 14 nights <small>${booked} booked · ${14 - booked} free</small></h3><div class="v3-nights" role="img" aria-label="${booked} of the next 14 nights booked">${cells.join('')}</div>
    <p class="v3-key"><i class="bk"></i>Direct <i class="ota"></i>OTA <i class="free"></i>Free</p>`;
}

// ── Side panel ───────────────────────────────────────────────────────────────
function select(id) {
  if (id === 'bedrooms') id = 'bed2';
  selected = id;
  if (id !== 'overview' && renderer) {
    // a room: look inside, on its floor (the stairs stay on the floor you're on)
    const rooms = LAYOUT.filter(z => (z.same || z.id) === id);
    if (rooms.length) {
      if (!rooms.some(z => z.floor === FLOOR)) FLOOR = rooms[0].floor;
      document.querySelectorAll('[data-floor]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.floor === FLOOR)));
      setView(VIEW === 'plan' ? 'plan' : 'cutaway');
    } else { const f = focusOf(id); if (f && VIEW !== 'plan') flyTo(f.pos, f.target); }
  }
  if (id === 'overview' && renderer) flyTo(VIEWS[VIEW].pos, VIEWS[VIEW].target);
  updateTiles(); buildLabels(); renderPanel();
  if (innerWidth < 900) $('#panel').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
}
const stayHref = s => s.type === 'ota' ? (can('bookings') ? 'stay.html?hold=' + encodeURIComponent(s.no) : 'guest-register.html') : can('bookings') ? 'stay.html?open=' + encodeURIComponent(s.no) : 'guest-register.html';
const payPill = s => !can('guestRegister') ? '' : s.type === 'ota' ? '<span class="pill">Details pending</span>'
  : s.due > 0 ? `<span class="pill warn">${inr(s.due)} due</span>` : '<span class="pill good">Paid</span>';
function stayCard(s, what) {
  const pct = s.stayTotal > 0 ? Math.min(100, Math.round(s.stayPaid / s.stayTotal * 100)) : 0;
  const bar = can('guestRegister') && s.type !== 'ota' && s.stayTotal > 0 ? `<span class="v3-pay" title="${esc(inr(s.stayPaid))} of ${esc(inr(s.stayTotal))} received"><i style="--w:${pct}%"></i></span><small>${esc(inr(s.stayPaid))} of ${esc(inr(s.stayTotal))} received${s.nights ? ' · ' + s.nights + ' night' + (s.nights > 1 ? 's' : '') : ''}${s.arrivalTime && s.checkin >= todayISO() ? ' · arriving ' + esc(s.arrivalTime) : ''}</small>` : '';
  return `<a class="v3-row" href="${esc(stayHref(s))}"><span class="v3-row__m"><b data-no-i18n>${esc(s.guest || 'Guest')}</b><small>${esc(what)} · ${fmtDay(s.checkin)} → ${fmtDay(s.checkout)} · ${s.guests ? esc(s.guests) + ' guests' : ''}${s.bedrooms ? ' · ' + esc(s.bedrooms) + ' BR' : ''}${s.channel ? ' · ' + esc(s.channel) : ''}</small>${bar}</span>${payPill(s)}</a>`;
}
function issueRow(i) {
  return `<a class="v3-row" href="issues.html?id=${encodeURIComponent(i.id)}"><span class="v3-row__m"><b data-no-i18n>${esc(i.title)}</b><small>${i.urgency === 'urgent' ? '<span class="urg">Urgent</span> · ' : ''}${esc(i.area || 'No area given')} · reported ${ago(i.reportedAt)} · assignee not tracked</small></span><span class="pill ${i.urgency === 'urgent' ? 'bad' : 'warn'}">Open</span></a>`;
}
function itemRows(items, src) {
  return items.map(it => `<li class="${it.checked ? 'ok' : ''}"><span aria-hidden="true">${it.checked ? '✓' : '○'}</span> ${esc(it.text)}${it.note ? ` <em>— ${esc(it.note)}</em>` : ''}</li>`).join('') + `<li class="src">${esc(src)}</li>`;
}
function renderPanel() {
  const P = $('#panelBody'), d = DERIVED;
  if (!d) { P.innerHTML = '<p class="v3-muted">Loading…</p>'; return; }
  if (!selected || selected === 'overview') {
    const parts = [`<h2>RYST 109A <small>Pearl Beach, Cheyyur</small></h2>`];
    if (!can('guestRegister')) parts.push('<p class="v3-muted">Bookings are hidden — your access doesn\'t include the Bookings page.</p>');
    else if (ERR.reg) parts.push(`<p class="v3-err">Bookings: ${esc(ERR.reg)}</p>`);
    else {
      if (d.inHouse) parts.push('<h3>Current stay</h3>' + stayCard(d.inHouse, 'In house'));
      if (d.leavingToday && d.leavingToday !== d.inHouse) parts.push('<h3>Leaving today</h3>' + stayCard(d.leavingToday, 'Check-out today'));
      if (d.next) parts.push('<h3>Next check-in</h3>' + stayCard(d.next, 'Arriving'));
      if (!d.inHouse && !d.next) parts.push('<p class="v3-muted">No current or upcoming stays.</p>');
      const gh = guestsHere(), ct = renderer ? PEOPLE.find(p => p.kind === 'caretaker') : null;
      if (renderer && (gh || ct)) parts.push(`<p class="v3-muted small">On the model: ${gh ? `${gh.n} guest${gh.n === 1 ? '' : 's'} (${gh.counted ? 'checked-in count' : 'from the booking'}; where each one is follows the time of day)` : 'no guests'}${ct ? ` · caretaker${ct.name ? ' ' + esc(ct.name) : ''}: ${esc(ct.label)}` : ''}.</p>`);
      parts.push(nightsStrip());
    }
    if (can('checklist') && d.prepFor) {
      const r = d.ciRun, n = r ? r.items.filter(i => i.checked).length : 0;
      parts.push(`<h3>Housekeeping</h3><p>${r ? `Check-in checklist for ${esc(fmtDay(d.prepFor.checkin))}: <b>${n}/${r.items.length}</b>${r.status === 'completed' ? ' — done' : ''}` : `Check-in checklist for ${esc(fmtDay(d.prepFor.checkin))} not started.`}</p>
        <a class="btn" href="checklist.html?start=checkin&stay=${encodeURIComponent(d.prepFor.no)}&guest=${encodeURIComponent(d.prepFor.guest || '')}">${r ? 'Open checklist' : 'Start checklist'}</a>`);
    }
    if (d.unplaced.length) parts.push('<h3>Issues not tied to a place</h3>' + d.unplaced.map(issueRow).join('') + '<p class="v3-muted small">Add an area (e.g. "Bedroom 2", "Pool") when reporting, and it appears on the model.</p>');
    parts.push('<p class="v3-muted small">Select a room or amenity on the model, or from the list below.</p>' + zoneList());
    P.innerHTML = parts.join(''); return;
  }
  const z = ZONE[selected], st = zoneState(selected), hk = d.hk[selected], iss = d.iss[selected] || [];
  const stockKey = /^bed/.test(selected) ? 'bed' : selected;
  const parts = [`<button type="button" class="v3-back" data-back>← Villa overview</button><h2>${esc(t(z.name))}${z.note ? `<small>${esc(z.note)}</small>` : ''}</h2>`,
    `<p class="v3-state"><span class="v3-dot s-${st.key}" aria-hidden="true">${STATE_STYLE[st.key].icon}</span> ${esc(st.label)}</p>`, factsHtml(selected)];
  if (/^bed/.test(selected) && can('guestRegister')) {
    if (d.inHouse) parts.push('<h3>Stay</h3>' + stayCard(d.inHouse, 'In house') + '<p class="v3-muted small">The villa is booked whole — Harbour records the number of bedrooms booked, not which ones.</p>');
    else if (d.next) parts.push('<h3>Next stay</h3>' + stayCard(d.next, 'Arriving'));
  }
  if (can('checklist')) {
    if (hk && hk.checkin.length && d.prepFor) parts.push(`<h3>Check-in checklist · ${esc(fmtDay(d.prepFor.checkin))}</h3><ul class="v3-items">${itemRows(hk.checkin, 'From the check-in checklist for ' + (d.prepFor.guest || 'the next stay'))}</ul>`);
    else if (d.prepFor && /^bed/.test(selected)) parts.push(`<h3>Housekeeping</h3><p class="v3-muted">The check-in checklist for ${esc(fmtDay(d.prepFor.checkin))} hasn't been started.</p>`);
    if (hk && hk.daily.length) parts.push(`<h3>Daily rounds · today</h3><ul class="v3-items">${itemRows(hk.daily, "From today's daily rounds")}</ul>`);
    if (!(hk && (hk.checkin.length || hk.daily.length)) && !/^bed/.test(selected)) parts.push('<p class="v3-muted small">No checklist item covers this place yet — add one in Settings → Checklists to track it here.</p>');
    parts.push(`<h3>Maintenance</h3>${iss.length ? iss.map(issueRow).join('') : '<p class="v3-muted">No open issues here.</p>'}<a class="btn" href="issues.html?area=${encodeURIComponent(z.name)}#report">Report an issue here</a>`);
  } else parts.push('<p class="v3-muted">Housekeeping and maintenance are hidden — your access doesn\'t include Checklists.</p>');
  if (can('inventory') && d.stock[stockKey]) parts.push('<h3>Low stock</h3>' + d.stock[stockKey].map(i => `<a class="v3-row" href="inventory.html"><span class="v3-row__m"><b data-no-i18n>${esc(i.name)}</b><small>${esc(i.quantity)} ${esc(i.unit || '')} left · restock at ${esc(i.threshold)}</small></span><span class="pill warn">Low</span></a>`).join(''));
  P.innerHTML = parts.join('');
}
function zoneList() {
  return '<div class="v3-zlist" role="list">' + ZONES.map(z => { const st = zoneState(z.id); return `<button type="button" role="listitem" class="v3-z" data-zone="${z.id}"><span class="v3-dot s-${st.key}" aria-hidden="true">${STATE_STYLE[st.key].icon}</span><span>${esc(t(z.name))}</span><small>${esc(st.label)}</small></button>`; }).join('') + '</div>';
}
$('#panel').addEventListener('click', e => {
  if (e.target.closest('[data-back]')) return select('overview');
  const z = e.target.closest('.v3-z[data-zone]'); if (z) select(z.dataset.zone);
});

// ── KPIs, legend, drawer ─────────────────────────────────────────────────────
function rangeLabel() { return RANGE.from === RANGE.to ? fmtDay(RANGE.from) : fmtDay(RANGE.from) + ' – ' + fmtDay(RANGE.to); }
function renderKpis() {
  const d = DERIVED, k = [];
  const reg = can('guestRegister'), cl = can('checklist');
  k.push(kpi('Arrivals', reg ? (ERR.reg ? '—' : d.arrivals.length) : '—', reg ? rangeLabel() : 'No access'));
  k.push(kpi('Departures', reg ? (ERR.reg ? '—' : d.departures.length) : '—', reg ? rangeLabel() : 'No access'));
  k.push(kpi('In house now', reg ? (d.inHouse ? (d.inHouse.guests || '✓') : '0') : '—', reg ? (d.inHouse ? 'guests · out ' + fmtDay(d.inHouse.checkout) : 'villa free tonight') : 'No access'));
  k.push(kpi('Open issues', cl ? (ERR.issues ? '—' : openIssues().length) : '—', cl ? openIssues().filter(i => i.urgency === 'urgent').length + ' urgent · now' : 'No access', cl && openIssues().some(i => i.urgency === 'urgent')));
  k.push(kpi('Check-ins to prepare', cl && reg ? d.checklistsDue.length : '—', cl && reg ? 'checklist not done · ' + rangeLabel() : 'No access'));
  if (can('reports')) {
    const m = D.metrics;
    k.push(kpi('Booked', m ? inr(m.revenue) : ERR.metrics ? '—' : '…', m ? 'check-ins ' + rangeLabel() : ERR.metrics || ''));
    k.push(kpi('Received', m ? inr(m.received) : '—', m ? (m.due > 0 ? inr(m.due) + ' still due' : 'nothing due') : ''));
    if (m && m.occupancy != null) k.push(kpi('Occupancy', m.occupancy + '%', (m.nights || 0) + ' night' + (m.nights === 1 ? '' : 's') + ' booked · ' + rangeLabel()));
  }
  $('#kpis').innerHTML = k.join('');
}
const kpi = (l, v, s, alert) => `<div class="v3-kpi${alert ? ' alert' : ''}"><span>${esc(t(l))}</span><b>${esc(v)}</b><small>${esc(s)}</small></div>`;
function renderLegend() {
  $('#legend').innerHTML = Object.entries(STATE_STYLE).map(([k, s]) => `<span><i class="v3-dot s-${k}" aria-hidden="true">${s.icon}</i>${esc(t(s.text))}</span>`).join('');
}
function renderDrawer() {
  const d = DERIVED;
  const act = [];
  if (can('guestRegister')) {
    const ev = [...d.arrivals.map(s => ({ d: s.checkin, s, w: 'Check-in' })), ...d.departures.map(s => ({ d: s.checkout, s, w: 'Check-out' }))].sort((a, b) => a.d.localeCompare(b.d));
    act.push(ev.length ? ev.map(e => stayCard(e.s, e.w + ' ' + fmtDay(e.d))).join('') : `<p class="v3-muted">No check-ins or check-outs ${RANGE.kind === 'today' ? 'today' : 'in these dates'}.</p>`);
  } else act.push('<p class="v3-muted">Your access doesn\'t include the Bookings page.</p>');
  $('#actList').innerHTML = act.join('');
  $('#mtList').innerHTML = !can('checklist') ? '<p class="v3-muted">Your access doesn\'t include Checklists.</p>'
    : ERR.issues ? `<p class="v3-err">${esc(ERR.issues)}</p>` : openIssues().length ? openIssues().slice(0, 12).map(issueRow).join('') : '<p class="v3-muted">No open issues.</p>';
}
function renderAll() { if (renderer) buildPeople(); renderKpis(); renderLegend(); renderDrawer(); renderPanel(); if (renderer) { updateTiles(); buildLabels(); syncCar(); } else renderPlanSvg(); }

// ── Without WebGL: the same places as a clickable plan ──────────────────────
function renderPlanSvg() {
  const fl = FLOOR, items = LAYOUT.filter(z => z.floor === fl && !z.same).concat(fl === 0 ? OUTDOOR : []);
  const pad = 1, minX = Math.min(...items.map(z => z.x)) - pad, minZ = Math.min(...items.map(z => z.z)) - pad;
  const W = Math.max(...items.map(z => z.x + z.w)) + pad - minX, H = Math.max(...items.map(z => z.z + z.d)) + pad - minZ;
  $('#fallback').innerHTML = `<div class="v3-fb-head"><b>Floor plan</b> <span class="v3-muted small">3D isn't available on this device, so here is the plan.</span>
    <span class="v3-seg"><button type="button" data-ffloor="0" aria-pressed="${fl === 0}">Ground</button><button type="button" data-ffloor="1" aria-pressed="${fl === 1}">First</button><button type="button" data-ffloor="2" aria-pressed="${fl === 2}">Second</button></span></div>
    <svg viewBox="0 0 ${W * 10} ${H * 10}" role="img" aria-label="Floor plan of RYST 109A">` + items.map(z => { const st = zoneState(z.id);
      return `<g class="v3-svgz s-${st.key}${selected === z.id ? ' on' : ''}" data-zone="${z.id}" tabindex="0" role="button" aria-label="${esc(z.name)}: ${esc(st.label)}"><rect x="${(z.x - minX) * 10}" y="${(z.z - minZ) * 10}" width="${z.w * 10}" height="${z.d * 10}" rx="6"/><text x="${(z.x - minX + z.w / 2) * 10}" y="${(z.z - minZ + z.d / 2) * 10 - 7}">${esc(z.name)}</text><text class="st" x="${(z.x - minX + z.w / 2) * 10}" y="${(z.z - minZ + z.d / 2) * 10 + 9}">${esc(st.label)}</text></g>`; }).join('') + '</svg>';
}
$('#fallback').addEventListener('click', e => {
  const f = e.target.closest('[data-ffloor]'); if (f) { FLOOR = +f.dataset.ffloor; return renderPlanSvg(); }
  const g = e.target.closest('[data-zone]'); if (g) { select(g.dataset.zone); renderPlanSvg(); }
});
$('#fallback').addEventListener('keydown', e => { const g = e.target.closest('[data-zone]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(g.dataset.zone); renderPlanSvg(); } });

// ── Controls ─────────────────────────────────────────────────────────────────
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { if (renderer) { setView(b.dataset.view); buildLabels(); } }));
document.querySelectorAll('[data-floor]').forEach(b => b.addEventListener('click', () => { if (renderer) { setFloor(+b.dataset.floor); buildLabels(); } }));
$('#btnReset').addEventListener('click', () => { selected = null; if (renderer) setView('overview'); renderAll(); });
$('#btnEvening').addEventListener('click', e => { EVENING = !EVENING; e.currentTarget.setAttribute('aria-pressed', String(EVENING)); if (renderer) { applyLighting(); buildPeople(); } kick(); });
$('#btnMotion').addEventListener('click', e => { const still = document.documentElement.classList.toggle('v3-still'); e.currentTarget.setAttribute('aria-pressed', String(still)); try { localStorage.setItem('ryst_v3_still', still ? '1' : ''); } catch (x) {} needRender = true; kick(); });
if (ls('ryst_v3_still')) { document.documentElement.classList.add('v3-still'); $('#btnMotion').setAttribute('aria-pressed', 'true'); }
document.querySelectorAll('[data-range]').forEach(b => b.addEventListener('click', async () => {
  document.querySelectorAll('[data-range]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  $('#customRange').hidden = b.dataset.range !== 'custom';
  if (b.dataset.range === 'custom') { $('#rFrom').value = RANGE.from; $('#rTo').value = RANGE.to; return; }
  setRange(b.dataset.range); await refreshRange();
}));
$('#rApply').addEventListener('click', async () => {
  const f = $('#rFrom').value, to = $('#rTo').value;
  if (!f || !to || to < f) { $('#rErr').textContent = 'Pick a start and an end date'; return; }
  $('#rErr').textContent = ''; setRange('custom', f, to); await refreshRange();
});
async function refreshRange() { DERIVED = derive(); renderAll(); await loadMetrics(); renderKpis(); }
document.querySelectorAll('[data-layer]').forEach(b => b.addEventListener('click', () => {
  LAYER = b.dataset.layer; document.querySelectorAll('[data-layer]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  if (renderer) { updateTiles(); buildLabels(); } else renderPlanSvg();
}));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && selected) select('overview'); });

// Free the GPU memory when leaving the page (the app keeps pages in memory on phones).
addEventListener('pagehide', () => {
  if (!renderer) return;
  scene.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => x.dispose()); });
  controls.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer = null;
});
addEventListener('pageshow', e => { if (e.persisted && !renderer) location.reload(); });

// after sunset the model is lit for the evening (the button still switches it)
{ const m = new Date(Date.now() + 5.5 * 3600e3), hm = m.getUTCHours() * 60 + m.getUTCMinutes(); if (hm >= 18 * 60 + 30 || hm < 6 * 60) { EVENING = true; $('#btnEvening').setAttribute('aria-pressed', 'true'); } }
// ── Start ────────────────────────────────────────────────────────────────────
renderLegend();
if (webglOK() && !/[?&]lite=1/.test(location.search)) {
  try { initScene(); $('#stageLoad').hidden = true; }
  catch (e) { console.warn('3D view unavailable:', e && e.message); renderer = null; $('#stageLoad').hidden = true; $('#fallback').hidden = false; stage.classList.add('v3-nogl'); }
} else { $('#stageLoad').hidden = true; $('#fallback').hidden = false; stage.classList.add('v3-nogl'); }
loadAll();
// the same refresh as the dashboard: when the app comes back to the front
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - (window.__v3loaded || 0) > 60e3) { window.__v3loaded = Date.now(); loadAll(); } });
window.__v3loaded = Date.now();
let lastHour = istHour();
setInterval(() => { if (istHour() !== lastHour) { lastHour = istHour(); buildPeople(); renderPanel(); } }, 10 * 60e3);
