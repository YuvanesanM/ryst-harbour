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

// ── The villa, room by room (metres; x east, z towards the street) ──────────
// Conceptual: drawn from the façade photo and what the villa has, not from
// a surveyed plan. `match` decides which checklist items and issues belong
// to a place (an issue's "area" and title are searched, most specific first).
const FLOOR_H = 3.2;
const LAYOUT = [
  // ground floor
  { id: 'living', name: 'Living room', floor: 0, x: -9, z: -5, w: 7, d: 6, note: '65-inch TV', match: ['living', 'television', '\\btv\\b', 'sofa'] },
  { id: 'dining', name: 'Dining', floor: 0, x: -2, z: -5, w: 5, d: 6, match: ['dining'] },
  { id: 'kitchen', name: 'Kitchen', floor: 0, x: 3, z: -5, w: 6, d: 6, note: 'Fully equipped', match: ['kitchen', 'fridge', 'stove', '\\bgas\\b', 'microwave', 'induction', 'utensil', 'cutlery'] },
  { id: 'rec', name: 'Recreation hall', floor: 0, x: -3, z: 1, w: 7, d: 4.5, note: 'Table tennis, foosball, darts, board games', match: ['recreation', 'table tennis', 'foosball', 'dart', 'board game', 'carrom', '\\bgames?\\b'] },
  { id: 'bed1', name: 'Bedroom 1', floor: 0, x: -9, z: 1, w: 6, d: 4.5, bath: true, match: ['bedroom ?1\\b', '\\broom ?1\\b'] },
  { id: 'lift', name: 'Lift & stairs', floor: 0, x: 4, z: 1, w: 2.4, d: 4.5, match: ['\\blift\\b', 'elevator', 'stair'] },
  { id: 'powder', name: 'Powder room', floor: 0, x: 6.4, z: 1, w: 2.6, d: 4.5, match: ['powder room'] },
  // first floor
  { id: 'bed2', name: 'Bedroom 2', floor: 1, x: -9, z: -5, w: 6, d: 5.5, bath: true, match: ['bedroom ?2\\b', '\\broom ?2\\b'] },
  { id: 'bed3', name: 'Bedroom 3', floor: 1, x: -3, z: -5, w: 6, d: 5.5, bath: true, match: ['bedroom ?3\\b', '\\broom ?3\\b'] },
  { id: 'bed4', name: 'Bedroom 4', floor: 1, x: 3, z: -5, w: 6, d: 5.5, bath: true, match: ['bedroom ?4\\b', '\\broom ?4\\b'] },
  { id: 'balcony', name: 'Chess balcony & lounge', floor: 1, x: -9, z: 0.5, w: 13, d: 4.5, match: ['balcony', 'terrace', '\\bchess\\b'] },
  { id: 'lift1', name: 'Lift & stairs', floor: 1, x: 4, z: 0.5, w: 2.4, d: 4.5, same: 'lift' },
];
// Outdoors — the same idea, placed around the house.
const OUTDOOR = [
  { id: 'pool', name: 'Swimming pool', x: -4, z: -12, w: 7, d: 3.8, note: 'About 22 × 12 ft, up to 4.5 ft deep', match: ['\\bpool\\b(?! deck)', 'swim', 'chlorine', 'skimm'] },
  { id: 'jacuzzi', name: 'Jacuzzi', x: 3.2, z: -11.6, w: 2, d: 2, note: 'Corner of the pool', match: ['jacuzzi', '\\bspa\\b'] },
  { id: 'deck', name: 'Pool deck & lounge', x: -9, z: -13.5, w: 4.5, d: 6, match: ['pool deck', 'lounger', '\\bdeck\\b', 'pool towel', 'ashtray', 'seating'] },
  { id: 'screen', name: 'Outdoor LED screen', x: 6, z: -12.5, w: 1, d: 3.4, note: '150-inch, beside the jacuzzi', match: ['\\bled\\b', 'screen', 'projector'] },
  { id: 'parking', name: 'Parking', x: 10, z: -1, w: 6, d: 9, note: 'Under the porch, gated', match: ['parking', '\\bcar\\b', '\\bgate', 'vehicle'] },
  { id: 'garden', name: 'Garden & lawn', x: -14, z: -9, w: 4, d: 16, match: ['lawn', 'garden', 'grass', '\\btrees?\\b', 'plants?\\b', 'leaves'] },
];
// Villa-wide systems: issues and checks about the whole house.
const SYSTEMS = { id: 'systems', name: 'Villa systems', note: 'AC, Wi-Fi, power, water', match: ['\\ba\\.?c\\b', 'air ?con', 'wi-?fi', 'internet', 'power', 'generator', 'inverter', '\\bups\\b', 'water tank', 'motor', 'electric', 'lights?\\b', 'fans?\\b'] };
const ZONES = [...LAYOUT.filter(z => !z.same), ...OUTDOOR, SYSTEMS];
const ZONE = Object.fromEntries(ZONES.map(z => [z.id, z]));
ZONES.forEach(z => { z.re = (z.match || []).map(m => new RegExp(m, 'i')); });
// Most specific first, so "pool deck" isn't the pool and "jacuzzi" isn't the pool.
const MATCH_ORDER = ['deck', 'jacuzzi', 'screen', 'bed1', 'bed2', 'bed3', 'bed4', 'powder', 'pool', 'kitchen', 'dining', 'rec', 'living', 'balcony', 'lift', 'parking', 'garden', 'systems'];
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
  wall: M(0xf6f2ea), wallIn: M(0xefe9df), trim: M(0xdedbd3), glass: M(0x9fb8c4, { roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.55 }),
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
  resize();
  new ResizeObserver(resize).observe(stage);
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
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

