// ===== Scout Adventure At Aiken Basserie: walking the farm in first person =====
// The game opens on foot, seen through the Scout's eyes. The overhead view is the Map (a button), and a
// mission that needs the overhead view takes it and hands the walk back when the patrol goes Home.
//   Walk:  W A S D or the arrow keys (hold Shift to jog), the on-screen stick on a phone or tablet,
//          or the left stick of a controller.
//   Look:  drag on the farm, or the right stick.
// A Scout cannot walk into a pond, through a tree trunk or a building, or off the property.
// The engine is unchanged: it already has a first-person camera (ctrl.walk); this file moves it.
const SCW = {
  eye: 1.5,               // metres from the ground to the Scout's eyes
  walk: 4.5, jog: 7.5,    // metres a second
  tiredSlow: 0.75,        // out of energy: this much of the speed
  fov: 64,                // how wide the first-person view is, in degrees
  stepEnergy: 30,         // metres on foot for one point of energy
  on: false, want: true, x: 0, z: 0, yaw: 0, pitch: 0, keys: {}, stick: [0, 0], pad: [0, 0], bob: 0, walked: 0, grp: null, solids: null, ride: null, v: 0
};
// the Scout a patrol plays as: an emblem and a name, shown on the cards
const SC_AVATARS = [
  { id: 'eagle', name: 'Eagle', icon: '🦅' }, { id: 'wolf', name: 'Wolf', icon: '🐺' }, { id: 'fox', name: 'Fox', icon: '🦊' }, { id: 'owl', name: 'Owl', icon: '🦉' },
  { id: 'beaver', name: 'Beaver', icon: '🦫' }, { id: 'otter', name: 'Otter', icon: '🦦' }, { id: 'turtle', name: 'Turtle', icon: '🐢' }, { id: 'raccoon', name: 'Raccoon', icon: '🦝' }];
function scAvatar(patrol) { const id = (SC.save.avatar || {})[patrol || SC.save.patrol || 'Patrol 1']; return SC_AVATARS.find(a => a.id === id) || null }
function scAvatarCard() {
  const p = SC.save.patrol || 'Patrol 1', cur = scAvatar(p);
  scCard('Choose Your Scout', [cur ? p + ' plays as the ' + cur.name + '.' : 'Pick the Scout your patrol plays as.', { small: 'You see the farm through your Scout’s eyes.' }], cur ? [{ label: 'Back', fn: scHome, go: true }] : []);
  const c = document.getElementById('sccard'), g = scEl('div', 'scavatars');
  for (const a of SC_AVATARS) {
    const b = scEl('button', 'scbtn scavatar' + (cur === a ? ' cur' : '')); b.append(scEl('span', 'scavataricon', a.icon), scEl('span', '', a.name));
    b.onclick = () => { (SC.save.avatar || (SC.save.avatar = {}))[p] = a.id; scSave(); scHome() }; g.appendChild(b);
  }
  c.insertBefore(g, c.querySelector('.scrow'));
}

// ---- where a Scout can stand
function scwInFarm(x, z) { const B = S.boundary && S.boundary.pts; return !B || inPoly(x, z, B) }
function scwBlocked(x, z, pad) {
  if (groundAt(x, z) > 1e8 || !scwInFarm(x, z)) return 'edge';
  for (const p of S.ponds || []) if (!p.unfinished && inPoly(x, z, p.xy_show || p.xy)) return 'water';
  const T = S.trees || []; for (let i = 0; i < T.length; i++) { const dx = T[i][0] - x, dz = T[i][1] - z; if (dx * dx + dz * dz < pad * pad) return 'tree' }
  return '';
}
const scwRay = new THREE.Raycaster();
function scwWall(x, z, dx, dz, reach) {      // is there a building in the way, this close ahead?
  if (!SCW.solids) SCW.solids = picks.filter(m => m.userData && (m.userData.rng || m.userData.solid) && !(typeof leafMeshes !== 'undefined' && leafMeshes.includes(m)));
  const n = Math.hypot(dx, dz); if (n < 1e-6) return false;
  scwRay.set(new THREE.Vector3(x, scY(x, z) + 0.9, z), new THREE.Vector3(dx / n, 0, dz / n)); scwRay.near = 0; scwRay.far = reach;
  return scwRay.intersectObjects(SCW.solids.filter(m => m.visible), false).length > 0;
}
function scwCanGo(x, z, nx, nz, pad) { return !scwBlocked(nx, nz, pad) && !scwWall(x, z, nx - x, nz - z, Math.hypot(nx - x, nz - z) + pad) }
function scwSpot() {      // somewhere clear to start: the end of the driveway, or failing that near the cabin
  const R = S.route && S.route.pts, c = scMark('Cabin'), tries = [];
  if (R && R.length) tries.push([R[R.length - 1][0], R[R.length - 1][1]]); if (c) tries.push([c.p[0] - 16, c.p[2] - 16]);
  for (const t of tries) for (let r = 0; r < 30; r += 3) for (let a = 0; a < 6.28; a += 0.785) { const x = t[0] + Math.cos(a) * r, z = t[1] + Math.sin(a) * r; if (!scwBlocked(x, z, 1.2)) return [x, z] }
  return tries[0] || [0, 0];
}

