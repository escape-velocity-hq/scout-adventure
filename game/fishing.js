// ===== Scout Adventure At Aiken Basserie: fishing with a rod, in first person =====
// This replaces the old "tap the water" fishing. The Scout stands on the bank, or on the lower or upper
// deck of the Fishing Lounge, holding a rod.
//   Cast:   hold the button (or Space, or A on a controller) to wind up, let go to cast. The lure flies in
//           an arc and lands where the wind-up sends it.
//   Wait:   fish in the pond notice the lure and one swims over to it. Reel slowly to draw the lure in.
//   Strike: when it bites, press the button to set the hook.
//   Fight:  hold to reel, let go to give line. The fish runs and rests. Reel against a strong run and the
//           tension climbs past what the line can take and it snaps; leave the line slack too long and the
//           hook pulls out. Tire the fish, then bring it in.
// The fish are the real ones swimming in the pond: the one that bites is the one you see come to the lure.
// A fish's pull comes from its weight (worked out from its length), so a bream comes straight in and a
// trophy bass has to be played. Tackle from the shop matters: bait draws fish sooner, the Spinner Lure
// brings more trophies, Braided Line takes more tension, the Heavy Rod reels harder, and a pond's monster
// only takes a Monster Lure on that rod and line.
const SC_FISHING = {
  castMin: 6, castMax: 26,        // metres the lure flies at the weakest and the strongest cast
  windUp: 1.6,                    // seconds for the power meter to go up and back
  reel: 2.4,                      // metres of line a second, reeling
  notice: 3, noticeBait: 6, noticeGrow: 1.6, noticeMax: 18,   // how far away a fish notices the lure (metres), growing each second
  swim: 1.7,                      // metres a second a fish swims to the lure
  strike: 1.5, strikeMonster: 1.0,   // seconds to set the hook
  line: 1.0, braided: 1.8,        // how much tension the line takes
  rod: 1.0, heavy: 1.35,          // how hard the rod reels
  snapAfter: 0.35,                // seconds over the limit before the line snaps
  slackAfter: 2.5,                // seconds of slack line before the hook pulls out
  spool: 45,                      // metres of line on the reel
  landAt: 2.6                     // metres: close enough to land
};
const SCF = { on: false, st: 'idle', hold: false, btn: false, key: false, pad: false, was: false, x: 0, y: 0, z: 0, pts: 0, n: 0, lure: null, rod: null, line: null, fish: null, next: null, paid: false };
const scFishLb = inches => Math.round(inches * inches * inches / 1600 * 10) / 10;      // weight in pounds from length in inches

