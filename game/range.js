// ===== Scout Adventure At Aiken Basserie: the BB gun range and the archery range =====
// Both are shot in first person from a firing line, at targets only. Every BB and every arrow is flown as a
// real projectile: it leaves at its own speed, gravity pulls it down, the air slows it, and the wind pushes
// it sideways. So a far target needs the aim held a little high, and a crosswind needs it held a little off.
//   Aim:   drag on the farm, the arrow keys (fine), or a controller's right stick. The cross marks the aim.
//   Shoot: BB gun: press the button (or Space, or A). Bow: hold to draw, let go to loose.
// BB range: ten shots at paper targets 15 feet away, after agreeing to the range rules.
// Archery: twelve arrows at three round targets and three foam animals (turkey, deer, bear), with a choice
// of arrow tip. Broadheads are hunting tips and are not used on a Scout range, so they are not offered.
const SC_RANGE = {
  g: 9.81,
  bb: { speed: 105, drag: 0.0128, shots: 10, dist: 4.57, face: 0.075, fov: 34 },      // a 350 feet-a-second BB; targets at 15 feet; a 6 inch paper face
  bow: { v0: 12, v1: 45, draw: 1.0, arrows: 12, fov: 46 },      // arrow speed at no draw and at full draw (metres a second); seconds to full draw
  tips: [
    { id: 'field', name: 'Field Point', drag: 0.0024, sticks: true, note: 'The target tip. Flies true and pulls out of the target easily. Use this one.' },
    { id: 'bullet', name: 'Bullet Point', drag: 0.0022, sticks: true, note: 'A little heavier and rounder. Drops slightly less far out, steadier in wind.' },
    { id: 'blunt', name: 'Blunt', drag: 0.0042, sticks: false, note: 'A flat rubber tip. Slows down faster and bounces off instead of sticking.' },
    { id: 'judo', name: 'Judo Point', drag: 0.006, sticks: false, note: 'Has little spring arms so it does not get lost in grass. The slowest: it drops the most.' }],
  rules: {
    bb: ['Always point the muzzle downrange.', 'Safety glasses on before anyone shoots.', 'Finger off the trigger until you are ready to shoot.', 'Only shoot at your own target, and only when the range master says "Commence firing".', 'On "Cease fire", stop at once and lay the gun down.'],
    bow: ['Only nock an arrow on the shooting line, and only point it downrange.', 'Never draw a bow with no arrow on the string.', 'Shoot only at the targets, never into the air.', 'Wait for the range master before anyone walks forward to get arrows.']
  }
};
const SCR = { on: false, kind: '', hold: false, btn: false, key: false, pad: false, was: false, shots: 0, pts: 0, power: 0, t0: 0, targets: [], flying: [], stuck: [], tip: null, wind: 0, x: 0, y: 0, z: 0, last: '' };

