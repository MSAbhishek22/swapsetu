// SwapSetu 3D — a working model of a city battery-swap network.
// Three.js r160 (vendored, see ../vendor). No build step.
//
// Model rules (plain, and stated in the README):
//  - Riders drain 1.15% battery per sim-minute of riding.
//  - At 25% charge a rider heads to the nearest station expected to
//    have a charged pack, and queues if it is busy or empty.
//  - A swap takes 0.75 sim-minutes. A station holds 10 packs and
//    recharges one pack every 4 sim-minutes.
//  - 1 real second = 1 sim-minute at 1x speed.

import * as THREE from 'three';

/* ================= config ================= */
const PITCH = 14;                 // distance between junctions
const JN = 8;                     // junctions per side (8x8 grid)
const jc = (k) => (k - (JN - 1) / 2) * PITCH;   // junction coord from index
const MAX_RIDERS = 30;
const STATION_CAP = 10;           // packs per station
const MAX_STATIONS = 16;
const SWAP_TIME = 0.75;           // sim-minutes per swap
const RECHARGE_TIME = 4;          // sim-minutes per pack recharged
const DRAIN = 1.15;               // % per sim-minute of riding
const LOW_BATT = 25;              // % at which a rider seeks a station
const RIDER_SPEED = 9;            // world units per sim-minute
const INITIAL_STATIONS = [[1, 1], [6, 1], [1, 6], [6, 6], [3, 3], [4, 5]];
const ZONE_NAMES = ['North-West', 'North', 'North-East',
                    'West', 'Central', 'East',
                    'South-West', 'South', 'South-East'];
const RIDER_COLORS = [0xe4572e, 0x2e86ab, 0xf2b134, 0x7fb069, 0x9b5de5,
                      0xef476f, 0x118ab2, 0x06d6a0, 0x8d6e63, 0x5c6bc0];
const ROOF_COLORS = [0xc96f4a, 0xd9a441, 0xa8b5a0, 0xb08968, 0x8fa6a0,
                     0xd4a373, 0xbc6c25, 0xccd5ae];

/* ================= state ================= */
const S = {
  running: true,
  speed: 1,
  simMin: 0,              // sim-minutes since the clock anchor
  anchorHour: 8,          // clock hour set by the slider
  swaps: 0,
  servedSet: new Set(),
  waits: [],              // recent waits (sim-minutes), last 50
  zoneWaits: new Map(),   // zoneIdx -> {sum, n}
  stations: [],
  riders: [],
  selected: null,
  addMode: false,
  topView: false,
  worstZone: -1,
  nextLetter: 0,
};

/* ================= dom ================= */
const $ = (id) => document.getElementById(id);
const canvas = $('scene');
const wrap = $('canvas-wrap');

/* ================= three setup ================= */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe4ef);
scene.fog = new THREE.Fog(0xcfe4ef, 150, 260);

const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 500);
const cam = { az: 0.75, pol: 0.98, polT: 0.98, azT: 0.75, r: 104, rT: 104 };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const hemi = new THREE.HemisphereLight(0xfff4e0, 0x8a7a5f, 0.95);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(60, 90, 30);
scene.add(sun);

/* ================= city ================= */
const cityGroup = new THREE.Group();
scene.add(cityGroup);