function buildSite() {
  const g = new THREE.Group(); scene.add(g); groups.site = g;
  const plot = box(44, 0.4, 40, MAT.ground, 0, -0.2, -3, g); plot.castShadow = false;
  const lawn = box(5, 0.05, 20, MAT.lawn, -14, 0.03, -7, g); lawn.castShadow = false;
  const lawn2 = box(30, 0.05, 3, MAT.lawn, 0, 0.03, -18.3, g); lawn2.castShadow = false;
  const drive = box(7, 0.06, 13, MAT.path, 13, 0.03, 3, g); drive.castShadow = false;
  const road = box(60, 0.1, 6, MAT.road, 0, 0.0, 20, g); road.castShadow = false;
  const kerb = box(60, 0.2, 0.4, MAT.trim, 0, 0.1, 16.8, g); kerb.castShadow = false;
  // beach and sea behind the villa (Pearl Beach)
  const beach = box(70, 0.3, 14, MAT.sand, 0, -0.25, -29, g); beach.castShadow = false;
  const seaGeo = new THREE.PlaneGeometry(90, 40, 40, 16); seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(seaGeo, MAT.sea); sea.position.set(0, -0.35, -55); sea.receiveShadow = true; g.add(sea);
  animated.push({ kind: 'waves', mesh: sea, base: seaGeo.attributes.position.array.slice(), amp: 0.12, speed: 0.6 });
  // compound wall with the perforated screen, and the black gate (as in the photo)
  box(17, 1.4, 0.35, MAT.wall, -6.5, 0.7, 9, g);
  const screen = box(17, 1.1, 0.12, MAT.trim, -6.5, 1.95, 9, g); screen.material = M(0xf3f0ea, { transparent: true, opacity: 0.85 });
  box(7, 2.5, 0.2, MAT.gate, 13, 1.25, 9.2, g);
  box(0.35, 1.4, 25, MAT.wall, -16.2, 0.7, -3.5, g);
  box(0.35, 1.4, 25, MAT.wall, 16.6, 0.7, -3.5, g);
  // name sign
  const sign = box(2.6, 0.5, 0.06, MAT.dark, 0.5, 1.0, 9.22, g); sign.castShadow = false;
  // wall washers (evening)
  [-12, -6, -1].forEach(x => { const l = box(0.2, 0.12, 0.12, MAT.lamp, x, 1.3, 9.25, g); l.castShadow = false; evenLamps.push(l); });
}

