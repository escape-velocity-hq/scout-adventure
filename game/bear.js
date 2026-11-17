// ===== Scout Adventure At Aiken Basserie: the bear, and Bear Spray =====
// A bear roams the farm. If it sees a Scout on foot it stares, then charges, and a bear is faster than a
// Scout can jog. If it reaches the Scout it takes their snacks and some tokens and wanders off: nobody is
// hurt. Bear Spray from the Camp Store stops it, used the way the real thing is taught:
//   keep it within reach, safety clip off, aim slightly down at the bear, spray when it is 30 to 60 feet away.
// A Scout on a vehicle, on the Map or in a mission is left alone.
const SC_BEAR = {
  amble: 1.6, charge: 9,       // metres a second (a Scout jogs at 7.5)
  sees: 45,                    // metres at which it notices a Scout on foot
  stare: 4,                    // seconds it stares before it charges
  reach: 2.2,                  // metres: it has got you
  takes: 10,                   // tokens it takes
  rest: 90,                    // seconds before it bothers anyone again
  far: 18.3, close: 9.1,       // the 60 foot and 30 foot marks, in metres
  aim: 0.6,                    // how far off the bear (radians) the Scout can be looking and still hit
  reward: 10,                  // tokens the first time a patrol stops the bear the right way
  x: 0, z: 0, yaw: 0, mode: 'roam', tx: 0, tz: 0, until: 0, quiet: 0, clip: true, obj: null, clouds: []
};
const SC_BEAR_STEPS = ['Keep the can where you can grab it fast: on your belt or chest, never inside your pack.', 'Pull the safety clip off with your thumb.', 'Aim slightly down, in front of the bear, not over its head.',
  'Spray when the charging bear is 30 to 60 feet away, so it runs into the cloud.', 'Then back away and leave. Do not run: a bear is faster than you.'];

function scBearClass() {
  scCard('Bear Spray Class', ['How to use Bear Spray:', { list: SC_BEAR_STEPS }, { small: 'Bear Spray is only for a bear that charges or comes too close. Most bears want to be left alone, so give them room. In the game: press Bear Spray (or F, or Y on a controller) once for the clip and again to spray.' }],
    [{ label: 'Camp Store', fn: scCamp, go: true }, { label: 'Back', fn: scShop }]);
}
const scCamp = () => { scShelf('Camp Store', 'Bear Spray stops a charging bear. Take the class first.', SC_ECON.camp, scCamp); const row = document.querySelector('#sccard .scrow'); if (row) { const e = scEl('button', 'scbtn', 'Bear Spray Class'); e.onclick = scBearClass; row.insertBefore(e, row.lastChild) } };