// ---- where a Scout can fish
function scFishPondAt(x, z) { for (const p of S.ponds || []) if (!p.unfinished && inPoly(x, z, p.xy_show || p.xy)) return p; return null }
function scFishWater(x, z, yaw, deck) {      // how much open water lies ahead: 0 to 5. Water under the deck itself does not count.
  let n = 0; for (let k = 4; k <= 20; k += 4) { const px = x + Math.sin(yaw) * k, pz = z + Math.cos(yaw) * k; if (scFishPondAt(px, pz) && !(deck && px > deck[0] && px < deck[1] && pz > deck[2] && pz < deck[3])) n++ } return n;
}
function scFishBest(pts, deck) {      // of these places to stand, the one with the most open water in front of it, and which way to face
  let best = null; for (const q of pts) for (let a = 0; a < 6.283; a += 0.3927) { const n = scFishWater(q[0], q[1], a, deck) + scFishWater(q[0], q[1], a + 0.3, deck) + scFishWater(q[0], q[1], a - 0.3, deck); if (!best || n > best.n) best = { x: q[0], z: q[1], yaw: a, n } } return best;
}
function scFishDeck(x0, x1, z0, z1, top, name) { const pts = []; for (let x = x0 + 0.5; x <= x1 - 0.5; x += 0.9) { pts.push([x, z0 + 0.5], [x, z1 - 0.5]) } for (let z = z0 + 0.5; z <= z1 - 0.5; z += 0.9) { pts.push([x0 + 0.5, z], [x1 - 0.5, z]) } const b = scFishBest(pts, [x0, x1, z0, z1]); return b && b.n ? { x: b.x, z: b.z, yaw: b.yaw, y: top + SCW.eye, name, deck: true, n: b.n } : null }
// the two decks of the Fishing Lounge, measured from the farm model
const scFishLower = () => scFishDeck(-81.1, -73.93, 0.57, 5.94, 96.7, 'the lower deck of the Fishing Lounge');
const scFishUpper = () => scFishDeck(-86.3, -81.74, -4.27, 5.8, 96.99, 'the upper deck of the Fishing Lounge');
function scFishBank() {      // the nearest bank to where the Scout stands
  let best = null, bd = 1e9; for (const p of S.ponds || []) { if (p.unfinished) continue; const xy = p.xy_show || p.xy; let cx = 0, cz = 0; xy.forEach(q => { cx += q[0] / xy.length; cz += q[1] / xy.length });
    for (let i = 0; i < xy.length; i += 2) { const q = xy[i], dx = q[0] - cx, dz = q[1] - cz, n = Math.hypot(dx, dz) || 1, x = q[0] + dx / n * 1.6, z = q[1] + dz / n * 1.6, d = Math.hypot(x - SCW.x, z - SCW.z); if (d < bd && !scwBlocked(x, z, 0.6)) { bd = d; best = [x, z] } } }
  if (!best) return null; const b = scFishBest([best]); return { x: b.x, z: b.z, yaw: b.yaw, y: scY(b.x, b.z) + SCW.eye, name: 'the bank' };
}
function scFishOffer() {      // what the Use button offers a Scout on foot: the lounge decks, or the water in front of them
  if (!SCW.on || SCW.ride || SC.cur) return null; const L = scMark('Fishing Lounge');
  if (L && Math.hypot(L.p[0] - SCW.x, L.p[2] - SCW.z) < 15) return { text: 'Fish From The Lounge', go: scFishLounge };
  for (const k of [2, 4, 6]) if (scFishPondAt(SCW.x + Math.sin(SCW.yaw) * k, SCW.z + Math.cos(SCW.yaw) * k)) return { text: 'Fish Here', go: () => { SCF.next = { x: SCW.x, z: SCW.z, yaw: SCW.yaw, y: scY(SCW.x, SCW.z) + SCW.eye, name: 'the bank' }; scStart(scFishMission) } };
  return null;
}
function scFishLounge() {
  const go = s => () => { if (!s) return toast('No open water from there.'); SCF.next = s; scStart(scFishMission) };
  scCard('Fishing Lounge', ['Pick a deck to fish from.', { small: 'The lower deck sits right on the water. The upper deck is by the kitchen and the vending machines.' }], [{ label: 'Lower Deck', go: true, fn: go(scFishLower()) }, { label: 'Upper Deck', go: true, fn: go(scFishUpper()) }, { label: 'Back', fn: scHome }]);
}