// ---- targets
function scRangeFace(x, z, R, h, rings) {      // a round target on a stand, facing the firing line
  const g = new THREE.Group(), cols = [0xffffff, 0xffffff, 0x222222, 0x222222, 0x2b7ad9, 0x2b7ad9, 0xd8342b, 0xd8342b, 0xf2c230, 0xf2c230];
  for (let i = 0; i < 10; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(R * (10 - i) / 10, 28), new THREE.MeshBasicMaterial({ color: cols[i] })); d.position.set(0, h, 0.012 + i * 0.001); g.add(d) }
  const back = new THREE.Mesh(new THREE.BoxGeometry(R * 2.3, R * 2.3, 0.02 + R * 0.25), new THREE.MeshStandardMaterial({ color: 0xc9b98a, roughness: 1 })); back.position.set(0, h, -0.01 - R * 0.125); g.add(back);
  for (const sx of [-R * 0.9, R * 0.9]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h + R, 6), new THREE.MeshStandardMaterial({ color: 0x8a6a45 })); l.position.set(sx, (h + R) / 2, -0.05 - R * 0.25); g.add(l) }
  const y = scY(x, z); g.position.set(x, y, z); SC.grp.add(g); return { kind: 'face', name: Math.round((SCR.z - z) * SCFT) + ' foot target', x, y: y + h, z, R, g };
}
function scRangeAnimal(kind, x, z) {      // a foam animal: a body, and a vital zone that scores highest
  const g = new THREE.Group(), M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }), y = scY(x, z);
  const ball = (r, sx, sy, sz, px, py, pz, c) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), M(c)); o.scale.set(sx, sy, sz); o.position.set(px, py, pz); o.castShadow = true; g.add(o); return o };
  const leg = (px, pz, h, c) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, h, 8), M(c)); l.position.set(px, h / 2, pz); g.add(l) };
  let T;      // body: centre and half-sizes; vital: centre (all relative to the feet, broadside to the shooter, head to the right)
  if (kind === 'turkey') { ball(0.26, 1.15, 1, 0.8, 0, 0.5, 0, 0x4a3a2a); ball(0.09, 1, 1.6, 1, 0.3, 0.86, 0, 0x7a2f2f); ball(0.07, 1, 1, 1, 0.32, 1.02, 0, 0x4f6f9f); const fan = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16, 0, Math.PI), M(0x6b4a2a)); fan.position.set(-0.3, 0.55, 0); fan.rotation.y = Math.PI / 2; fan.material.side = THREE.DoubleSide; g.add(fan); leg(-0.05, 0.06, 0.28, 0xb88a4a); leg(0.05, -0.06, 0.28, 0xb88a4a); T = { name: 'Turkey', b: [0, 0.5, 0.3, 0.26], v: [0.05, 0.52] } }
  else if (kind === 'deer') { ball(0.36, 1.75, 0.95, 0.8, 0, 1.0, 0, 0x9a6b3f); ball(0.15, 1, 2.1, 1, 0.62, 1.38, 0, 0x9a6b3f); ball(0.14, 1.5, 0.9, 0.9, 0.78, 1.72, 0, 0x9a6b3f); for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.4, 6), M(0xe8dcc0)); a.position.set(0.72, 1.98, s * 0.08); a.rotation.x = s * 0.5; g.add(a) } for (const px of [-0.45, 0.42]) for (const pz of [-0.1, 0.1]) leg(px, pz, 0.72, 0x7a5330); ball(0.07, 1, 1, 1, -0.64, 1.05, 0, 0xf4f1e6); T = { name: 'Deer', b: [0, 1.0, 0.63, 0.34], v: [0.28, 0.95] } }
  else { ball(0.5, 1.7, 0.95, 0.9, 0, 0.78, 0, 0x2a1d14); ball(0.34, 1, 1, 1, 0.95, 1.0, 0, 0x2a1d14); ball(0.16, 1.2, 0.8, 1, 1.26, 0.93, 0, 0x8a6a4a); for (const s of [-1, 1]) ball(0.1, 1, 1, 0.6, 0.9, 1.32, s * 0.2, 0x2a1d14); for (const px of [-0.55, 0.5]) for (const pz of [-0.18, 0.18]) leg(px, pz, 0.45, 0x1c130d); T = { name: 'Bear', b: [0, 0.78, 0.85, 0.47], v: [0.36, 0.72] } }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.115, 20), new THREE.MeshBasicMaterial({ color: 0xf4f1e6, side: THREE.DoubleSide })); ring.position.set(T.v[0], T.v[1], 0.31); g.add(ring);      // the scoring ring on the vitals, as foam targets have
  g.position.set(x, y, z); SC.grp.add(g);
  return { kind: 'animal', name: T.name, x, y, z, bx: x + T.b[0], by: y + T.b[1], rx: T.b[2], ry: T.b[3], rz: 0.3, vx: x + T.v[0], vy: y + T.v[1], g };
}
function scRangeScore(tg, px, py) {      // points for a hit at this spot
  if (tg.kind === 'face') { const r = Math.hypot(px - tg.x, py - tg.y); return r > tg.R ? 0 : Math.max(1, 10 - Math.floor(r / (tg.R / 10))) }
  const d = Math.hypot(px - tg.vx, py - tg.vy); return d <= 0.06 ? 10 : d <= 0.115 ? 8 : 5;
}