// ---- in and out of the walk
function scwPlace() { const w = ctrl.walk; if (!w) return; w.pos.set(SCW.x, scY(SCW.x, SCW.z) + (SCW.ride ? SCW.ride.def.eye : SCW.eye) + Math.sin(SCW.bob) * 0.035, SCW.z); w.yaw = SCW.yaw; w.pitch = SCW.pitch; ctrl.target.set(SCW.x, scY(SCW.x, SCW.z), SCW.z); ctrl.sph.radius = 45; ctrl.update() }
function scwEnter() {
  if (SC.cur) return; if (!SCW.has) { const s = scwSpot(), c = scMark('Fishing Lounge') || scMark('Cabin'); SCW.x = s[0]; SCW.z = s[1]; SCW.yaw = c ? Math.atan2(c.p[0] - s[0], c.p[2] - s[1]) : 0; SCW.pitch = 0; SCW.has = true }
  try { fly = null; if (typeof stopDrive === 'function') stopDrive() } catch (e) { }
  ctrl.walk = { pos: new THREE.Vector3(), yaw: SCW.yaw, pitch: SCW.pitch }; cam.fov = SCW.fov; cam.updateProjectionMatrix(); SCW.on = true; SCW.want = true;
  if (SCW.grp) SCW.grp.visible = false; document.body.classList.add('scw-on'); scwPlace(); scwButton();
}
function scwLeave() {      // step out of first person, remembering where the Scout stands and looks
  if (!SCW.on) return; if (ctrl.walk) { SCW.yaw = ctrl.walk.yaw; SCW.pitch = ctrl.walk.pitch }
  SCW.on = false; SCW.v = 0; ctrl.walk = null; cam.fov = 46; cam.updateProjectionMatrix(); document.body.classList.remove('scw-on'); scwButton();
}
function scwMap() {      // the overhead view, with a flag where the Scout is standing
  scwLeave(); SCW.want = false; const y = scY(SCW.x, SCW.z); ctrl.set([SCW.x + 55, y + 120, SCW.z + 85], [SCW.x, y, SCW.z]);
  if (!SCW.grp) { SCW.grp = new THREE.Group(); scene.add(SCW.grp) } while (SCW.grp.children.length) SCW.grp.remove(SCW.grp.children[0]);
  const keep = SC.grp; SC.grp = SCW.grp; const a = scAvatar(); scFlag(SCW.x, SCW.z, 0xf2c230, 'You are here'); SC.grp = keep; SCW.grp.visible = true; scwButton();
}
function scwButton() { const b = document.getElementById('scwmap'); if (b) { b.textContent = SCW.on ? 'Map' : 'Walk'; b.hidden = !!SC.cur } const u = document.getElementById('scwuse'); if (u && !SCW.on) u.hidden = true }

// ---- every frame
function scwInput() {      // where the Scout wants to go: x to the right, y ahead, each from -1 to 1
  const k = SCW.keys; let x = (k.d || k.ArrowRight ? 1 : 0) - (k.a || k.ArrowLeft ? 1 : 0), y = (k.w || k.ArrowUp ? 1 : 0) - (k.s || k.ArrowDown ? 1 : 0);
  x += SCW.stick[0] + SCW.pad[0]; y += SCW.stick[1] + SCW.pad[1]; const n = Math.hypot(x, y); if (n > 1) { x /= n; y /= n } return [x, y, n > 0.02];
}
function scwTick(t, dt) {
  if (!SCW.on) return; if (!ctrl.walk || SC.cur) { scwLeave(); return }      // something else took the camera
  dt = Math.min(dt, 0.05); SCW.yaw = ctrl.walk.yaw; SCW.pitch = ctrl.walk.pitch;      // dragging on the farm turns the head
  const [ix, iy, moving] = scwInput(), fx = Math.sin(SCW.yaw), fz = Math.cos(SCW.yaw), rx = -fz, rz = fx;
  if (moving && !SCW.ride) {
    const tired = typeof scTired === 'function' && scTired(), jog = SCW.keys.Shift || Math.hypot(ix, iy) > 0.9 && (SCW.stick[0] || SCW.stick[1] || SCW.pad[0] || SCW.pad[1]);
    const sp = (jog ? SCW.jog : SCW.walk) * (tired ? SCW.tiredSlow : 1) * dt, dx = (fx * iy + rx * ix) * sp, dz = (fz * iy + rz * ix) * sp, x = SCW.x, z = SCW.z;
    // slide along whatever is in the way
    if (scwCanGo(x, z, x + dx, z + dz, 0.55)) { SCW.x += dx; SCW.z += dz } else if (scwCanGo(x, z, x + dx, z, 0.55)) SCW.x += dx; else if (scwCanGo(x, z, x, z + dz, 0.55)) SCW.z += dz;
    const d = Math.hypot(SCW.x - x, SCW.z - z); SCW.bob += d * 2.1; SCW.walked += d;
    if (d > 0 && SCW.homeCard) { SCW.homeCard = false; const c = document.getElementById('sccard'); if (c && c.querySelector('.scclose')) c.hidden = true }      // setting off puts the Welcome card away
    if (SCW.walked >= SCW.stepEnergy) { SCW.walked -= SCW.stepEnergy; if (typeof scUseEnergy === 'function') scUseEnergy(1) }
  }
  if (typeof scRideTick === 'function') scRideTick(t, dt, ix, iy);
  scwPlace();
}