// ---- the rod, the line and the lure
function scFishGear() {
  if (SCF.rod) return; const g = new THREE.Group(), mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
  const butt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.5, 8), mat(0x222222)); butt.position.y = 0.25; g.add(butt);
  const blank = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.016, 1.7, 8), mat(0x7a1f1f)); blank.position.y = 1.35; g.add(blank);
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), mat(0x9a9a9a)); reel.rotation.z = Math.PI / 2; reel.position.set(0, 0.42, 0.05); g.add(reel);
  g.traverse(o => { o.frustumCulled = false }); g.visible = false; scene.add(g); SCF.rod = g;
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
  SCF.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf4f4f4, transparent: true, opacity: 0.85 })); SCF.line.frustumCulled = false; SCF.line.visible = false; scene.add(SCF.line);
  const l = new THREE.Group(); l.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8, 0, 6.3, 0, 1.6), new THREE.MeshBasicMaterial({ color: 0xe23b2e })), new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8, 0, 6.3, 1.5, 1.7), new THREE.MeshBasicMaterial({ color: 0xffffff }))); l.visible = false; scene.add(l); SCF.lure = l;
  SCF.tip = new THREE.Vector3(); SCF.lp = new THREE.Vector3(); SCF.lv = new THREE.Vector3();
}
const _scfR = new THREE.Vector3(), _scfU = new THREE.Vector3(), _scfF = new THREE.Vector3(), _scfQ = new THREE.Quaternion(), _scfE = new THREE.Euler();
function scFishDraw(t) {      // hold the rod in front of the camera, bend it with the tension, and string the line to the lure or the fish
  const r = SCF.rod; cam.matrixWorld.extractBasis(_scfR, _scfU, _scfF); _scfF.negate();
  r.position.copy(cam.position).addScaledVector(_scfR, 0.3).addScaledVector(_scfU, -0.42).addScaledVector(_scfF, 0.5);
  const lean = SCF.st === 'charge' ? 0.15 - SCF.power * 0.5 : SCF.st === 'fight' ? 0.75 + Math.min(1.3, SCF.T) * 0.5 : SCF.st === 'bite' ? 1.05 : 0.8;      // radians forward from straight up
  _scfE.set(-lean, 0, -0.12); _scfQ.setFromEuler(_scfE); r.quaternion.copy(cam.quaternion).multiply(_scfQ); r.updateMatrixWorld(true);
  SCF.tip.set(0, 2.2, 0).applyMatrix4(r.matrixWorld);
  const out = SCF.st === 'fly' || SCF.st === 'water' || SCF.st === 'bite' || SCF.st === 'fight'; SCF.line.visible = out; SCF.lure.visible = out && SCF.st !== 'fight';
  if (!out) return; const end = SCF.st === 'fight' ? SCF.fp : SCF.lp, a = SCF.line.geometry.attributes.position, d = SCF.tip.distanceTo(end), sag = SCF.st === 'fight' ? 0.04 + 0.5 * Math.max(0, 0.3 - SCF.T) : SCF.st === 'fly' ? 0.3 : 0.25 + d * 0.03;
  for (let i = 0; i < 16; i++) { const u = i / 15; a.setXYZ(i, SCF.tip.x + (end.x - SCF.tip.x) * u, SCF.tip.y + (end.y - SCF.tip.y) * u - sag * 4 * u * (1 - u), SCF.tip.z + (end.z - SCF.tip.z) * u) } a.needsUpdate = true;
  if (SCF.lure.visible) SCF.lure.position.copy(SCF.lp);
}
function scFishPut(f, x, z, th, dep) {      // move one of the pond's fish by hand, and redraw it this frame
  f.x = x; f.z = z; f.th = th; f.dep = dep; f.tx = x; f.tz = z; f.tt = 5; f.v = 0; f.pause = 0; const i = FISH.indexOf(f); if (i < 0 || !fishMesh) return;
  _fe.set(0, -th, 0); _fq.setFromEuler(_fe); _fp.set(x, f.pond.z - dep, z); _fs.set(f.L, f.L, f.L); _fm.compose(_fp, _fq, _fs); fishMesh.setMatrixAt(i, _fm); fishMesh.instanceMatrix.needsUpdate = true;
}
function scFishFree() { const f = SCF.fish; if (f) { if (SCF.L0) f.L = SCF.L0; f.tt = 0 } SCF.fish = null; SCF.L0 = 0; SCF.mon = false; SCF.big = false }

