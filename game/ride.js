// ===== Scout Adventure At Aiken Basserie: golf carts, ATVs and motorcycles =====
// Parked on the parking pad by the Fishing Lounge. Walk up to one and press Use (the button that appears,
// the E key, or X on a controller) to get on; Use again to get off. Golf carts are free. The ATV and the
// motorcycle rent for tokens each ride. Driven in first person: ahead and back are the throttle, left and
// right steer. Riding uses no energy. They stop at ponds, trees, buildings and the property line.
const SC_RIDES = [
  { id: 'cart', name: 'Golf Cart', verb: 'Drive', cost: 0, max: 9, accel: 5, turn: 1.5, eye: 1.4, pad: 1.0, on: 'Buckle up, and keep it slow near people.' },
  { id: 'atv', name: 'ATV', verb: 'Ride', cost: 5, max: 16, accel: 8, turn: 1.8, eye: 1.3, pad: 0.9, on: 'Helmet on! One rider only, and keep both hands on the bars.' },
  { id: 'moto', name: 'Motorcycle', verb: 'Ride', cost: 8, max: 22, accel: 10, turn: 1.6, eye: 1.25, pad: 0.8, on: 'Helmet on! Look where you want to go.' }];
const SC_PARKED = [];      // the vehicles on the farm: { def, x, z, yaw, obj }