// ---- controls: keys, and a stick for touch screens
window.addEventListener('keydown', e => { if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; SCW.keys[k] = true; if (SCW.on && /^Arrow/.test(k)) e.preventDefault(); if (SCW.on && k === 'e' && typeof scwUse === 'function') scwUse() });
window.addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; SCW.keys[k] = false });
window.addEventListener('blur', () => { SCW.keys = {}; SCW.stick = [0, 0] });
function scwStick() {
  const base = scEl('div'); base.id = 'scwstick'; base.setAttribute('aria-label', 'Walk: drag to move'); const nub = scEl('div'); nub.id = 'scwnub'; base.appendChild(nub); document.body.appendChild(base);
  let id = null; const set = e => { const r = base.getBoundingClientRect(), R = r.width / 2; let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R; const n = Math.hypot(x, y); if (n > 1) { x /= n; y /= n } SCW.stick = [x, -y]; nub.style.transform = 'translate(' + (x * R * 0.6) + 'px,' + (y * R * 0.6) + 'px)' };
  const end = e => { if (e.pointerId !== id) return; id = null; SCW.stick = [0, 0]; nub.style.transform = '' };
  base.addEventListener('pointerdown', e => { id = e.pointerId; try { base.setPointerCapture(id) } catch (er) { } set(e); e.preventDefault() });
  base.addEventListener('pointermove', e => { if (e.pointerId === id) set(e) }); base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
}

// ---- hooks into the game core (which is left unchanged)
const scTickW0 = scTick;
scTick = function (t, dt) { scTickW0(t, dt); try { scwTick(t, dt) } catch (e) { if (!SCW.err) { SCW.err = e; console.error(e) } } };
const scStartW0 = scStart;
scStart = function (m) { scwLeave(); if (SCW.grp) SCW.grp.visible = false; scStartW0(m); scwButton() };      // a mission takes the camera
const scHomeW0 = scHome;
scHome = function () {
  const was = SCW.on; if (was) scwLeave(); scHomeW0(); if (SCW.want && SCW.ready) scwEnter(); else scwButton();
  const c = document.getElementById('sccard'), row = c && c.querySelector('.scrow'), a = scAvatar(); if (!row) return;
  if (!a) return scAvatarCard();      // first, choose a Scout
  const small = c.querySelector('.scsmall'); if (small) small.textContent = 'Walk with W A S D, the arrow keys, the on-screen stick or a controller. Drag to look around. The Map button shows the whole farm.';
  for (const p of c.querySelectorAll('p')) if (/^You are playing as: /.test(p.textContent)) p.textContent = p.textContent.replace('You are playing as: ', 'You are playing as: ' + a.icon + ' the ' + a.name + ' of ');
  const e = scEl('button', 'scbtn', 'Change Scout'); e.onclick = scAvatarCard; row.insertBefore(e, row.children[1] || null);
  const go = scEl('button', 'scbtn go', 'Let\u2019s Go'); go.title = 'Put this card away. The Home button brings it back.'; go.onclick = () => { c.hidden = true }; row.appendChild(go);
  const x = scEl('button', 'scclose', '\u00D7'); x.title = 'Hide this card. The Home button brings it back.'; x.setAttribute('aria-label', 'Hide this card'); x.onclick = () => { c.hidden = true }; c.insertBefore(x, c.firstChild); SCW.homeCard = true;
};
const scInitW0 = scInit;
scInit = function () {
  scInitW0(); const top = document.getElementById('sctop');
  const b = scEl('button', 'scbtn', 'Map'); b.id = 'scwmap'; b.title = 'Switch between walking and the overhead map'; b.onclick = () => { if (SCW.on) scwMap(); else { SCW.want = true; scwEnter() } };
  if (top) top.insertBefore(b, top.children[1] || null);
  const u = scEl('button', 'scbtn go'); u.id = 'scwuse'; u.hidden = true; document.body.appendChild(u); scwStick();
  setTimeout(() => { SCW.ready = true; if (!SC.cur && SCW.want) scwEnter() }, 2400);      // a look at the farm from above, then down to the ground
};