// Ground (asphalt) and a soft outer apron.
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(124, 124),
  new THREE.MeshLambertMaterial({ color: 0x3c4148 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.06;
cityGroup.add(ground);
const apron = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshLambertMaterial({ color: 0xd9cfb2 })
);
apron.rotation.x = -Math.PI / 2;
apron.position.y = -0.12;
cityGroup.add(apron);

// Block slabs (pavement) — instanced.
{
  const slabGeo = new THREE.BoxGeometry(11, 0.3, 11);
  const slabMat = new THREE.MeshLambertMaterial({ color: 0xcfc6ae });
  const slabs = new THREE.InstancedMesh(slabGeo, slabMat, 49);
  const m = new THREE.Matrix4();
  let i = 0;
  for (let bx = 0; bx < 7; bx++) for (let bz = 0; bz < 7; bz++) {
    m.setPosition(jc(bx + 0.5) + 0, 0.09, jc(bz + 0.5));
    // block centres sit between junctions: jc(k+0.5) works since jc is linear
    slabs.setMatrixAt(i++, m);
  }
  slabs.instanceMatrix.needsUpdate = true;
  cityGroup.add(slabs);
}

// Buildings — one InstancedMesh, warm rooftops.
{
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const spots = [];
  for (let bx = 0; bx < 7; bx++) for (let bz = 0; bz < 7; bz++) {
    const cx = jc(bx + 0.5), cz = jc(bz + 0.5);
    for (const [ox, oz] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) {
      if (Math.random() < 0.16) continue;   // a few empty plots
      spots.push([cx + ox, cz + oz]);
    }
  }
  const inst = new THREE.InstancedMesh(geo, mat, spots.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  spots.forEach(([x, z], i) => {
    const w = 3.4 + Math.random() * 1.4, d = 3.4 + Math.random() * 1.4;
    const h = 1.8 + Math.random() * 5.6;
    m.compose(new THREE.Vector3(x, 0.24, z), q,
              new THREE.Vector3(w, h, d));
    inst.setMatrixAt(i, m);
    col.setHex(ROOF_COLORS[i % ROOF_COLORS.length]);
    col.offsetHSL(0, 0, (Math.random() - 0.5) * 0.05);
    inst.setColorAt(i, col);
  });
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  cityGroup.add(inst);
}

// Worst-zone highlight (hidden until a zone earns it).
const zoneHl = new THREE.Mesh(
  new THREE.PlaneGeometry(112 / 3, 112 / 3),
  new THREE.MeshBasicMaterial({ color: 0xcf4444, transparent: true, opacity: 0.13, depthWrite: false })
);
zoneHl.rotation.x = -Math.PI / 2;
zoneHl.position.y = 0.06;
zoneHl.visible = false;
scene.add(zoneHl);

/* ================= helpers ================= */
const zoneOf = (kx, kz) =>
  Math.min(2, Math.floor(kz * 3 / JN)) * 3 + Math.min(2, Math.floor(kx * 3 / JN));
const nodePos = (kx, kz) => ({ x: jc(kx), z: jc(kz) });
const manhattan = (a, b) => Math.abs(a.kx - b.kx) + Math.abs(a.kz - b.kz);

function pathBetween(from, to) {
  // Manhattan path along the junction grid, axis order randomised.
  const path = [];
  let { kx, kz } = from;
  const axes = Math.random() < 0.5 ? ['x', 'z'] : ['z', 'x'];
  for (const ax of axes) {
    if (ax === 'x') while (kx !== to.kx) { kx += Math.sign(to.kx - kx); path.push({ kx, kz }); }
    else while (kz !== to.kz) { kz += Math.sign(to.kz - kz); path.push({ kx, kz }); }
  }
  return path;
}
const randJunction = () => ({ kx: (Math.random() * JN) | 0, kz: (Math.random() * JN) | 0 });

function demandAt(hour) {
  const g = (c, a, w) => a * Math.exp(-((hour - c) ** 2) / (2 * w * w));
  let d = 0.22 + g(9, 0.5, 1.7) + g(18.5, 0.78, 2.1);
  if (hour < 6) d -= 0.1;
  return Math.max(0.08, Math.min(1, d));
}
function demandLabel(d) {
  return d < 0.35 ? 'Quiet' : d < 0.55 ? 'Steady' : d < 0.8 ? 'Busy' : 'Peak rush';
}
const currentHour = () => (S.anchorHour + S.simMin / 60) % 24;
const fmtClock = () => {
  const t = Math.floor(currentHour() * 60);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const avgWait = () => S.waits.length
  ? S.waits.reduce((a, b) => a + b, 0) / S.waits.length : null;

/* ================= stations ================= */
const stationGroup = new THREE.Group();
scene.add(stationGroup);
const packInst = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.55, 0.55, 0.55),
  new THREE.MeshLambertMaterial({ color: 0x2fae5f, emissive: 0x0d5c2e }),
  MAX_STATIONS * STATION_CAP
);
packInst.count = 0;
scene.add(packInst);

function makeStation(kx, kz) {
  const { x, z } = nodePos(kx, kz);
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 2.1, 0.35, 20),
    new THREE.MeshLambertMaterial({ color: 0x8d8272 }));
  base.position.y = 0.17;
  g.add(base);

  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 3.4, 1.5),
    new THREE.MeshLambertMaterial({ color: 0x2b3644 }));
  tower.position.y = 2.0;
  g.add(tower);

  const beaconMat = new THREE.MeshLambertMaterial({
    color: 0x2fae5f, emissive: 0x1e9e57, emissiveIntensity: 0.9 });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), beaconMat);
  beacon.position.y = 4.1;
  g.add(beacon);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.5, 2.95, 32),
    new THREE.MeshBasicMaterial({ color: 0x14703d, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.1;
  ring.visible = false;
  g.add(ring);

  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 5, 8),
    new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 2.2;
  g.add(hit);

  stationGroup.add(g);
  const st = {
    id: S.stations.length,
    letter: String.fromCharCode(65 + (S.nextLetter++ % 26)),
    kx, kz, x, z, zone: zoneOf(kx, kz),
    packs: 8, queue: [], swapsToday: 0, waits: [],
    serviceT: 0, rechargeT: 0,
    group: g, beaconMat, ring,
  };
  hit.userData.station = st;
  st.hit = hit;
  S.stations.push(st);
  return st;
}

