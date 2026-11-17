// ===== Scout Adventure At Aiken Basserie: core =====
// A game layered on the farm's 3D engine. The engine calls three hooks: scInit() once the farm is built,
// scPick(e) on every tap, scTick(t, dt) every frame. Each mission is an object in SC_MISSIONS with:
//   id, name, start(), stop(), pick(e) -> true if it used the tap, tick(t, dt)
const SCFT = 3.28084;
const SC = { cur: null, grp: null, t: 0, save: { patrol: 'Patrol 1', troop: '', scores: {} }, voice: true };
const SC_MISSIONS = [];
const scRnd = (a, b) => a + (b - a) * Math.random();
const scShuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]] } return a };

function scEl(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e }
// One card for everything the game says. lines: strings or {small:'...'} or {list:[...]} or {input:{value,placeholder,on}}; buttons: {label, fn, go, big}
function scCard(title, lines, buttons) {
  const c = document.getElementById('sccard'); c.textContent = ''; c.hidden = false; c.appendChild(scEl('h2', '', title));
  for (const l of lines || []) {
    if (typeof l === 'string') c.appendChild(scEl('p', '', l));
    else if (l.small) c.appendChild(scEl('p', 'scsmall', l.small));
    else if (l.list) { const u = scEl('ul'); l.list.forEach(s => u.appendChild(scEl('li', '', s))); c.appendChild(u) }
    else if (l.input) { const i = scEl('input'); i.value = l.input.value || ''; i.placeholder = l.input.placeholder || ''; i.maxLength = 24; i.setAttribute('aria-label', l.input.placeholder || 'Text'); i.oninput = () => l.input.on(i.value); c.appendChild(i) }
  }
  if (buttons && buttons.length) { const r = scEl('div', 'scrow'); for (const b of buttons) { const e = scEl('button', 'scbtn' + (b.go ? ' go' : '') + (b.big ? ' big' : ''), b.label); e.onclick = b.fn; r.appendChild(e) } c.appendChild(r) }
  c.scrollTop = 0;
}
function scSpeak(text) { try { if (!SC.voice || !window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; u.pitch = 1.25; speechSynthesis.speak(u) } catch (e) { } }
function scBeep(freq, dur) { try { const c = SND.ctx; if (!c || c.state !== 'running' || !SND.on) return; const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(0.18, c.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (dur || 0.25)); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + (dur || 0.25) + 0.05) } catch (e) { } }
const scWin = () => { scBeep(660, 0.15); setTimeout(() => scBeep(880, 0.3), 140) }, scMiss = () => scBeep(220, 0.3);

// ---- scores: kept on this device (browser storage), one row per patrol
function scLoad() { try { const s = store.get('abf3d.scouts'); if (s && s.scores) SC.save = s } catch (e) { } }
function scSave() { try { store.set('abf3d.scouts', SC.save) } catch (e) { } }
function scAward(id, pts) { const p = SC.save.patrol || 'Patrol 1', s = SC.save.scores[p] || (SC.save.scores[p] = {}); pts = Math.max(0, Math.round(pts)); if (!(s[id] >= pts)) s[id] = pts; scSave(); scBar(); return pts }
const scTotal = p => Object.values(SC.save.scores[p] || {}).reduce((a, b) => a + b, 0);