// ---- one projectile, flown in small steps. Returns what it hit, or null while it is still flying.
function scRangeStep(p, dt) {
  const R = SC_RANGE, n = Math.max(1, Math.ceil(dt * 600)), h = dt / n;
  for (let i = 0; i < n; i++) {
    const rx = p.vx - SCR.wind, sp = Math.hypot(rx, p.vy, p.vz), k = p.drag * sp, ox = p.x, oy = p.y, oz = p.z;      // drag acts against the motion through the air, so wind pushes it along
    p.vx -= k * rx * h; p.vy -= (R.g + k * p.vy) * h; p.vz -= k * p.vz * h; p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h; p.t += h;
    for (const tg of SCR.targets) {
      if (tg.kind === 'face') { if (oz > tg.z && p.z <= tg.z) { const u = (oz - tg.z) / (oz - p.z), hx = ox + (p.x - ox) * u, hy = oy + (p.y - oy) * u; if (Math.hypot(hx - tg.x, hy - tg.y) <= tg.R) return { tg, x: hx, y: hy, z: tg.z + 0.02 } } }
      else { const ex = (p.x - tg.bx) / tg.rx, ey = (p.y - tg.by) / tg.ry, ez = (p.z - tg.z) / tg.rz; if (ex * ex + ey * ey + ez * ez <= 1) return { tg, x: p.x, y: p.y, z: p.z } }
    }
    if (p.y <= scY(p.x, p.z)) return { tg: null, x: p.x, y: scY(p.x, p.z), z: p.z };
    if (p.t > 6 || p.z < SCR.z - 90) return { tg: null, x: p.x, y: p.y, z: p.z, gone: true };
  }
  return null;
}
function scRangeFire(speed) {      // loose one along the line of sight
  const w = ctrl.walk, c = Math.cos(w.pitch), dx = Math.sin(w.yaw) * c, dy = Math.sin(w.pitch), dz = Math.cos(w.yaw) * c, bow = SCR.kind === 'bow';
  const m = bow ? new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.75, 6), new THREE.MeshBasicMaterial({ color: 0x2a2a2a })) : new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xc9a227 }));
  m.frustumCulled = false; scene.add(m);
  const p = { x: SCR.x + dx * 0.4, y: SCR.y - 0.08 + dy * 0.4, z: SCR.z + dz * 0.4, vx: dx * speed, vy: dy * speed, vz: dz * speed, drag: bow ? SCR.tip.drag : SC_RANGE.bb.drag, t: 0, m };
  SCR.flying.push(p); SCR.shots--; scBeep(bow ? 240 : 900, bow ? 0.12 : 0.04); return p;
}
function scRangeLand(p, hit) {
  const bow = SCR.kind === 'bow', tg = hit.tg; let pts = 0, say;
  if (tg) {
    pts = scRangeScore(tg, hit.x, hit.y); SCR.pts += pts; const dy = hit.y - (tg.kind === 'face' ? tg.y : tg.vy), dx = hit.x - (tg.kind === 'face' ? tg.x : tg.vx), inch = v => Math.round(Math.abs(v) * 39.37);
    const off = pts >= 10 ? '' : ' ' + [inch(dy) >= 1 ? inch(dy) + ' in ' + (dy > 0 ? 'high' : 'low') : '', inch(dx) >= 1 ? inch(dx) + ' in ' + (dx > 0 ? 'right' : 'left') : ''].filter(Boolean).join(', ') + '.';
    say = (tg.kind === 'animal' ? tg.name + ': ' + (pts === 10 ? 'a perfect vital hit! 10' : pts === 8 ? 'in the vital ring. 8' : 'a body hit. 5') : (pts === 10 ? 'BULLSEYE! 10' : pts + ' at the ' + tg.name)) + (pts === 10 ? '!' : '.') + off; if (pts >= 8) scWin(); else scBeep(500, 0.08);
  } else { say = hit.gone ? 'That one sailed over everything. Aim lower.' : 'Missed: it came down ' + Math.round((SCR.z - hit.z) * SCFT) + ' feet out. ' + (bow ? 'Far targets need the aim held higher.' : 'Line the cross up on the middle.'); scMiss() }
  if (bow && SCR.tip.sticks || !tg || !bow) { p.m.position.set(hit.x, hit.y, hit.z + (bow ? 0.3 : 0)); if (bow) { p.m.rotation.set(Math.atan2(p.vz, p.vy), 0, 0) } if (!bow && tg) p.m.material.color.setHex(0x111111); SCR.stuck.push(p.m) }
  else { p.m.position.set(hit.x, scY(hit.x, hit.z + 0.5) + 0.02, hit.z + 0.5); p.m.rotation.set(0, 0, Math.PI / 2); SCR.stuck.push(p.m); say += ' The ' + SCR.tip.name.toLowerCase() + ' bounced off.' }
  SCR.last = say; toast(say); scRangeCard();
}