function removeStationVisual(st) {
  stationGroup.remove(st.group);
}

function refreshPackInstances() {
  const m = new THREE.Matrix4();
  let i = 0;
  for (const st of S.stations) {
    for (let p = 0; p < st.packs; p++) {
      const col = p % 2, row = Math.floor(p / 2);
      // a neat rack beside the tower: two columns, five high
      m.setPosition(st.x + 1.7, 0.62 + row * 0.62, st.z - 0.65 + col * 0.68);
      packInst.setMatrixAt(i++, m);
    }
  }
  packInst.count = i;
  packInst.instanceMatrix.needsUpdate = true;
}

/* ================= riders ================= */
const riderGroup = new THREE.Group();
scene.add(riderGroup);

function makeRider(id) {
  const g = new THREE.Group();
  const color = RIDER_COLORS[id % RIDER_COLORS.length];
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.5, 0.75),
    new THREE.MeshLambertMaterial({ color }));
  body.position.y = 0.45;
  g.add(body);
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.34, 0.65),
    new THREE.MeshLambertMaterial({ color: 0x24303c }));
  canopy.position.set(-0.05, 0.85, 0);
  g.add(canopy);
  const barBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.2),
    new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide }));
  barBg.position.y = 1.45;
  g.add(barBg);
  const barMat = new THREE.MeshBasicMaterial({ color: 0x2fae5f, side: THREE.DoubleSide });
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.13), barMat);
  bar.position.y = 1.45;
  g.add(bar);
  g.visible = false;
  riderGroup.add(g);
  return {
    id, group: g, bar, barMat, barBg,
    active: false, parking: false,
    battery: 80, state: 'idle',
    a: { kx: 0, kz: 0 }, b: null, dist: 0, path: [],
    target: null, waitStart: 0, jitter: 0.85 + Math.random() * 0.3,
    pos: new THREE.Vector3(),
  };
}
for (let i = 0; i < MAX_RIDERS; i++) S.riders.push(makeRider(i));

function activateRider(r) {
  const j = randJunction();
  r.a = j; r.path = []; r.b = null; r.dist = 0;
  r.battery = 30 + Math.random() * 62;
  r.state = 'ride'; r.parking = false; r.target = null;
  r.active = true; r.group.visible = true;
  const p = nodePos(j.kx, j.kz);
  r.pos.set(p.x, 0, p.z);
  pickDestination(r);
}
function pickDestination(r) {
  let dest = randJunction();
  if (dest.kx === r.a.kx && dest.kz === r.a.kz) dest = randJunction();
  r.path = pathBetween(r.a, dest);
  r.b = r.path.shift() || null;
}
function deactivateRider(r) {
  r.active = false; r.state = 'idle'; r.group.visible = false;
  if (r.target) {
    const qi = r.target.queue.indexOf(r);
    if (qi >= 0) r.target.queue.splice(qi, 1);
    r.target = null;
  }
}

/* ================= simulation ================= */
function chooseStation(r) {
  const sorted = [...S.stations].sort(
    (s1, s2) => manhattan(r.a, s1) - manhattan(r.a, s2));
  return sorted.find((st) => st.packs > st.queue.length) || sorted[0] || null;
}

function joinQueue(r, st) {
  r.state = 'queue';
  r.target = st;
  r.waitStart = S.simMin;
  st.queue.push(r);
}