function walls(z0, parent, y0, h, full) {
  // four walls around a room; low in the cutaway so you can look in
  const { x, z, w, d } = z0, th = 0.14, H = full ? h : 1.1;
  const m = MAT.wallIn;
  box(w, H, th, m, x + w / 2, y0 + H / 2, z, parent);
  box(w, H, th, m, x + w / 2, y0 + H / 2, z + d, parent);
  box(th, H, d, m, x, y0 + H / 2, z + d / 2, parent);
  box(th, H, d, m, x + w, y0 + H / 2, z + d / 2, parent);
}
function furniture(zone, parent, y0) {
  const cx = zone.x + zone.w / 2, cz = zone.z + zone.d / 2;
  if (/^bed/.test(zone.id)) {
    box(2.0, 0.45, 2.2, MAT.bed, cx - 0.6, y0 + 0.25, cz, parent);
    box(2.1, 1.0, 0.15, MAT.bedHead, cx - 0.6, y0 + 0.5, cz - 1.15, parent);
    box(1.6, 0.18, 0.4, MAT.cushion, cx - 0.6, y0 + 0.55, cz - 0.85, parent);
    // attached bathroom
    const bx = zone.x + zone.w - 1.4, bz = zone.z + 0.1;
    const bath = box(1.3, 0.04, 2.0, M(0xd6e3e6), bx + 0.65, y0 + 0.04, bz + 1.0, parent); bath.castShadow = false;
    box(0.1, 1.1, 2.0, MAT.wallIn, bx, y0 + 0.55, bz + 1.0, parent);
  } else if (zone.id === 'living') {
    box(3.2, 0.5, 0.9, MAT.fabric, cx, y0 + 0.3, cz + 1.2, parent);
    box(1.2, 0.35, 0.7, MAT.wood, cx, y0 + 0.2, cz, parent);
    box(1.6, 0.92, 0.06, MAT.screen, cx, y0 + 1.3, zone.z + 0.15, parent); // 65" TV
  } else if (zone.id === 'dining') {
    box(2.6, 0.08, 1.1, MAT.wood, cx, y0 + 0.75, cz, parent);
    [-1, -0.35, 0.35, 1].forEach(dx => { box(0.4, 0.5, 0.4, MAT.fabric, cx + dx, y0 + 0.25, cz - 0.85, parent); box(0.4, 0.5, 0.4, MAT.fabric, cx + dx, y0 + 0.25, cz + 0.85, parent); });
  } else if (zone.id === 'kitchen') {
    box(zone.w - 0.6, 0.9, 0.65, MAT.trim, cx, y0 + 0.45, zone.z + 0.45, parent);
    box(2.2, 0.9, 0.9, MAT.trim, cx, y0 + 0.45, cz + 0.6, parent);
    box(0.7, 1.9, 0.7, M(0xcfd3d6), zone.x + 0.6, y0 + 0.95, zone.z + 0.45, parent);
  } else if (zone.id === 'rec') {
    box(2.7, 0.08, 1.5, M(0x2f5f6e), cx - 1.2, y0 + 0.76, cz, parent); // table tennis
    box(0.05, 0.16, 1.5, MAT.trim, cx - 1.2, y0 + 0.88, cz, parent);
    box(1.2, 0.85, 0.7, MAT.wood, cx + 1.6, y0 + 0.43, cz - 0.6, parent); // foosball
    box(0.55, 0.55, 0.05, M(0x5b3b2e), cx + 2.6, y0 + 1.5, zone.z + zone.d - 0.12, parent); // darts
  } else if (zone.id === 'balcony') {
    box(0.9, 0.06, 0.9, MAT.wood, cx - 2, y0 + 0.7, cz, parent); // chess table
    box(2.8, 0.45, 0.8, MAT.fabric, cx + 2, y0 + 0.25, cz + 0.8, parent);
  } else if (zone.id === 'lift') {
    box(1.4, 2.6, 1.4, MAT.dark, cx, y0 + 1.3, cz - 0.8, parent);
  }
}
function buildHouse() {
  const ext = new THREE.Group(), cut = [new THREE.Group(), new THREE.Group()];
  scene.add(ext); cut.forEach(c => scene.add(c));
  groups.exterior = ext; groups.cut = cut;
  // slabs (shared by both views)
  const slabs = new THREE.Group(); scene.add(slabs); groups.slabs = slabs;
  box(18.6, 0.3, 10.6, MAT.slab, 0, 0.15, -0.2, slabs);
  groups.slab1 = box(18.6, 0.25, 10.6, MAT.slab, 0, FLOOR_H + 0.12, -0.5, slabs);
  // ── exterior shell (from the photo): ground block, the angled first-floor
  // block with the lit window band, stepped right wing, glass balcony, porch
  box(18, FLOOR_H, 10, MAT.wall, 0, FLOOR_H / 2 + 0.3, -0.2, ext);
  // first floor: left angled block
  const ang = new THREE.Shape(); ang.moveTo(-9.6, 0); ang.lineTo(3.2, 0); ang.lineTo(3.2, FLOOR_H + 0.2); ang.lineTo(-11.2, FLOOR_H + 0.2); ang.closePath();
  const angGeo = new THREE.ExtrudeGeometry(ang, { depth: 10, bevelEnabled: false }); angGeo.translate(0, 0, -5.2);
  const angM = new THREE.Mesh(angGeo, MAT.wall); angM.position.y = FLOOR_H + 0.25; angM.castShadow = angM.receiveShadow = true; ext.add(angM);
  // window band with downlights on the street side
  box(6.6, 1.6, 0.1, MAT.win, -3, FLOOR_H + 1.6, 4.86, ext);
  for (let i = 0; i < 6; i++) box(0.06, 1.6, 0.12, MAT.trim, -6.3 + i * 1.32, FLOOR_H + 1.6, 4.9, ext);
  [-5.6, -4.1, -2.6, -1.1].forEach(x => { const l = box(0.18, 0.08, 0.18, MAT.lamp, x, FLOOR_H + 2.55, 4.9, ext); l.castShadow = false; evenLamps.push(l); });
  // right wing, set back, with the glass balcony
  box(6, FLOOR_H, 8, MAT.wall, 6.2, FLOOR_H * 1.5 + 0.25, -1.5, ext);
  box(6.6, 0.25, 2.4, MAT.slab, 6.2, FLOOR_H + 0.25, 3.6, ext);
  box(6.6, 1.0, 0.06, MAT.glass, 6.2, FLOOR_H + 0.9, 4.8, ext);
  box(5.4, 1.4, 0.08, MAT.win, 6.2, FLOOR_H + 1.5, 2.48, ext);
  // terrace level
  box(5, 2.2, 5, MAT.wall, 4.5, FLOOR_H * 2 + 1.4, -2.5, ext);
  box(1.2, 0.8, 1.2, MAT.trim, 3.5, FLOOR_H * 2 + 2.9, -3.5, ext);
  // ground floor openings
  box(5, 2.2, 0.08, MAT.win, -4, 1.5, 4.82, ext);
  box(9, 2.2, 0.08, MAT.win, 0, 1.6, -5.32, ext);
  // the pool side: sliding doors below, a window for each bedroom above
  [-6, 0, 6].forEach(x => box(3.4, 1.5, 0.08, MAT.win, x, FLOOR_H + 1.8, -5.32, ext));
  box(18.4, 0.12, 0.6, MAT.trim, 0, FLOOR_H + 0.35, -5.5, ext);
  // porch over the parking
  box(7, 0.3, 9, MAT.slab, 12.5, FLOOR_H + 0.1, 3.2, ext);
  [[9.2, 7.4], [15.8, 7.4]].forEach(([x, z]) => box(0.35, FLOOR_H, 0.35, MAT.wall, x, FLOOR_H / 2, z, ext));
  [10.5, 12.5, 14.5].forEach(x => { const l = box(0.25, 0.06, 0.25, MAT.lamp, x, FLOOR_H - 0.06, 3, ext); l.castShadow = false; evenLamps.push(l); });

  // ── cutaway: each floor's rooms (floor tile = the place you can select)
  LAYOUT.forEach(z => {
    const parent = cut[z.floor], y0 = z.floor ? FLOOR_H + 0.25 : 0.3;
    const zone = z.same ? Object.assign({}, z, { id: z.same }) : z;
    const tile = new THREE.Mesh(new THREE.BoxGeometry(z.w - 0.1, 0.06, z.d - 0.1), M(0xe6dfd2));
    tile.position.set(z.x + z.w / 2, y0 + 0.03, z.z + z.d / 2); tile.receiveShadow = true;
    tile.userData.zone = zone.id; parent.add(tile); pickables.push(tile);
    (tiles[zone.id] = tiles[zone.id] || []).push(tile);
    walls(z, parent, y0, FLOOR_H, false);
    furniture(zone, parent, y0);
  });
  // the first floor sits on its slab; the cutaway floor selector shows/hides it
}
function palm(x, z, h, parent) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, h, 7), MAT.trunk);
  trunk.position.y = h / 2; trunk.rotation.z = 0.06; trunk.castShadow = true; g.add(trunk);
  const crown = new THREE.Group(); crown.position.y = h; g.add(crown);
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.6, 4, 1), MAT.frond);
    f.geometry.translate(0, 1.3, 0); f.rotation.set(1.25, (i / 7) * Math.PI * 2, 0, 'YXZ'); f.castShadow = true; crown.add(f);
  }
  animated.push({ kind: 'sway', obj: crown, phase: Math.random() * 6, amp: 0.05 });
}
function buildOutdoors() {
  const g = new THREE.Group(); scene.add(g); groups.out = g;
  // pool: coping, shell, water (gently moving), steps, jacuzzi corner
  const P = ZONE.pool, J = ZONE.jacuzzi;
  box(P.w + 1.2, 0.35, P.d + 1.2, MAT.trim, P.x + P.w / 2, 0.17, P.z + P.d / 2, g);
  const shell = box(P.w, 0.3, P.d, MAT.poolTile, P.x + P.w / 2, 0.2, P.z + P.d / 2, g); shell.castShadow = false;
  const wGeo = new THREE.PlaneGeometry(P.w, P.d, 24, 12); wGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wGeo, MAT.water); water.position.set(P.x + P.w / 2, 0.37, P.z + P.d / 2); water.userData.zone = 'pool'; g.add(water); pickables.push(water);
  animated.push({ kind: 'waves', mesh: water, base: wGeo.attributes.position.array.slice(), amp: 0.025, speed: 1.4 });
  const jac = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.5, 20), MAT.trim); jac.position.set(J.x + 1, 0.3, J.z + 1); jac.castShadow = true; g.add(jac);
  const jw = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.05, 20), MAT.water); jw.position.set(J.x + 1, 0.56, J.z + 1); jw.userData.zone = 'jacuzzi'; g.add(jw); pickables.push(jw);
  // deck loungers + outdoor seating
  for (let i = 0; i < 3; i++) { box(0.7, 0.3, 1.9, MAT.fabric, -8 + i * 1.1, 0.25, -9.6, g); box(0.7, 0.5, 0.15, MAT.fabric, -8 + i * 1.1, 0.45, -10.5, g); }
  box(2.4, 0.45, 0.8, MAT.wood, -7, 0.25, -14.3, g); box(1, 0.35, 1, MAT.wood, -7, 0.2, -13.2, g);
  const deck = box(ZONE.deck.w, 0.06, ZONE.deck.d, MAT.wood, ZONE.deck.x + ZONE.deck.w / 2, 0.06, ZONE.deck.z + ZONE.deck.d / 2, g);
  deck.userData.zone = 'deck'; pickables.push(deck);
  // the 150-inch LED screen
  const S = ZONE.screen; box(0.2, 2.2, 0.2, MAT.dark, S.x + 0.5, 1.1, S.z + 0.3, g); box(0.2, 2.2, 0.2, MAT.dark, S.x + 0.5, 1.1, S.z + 3.1, g);
  const scr = box(0.15, 1.9, 3.4, MAT.screen, S.x + 0.45, 2.1, S.z + 1.7, g); scr.userData.zone = 'screen'; pickables.push(scr);
  // parking: a car under the porch
  const Pk = ZONE.parking, park = box(Pk.w, 0.04, Pk.d, MAT.path, Pk.x + Pk.w / 2, 0.06, Pk.z + Pk.d / 2, g); park.userData.zone = 'parking'; pickables.push(park);
  box(1.9, 0.7, 4.2, M(0x5c6870, { roughness: 0.4 }), 13, 0.55, 2.5, g); box(1.7, 0.55, 2.2, M(0x2a3238, { roughness: 0.3 }), 13, 1.15, 2.3, g);
  const gd = ZONE.garden, gpick = new THREE.Mesh(new THREE.BoxGeometry(gd.w, 0.08, gd.d), new THREE.MeshBasicMaterial({ visible: false }));
  gpick.position.set(gd.x + gd.w / 2, 0.08, gd.z + gd.d / 2); gpick.userData.zone = 'garden'; g.add(gpick); pickables.push(gpick);
  // palms and shrubs
  [[-14.5, -15, 6.5], [-13.5, -3, 5.5], [-14.2, 5, 6], [10.5, -15.5, 6.2], [14.8, -9, 5.4], [-10, 7.5, 4.8], [15.2, -16, 5.8]].forEach(([x, z, h]) => palm(x, z, h, g));
  const shrubGeo = new THREE.IcosahedronGeometry(0.7, 0), shrubs = new THREE.InstancedMesh(shrubGeo, M(0x6f8f5c), 14), m4 = new THREE.Matrix4();
  [[-15, -12], [-15, -6], [-15, 0], [-15, 3], [-11, 8], [-8, 8], [-4, 8], [-1, 8], [9, -15], [12, -14], [15, -12], [15, -5], [15.5, 0], [-12, -17]]
    .forEach(([x, z], i) => { const s = 0.7 + ((i * 37) % 10) / 20; m4.compose(new THREE.Vector3(x, 0.45 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); shrubs.setMatrixAt(i, m4); });
  shrubs.castShadow = true; g.add(shrubs);
  // pool lights (evening)
  [[-3, -12.3], [2, -12.3], [-3, -7.9], [2, -7.9]].forEach(([x, z]) => { const l = box(0.18, 0.06, 0.18, MAT.lamp, x, 0.37, z, g); l.castShadow = false; evenLamps.push(l); });
  evenLamps.forEach(l => { l.visible = EVENING; });
}