// ---- what the Scout sees
function scRangeHud() {
  if (document.getElementById('scrange')) return; const h = scEl('div'); h.id = 'scrange'; h.hidden = true; const bar = scEl('div', 'scfbar'); bar.append(scEl('div', 'scffill')); const say = scEl('div', 'scfsay'), b = scEl('button', 'scbtn go big', 'SHOOT'); b.id = 'scrangebtn';
  const dn = e => { SCR.btn = true; e.preventDefault() }, up = () => { SCR.btn = false }; b.addEventListener('pointerdown', dn); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up); b.addEventListener('contextmenu', e => e.preventDefault());
  h.append(say, bar, b); const x = scEl('div'); x.id = 'scrcross'; x.hidden = true; document.body.append(h, x);
}
function scRangeSay(txt, fill, btn) { const h = document.getElementById('scrange'), s = h.querySelector('.scfsay'), f = h.querySelector('.scffill'), b = document.getElementById('scrangebtn'); if (s.textContent !== txt) s.textContent = txt; f.style.width = Math.round(fill * 100) + '%'; f.className = 'scffill pow'; if (b.textContent !== btn) b.textContent = btn }
const scRangeWind = () => Math.abs(SCR.wind) < 0.3 ? 'Wind: calm.' : 'Wind: ' + Math.round(Math.abs(SCR.wind) * 2.237) + ' mph, pushing ' + (SCR.wind > 0 ? 'right' : 'left') + '.';
function scRangeCard() {
  const bow = SCR.kind === 'bow', title = bow ? 'Archery Range' : 'BB Gun Range', over = SCR.shots <= 0 && !SCR.flying.length;
  if (over) { if (!SCR.paid) { SCR.paid = true; scAward(bow ? 'archery' : 'bb', SCR.pts * 5) } const tot = SCR.pts * 5; return scCard(title, [SCR.last, 'Range is cold. You scored ' + SCR.pts + ' out of ' + (bow ? SC_RANGE.bow.arrows : SC_RANGE.bb.shots) * 10 + ' (' + tot + ' on the scoreboard).', { small: bow ? 'Now everyone waits for the range master before walking out for the arrows.' : 'Guns down, actions open. Well done.' }].filter(Boolean), [{ label: 'Shoot Again', fn: () => scStart(SC.cur) }, { label: 'Home', go: true, fn: scHome }]) }
  scCard(title, [SCR.last, (bow ? 'Arrows left: ' : 'BBs left: ') + SCR.shots + '. Score: ' + SCR.pts + '.', scRangeWind(), { small: bow ? 'Tip: ' + SCR.tip.name + '. Hold SHOOT to draw, let go to loose. An arrow drops on its way: hold the cross above a far target.' : 'Put the cross on the middle and press SHOOT. The targets are 15 feet away.' },
    { small: 'Drag or use the arrow keys to aim.' }].filter(Boolean), bow ? [{ label: 'Change Tip', fn: () => scRangeTips() }, { label: 'Done', fn: scHome }] : [{ label: 'Done', fn: scHome }]);
}
function scRangeTips() {
  scCard('Choose Your Arrow Tip', ['Pick the tip on your arrows.', { small: 'Broadheads are hunting tips. They are never used on a Scout range, so they are not here.' }], SC_RANGE.tips.map(t => ({ label: t.name, go: SCR.tip === t, fn: () => { SCR.tip = t; SCR.live = true; scRangeCard() } })));
  const btns = [...document.querySelectorAll('#sccard .scrow button')]; SC_RANGE.tips.forEach((t, i) => { const e = btns[i]; if (e) { e.classList.add('scitem'); e.appendChild(scEl('span', 'scitemnote', t.note)) } });
}
function scRangeRules(kind, then) {
  scCard(kind === 'bow' ? 'Archery Range' : 'BB Gun Range', ['Range rules. Every Scout agrees to them before the range goes hot:', { list: SC_RANGE.rules[kind] }, { small: 'We shoot at targets only. Never at people, and never at real animals.' }], [{ label: 'I Will Follow The Range Rules', big: true, go: true, fn: then }]);
}