function onReachJunction(r) {
  // r has arrived at node r.a (already updated by caller)
  if (r.state === 'toStation' && r.target &&
      r.a.kx === r.target.kx && r.a.kz === r.target.kz) {
    joinQueue(r, r.target);
    return;
  }
  if (r.parking) { deactivateRider(r); return; }
  if (r.state === 'ride') pickDestination(r);
}

function stepRider(r, dt) {
  if (!r.active) return;
  if (r.state === 'queue') {
    // stand at a queue slot near the station
    const st = r.target;
    const idx = st.queue.indexOf(r);
    const ang = idx * 0.95 + 0.6;
    r.pos.set(st.x + Math.cos(ang) * 3.1, 0, st.z + Math.sin(ang) * 3.1);
    return;
  }
  if (!r.b) { pickDestination(r); if (!r.b) return; }
  r.battery = Math.max(0, r.battery - DRAIN * dt);
  r.dist += RIDER_SPEED * r.jitter * dt;
  const A = nodePos(r.a.kx, r.a.kz), B = nodePos(r.b.kx, r.b.kz);
  const t = Math.min(1, r.dist / PITCH);
  r.pos.set(A.x + (B.x - A.x) * t, 0, A.z + (B.z - A.z) * t);
  if (r.dist >= PITCH) {
    r.a = r.b; r.b = null; r.dist = 0;
    if (r.path.length) { r.b = r.path.shift(); }
    else onReachJunction(r);
  }
  // low battery → head for a station
  if (r.state === 'ride' && r.battery <= LOW_BATT) {
    const st = chooseStation(r);
    if (st) {
      r.target = st;
      r.state = 'toStation';
      r.path = pathBetween(r.a, st);
      r.b = r.path.shift() || null;
      r.dist = 0;
      if (!r.b) joinQueue(r, st);   // already standing on it
    }
  }
}

function stepStation(st, dt) {
  // recharge
  if (st.packs < STATION_CAP) {
    st.rechargeT += dt;
    if (st.rechargeT >= RECHARGE_TIME) { st.packs++; st.rechargeT = 0; refreshPackInstances(); }
  } else st.rechargeT = 0;

  // serve the queue
  if (st.queue.length && st.packs > 0) {
    st.serviceT += dt;
    if (st.serviceT >= SWAP_TIME) {
      st.serviceT = 0;
      const r = st.queue.shift();
      st.packs--;
      st.swapsToday++;
      S.swaps++;
      S.servedSet.add(r.id);
      const wait = S.simMin - r.waitStart;
      S.waits.push(wait); if (S.waits.length > 50) S.waits.shift();
      st.waits.push(wait); if (st.waits.length > 50) st.waits.shift();
      const zw = S.zoneWaits.get(st.zone) || { sum: 0, n: 0 };
      zw.sum += wait; zw.n++; S.zoneWaits.set(st.zone, zw);
      // rider rides on with a full battery
      r.battery = 100; r.target = null; r.state = 'ride';
      r.a = { kx: st.kx, kz: st.kz }; r.dist = 0;
      pickDestination(r);
      refreshPackInstances();
    }
  } else st.serviceT = 0;

  // beacon colour = station health
  const c = st.packs > 3 ? 0x1e9e57 : st.packs > 0 ? 0xdd8a00 : 0xcf4444;
  st.beaconMat.emissive.setHex(c);
  st.beaconMat.color.setHex(c);
}

function manageFleet() {
  const want = Math.round(4 + demandAt(currentHour()) * 22);
  const active = S.riders.filter((r) => r.active);
  if (active.length < want) {
    const parked = S.riders.find((r) => !r.active);
    if (parked) activateRider(parked);
  } else if (active.length > want) {
    const cand = active.find((r) => r.state === 'ride' && r.battery > 55 && !r.parking);
    if (cand) cand.parking = true;
  }
}

function computeWorstZone() {
  let worst = -1, worstAvg = -1;
  for (const [z, v] of S.zoneWaits) {
    if (v.n >= 3 && v.sum / v.n > worstAvg) { worstAvg = v.sum / v.n; worst = z; }
  }
  S.worstZone = worst;
  if (worst >= 0) {
    const col = worst % 3, row = Math.floor(worst / 3);
    zoneHl.position.x = -56 + (col + 0.5) * (112 / 3);
    zoneHl.position.z = -56 + (row + 0.5) * (112 / 3);
    zoneHl.visible = true;
  } else zoneHl.visible = false;
}