// ---- what the Scout sees: a tension bar, a line of words, and one big button to hold
function scFishHud() {
  if (document.getElementById('scfish')) return; const h = scEl('div'); h.id = 'scfish'; h.hidden = true;
  const bar = scEl('div', 'scfbar'); bar.append(scEl('div', 'scfsafe'), scEl('div', 'scffill')); const say = scEl('div', 'scfsay'), b = scEl('button', 'scbtn go big', 'CAST'); b.id = 'scfishbtn';
  const dn = e => { SCF.btn = true; e.preventDefault() }, up = () => { SCF.btn = false }; b.addEventListener('pointerdown', dn); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up); b.addEventListener('contextmenu', e => e.preventDefault());
  h.append(say, bar, b); document.body.appendChild(h);
}
function scFishSay(txt, fill, cls, btn) {
  const h = document.getElementById('scfish'); if (!h) return; const s = h.querySelector('.scfsay'), f = h.querySelector('.scffill'), b = document.getElementById('scfishbtn');
  if (s.textContent !== txt) s.textContent = txt; f.style.width = Math.round(Math.max(0, Math.min(1, fill)) * 100) + '%'; f.className = 'scffill ' + (cls || ''); if (b.textContent !== btn) b.textContent = btn;
}
function scFishCard(extra) {
  const b = scBank(), bc = scBigCatch(), has = []; if (b.bait > 0) has.push(b.bait + (b.bait === 1 ? ' worm' : ' worms')); if (b.spinner) has.push('Spinner Lure'); if (b.rod) has.push('Heavy Rod'); if (b.line) has.push('Braided Line'); if (b.lure > 0) has.push(b.lure + (b.lure === 1 ? ' Monster Lure' : ' Monster Lures'));
  scCard('Catch A Bass', (extra || ['You are fishing from ' + SCF.name + '.', 'Hold CAST to wind up and let go to cast. When a fish bites, press to set the hook. Then hold to reel and let go when it runs.']).concat([
    'Fish landed: ' + SCF.n + '. Points: ' + SCF.pts + '.', { small: has.length ? 'Tackle: ' + has.join(', ') + '.' : 'Tackle: plain rod, hook and line. The Tackle Shop has more.' },
    bc ? { small: 'Your biggest catch: ' + bc.inches + ' inch ' + bc.name + (bc.trophy ? ' (trophy)' : '') + '.' } : '', { small: 'Drag to look around. Space or the big button casts and reels.' }]).filter(Boolean),
    [{ label: 'Done Fishing', go: true, fn: scHome }, { label: 'Tackle Shop', fn: () => { scFishIdle(); scTackleFromFishing() } }]);
}
function scTackleFromFishing() { scTackle(); const row = document.querySelector('#sccard .scrow'); if (!row) return; const e = scEl('button', 'scbtn go', 'Back To Fishing'); e.onclick = () => scFishCard(); row.appendChild(e) }
function scFishIdle() { scFishFree(); SCF.st = 'idle'; SCF.power = 0; SCF.T = 0 }