// ── Views ────────────────────────────────────────────────────────────────────
const VIEWS = {
  // from the sea side, like the reference: beach and pool in front, the house behind
  overview: { pos: [-40, 44, -64], target: [0, 1, -5] },
  cutaway: { pos: [-38, 50, -52], target: [0, 1.5, -3] },
  plan: { pos: [0.01, 92, 0.5], target: [0, 0, -3] },
};
function setView(v, instant) {
  VIEW = v;
  const showExt = v === 'overview';
  groups.exterior.visible = showExt;
  groups.cut[0].visible = !showExt && (v === 'plan' ? FLOOR === 0 : true);
  groups.cut[1].visible = !showExt && FLOOR === 1;
  groups.slab1.visible = showExt || FLOOR === 1;
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  $('#floorSw').hidden = showExt;
  controls.maxPolarAngle = v === 'plan' ? 0.02 : Math.PI * 0.47;
  controls.minPolarAngle = v === 'plan' ? 0 : 0;
  controls.enableRotate = v !== 'plan';
  const tgt = selected && v !== 'plan' && v !== 'overview' ? focusOf(selected) : null;
  flyTo(tgt ? tgt.pos : VIEWS[v].pos, tgt ? tgt.target : VIEWS[v].target, instant || v === 'plan'); // the plan is always north-up
  updateTiles(); needRender = true; kick();
}
function setFloor(f) {
  FLOOR = f;
  document.querySelectorAll('[data-floor]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.floor === f)));
  setView(VIEW === 'overview' ? 'cutaway' : VIEW, false);
}
let fly = null;
function flyTo(pos, target, instant) {
  const p = new THREE.Vector3(...pos), tg = new THREE.Vector3(...target);
  if (instant || reduceMotion()) { camera.position.copy(p); controls.target.copy(tg); controls.update(); needRender = true; return; }
  fly = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p, tg };
  kick();
}
// Where to look when a place is chosen
function focusOf(id) {
  const lz = LAYOUT.find(z => (z.same || z.id) === id && (z.floor === FLOOR || !LAYOUT.some(q => (q.same || q.id) === id && q.floor === FLOOR)));
  const o = OUTDOOR.find(z => z.id === id);
  const z = lz || o; if (!z) return null;
  const cx = z.x + z.w / 2, cz = z.z + z.d / 2, y = lz && lz.floor ? FLOOR_H : 0;
  // keep the angle you're looking from; just come closer
  const dir = camera ? camera.position.clone().sub(controls.target).normalize() : new THREE.Vector3(-0.45, 0.55, -0.7).normalize();
  if (dir.y < 0.45) { dir.y = 0.45; dir.normalize(); }
  return { pos: [cx + dir.x * 34, y + dir.y * 34, cz + dir.z * 34], target: [cx, y, cz] };
}