function stepSim(dt) {
  S.simMin += dt;
  for (const st of S.stations) stepStation(st, dt);
  for (const r of S.riders) stepRider(r, dt);
  manageFleet();
}

/* ================= sky by hour ================= */
const SKY_STOPS = [
  [5, 0xd9c9a8], [8, 0xcfe4ef], [13, 0xd8ecf5], [17, 0xf5deb0],
  [19, 0xe8a56b], [21, 0x7d86a0], [23, 0x46536b], [24, 0x3c4658],
];
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function updateSky() {
  const h = currentHour();
  let a = SKY_STOPS[0], b = SKY_STOPS[SKY_STOPS.length - 1];
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    if (h >= SKY_STOPS[i][0] && h <= SKY_STOPS[i + 1][0]) { a = SKY_STOPS[i]; b = SKY_STOPS[i + 1]; break; }
  }
  const t = (h - a[0]) / Math.max(0.001, b[0] - a[0]);
  _c1.setHex(a[1]); _c2.setHex(b[1]); _c1.lerp(_c2, t);
  scene.background.copy(_c1);
  scene.fog.color.copy(_c1);
  sun.intensity = 0.75 + 0.45 * Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
  hemi.intensity = 0.7 + 0.3 * Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
}

/* ================= dom updates ================= */
const els = {
  clock: $('st-clock'), riders: $('st-riders'), swaps: $('st-swaps'),
  served: $('st-served'), wait: $('st-wait'), stations: $('st-stations'),
  worst: $('st-worst'), list: $('station-list'),
  ocWait: $('oc-wait'), ocSwaps: $('oc-swaps'), ocWorst: $('oc-worst'),
  timeLabel: $('time-label'),
  card: $('station-card'),
};
const fmtWait = (w) => w === null ? '—' : `${w.toFixed(1)} min`;

function refreshUI() {
  const h = currentHour();
  const d = demandAt(h);
  els.clock.textContent = fmtClock();
  els.timeLabel.textContent = `${fmtClock()} · ${demandLabel(d)}`;
  els.riders.textContent = S.riders.filter((r) => r.active).length;
  els.swaps.textContent = S.swaps;
  els.served.textContent = S.servedSet.size;
  els.wait.textContent = fmtWait(avgWait());
  els.stations.textContent = S.stations.length;
  computeWorstZone();
  els.worst.textContent = S.worstZone >= 0 ? ZONE_NAMES[S.worstZone] : '—';
  els.ocWait.textContent = fmtWait(avgWait());
  els.ocSwaps.textContent = S.swaps;
  els.ocWorst.textContent = S.worstZone >= 0 ? ZONE_NAMES[S.worstZone] : '—';

  // station list
  els.list.innerHTML = '';
  for (const st of S.stations) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    if (S.selected === st) btn.className = 'selected';
    const dotCls = st.packs > 3 ? '' : st.packs > 0 ? 'low' : 'out';
    btn.innerHTML = `<span class="dot ${dotCls}"></span>Station ${st.letter} · ${ZONE_NAMES[st.zone]} · ${st.packs} packs · queue ${st.queue.length}`;
    btn.addEventListener('click', () => selectStation(st));
    li.appendChild(btn);
    els.list.appendChild(li);
  }
  if (S.selected) fillCard(S.selected);
}

function fillCard(st) {
  $('card-title').textContent = `Station ${st.letter}`;
  $('card-zone').textContent = `${ZONE_NAMES[st.zone]} zone`;
  $('card-packs').textContent = `${st.packs} / ${STATION_CAP}`;
  $('card-packfill').style.width = `${st.packs * 10}%`;
  $('card-queue').textContent = st.queue.length;
  $('card-swaps').textContent = st.swapsToday;
  $('card-wait').textContent = st.waits.length
    ? fmtWait(st.waits.reduce((a, b) => a + b, 0) / st.waits.length) : '—';
}

function selectStation(st) {
  if (S.selected) S.selected.ring.visible = false;
  S.selected = st;
  if (st) {
    st.ring.visible = true;
    fillCard(st);
    els.card.hidden = false;
  } else {
    els.card.hidden = true;
  }
  refreshUI();
}