// ---- the mission
const scFishMission = {
  id: 'fish', name: 'Catch A Bass',
  start() {
    const s = SCF.next || scFishBank() || { x: SCW.x, z: SCW.z, yaw: SCW.yaw, y: scY(SCW.x, SCW.z) + SCW.eye, name: 'the bank' }; SCF.next = null; scFishGear(); scFishHud();
    SCF.x = s.x; SCF.z = s.z; SCF.y = s.y; SCF.name = s.name; SCF.pts = 0; SCF.n = 0; SCF.paid = false; SCF.on = true; scFishIdle();
    if (!s.deck) { SCW.x = s.x; SCW.z = s.z; SCW.yaw = s.yaw; SCW.has = true }      // the walk picks up from the bank afterwards
    try { fly = null } catch (e) { } ctrl.walk = { pos: new THREE.Vector3(s.x, s.y, s.z), yaw: s.yaw, pitch: -0.1 }; cam.fov = SCW.fov; cam.updateProjectionMatrix(); ctrl.target.set(s.x, s.y - SCW.eye, s.z); ctrl.sph.radius = 45; ctrl.update();
    SCF.rod.visible = true; document.getElementById('scfish').hidden = false; scFishCard();
  },
  pick() { return true },
  tick(t, dt) { try { scFishTick(t, Math.min(dt, 0.05)) } catch (e) { if (!SCF.err) { SCF.err = e; console.error(e) } } },
  stop() {
    scFishFree(); SCF.on = false; SCF.st = 'idle'; SCF.btn = SCF.key = SCF.pad = false; if (SCF.rod) { SCF.rod.visible = false; SCF.line.visible = false; SCF.lure.visible = false }
    const h = document.getElementById('scfish'); if (h) h.hidden = true; cam.fov = 46; cam.updateProjectionMatrix();
    if (SCF.pts > 0 && !SCF.paid) { SCF.paid = true; scAward('fish', SCF.pts) }
  }
};
function scFishTick(t, dt) {
  if (!SCF.on || !ctrl.walk) return; const F = SC_FISHING, bank = scBank(), yaw = ctrl.walk.yaw, hold = SCF.btn || SCF.key || SCF.pad, press = hold && !SCF.was, release = !hold && SCF.was; SCF.was = hold; SCF.hold = hold;
  ctrl.walk.pos.set(SCF.x, SCF.y, SCF.z);
  if (SCF.st === 'idle') { scFishSay('Hold CAST to wind up. Let go to cast.', 0, '', 'CAST'); if (press) { SCF.st = 'charge'; SCF.t0 = t; SCF.power = 0 } }
  else if (SCF.st === 'charge') {
    SCF.power = 0.5 - 0.5 * Math.cos((t - SCF.t0) / F.windUp * 6.2832); scFishSay('Winding up... let go to cast.', SCF.power, 'pow', 'LET GO');
    if (release) {      // the cast: the lure leaves the rod tip at 38 degrees, fast enough to carry the distance the wind-up asked for
      const R = F.castMin + (F.castMax - F.castMin) * SCF.power, a = 0.663, v = Math.sqrt(R * 9.81 / Math.sin(2 * a)); scFishDraw(t);
      SCF.lp.copy(SCF.tip); SCF.lv.set(Math.sin(yaw) * Math.cos(a) * v, Math.sin(a) * v, Math.cos(yaw) * Math.cos(a) * v); SCF.st = 'fly'; scUseEnergy(SC_ECON.castCost); scBeep(900, 0.06);
    }
  }
  else if (SCF.st === 'fly') {
    SCF.lv.y -= 9.81 * dt; SCF.lp.addScaledVector(SCF.lv, dt); scFishSay('The lure is in the air...', 0, '', '...');
    const p = scFishPondAt(SCF.lp.x, SCF.lp.z), g = scY(SCF.lp.x, SCF.lp.z);
    if (p && SCF.lp.y <= p.z) {      // it lands on the water
      SCF.lp.y = p.z; SCF.pond = p; SCF.st = 'water'; SCF.tw = 0; SCF.look = 0; try { ring(SCF.lp.x, SCF.lp.z, t, 1.2); burst(SCF.lp.x, p.z + 0.03, SCF.lp.z, t, 0.5) } catch (e) { }
      SCF.bait = bank.bait > 0; if (SCF.bait) { bank.bait--; scSave() }
      const near = SC_MONSTERS.list.find(f => f.pond.name === p.name && !f.jump && Math.hypot(f.x - SCF.lp.x, f.z - SCF.lp.z) <= SC_MONSTER_CATCH.reach);
      if (near && bank.lure > 0 && bank.rod && bank.line) { SCF.fish = near; SCF.mon = true; bank.lure--; scSave(); toast('Your Monster Lure landed right beside ' + near.monster.name + '...') }
      else if (near && bank.lure > 0) toast(near.monster.name + ' is right there, but it would snap this tackle. You kept your Monster Lure.');
      else if (near) toast('Something huge is swimming right there. Only a Monster Lure will tempt it.');
    } else if (!p && SCF.lp.y <= g) { toast('That landed on the bank. Aim at the water.'); scMiss(); scFishIdle() }
  }
  else if (SCF.st === 'water' || SCF.st === 'bite') {
    const p = SCF.pond, dx = SCF.x - SCF.lp.x, dz = SCF.z - SCF.lp.z, d = Math.hypot(dx, dz); SCF.tw += dt;
    if (SCF.st === 'water') {
      SCF.lp.y = p.z + 0.02 + Math.sin(t * 2) * 0.02; scFishSay(SCF.fish ? 'A fish is coming to the lure...' : 'Waiting for a fish. Hold REEL to draw the lure in.', 0, '', 'REEL');
      if (hold) { const st = F.reel * dt; SCF.lp.x += dx / d * st; SCF.lp.z += dz / d * st; if (d < 3 || !scFishPondAt(SCF.lp.x, SCF.lp.z)) { toast('Reeled in. Cast again.'); return scFishIdle() } }
      if (!SCF.fish && t > SCF.look) {      // which fish notices the lure? the nearest one inside a circle that grows the longer the lure sits
        SCF.look = t + 0.4; const r = Math.min(F.noticeMax, (SCF.bait ? F.noticeBait : F.notice) + F.noticeGrow * SCF.tw); let best = null, bd = r;
        for (const f of FISH) { if (f.monster || f.jump || f.pond.name !== p.name) continue; const q = Math.hypot(f.x - SCF.lp.x, f.z - SCF.lp.z); if (q < bd) { bd = q; best = f } } SCF.fish = best;
      }
      const f = SCF.fish; if (f) {
        if (f.jump) { if (!SCF.mon) SCF.fish = null } else { const fx = SCF.lp.x - f.x, fz = SCF.lp.z - f.z, q = Math.hypot(fx, fz), st = Math.min(q, F.swim * (SCF.mon ? 0.8 : 1) * dt);
          scFishPut(f, f.x + (q ? fx / q * st : 0), f.z + (q ? fz / q * st : 0), Math.atan2(fz, fx), Math.max(0.15, f.dep - dt * 0.4));
          if (q < 0.7) {      // the bite
            SCF.st = 'bite'; SCF.until = t + (SCF.mon ? F.strikeMonster : F.strike); SCF.big = !SCF.mon && Math.random() < (bank.spinner ? SC_TROPHY.spinner : SC_TROPHY.chance);
            try { ring(SCF.lp.x, SCF.lp.z, t, SCF.mon ? 4 : SCF.big ? 3.2 : 2) } catch (e) { } scBeep(SCF.mon ? 260 : SCF.big ? 330 : 520, SCF.mon || SCF.big ? 0.3 : 0.12);
            toast(SCF.mon ? 'MONSTER BITE! ' + f.monster.name + ' is on! Set the hook!' : SCF.big ? 'BIG BITE! Set the hook!' : 'BITE! Set the hook!');
          } }
      }
    } else {
      SCF.lp.y = p.z - 0.15 + Math.sin(t * 22) * 0.05; scFishSay('BITE! Press now to set the hook!', 1, 'bad', 'SET THE HOOK');
      if (SCF.fish) scFishPut(SCF.fish, SCF.lp.x, SCF.lp.z, SCF.fish.th, 0.2);
      if (press) scFishHook(t); else if (t > SCF.until) { toast(SCF.mon ? SCF.fish.monster.name + ' spat the lure out and took it. Set the hook the moment it bites.' : 'Too slow: it spat the hook. Set the hook the moment it bites.'); scMiss(); scFishIdle() }
    }
  }
  else if (SCF.st === 'fight') scFishFight(t, dt, hold, bank);
  scFishDraw(t);
}
function scFishHook(t) {      // the hook is set: size the fish up and start the fight
  const F = SC_FISHING, f = SCF.fish, bank = scBank(); SCF.L0 = f.L; if (SCF.big) f.L = f.sp.L[1] * scRnd(SC_TROPHY.grow[0], SC_TROPHY.grow[1]);
  SCF.inches = SCF.mon ? f.monster.inches : Math.round(f.L / 0.0254); SCF.lb = scFishLb(SCF.inches); SCF.pull = Math.max(0.3, Math.min(2.2, 0.3 + SCF.lb / 10));
  SCF.lim = bank.line ? F.braided : F.line; SCF.pow = bank.rod ? F.heavy : F.rod; SCF.d = Math.hypot(SCF.lp.x - SCF.x, SCF.lp.z - SCF.z); SCF.ang = Math.atan2(SCF.lp.x - SCF.x, SCF.lp.z - SCF.z);
  SCF.S = 1; SCF.T = 0.3; SCF.over = 0; SCF.slack = 0; SCF.run = false; SCF.ph = t + 0.8; SCF.turn = 0; SCF.fp = new THREE.Vector3(SCF.lp.x, SCF.pond.z - 0.2, SCF.lp.z); SCF.st = 'fight'; SCF.splash = 0; scBeep(660, 0.1);
}
function scFishFight(t, dt, hold, bank) {
  const F = SC_FISHING, f = SCF.fish, p = SCF.pond;
  if (t > SCF.ph) { SCF.run = !SCF.run; SCF.ph = t + (SCF.run ? scRnd(1.2, 2.8) * (0.4 + 0.6 * SCF.S) : scRnd(1.5, 3)); SCF.turn = scRnd(-0.5, 0.5); if (SCF.run && SCF.S > 0.05) scBeep(300, 0.15) }
  const tired = SCF.S <= 0, r = SCF.pull * (tired ? 0.1 : SCF.run ? 0.4 + 0.6 * SCF.S : 0.15);      // how hard the fish is pulling right now
  const want = hold ? 0.35 + 0.9 * r / SCF.lim : 0.12 * r / SCF.lim; SCF.T += (want - SCF.T) * Math.min(1, dt * 2.2);      // tension, as a share of what the line can take
  if (hold) SCF.d -= F.reel * SCF.pow * (1 - Math.min(1, SCF.T) * 0.6) * (SCF.run && !tired ? 0.25 : 1) * dt; else if (SCF.run && !tired) SCF.d += (1.5 + 2.5 * r) * dt;
  if (SCF.run && !tired) SCF.ang += SCF.turn * dt;
  SCF.S = Math.max(0, SCF.S - dt * (0.05 + 0.22 * SCF.T) / (0.6 + SCF.lb / 6));      // the fish tires faster the harder it has to pull
  let x = SCF.x + Math.sin(SCF.ang) * SCF.d, z = SCF.z + Math.cos(SCF.ang) * SCF.d; for (let k = 0; k < 40 && SCF.d > F.landAt && !scFishPondAt(x, z); k++) { SCF.d -= 0.25; x = SCF.x + Math.sin(SCF.ang) * SCF.d; z = SCF.z + Math.cos(SCF.ang) * SCF.d }      // it stays in the pond
  SCF.fp.set(x, p.z - 0.2, z); scFishPut(f, x, z, SCF.run && !tired ? Math.atan2(z - SCF.z, x - SCF.x) + SCF.turn : Math.atan2(SCF.z - z, SCF.x - x), 0.2);
  if (SCF.run && !tired && t > SCF.splash) { SCF.splash = t + 0.6; try { ring(x, z, t, 1 + SCF.pull) } catch (e) { } }
  SCF.over = SCF.T > 1 ? SCF.over + dt : 0; SCF.slack = SCF.T < 0.08 ? SCF.slack + dt : 0;
  const ft = Math.round(SCF.d * SCFT), who = SCF.mon ? f.monster.name : 'The fish';
  scFishSay(tired ? who + ' is worn out. Reel it in! ' + ft + ' ft.' : SCF.run ? who + ' is RUNNING. Ease off! ' + ft + ' ft.' : who + ' is resting. Reel! ' + ft + ' ft.', SCF.T / 1.25, SCF.T > 1 ? 'bad' : SCF.T > 0.75 ? 'warn' : 'ok', hold ? 'REELING' : 'REEL');
  const lost = why => { toast(why); scMiss(); scFishIdle(); scFishCard([why]) };
  if (SCF.over > F.snapAfter) return lost('SNAP! The line broke. Let go of the reel when the fish runs' + (bank.line ? '.' : ', or get the Braided Line.') + (SCF.mon ? ' Your Monster Lure went with it.' : ''));
  if (SCF.slack > F.slackAfter) return lost('The hook pulled out. Keep some tension on the line.' + (SCF.mon ? ' Your Monster Lure went with it.' : ''));
  if (SCF.d > F.spool) return lost('It took all your line and broke off. Reel when it rests.');
  if (SCF.d <= F.landAt) scFishLand(t);
}
function scFishLand(t) {
  const f = SCF.fish, inches = SCF.inches, lb = SCF.lb, kind = trn('sp', f.sp.sk), bank = scBank(), p = SCF.pond; let lines;
  try { burst(SCF.fp.x, p.z + 0.05, SCF.fp.z, t, SCF.mon || SCF.big ? 2.6 : 1.4) } catch (e) { } scWin(); SCF.n++;
  if (SCF.mon) {
    const pts = inches * 5 + SC_MONSTER_CATCH.points; SCF.pts += pts; scNoteCatch(inches, kind + ' (' + f.monster.name + ')', true); if (!bank.monsters.includes(f.monster.name)) bank.monsters.push(f.monster.name); scSave(); const tk = scEarn(SC_ECON.monsterTokens); setTimeout(scWin, 320);
    let tries = 0; const leap = () => { try { if (!scMonsterLeap(f, SC.t) && ++tries < 12) setTimeout(leap, 600) } catch (e) { } }; setTimeout(leap, 1500);
    lines = ['YOU LANDED ' + f.monster.name.toUpperCase() + '! A ' + inches + ' inch, ' + lb + ' pound ' + kind + '. +' + pts + ' points and +' + tk + ' tokens.', { small: 'You let it go, and it swims off to grow even bigger. Watch it jump.' }];
  } else {
    const big = SCF.big, name = kind + (f.vr ? ' (' + f.vr + ')' : ''), pts = inches * 5 + (big ? SC_TROPHY.bonus : 0); SCF.pts += pts; const rec = scNoteCatch(inches, name, big), tk = scEarn(SC_ECON.fishTokens(inches) + (big ? SC_ECON.trophyTokens : 0)), tks = ' and +' + tk + (tk === 1 ? ' token' : ' tokens');
    lines = [(big ? 'TROPHY FISH! You landed a ' : 'Fish on the bank! You caught a ') + name + ': ' + inches + ' inches, ' + lb + ' pounds. +' + pts + ' points' + tks + (big ? ', with ' + SC_TROPHY.bonus + ' points for the trophy.' : '.'), rec ? 'That is your patrol\'s biggest catch so far!' : '',
    { small: big ? 'A quick photo, then you let it go. Catch and release is how a pond grows trophies.' : 'Then you let it go. Catch and release keeps the pond full of big fish.' }];
  }
  scFishIdle(); scFishCard(lines.filter(Boolean));
}
window.addEventListener('keydown', e => { if (e.key === ' ' && SCF.on && !/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test((e.target && e.target.tagName) || '')) { SCF.key = true; e.preventDefault() } });
window.addEventListener('keyup', e => { if (e.key === ' ') SCF.key = false });
window.addEventListener('blur', () => { SCF.key = false; SCF.btn = false });

// ---- hooks: take the place of the old fishing mission, and offer fishing from the Use button
SC_MISSIONS[SC_MISSIONS.findIndex(m => m.id === 'fish')] = scFishMission;
const scwUseF0 = scwUse;
scwUse = function () { if (SCW.on && !SCW.ride && !scRideNear()) { const o = scFishOffer(); if (o) { o.go(); return true } } return scwUseF0() };
const scRideTickF0 = scRideTick;
scRideTick = function (t, dt, ix, iy) { scRideTickF0(t, dt, ix, iy); const u = document.getElementById('scwuse'); if (!u || !u.hidden) return; const o = scFishOffer(); if (o) { if (u.textContent !== o.text) u.textContent = o.text; u.hidden = false } };