// ── Picking ──────────────────────────────────────────────────────────────────
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let downAt = null;
function onDown(e) { downAt = { x: e.clientX, y: e.clientY }; }
function onUp(e) {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const vis = pickables.filter(m => { let o = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; });
  const hit = ray.intersectObjects(vis, false)[0];
  if (hit && hit.object.userData.zone) select(hit.object.userData.zone);
  else if (VIEW === 'overview') { // the house itself: look inside
    const houseHit = ray.intersectObject(groups.exterior, true)[0];
    if (houseHit) { setView('cutaway'); select('overview'); }
  }
}

// ── Render loop (only while something moves) ────────────────────────────────
function kick() { if (!running && renderer) { running = true; requestAnimationFrame(frame); } }
let last = 0;
function frame(now) {
  if (document.hidden) { running = false; return; }
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
  let moving = controls.update();
  if (fly) {
    fly.t = Math.min(1, fly.t + dt / 0.9); const k = 1 - Math.pow(1 - fly.t, 3);
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
      }
    });
  }
  if (moving || anim || needRender) { renderer.render(scene, camera); placeLabels(); needRender = false; }
  if (moving || anim || fly) requestAnimationFrame(frame); else running = false;
}
let STAGE_VISIBLE = true;
new IntersectionObserver(es => { STAGE_VISIBLE = es[0].isIntersecting; if (STAGE_VISIBLE) kick(); }).observe(stage);
function resize() {
  if (!renderer) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); needRender = true; kick();
}