/* ================= controls ================= */
const btnPlay = $('btn-play');
function setRunning(v) {
  S.running = v;
  btnPlay.innerHTML = v ? '❚❚&nbsp; Pause' : '▶&nbsp; Resume';
  btnPlay.setAttribute('aria-pressed', String(v));
}
btnPlay.addEventListener('click', () => setRunning(!S.running));

document.querySelectorAll('.speed').forEach((b) => {
  b.addEventListener('click', () => {
    S.speed = parseFloat(b.dataset.speed);
    document.querySelectorAll('.speed').forEach((x) => {
      x.classList.toggle('active', x === b);
      x.setAttribute('aria-pressed', String(x === b));
    });
  });
});

const slider = $('time-slider');
slider.addEventListener('input', () => {
  S.anchorHour = parseInt(slider.value, 10);
  S.simMin = 0;
  refreshUI();
});

const btnAdd = $('btn-add');
function setAddMode(v) {
  S.addMode = v;
  btnAdd.classList.toggle('active', v);
  btnAdd.setAttribute('aria-pressed', String(v));
  $('add-hint').hidden = !v;
  wrap.classList.toggle('adding', v);
  ghost.visible = false;
}
btnAdd.addEventListener('click', () => setAddMode(!S.addMode));

$('btn-view').addEventListener('click', (e) => {
  S.topView = !S.topView;
  cam.polT = S.topView ? 0.16 : 0.98;
  e.currentTarget.textContent = S.topView ? 'View: Top' : 'View: Tilt';
});

$('btn-reset').addEventListener('click', resetSim);
$('card-close').addEventListener('click', () => selectStation(null));

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && S.addMode) setAddMode(false);
  if (e.key === ' ' && e.target === document.body) { e.preventDefault(); setRunning(!S.running); }
});

function resetSim() {
  for (const st of [...S.stations]) removeStationVisual(st);
  S.stations = [];
  S.nextLetter = 0;
  S.swaps = 0; S.servedSet.clear(); S.waits = []; S.zoneWaits.clear();
  S.simMin = 0; S.anchorHour = parseInt(slider.value, 10);
  selectStation(null);
  for (const st of INITIAL_STATIONS) makeStation(st[0], st[1]);
  for (const r of S.riders) deactivateRider(r);
  refreshPackInstances();
  // seed the fleet
  const want = Math.round(4 + demandAt(currentHour()) * 22);
  let n = 0;
  for (const r of S.riders) { if (n++ < want) activateRider(r); }
  refreshUI();
}

/* ================= picking & camera ================= */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitPoint = new THREE.Vector3();

const ghost = new THREE.Group();
{
  const gm = new THREE.MeshLambertMaterial({ color: 0x1e9e57, transparent: true, opacity: 0.45 });
  const gt = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.4, 1.5), gm);
  gt.position.y = 2.0;
  ghost.add(gt);
  const gb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), gm);
  gb.position.y = 4.1;
  ghost.add(gb);
  ghost.visible = false;
}
scene.add(ghost);

function castAt(ev) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
}
function junctionFromEvent(ev) {
  castAt(ev);
  if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) return null;
  const kx = Math.round(hitPoint.x / PITCH + (JN - 1) / 2);
  const kz = Math.round(hitPoint.z / PITCH + (JN - 1) / 2);
  if (kx < 0 || kx >= JN || kz < 0 || kz >= JN) return null;
  return { kx, kz };
}
const stationAt = (kx, kz) => S.stations.find((s) => s.kx === kx && s.kz === kz);

let drag = null;
canvas.addEventListener('pointerdown', (ev) => {
  drag = { x: ev.clientX, y: ev.clientY, moved: 0 };
  canvas.setPointerCapture(ev.pointerId);
});
canvas.addEventListener('pointermove', (ev) => {
  if (drag) {
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 4) {
      cam.azT -= dx * 0.005;
      cam.polT = THREE.MathUtils.clamp(cam.polT - dy * 0.004, 0.12, 1.35);
      drag.x = ev.clientX; drag.y = ev.clientY;
    }
  } else if (S.addMode) {
    const j = junctionFromEvent(ev);
    if (j && !stationAt(j.kx, j.kz) && S.stations.length < MAX_STATIONS) {
      const p = nodePos(j.kx, j.kz);
      ghost.position.set(p.x, 0, p.z);
      ghost.visible = true;
    } else ghost.visible = false;
  }
});
canvas.addEventListener('pointerup', (ev) => {
  const wasClick = drag && drag.moved <= 4;
  drag = null;
  if (!wasClick) return;
  if (S.addMode) {
    const j = junctionFromEvent(ev);
    if (j && !stationAt(j.kx, j.kz) && S.stations.length < MAX_STATIONS) {
      const st = makeStation(j.kx, j.kz);
      refreshPackInstances();
      selectStation(st);
      refreshUI();
    }
    return;
  }
  castAt(ev);
  const hits = raycaster.intersectObjects(S.stations.map((s) => s.hit));
  if (hits.length) selectStation(hits[0].object.userData.station);
  else selectStation(null);
});
canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  cam.rT = THREE.MathUtils.clamp(cam.rT + ev.deltaY * 0.06, 48, 170);
}, { passive: false });