// ---- 3D helpers. Engine coordinates: x, height, z (metres). Plan north / east come from the engine (NORTH, EAST).
function scY(x, z) { const g = groundAt(x, z); return g > 1e8 ? 0 : g }
function scLabel(text, color) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const x = cv.getContext('2d'); x.font = '600 44px "Space Grotesk",system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 8; x.strokeStyle = 'rgba(10,14,11,.9)'; x.strokeText(text, 256, 50); x.fillStyle = color || '#f2c230'; x.fillText(text, 256, 50);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false, fog: false })); s.scale.set(8, 1.5, 1); s.renderOrder = 20; return s;
}
function scFlag(x, z, color, text) {
  const g = new THREE.Group(), y = scY(x, z); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 8), new THREE.MeshStandardMaterial({ color: 0xe8e4da })); pole.position.y = 2; g.add(pole);
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1.6, 0.45); sh.lineTo(0, 0.9); const f = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); f.position.set(0.06, 3.05, 0); g.add(f);
  if (text) { const l = scLabel(text); l.position.y = 5.2; g.add(l) } g.position.set(x, y, z); SC.grp.add(g); return g;
}
function scLine(pts, color) { const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0], p[1], p[2]))); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, depthTest: false, fog: false })); l.renderOrder = 19; SC.grp.add(l); return l }
function scClear() { while (SC.grp.children.length) { const o = SC.grp.children.pop(); o.traverse(q => { if (q.geometry) q.geometry.dispose() }) } }
function scHit(e) {   // what did the tap land on? first a solid thing, otherwise the ground
  const r = canvas.getBoundingClientRect(); mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1; ray.setFromCamera(mouse, cam);
  const h = ray.intersectObjects(picks.filter(m => m.visible), false)[0]; if (h) return [h.point.x, h.point.z]; return groundHit(e);
}
function scPond(x, z) { for (const p of S.ponds || []) if (inPoly(x, z, p.xy)) return p; return null }
function scWater(e) {    // where the tap meets a pond's surface
  const r = canvas.getBoundingClientRect(); mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1; ray.setFromCamera(mouse, cam); const o = ray.ray.origin, d = ray.ray.direction;
  for (const p of S.ponds || []) { if (d.y >= -1e-4) continue; const k = (p.z - o.y) / d.y; if (k <= 0) continue; const x = o.x + d.x * k, z = o.z + d.z * k; if (inPoly(x, z, p.xy)) return { pond: p, x, z } } return null;
}
function scBearing(ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, n = dx * NORTH.x + dz * NORTH.y, e = dx * EAST.x + dz * EAST.y; return { deg: (Math.atan2(e, n) * 180 / Math.PI + 360) % 360, ft: Math.hypot(dx, dz) * SCFT } }
const scCompass = d => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(d / 45) % 8];
function scMark(name) { return (S.scout.marks || []).find(m => m.n === name) }
function scLookAt(x, z, dist) { const y = scY(x, z); flyTo({ p: [x + dist * 0.55, y + dist * 0.6, z + dist * 0.75], t: [x, y, z] }) }
// a flat, open spot near the cabin: used for the fire class
function scOpenSpot() {
  const c = scMark('Cabin') || { p: [0, 0, 0] }; let best = null, bs = -1e9;
  for (let dx = -70; dx <= 70; dx += 5) for (let dz = -70; dz <= 70; dz += 5) {
    const x = c.p[0] + dx, z = c.p[2] + dz, g = groundAt(x, z); if (g > 1e8 || scPond(x, z)) continue;
    const slope = Math.hypot(groundAt(x + 2, z) - groundAt(x - 2, z), groundAt(x, z + 2) - groundAt(x, z - 2)) / 4; let near = 1e9;
    for (const t of S.trees || []) near = Math.min(near, Math.hypot(t[0] - x, t[1] - z) - t[4]); for (const m of S.scout.marks) near = Math.min(near, Math.hypot(m.p[0] - x, m.p[2] - z) - m.r);
    for (const p of S.ponds) for (let i = 0; i < p.xy.length; i += 12) near = Math.min(near, Math.hypot(p.xy[i][0] - x, p.xy[i][1] - z));
    const sc = Math.min(near, 14) - slope * 220 - Math.hypot(dx, dz) * 0.04; if (sc > bs) { bs = sc; best = [x, z] }
  } return best || [c.p[0] + 20, c.p[2] - 20];
}