// ── Status colours on the floor tiles ───────────────────────────────────────
function updateTiles() {
  Object.keys(tiles).forEach(id => {
    const st = zoneState(id), c = new THREE.Color(STATE_STYLE[st.key].color), base = new THREE.Color(0xe9e2d6);
    const show = LAYER === 'all' || LAYER === 'housekeeping' || (LAYER === 'maintenance' && st.key === 'attention') || (LAYER === 'bookings' && st.key === 'occupied');
    tiles[id].forEach(m => {
      m.material.color.copy(show ? base.clone().lerp(c, 0.55) : base);
      m.material.emissive = new THREE.Color(selected === id ? 0x5a4520 : 0x000000);
      m.material.emissiveIntensity = selected === id ? 0.35 : 0;
    });
  });
  needRender = true; kick();
}

// ── Floating labels (HTML buttons kept over their 3D spot) ──────────────────
let LABELS = [];
function anchorOf(id) {
  if (id === 'overview') return new THREE.Vector3(0, FLOOR_H * 2 + 3.4, -1);
  if (id === 'systems') return new THREE.Vector3(5, FLOOR_H * 2 + 3.2, -3);
  if (id === 'bedrooms') return new THREE.Vector3(-3, FLOOR_H * 2 + 0.6, 2);
  const f = focusOf(id); if (!f) return null;
  const lz = LAYOUT.find(z => (z.same || z.id) === id);
  const lift = { screen: 3.4, jacuzzi: 0.9, parking: FLOOR_H + 0.8 }[id];
  const y = lift != null ? lift : VIEW === 'overview' ? (lz ? (lz.floor ? FLOOR_H * 2 + 0.8 : FLOOR_H + 0.6) : 1.6) : (lz && lz.floor && FLOOR === 1 ? FLOOR_H + 1.6 : 1.5);
  return new THREE.Vector3(f.target[0], y, f.target[2]);
}
function buildLabels() {
  if (!renderer) { labelsEl.innerHTML = ''; LABELS = []; return; } // the plan without 3D has its own names
  const d = DERIVED, out = [];
  // the villa itself
  const hl = d && d.inHouse ? `In house · ${d.inHouse.guests || '?'} guests · out ${fmtDay(d.inHouse.checkout)}`
    : d && d.next ? `Next check-in ${fmtDay(d.next.checkin)}${d.next.guests ? ' · ' + d.next.guests + ' guests' : ''}` : can('guestRegister') ? 'No upcoming stays' : '';
  out.push({ id: 'overview', title: 'RYST 109A', sub: hl, kind: 'main' });
  const showHK = LAYER === 'all' || LAYER === 'housekeeping', showMT = LAYER === 'all' || LAYER === 'maintenance';
  if (VIEW === 'overview' && (LAYER !== 'maintenance')) {
    // the four bedrooms as one label here; each room is in the Inside and Plan views
    const sts = ['bed1', 'bed2', 'bed3', 'bed4'].map(zoneState), rank = ['attention', 'checkout', 'occupied', 'preparing', 'notprepared', 'ready', 'idle', 'untracked'];
    const worst = sts.slice().sort((a, b) => rank.indexOf(a.key) - rank.indexOf(b.key))[0];
    const same = sts.every(x => x.key === worst.key);
    const bi = ['bed1', 'bed2', 'bed3', 'bed4'].reduce((a, b) => a + ((d && d.iss[b]) || []).length, 0);
    out.push({ id: 'bedrooms', title: 'Bedrooms 1–4', sub: [worst.key === 'untracked' ? '' : same ? worst.label : sts.filter(x => x.key === worst.key).length + ' · ' + worst.label, bi ? bi + ' issue' + (bi > 1 ? 's' : '') : ''].filter(Boolean).join(' · '), state: worst.key, issues: bi });
  }
  const visibleIds = VIEW === 'overview' ? ['pool', 'jacuzzi', 'screen', 'parking', 'rec', 'kitchen', 'living', 'garden', 'systems', 'deck', 'balcony', 'dining', 'lift', 'powder', 'bed1', 'bed2', 'bed3', 'bed4']
    : LAYOUT.filter(z => z.floor === FLOOR && !z.same).map(z => z.id).concat(FLOOR === 0 || VIEW === 'cutaway' ? OUTDOOR.map(z => z.id) : []).concat(['systems']);
  visibleIds.forEach(id => {
    const z = ZONE[id], st = zoneState(id), n = (d && d.iss[id] || []).length;
    const important = st.key !== 'untracked' && st.key !== 'idle';
    // the overview keeps it calm: the main places, plus anywhere that needs someone
    if (VIEW === 'overview' && !(['pool', 'jacuzzi', 'screen', 'parking', 'rec'].includes(id) && !/^bed/.test(id)) && !(n && showMT && !/^bed/.test(id)) && !(n && LAYER === 'maintenance')) return;
    if (LAYER === 'maintenance' && !n) return;
    if (LAYER === 'bookings' && !/^bed/.test(id)) return;
    if (LAYER === 'housekeeping' && st.key === 'untracked' && !['pool', 'jacuzzi'].includes(id)) return;
    out.push({ id, title: z.name, sub: showMT && n ? `${n} issue${n > 1 ? 's' : ''}` + ((d.iss[id] || []).some(i => i.urgency === 'urgent') ? ' · urgent' : '') : (showHK || LAYER === 'bookings') && important ? st.label : '', state: st.key, issues: showMT ? n : 0 });
  });
  labelsEl.innerHTML = out.map((l, i) => `<button type="button" class="v3-lab${l.kind === 'main' ? ' v3-lab--main' : ''}${l.issues ? ' v3-lab--iss' : ''}${selected === l.id ? ' on' : ''}" data-i="${i}" data-zone="${esc(l.id)}">
    ${l.state ? `<span class="v3-dot s-${l.state}" aria-hidden="true">${STATE_STYLE[l.state].icon}</span>` : ''}<span class="v3-lab__t">${esc(t(l.title))}</span>${l.sub ? `<span class="v3-lab__s">${esc(l.sub)}</span>` : ''}</button>`).join('');
  LABELS = out.map((l, i) => ({ el: labelsEl.children[i], at: anchorOf(l.id) }));
  placeLabels();
}
const tmpV = new THREE.Vector3();
function placeLabels() {
  if (!camera) return;
  const w = stage.clientWidth, h = stage.clientHeight, rects = [];
  LABELS.forEach(L => {
    if (!L.at) { L.el.hidden = true; return; }
    tmpV.copy(L.at).project(camera);
    const x = (tmpV.x * 0.5 + 0.5) * w, y = (-tmpV.y * 0.5 + 0.5) * h;
    const off = tmpV.z > 1 || x < -40 || x > w + 40 || y < -20 || y > h + 20;
    L.el.hidden = off; if (off) return;
    L.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
    // keep labels from piling up: a label that lands on an earlier one is faded
    const r = { x: x - 60, y: y - 34, w: 120, h: 34 }, clash = rects.some(q => Math.abs(q.x - r.x) < 110 && Math.abs(q.y - r.y) < 30);
    L.el.classList.toggle('dim', clash && !L.el.classList.contains('on') && !L.el.classList.contains('v3-lab--main')); rects.push(r);
  });
}
labelsEl.addEventListener('click', e => { const b = e.target.closest('[data-zone]'); if (b) select(b.dataset.zone); });