/* ================= main loop ================= */
function resize() {
  const w = wrap.clientWidth, h = wrap.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

let wasRunningBeforeHide = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { wasRunningBeforeHide = S.running; }
});

const clockT = new THREE.Clock();
let uiT = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clockT.getDelta(), 0.1);

  if (S.running && !document.hidden) {
    let simDt = dt * S.speed;              // sim-minutes to advance
    while (simDt > 0) {
      const step = Math.min(0.05, simDt);
      stepSim(step);
      simDt -= step;
    }
  }
  // rider meshes follow sim positions; battery bars face the camera
  for (const r of S.riders) {
    if (!r.active) continue;
    r.group.position.copy(r.pos);
    r.bar.scale.x = Math.max(0.02, r.battery / 100);
    r.barMat.color.setHex(r.battery > 50 ? 0x2fae5f : r.battery > LOW_BATT ? 0xdd8a00 : 0xcf4444);
    r.bar.lookAt(camera.position.x, r.bar.getWorldPosition(new THREE.Vector3()).y, camera.position.z);
    r.barBg.lookAt(camera.position.x, r.barBg.getWorldPosition(new THREE.Vector3()).y, camera.position.z);
  }
  updateSky();

  // camera easing (snap when reduced motion)
  const k = reducedMotion ? 1 : 1 - Math.pow(0.0015, dt);
  cam.az += (cam.azT - cam.az) * k;
  cam.pol += (cam.polT - cam.pol) * k;
  cam.r += (cam.rT - cam.r) * k;
  camera.position.set(
    cam.r * Math.sin(cam.pol) * Math.sin(cam.az),
    cam.r * Math.cos(cam.pol),
    cam.r * Math.sin(cam.pol) * Math.cos(cam.az)
  );
  camera.lookAt(0, 0, 0);

  uiT += dt;
  if (uiT > 0.25) { uiT = 0; refreshUI(); }
  renderer.render(scene, camera);
}

/* ================= init ================= */
for (const st of INITIAL_STATIONS) makeStation(st[0], st[1]);
refreshPackInstances();
{
  const want = Math.round(4 + demandAt(currentHour()) * 22);
  let n = 0;
  for (const r of S.riders) { if (n++ < want) activateRider(r); }
}
resize();
refreshUI();
animate();

/* test hook (used by qa/smoke.mjs) */
window.__SS = {
  getState: () => ({
    running: S.running,
    speed: S.speed,
    hour: currentHour(),
    clock: fmtClock(),
    simMin: Math.round(S.simMin * 100) / 100,
    activeRiders: S.riders.filter((r) => r.active).length,
    swaps: S.swaps,
    served: S.servedSet.size,
    avgWait: avgWait(),
    stations: S.stations.length,
    selected: S.selected ? S.selected.letter : null,
    addMode: S.addMode,
    worstZone: S.worstZone >= 0 ? ZONE_NAMES[S.worstZone] : null,
    totalPacks: S.stations.reduce((a, s) => a + s.packs, 0),
  }),
  // screen position (client px) of a station tower, for the smoke test's
  // real mouse click through the raycast path
  projectStation: (idx) => {
    const st = S.stations[idx];
    if (!st) return null;
    const v = new THREE.Vector3(st.x, 2.2, st.z).project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, letter: st.letter };
  },
  projectJunction: (kx, kz) => {
    const p = nodePos(kx, kz);
    const v = new THREE.Vector3(p.x, 0, p.z).project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  },
  junctionAt: (clientX, clientY) => junctionFromEvent({ clientX, clientY }),
};