function scBearModel() {
  const g = new THREE.Group(), fur = new THREE.MeshStandardMaterial({ color: 0x4a3324, roughness: 1 }), dark = new THREE.MeshStandardMaterial({ color: 0x1c130d, roughness: 1 }), tan = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 });
  const ball = (r, sx, sy, sz, x, y, z, m) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m || fur); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o };
  ball(0.5, 1.0, 0.95, 1.7, 0, 0.75, 0); ball(0.36, 1, 1, 1, 0, 1.0, 0.95); ball(0.18, 1, 0.8, 1.2, 0, 0.92, 1.3, tan); ball(0.06, 1, 1, 1, 0, 0.95, 1.5, dark);
  for (const x of [-0.24, 0.24]) { ball(0.11, 1, 1, 0.6, x, 1.33, 0.88); ball(0.035, 1, 1, 1, x * 0.6, 1.08, 1.27, dark) }
  for (const x of [-0.3, 0.3]) for (const z of [0.55, -0.55]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.6, 10), fur); l.position.set(x, 0.3, z); l.castShadow = true; g.add(l) }
  ball(0.09, 1, 1, 1, 0, 0.85, -0.85); return g;
}
function scBearSpot(minFrom) {      // somewhere in the trees, inside the farm, away from the Scout
  const T = S.trees || []; for (let k = 0; k < 400; k++) { const t = T[(Math.random() * T.length) | 0]; if (!t) break; const x = t[0] + scRnd(-4, 4), z = t[1] + scRnd(-4, 4); if (!scwBlocked(x, z, 0.8) && Math.hypot(x - SCW.x, z - SCW.z) >= minFrom) return [x, z] }
  return [SCW.x + minFrom, SCW.z];
}
function scBearSetup() { const B = SC_BEAR, s = scBearSpot(140); B.x = s[0]; B.z = s[1]; B.tx = s[0]; B.tz = s[1]; B.obj = scBearModel(); scene.add(B.obj); const bar = scEl('button', 'scbtn'); bar.id = 'scbear'; bar.hidden = true; bar.onclick = () => scBearKey(); document.body.appendChild(bar) }
const scBearDist = () => Math.hypot(SC_BEAR.x - SCW.x, SC_BEAR.z - SCW.z);
const scBearFeet = () => Math.round(scBearDist() * SCFT / 5) * 5;
const scBearHunting = () => SC_BEAR.mode === 'stare' || SC_BEAR.mode === 'charge';
function scBearLeave(t, fast) { const B = SC_BEAR, s = scBearSpot(120); B.mode = fast ? 'flee' : 'roam'; B.tx = s[0]; B.tz = s[1]; B.quiet = t + B.rest; B.clip = true }
// the Bear Spray button: first press takes the safety clip off, the next one sprays. True if it did something.
function scBearKey() {
  const B = SC_BEAR; if (!scBearHunting() || !SCW.on) return false; const b = scBank(), t = SC.t;
  if (!(b.spray > 0)) { toast('No Bear Spray! Get on a vehicle. The Camp Store sells Bear Spray.'); return true }
  if (B.clip) { B.clip = false; scBeep(700, 0.08); toast('Safety clip off. Aim slightly down at the bear. Spray when it is 30 to 60 feet away.'); return true }
  b.spray--; scSave(); scBearCloud(); const d = scBearDist(), want = Math.atan2(B.x - SCW.x, B.z - SCW.z); let off = want - SCW.yaw; off = Math.abs(Math.atan2(Math.sin(off), Math.cos(off)));
  if (off > B.aim) { toast('Missed! You were not facing the bear. Turn to it and aim slightly down. Bursts left: ' + b.spray + '.'); scMiss(); return true }
  if (d > B.far) { toast('Too far: the bear is ' + scBearFeet() + ' feet away and the cloud drifted off. Wait for 60 feet. Bursts left: ' + b.spray + '.'); scMiss(); return true }
  const first = !b.bearAware; b.bearAware = true; scSave(); scBearLeave(t, true); scWin(); scBearShow();
  const tk = first ? scEarn(B.reward) : 0;
  toast('The bear ran into the cloud at ' + scBearFeet() + ' feet and turned away. Now back away and leave.' + (tk ? ' +' + tk + ' tokens: your patrol is Bear Aware.' : '')); return true;
}
function scBearCloud() {      // an orange cloud, a few metres ahead and low
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xe8862a, transparent: true, opacity: 0.5, depthWrite: false }));
  m.position.set(SCW.x + Math.sin(SCW.yaw) * 5, scY(SCW.x, SCW.z) + 0.9, SCW.z + Math.cos(SCW.yaw) * 5); m.userData.t0 = SC.t; scene.add(m); SC_BEAR.clouds.push(m);
}
function scBearTick(t, dt) {
  const B = SC_BEAR; if (!B.obj) return; dt = Math.min(dt, 0.05);
  for (let i = B.clouds.length - 1; i >= 0; i--) { const c = B.clouds[i], k = (t - c.userData.t0) / 2.2; if (k >= 1) { scene.remove(c); c.geometry.dispose(); B.clouds.splice(i, 1) } else { const s = 0.6 + k * 4; c.scale.set(s * 1.4, s * 0.7, s * 1.4); c.material.opacity = 0.5 * (1 - k) } }
  const prey = SCW.on && !SCW.ride && !SC.cur, d = scBearDist();
  if (scBearHunting() && !prey) { scBearLeave(t, false); B.quiet = t + 20; if (SCW.ride) toast('The bear gave up. It cannot catch a vehicle.') }
  if (B.mode === 'roam' && prey && t > B.quiet && d < B.sees) { B.mode = 'stare'; B.until = t + B.stare; B.clip = true; toast('A bear has seen you, ' + scBearFeet() + ' feet away! Do not run. Get your Bear Spray ready, or get on a vehicle.'); scBeep(180, 0.5) }
  if (B.mode === 'stare') { B.yaw = Math.atan2(SCW.x - B.x, SCW.z - B.z); if (t > B.until) { B.mode = 'charge'; toast('The bear is charging!'); scBeep(150, 0.6) } }
  let sp = 0;
  if (B.mode === 'charge') { B.tx = SCW.x; B.tz = SCW.z; sp = B.charge; if (d < B.reach) { const b = scBank(), n = Math.min(b.tokens, B.takes); b.tokens -= n; scSave(); scHud(true); scMiss(); toast(n ? 'The bear got your snacks and ' + n + ' tokens, then wandered off. Bear Spray would have stopped it.' : 'The bear sniffed your empty pockets and wandered off.'); scBearLeave(t, false); return scBearShow() } }
  else if (B.mode === 'flee') { sp = B.charge; if (Math.hypot(B.tx - B.x, B.tz - B.z) < 3) B.mode = 'roam' }
  else if (B.mode === 'roam') { sp = B.amble; if (Math.hypot(B.tx - B.x, B.tz - B.z) < 2 || t > B.until) { const s = scBearSpot(0); B.tx = s[0]; B.tz = s[1]; B.until = t + 40 } }
  if (sp) {
    const dx = B.tx - B.x, dz = B.tz - B.z, n = Math.hypot(dx, dz) || 1, st = Math.min(sp * dt, n), nx = B.x + dx / n * st, nz = B.z + dz / n * st; B.yaw = Math.atan2(dx, dz);
    if (!scwBlocked(nx, nz, 0.5)) { B.x = nx; B.z = nz } else if (!scwBlocked(nx, B.z, 0.5)) B.x = nx; else if (!scwBlocked(B.x, nz, 0.5)) B.z = nz; else if (B.mode !== 'charge') B.until = 0;      // stuck: pick somewhere else
  }
  scBearShow();
}
function scBearShow() {
  const B = SC_BEAR, bar = document.getElementById('scbear'); B.obj.position.set(B.x, scY(B.x, B.z) + (B.mode === 'stare' ? 0.25 : Math.abs(Math.sin(SC.t * (B.mode === 'roam' ? 4 : 11))) * 0.06), B.z); B.obj.rotation.y = B.yaw; B.obj.rotation.x = B.mode === 'stare' ? -0.5 : 0;
  if (!bar) return; const on = scBearHunting() && SCW.on; bar.hidden = !on; if (!on) return;
  const b = scBank(), ft = scBearFeet(), inband = scBearDist() <= B.far, txt = !(b.spray > 0) ? 'Bear: ' + ft + ' ft. No Bear Spray!' : B.clip ? 'Bear: ' + ft + ' ft. Bear Spray: Safety Clip Off' : 'Bear: ' + ft + ' ft. ' + (inband ? 'SPRAY NOW' : 'Wait for 60 ft');
  if (bar.textContent !== txt) bar.textContent = txt; bar.classList.toggle('go', inband && !B.clip && b.spray > 0);
}
window.addEventListener('keydown', e => { if ((e.key === 'f' || e.key === 'F') && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) scBearKey() });

// ---- hooks
SC_ECON.camp = [{ id: 'spray', name: 'Bear Spray', cost: 6, give: 3, unit: 'bursts', note: 'Stops a charging bear. Three bursts in a can.' }];
const scShopB0 = scShop;
scShop = function () { scShopB0(); const row = document.querySelector('#sccard .scrow'); if (!row) return; const e = scEl('button', 'scbtn go', 'Camp Store'); e.onclick = scCamp; row.insertBefore(e, row.lastChild) };
const scTickB0 = scTick;
scTick = function (t, dt) { scTickB0(t, dt); try { scBearTick(t, dt) } catch (e) { if (!SC_BEAR.err) { SC_BEAR.err = e; console.error(e) } } };
const scInitB0 = scInit;
scInit = function () { scInitB0(); try { scBearSetup() } catch (e) { console.error(e) } };