function scRideModel(id) {
  const g = new THREE.Group(), M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m };
  const wheel = (r, w, x, y, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14), M(0x1b1b1b)); m.rotation.z = Math.PI / 2; m.position.set(x, y, z); m.castShadow = true; g.add(m) };
  const bar = (len, x, y, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 8), M(0x222222)); m.rotation.z = Math.PI / 2; m.position.set(x, y, z); g.add(m) };
  if (id === 'cart') {
    box(1.2, 0.35, 2.3, 0xf4f1e6, 0, 0.45, 0); box(1.2, 0.3, 0.7, 0xf4f1e6, 0, 0.7, 0.85); box(1.1, 0.12, 0.5, 0x2b2b2b, 0, 0.72, -0.25); box(1.1, 0.5, 0.1, 0x2b2b2b, 0, 0.95, -0.55);
    for (const x of [-0.55, 0.55]) for (const z of [0.55, -1.05]) box(0.05, 1.15, 0.05, 0x333333, x, 1.2, z); box(1.3, 0.06, 1.9, 0xf4f1e6, 0, 1.8, -0.25);
    for (const x of [-0.62, 0.62]) for (const z of [0.8, -0.8]) wheel(0.23, 0.18, x, 0.23, z); bar(0.34, 0, 1.0, 0.45);
  } else if (id === 'atv') {
    box(0.7, 0.3, 1.5, 0xc23a2a, 0, 0.6, 0); box(0.9, 0.12, 0.5, 0xc23a2a, 0, 0.72, 0.65); box(0.5, 0.14, 0.7, 0x1b1b1b, 0, 0.82, -0.2); box(0.8, 0.05, 0.45, 0x333333, 0, 0.8, -0.72);
    for (const x of [-0.5, 0.5]) for (const z of [0.6, -0.6]) wheel(0.3, 0.26, x, 0.3, z); bar(0.8, 0, 1.05, 0.4); box(0.06, 0.4, 0.06, 0x222222, 0, 0.88, 0.42);
  } else {
    wheel(0.33, 0.1, 0, 0.33, 0.75); wheel(0.33, 0.12, 0, 0.33, -0.7); box(0.28, 0.3, 0.6, 0x2a4fa3, 0, 0.8, 0.15); box(0.26, 0.1, 0.6, 0x1b1b1b, 0, 0.82, -0.4); box(0.24, 0.3, 0.5, 0x555555, 0, 0.5, 0.0);
    const f = box(0.06, 0.75, 0.06, 0x999999, 0, 0.7, 0.62); f.rotation.x = -0.35; bar(0.7, 0, 1.08, 0.5); box(0.14, 0.14, 0.1, 0xfff4c2, 0, 0.95, 0.72);
  }
  return g;
}
function scRideSetup() {
  const K = S.route && S.route.parking, c = K ? [K.c[0], K.c[1]] : [SCW.x, SCW.z], P = K && K.pts;
  // along the long side of the pad, facing out
  let ax = 1, az = 0; if (P) { const a = [P[1][0] - P[0][0], P[1][1] - P[0][1]], b = [P[2][0] - P[1][0], P[2][1] - P[1][1]], l = Math.hypot(a[0], a[1]) >= Math.hypot(b[0], b[1]) ? a : b, n = Math.hypot(l[0], l[1]); ax = l[0] / n; az = l[1] / n }
  const yaw = Math.atan2(-az, ax);      // nose across the pad
  ['cart', 'cart', 'atv', 'atv', 'moto'].forEach((id, i) => {
    const def = SC_RIDES.find(r => r.id === id), k = (i - 2) * 3.2, v = { def, x: c[0] + ax * k, z: c[1] + az * k, yaw, obj: scRideModel(id) };
    scene.add(v.obj); SC_PARKED.push(v); scRidePut(v);
  });
}
function scRidePut(v) { v.obj.position.set(v.x, scY(v.x, v.z), v.z); v.obj.rotation.y = v.yaw }
function scRideNear() { let best = null, bd = 3.4; for (const v of SC_PARKED) { if (v === SCW.ride) continue; const d = Math.hypot(v.x - SCW.x, v.z - SCW.z); if (d < bd) { bd = d; best = v } } return best }
function scRideOff() {
  const v = SCW.ride; if (!v) return false; const fx = Math.sin(SCW.yaw), fz = Math.cos(SCW.yaw);
  for (const o of [[fz * 1.4, -fx * 1.4], [-fz * 1.4, fx * 1.4], [-fx * 2, -fz * 2], [fx * 2.2, fz * 2.2]]) if (!scwBlocked(v.x + o[0], v.z + o[1], 0.55)) { SCW.x = v.x + o[0]; SCW.z = v.z + o[1]; break }
  SCW.ride = null; SCW.v = 0; toast('You parked the ' + v.def.name + '.'); return true;
}
// Use: get off what you are on, or get on what is beside you. True if it did something.
function scwUse() {
  if (!SCW.on) return false; if (SCW.ride) return scRideOff();
  const v = scRideNear(); if (!v) return false; const d = v.def, b = typeof scBank === 'function' ? scBank() : null;
  if (d.cost && b) { if (b.tokens < d.cost) { toast('The ' + d.name + ' rents for ' + d.cost + ' tokens a ride. You have ' + b.tokens + '.'); scMiss(); return true } b.tokens -= d.cost; scSave(); scHud(true) }
  SCW.ride = v; SCW.v = 0; SCW.x = v.x; SCW.z = v.z; SCW.yaw = v.yaw; if (ctrl.walk) { ctrl.walk.yaw = v.yaw; ctrl.walk.pitch = -0.12 }
  toast(d.on + (d.cost ? ' (' + d.cost + ' tokens)' : '')); scWin(); return true;
}
function scRideTick(t, dt, ix, iy) {
  const u = document.getElementById('scwuse');
  if (u) { const v = SCW.ride || scRideNear(), txt = SCW.ride ? 'Get Off The ' + v.def.name : v ? v.def.verb + ' The ' + v.def.name + (v.def.cost ? ' (' + v.def.cost + ' tokens)' : '') : ''; if (u.textContent !== txt) u.textContent = txt; u.hidden = !txt }
  const v = SCW.ride; if (!v) return; const d = v.def;
  if (iy) SCW.v += d.accel * iy * dt; else SCW.v *= Math.max(0, 1 - 1.8 * dt);
  SCW.v = Math.max(-3, Math.min(d.max, SCW.v));
  if (ix && Math.abs(SCW.v) > 0.2) { SCW.yaw -= ix * d.turn * Math.min(1, Math.abs(SCW.v) / 4) * Math.sign(SCW.v) * dt; if (ctrl.walk) ctrl.walk.yaw = SCW.yaw }
  const fx = Math.sin(SCW.yaw), fz = Math.cos(SCW.yaw), nx = SCW.x + fx * SCW.v * dt, nz = SCW.z + fz * SCW.v * dt;
  if (scwCanGo(SCW.x, SCW.z, nx, nz, d.pad)) { SCW.x = nx; SCW.z = nz } else SCW.v = -SCW.v * 0.15;      // a bump: it stops
  v.x = SCW.x; v.z = SCW.z; v.yaw = SCW.yaw; scRidePut(v);
}
const scInitR0 = scInit;
scInit = function () { scInitR0(); const u = document.getElementById('scwuse'); if (u) u.onclick = () => scwUse(); try { scRideSetup() } catch (e) { console.error(e) } };