// ---- screens
function scBar() {
  const b = document.getElementById('scbar'); if (!b) return; b.textContent = ''; const mine = SC.save.scores[SC.save.patrol] || {};
  for (const m of SC_MISSIONS) { const e = scEl('button', 'scbtn' + (SC.cur === m ? ' cur' : mine[m.id] !== undefined ? ' done' : ''), (mine[m.id] !== undefined ? '★ ' : '') + m.name); e.onclick = () => scStart(m); b.appendChild(e) }
}
function scStart(m) { scStop(); SC.cur = m; scBar(); m.start() }
function scStop() { if (SC.cur && SC.cur.stop) SC.cur.stop(); SC.cur = null; scClear(); try { window.speechSynthesis && speechSynthesis.cancel() } catch (e) { } if (ctrl.walk) { ctrl.walk = null; ctrl.set([cam.position.x, cam.position.y + 30, cam.position.z + 40], [cam.position.x, scY(cam.position.x, cam.position.z), cam.position.z]) } scBar() }
function scHome() {
  scStop(); const t = SC.save.troop ? 'Troop ' + SC.save.troop : 'Scouts';
  scCard('Welcome, ' + t + '!', ['This is the real farm you are standing on. Pick a mission from the bar at the bottom. Every mission earns points for your patrol.', { small: 'Drag to look around. Pinch or scroll to zoom. Tap things to choose them.' }, 'You are playing as: ' + SC.save.patrol + ' (' + scTotal(SC.save.patrol) + ' points)'],
    [{ label: 'Change Patrol', fn: scPatrol }, { label: 'Scoreboard', fn: scBoard, go: true }]);
}
function scPatrol() {
  let name = SC.save.patrol, troop = SC.save.troop;
  scCard('Who Is Playing?', ['Patrol name:', { input: { value: name, placeholder: 'Patrol name', on: v => name = v } }, 'Troop number:', { input: { value: troop, placeholder: 'Troop number', on: v => troop = v } }, { small: 'Scores are kept on this phone or computer only.' }],
    [{ label: 'Save', go: true, fn: () => { SC.save.patrol = (name || 'Patrol 1').trim().slice(0, 24) || 'Patrol 1'; SC.save.troop = (troop || '').trim().slice(0, 8); scSave(); scWelcome(); scHome() } }]);
}
function scBoard() {
  const rows = Object.keys(SC.save.scores).map(p => [p, scTotal(p)]).sort((a, b) => b[1] - a[1]);
  scCard('Scoreboard', rows.length ? [{ list: rows.map((r, i) => (i + 1) + '. ' + r[0] + ': ' + r[1] + ' points') }] : ['No scores yet. Play a mission!'],
    [{ label: 'Back', fn: scHome, go: true }, { label: 'Clear All Scores', fn: () => scCard('Clear All Scores?', ['This wipes every patrol\'s points on this device.'], [{ label: 'Yes, Clear', fn: () => { SC.save.scores = {}; scSave(); scBoard() } }, { label: 'No', go: true, fn: scBoard }]) }]);
}
// welcome banner at the Fishing Lounge and, at night, in the sky
function scWelcome() {
  if (SC.banner) { scene.remove(SC.banner); SC.banner = null } if (SC.sky) { scene.remove(SC.sky); SC.sky = null }
  const txt = SC.save.troop ? 'WELCOME TROOP ' + SC.save.troop : 'WELCOME SCOUTS', m = scMark('Fishing Lounge'); if (!m) return;
  const g = new THREE.Group(), l = scLabel(txt, '#ffffff'); l.scale.set(16, 3, 1); l.position.y = 9; g.add(l); g.position.set(m.p[0], m.p[1], m.p[2]); scene.add(g); SC.banner = g;
  const s = scLabel('★ ' + txt + ' ★', '#cfe0ff'); s.material.depthTest = true; s.scale.set(1500, 280, 1); SC.sky = s; SC.skyDir = new THREE.Vector3(NORTH.x * 0.3 + EAST.x * 0.9, 0.42, NORTH.y * 0.3 + EAST.y * 0.9).normalize(); scene.add(s);
}

// ---- engine hooks
function scInit() {
  document.body.classList.add('scout-mode'); scLoad(); SC.grp = new THREE.Group(); scene.add(SC.grp);
  const card = scEl('div'); card.id = 'sccard'; card.setAttribute('role', 'status'); const bar = scEl('nav'); bar.id = 'scbar'; bar.setAttribute('aria-label', 'Missions'); const top = scEl('div'); top.id = 'sctop';
  const mk = (label, title, fn) => { const b = scEl('button', 'scbtn', label); b.title = title; b.setAttribute('aria-label', title); b.onclick = () => fn(b); top.appendChild(b); return b };
  mk('Home', 'Home', scHome); mk('Day / Night', 'Day or night', () => setTime(NIGHT > 0.5 ? 15 : 22.5));
  mk('Sound', 'Sound on or off', () => { try { sndToggle() } catch (e) { } });
  mk('Voice', 'Voice on or off', b => { SC.voice = !SC.voice; b.style.opacity = SC.voice ? 1 : 0.45; if (!SC.voice) try { speechSynthesis.cancel() } catch (e) { } });
  document.body.append(card, bar, top); scWelcome(); scBar(); scHome();
  const c0 = scMark('Cabin'); if (c0) setTimeout(() => scLookAt(c0.p[0] - 8, c0.p[2] - 14, 120), 400);   // open on the heart of the farm
}
function scPick(e) { return !!(SC.cur && SC.cur.pick && SC.cur.pick(e)) }
function scTick(t, dt) {
  SC.t = t; if (SC.sky) { const k = sm(0.55, 0.95, NIGHT); SC.sky.visible = k > 0.02; SC.sky.material.opacity = k * 0.9; SC.sky.position.copy(cam.position).addScaledVector(SC.skyDir, 2800) }
  if (SC.cur && SC.cur.tick) SC.cur.tick(t, dt);
}
window.__sc = { start: id => scStart(SC_MISSIONS.find(m => m.id === id)), state: () => SC, ids: () => SC_MISSIONS.map(m => m.id), proj: (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam), R = canvas.getBoundingClientRect(); return [Math.round((v.x + 1) / 2 * R.width), Math.round((1 - v.y) / 2 * R.height)] }, pond: i => { const p = S.ponds[i]; let cx = 0, cz = 0; p.xy.forEach(q => { cx += q[0] / p.xy.length; cz += q[1] / p.xy.length }); return [cx, p.z, cz] }, sky: () => ({ vis: CSTL.g && CSTL.g.visible, n: CSTL_F.length, night: NIGHT, on: CSTL.on }) };   // test hook