// ── Side panel ───────────────────────────────────────────────────────────────
function select(id) {
  if (id === 'bedrooms') { if (renderer) { FLOOR = 1; document.querySelectorAll('[data-floor]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.floor === 1))); setView('cutaway'); } id = 'bed2'; }
  selected = id;
  if (id !== 'overview' && renderer) { const f = focusOf(id); if (f) { if (VIEW === 'overview' && LAYOUT.some(z => (z.same || z.id) === id)) { VIEW = 'cutaway'; const lz = LAYOUT.find(z => (z.same || z.id) === id); FLOOR = lz.floor; document.querySelectorAll('[data-floor]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.floor === FLOOR))); setView('cutaway'); } else if (VIEW !== 'plan') flyTo(f.pos, f.target); } }
  if (id === 'overview' && renderer) flyTo(VIEWS[VIEW].pos, VIEWS[VIEW].target);
  updateTiles(); buildLabels(); renderPanel();
  if (innerWidth < 900) $('#panel').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
}
const stayHref = s => s.type === 'ota' ? (can('bookings') ? 'stay.html?hold=' + encodeURIComponent(s.no) : 'guest-register.html') : can('bookings') ? 'stay.html?open=' + encodeURIComponent(s.no) : 'guest-register.html';
const payPill = s => !can('guestRegister') ? '' : s.type === 'ota' ? '<span class="pill">Details pending</span>'
  : s.due > 0 ? `<span class="pill warn">${inr(s.due)} due</span>` : '<span class="pill good">Paid</span>';
function stayCard(s, what) {
  return `<a class="v3-row" href="${esc(stayHref(s))}"><span class="v3-row__m"><b data-no-i18n>${esc(s.guest || 'Guest')}</b><small>${esc(what)} · ${fmtDay(s.checkin)} → ${fmtDay(s.checkout)} · ${s.guests ? esc(s.guests) + ' guests' : ''}${s.bedrooms ? ' · ' + esc(s.bedrooms) + ' BR' : ''}${s.channel ? ' · ' + esc(s.channel) : ''}</small></span>${payPill(s)}</a>`;
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
    `<p class="v3-state"><span class="v3-dot s-${st.key}" aria-hidden="true">${STATE_STYLE[st.key].icon}</span> ${esc(st.label)}</p>`];
  if (/^bed/.test(selected) && can('guestRegister')) {
    if (d.inHouse) parts.push('<h3>Stay</h3>' + stayCard(d.inHouse, 'In house') + '<p class="v3-muted small">The villa is booked whole — Harbour records the number of bedrooms booked, not which ones.</p>');
    else if (d.next) parts.push('<h3>Next stay</h3>' + stayCard(d.next, 'Arriving'));
  }
  if (can('checklist')) {
    if (hk && hk.checkin.length && d.prepFor) parts.push(`<h3>Check-in checklist · ${esc(fmtDay(d.prepFor.checkin))}</h3><ul class="v3-items">${itemRows(hk.checkin, 'From the check-in checklist for ' + (d.prepFor.guest || 'the next stay'))}</ul>`);
    else if (d.prepFor && /^bed/.test(selected)) parts.push(`<h3>Housekeeping</h3><p class="v3-muted">The check-in checklist for ${esc(fmtDay(d.prepFor.checkin))} hasn't been started.</p>`);
    if (hk && hk.daily.length) parts.push(`<h3>Daily rounds · today</h3><ul class="v3-items">${itemRows(hk.daily, "From today's daily rounds")}</ul>`);
    if (!(hk && (hk.checkin.length || hk.daily.length)) && !/^bed/.test(selected)) parts.push('<p class="v3-muted small">No checklist item covers this place yet — add one in Settings → Checklists to track it here.</p>');
    parts.push(`<h3>Maintenance</h3>${iss.length ? iss.map(issueRow).join('') : '<p class="v3-muted">No open issues here.</p>'}<a class="btn" href="issues.html#report">Report an issue</a>`);
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
function renderAll() { renderKpis(); renderLegend(); renderDrawer(); renderPanel(); if (renderer) { updateTiles(); buildLabels(); } else renderPlanSvg(); }

// ── Without WebGL: the same places as a clickable plan ──────────────────────
function renderPlanSvg() {
  const fl = FLOOR, items = LAYOUT.filter(z => z.floor === fl && !z.same).concat(fl === 0 ? OUTDOOR : []);
  const pad = 1, minX = Math.min(...items.map(z => z.x)) - pad, minZ = Math.min(...items.map(z => z.z)) - pad;
  const W = Math.max(...items.map(z => z.x + z.w)) + pad - minX, H = Math.max(...items.map(z => z.z + z.d)) + pad - minZ;
  $('#fallback').innerHTML = `<div class="v3-fb-head"><b>Floor plan</b> <span class="v3-muted small">3D isn't available on this device, so here is the plan.</span>
    <span class="v3-seg"><button type="button" data-ffloor="0" aria-pressed="${fl === 0}">Ground</button><button type="button" data-ffloor="1" aria-pressed="${fl === 1}">First</button></span></div>
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
$('#btnEvening').addEventListener('click', e => { EVENING = !EVENING; e.currentTarget.setAttribute('aria-pressed', String(EVENING)); if (renderer) applyLighting(); kick(); });
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