// ---- the two missions share one firing line
// Where the range goes: the nearest place to the cabin where the firing line and every target stand on dry,
// fairly level ground inside the farm, with no pond anywhere down the lanes. Worked out once.
function scRangeSite() {
  if (SCR.site) return SCR.site; const c = scMark('Cabin') || { p: [0, 0, 0] }, wet = (x, z) => groundAt(x, z) > 1e8 || !scwInFarm(x, z) || !!scPond(x, z), spots = [[-3.2, 10], [-0.8, 15], [1.6, 20], [3, 12], [7.5, 18], [3.6, 25], [0, 0], [-4, 0], [4, 0]], cand = [];
  for (let dx = -150; dx <= 150; dx += 10) for (let dz = -150; dz <= 150; dz += 10) cand.push([c.p[0] + dx, c.p[2] + dz, Math.hypot(dx, dz)]);
  // no building, vehicle or other landmark in or beside the lanes
  const near = q => (S.scout.marks || []).some(m => { const ddx = Math.max(q[0] - 8 - m.p[0], 0, m.p[0] - q[0] - 9.5), ddz = Math.max(q[1] - 27 - m.p[2], 0, m.p[2] - q[1] - 3); return Math.hypot(ddx, ddz) < m.r + 4 });
  cand.sort((a, b) => a[2] - b[2]);
  for (const q of cand) {
    if (q[2] < 25 || near(q)) continue; const y0 = scY(q[0], q[1]); let ok = true;
    for (let d = 0; ok && d <= 27; d += 3) for (let x = -7; x <= 9; x += 4) if (wet(q[0] + x, q[1] - d)) { ok = false; break }
    if (!ok) continue;
    for (const o of spots) { const x = q[0] + o[0], z = q[1] - o[1]; if (scwBlocked(x, z, 1.2) || Math.abs(scY(x, z) - y0) > 1.3) { ok = false; break } }
    for (const x of [-6, -3, 0, 3, 6, 9]) if (ok && scwWall(q[0] + x, q[1], 0, -1, 27)) ok = false;      // nothing solid down the lanes
    if (ok) return SCR.site = [q[0], q[1]];
  }
  return SCR.site = scOpenSpot();
}
function scRangeStart(kind) {
  const s = scRangeSite(), R = SC_RANGE; scRangeHud(); SCR.kind = kind; SCR.x = s[0]; SCR.z = s[1]; SCR.y = scY(s[0], s[1]) + SCW.eye; SCR.pts = 0; SCR.last = ''; SCR.flying = []; SCR.stuck = []; SCR.targets = []; SCR.live = false; SCR.paid = false; SCR.power = 0; SCR.st = 'ready';
  SCR.shots = kind === 'bow' ? R.bow.arrows : R.bb.shots; SCR.wind = kind === 'bow' ? scRnd(-3.5, 3.5) : scRnd(-1, 1); if (!SCR.tip) SCR.tip = R.tips[0];
  const line = new THREE.Mesh(new THREE.BoxGeometry(9, 0.03, 0.12), new THREE.MeshBasicMaterial({ color: 0xf4f1e6 })); line.position.set(SCR.x, scY(SCR.x, SCR.z - 0.6) + 0.03, SCR.z - 0.6); SC.grp.add(line);
  if (kind === 'bb') for (let i = -2; i <= 2; i++) SCR.targets.push(scRangeFace(SCR.x + i * 0.5, SCR.z - R.bb.dist, R.bb.face, 1.25));
  else { SCR.targets.push(scRangeFace(SCR.x - 3.2, SCR.z - 10, 0.4, 1.2), scRangeFace(SCR.x - 0.8, SCR.z - 15, 0.4, 1.2), scRangeFace(SCR.x + 1.6, SCR.z - 20, 0.4, 1.2), scRangeAnimal('turkey', SCR.x + 3, SCR.z - 12), scRangeAnimal('deer', SCR.x + 7.5, SCR.z - 18), scRangeAnimal('bear', SCR.x + 3.6, SCR.z - 25)) }
  try { fly = null } catch (e) { } ctrl.walk = { pos: new THREE.Vector3(SCR.x, SCR.y, SCR.z), yaw: Math.PI, pitch: 0 }; cam.fov = kind === 'bow' ? R.bow.fov : R.bb.fov; cam.updateProjectionMatrix(); ctrl.target.set(SCR.x, SCR.y - SCW.eye, SCR.z); ctrl.sph.radius = 45; ctrl.update(); SCR.on = true;
  document.getElementById('scrange').hidden = false; document.getElementById('scrcross').hidden = false;
  const hot = () => { SCR.live = true; SCR.was = true; toast(kind === 'bow' ? 'Range is hot. Archers, you may shoot.' : 'Range is hot. Commence firing.'); scRangeCard() };
  scRangeRules(kind, kind === 'bow' ? () => { scRangeTips(); SCR.was = true } : hot);
}
function scRangeStop() {
  SCR.on = false; SCR.live = false; SCR.btn = SCR.key = SCR.pad = false; for (const p of SCR.flying) scene.remove(p.m); for (const m of SCR.stuck) scene.remove(m); SCR.flying = []; SCR.stuck = []; SCR.targets = [];
  const h = document.getElementById('scrange'), x = document.getElementById('scrcross'); if (h) h.hidden = true; if (x) x.hidden = true; cam.fov = 46; cam.updateProjectionMatrix();
}
function scRangeTick(t, dt) {
  if (!SCR.on || !ctrl.walk) return; dt = Math.min(dt, 0.05); const R = SC_RANGE, bow = SCR.kind === 'bow', w = ctrl.walk, k = SCW.keys || {}, fine = (k.Shift ? 0.06 : 0.22) * dt;
  w.pos.set(SCR.x, SCR.y, SCR.z); w.yaw += ((k.ArrowLeft ? 1 : 0) - (k.ArrowRight ? 1 : 0)) * fine; w.pitch = Math.max(-0.6, Math.min(0.8, w.pitch + ((k.ArrowUp ? 1 : 0) - (k.ArrowDown ? 1 : 0)) * fine));
  const hold = SCR.btn || SCR.key || SCR.pad, press = hold && !SCR.was, release = !hold && SCR.was; SCR.was = hold;
  for (let i = SCR.flying.length - 1; i >= 0; i--) { const p = SCR.flying[i], hit = scRangeStep(p, dt); if (hit) { SCR.flying.splice(i, 1); scRangeLand(p, hit) } else { p.m.position.set(p.x, p.y, p.z); if (bow) p.m.rotation.set(Math.atan2(p.vz, p.vy), 0, 0) } }
  if (!SCR.live) return scRangeSay('Read the card first.', 0, '...');
  if (SCR.shots <= 0) return scRangeSay(SCR.flying.length ? 'In the air...' : 'Range is cold.', 0, 'DONE');
  if (!bow) { scRangeSay('BBs left: ' + SCR.shots + '. ' + scRangeWind(), 0, 'SHOOT'); if (press) scRangeFire(R.bb.speed) }
  else if (SCR.st === 'draw') { SCR.power = Math.min(1, (t - SCR.t0) / R.bow.draw); scRangeSay(SCR.power >= 1 ? 'Full draw. Let go to loose.' : 'Drawing...', SCR.power, 'LET GO'); if (release) { scRangeFire(R.bow.v0 + (R.bow.v1 - R.bow.v0) * SCR.power); SCR.st = 'ready'; SCR.power = 0 } }
  else { scRangeSay('Arrows left: ' + SCR.shots + '. ' + scRangeWind(), 0, 'HOLD TO DRAW'); if (press) { SCR.st = 'draw'; SCR.t0 = t } }
}
window.addEventListener('keydown', e => { if (e.key === ' ' && SCR.on && !/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test((e.target && e.target.tagName) || '')) { SCR.key = true; e.preventDefault() } });
window.addEventListener('keyup', e => { if (e.key === ' ') SCR.key = false });
window.addEventListener('blur', () => { SCR.key = false; SCR.btn = false });
const scRangeMission = (id, name, kind) => ({ id, name, start() { scRangeStart(kind) }, pick() { return true }, tick(t, dt) { try { scRangeTick(t, dt) } catch (e) { if (!SCR.err) { SCR.err = e; console.error(e) } } }, stop() { scRangeStop() } });
SC_MISSIONS.push(scRangeMission('bb', 'BB Gun Range', 'bb'), scRangeMission('archery', 'Archery Range', 'bow'));
