// ===== Missions: Catch A Bass, Night Sky Hunt =====

// ---- Catch A Bass: cast onto a pond, wait for the bite, reel in time
// Trophy fish: about one bite in four is a big one, and the last cast of a round always is if none has bitten yet.
// A trophy is longer than the biggest of its kind swimming in the ponds, and earns a bonus.
const SC_TROPHY = { chance: 0.25, grow: [1.08, 1.22], bonus: 100 };
function scBigCatch(patrol) { return (SC.save.big || {})[patrol || SC.save.patrol || 'Patrol 1'] || null }      // a patrol's biggest fish: {inches, name, trophy}
function scNoteCatch(inches, name, trophy) { const p = SC.save.patrol || 'Patrol 1', b = SC.save.big || (SC.save.big = {}); if (!b[p] || inches > b[p].inches) { b[p] = { inches, name, trophy: !!trophy }; scSave(); return true } return false }
SC_MISSIONS.push({
  id: 'fish', name: 'Catch A Bass',
  start() { this.casts = 6; this.pts = 0; this.best = null; this.st = 'idle'; this.bob = null; this.big = false; this.hadBig = false; const p = S.ponds[2] || S.ponds[0]; let cx = 0, cz = 0; p.xy.forEach(q => { cx += q[0] / p.xy.length; cz += q[1] / p.xy.length }); flyTo({ p: [cx + 18, p.z + 62, cz + 38], t: [cx, p.z, cz] }); this.show() },
  show(extra) { const bc = scBigCatch(); scCard('Catch A Bass', (extra || []).concat([this.casts > 0 ? 'Tap the water to cast. Casts left: ' + this.casts + '.' : '', 'Points: ' + this.pts, bc ? { small: 'Your biggest catch: ' + bc.inches + ' inch ' + bc.name + (bc.trophy ? ' (trophy)' : '') + '.' } : { small: 'Trophy fish are in here. Watch for a BIG BITE.' }]).filter(Boolean), this.casts > 0 ? [] : [{ label: 'Play Again', fn: () => scStart(this) }, { label: 'Home', go: true, fn: scHome }]) },
  pick(e) {
    if (this.st !== 'idle' || this.casts <= 0) return true; const w = scWater(e); if (!w) { toast('Cast onto the water!'); return true }
    if (!this.bob) { this.bob = new THREE.Group(); const a = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10, 0, 6.3, 0, 1.6), new THREE.MeshBasicMaterial({ color: 0xe23b2e })), b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10, 0, 6.3, 1.5, 1.7), new THREE.MeshBasicMaterial({ color: 0xffffff })); this.bob.add(a, b) }
    SC.grp.add(this.bob); this.bob.position.set(w.x, w.pond.z + 0.1, w.z); this.w = w; this.st = 'wait'; this.casts--; this.biteAt = SC.t + scRnd(2, 6); this.big = Math.random() < SC_TROPHY.chance || (this.casts <= 0 && !this.hadBig); if (this.big) this.hadBig = true; try { ring(w.x, w.z, SC.t, 1.2) } catch (er) { }
    scCard('Catch A Bass', ['Your line is out. Watch the bobber...', { small: 'Do not reel until it dips!' }], [{ label: 'Reel In', big: true, fn: () => this.reel() }]); return true;
  },
  reel() {
    if (this.st === 'wait') { this.st = 'idle'; SC.grp.remove(this.bob); scMiss(); return this.show(['Too early! You pulled the bait away from the fish.']) }
    if (this.st !== 'bite') return; this.st = 'idle'; SC.grp.remove(this.bob); const w = this.w, inP = FISH.filter(f => inPoly(f.x, f.z, w.pond.xy)); let f = null, bd = 1e9; for (const q of inP) { const d = Math.hypot(q.x - w.x, q.z - w.z) * scRnd(0.5, 1.5); if (d < bd) { bd = d; f = q } }
    if (!f) f = FISH[(Math.random() * FISH.length) | 0]; if (!f) return this.show(['Nothing there this time.']);
    const big = this.big, inches = Math.round((big ? f.sp.L[1] * scRnd(SC_TROPHY.grow[0], SC_TROPHY.grow[1]) : f.L) / 0.0254), name = trn('sp', f.sp.sk) + (f.vr ? ' (' + f.vr + ')' : ''), p = inches * 5 + (big ? SC_TROPHY.bonus : 0); this.pts += p; const rec = scNoteCatch(inches, name, big); if (!this.best || inches > this.best) this.best = inches; scWin(); try { burst(w.x, w.pond.z + 0.05, w.z, SC.t, big ? 2.6 : 1.4) } catch (er) { }
    if (this.casts <= 0) scAward('fish', this.pts); this.show([big ? 'TROPHY FISH! You landed a ' + name + ', ' + inches + ' inches long. +' + p + ' points, with ' + SC_TROPHY.bonus + ' for the trophy.' : 'Fish on! You caught a ' + name + ', ' + inches + ' inches long. +' + p + ' points.', rec ? 'That is your patrol\'s biggest catch so far!' : '', { small: big ? 'A quick photo, then you let it go. Catch and release is how a pond grows trophies.' : 'Then you let it go. Catch and release keeps the pond full of big fish.' }]);
  },
  tick(t) {
    if (!this.bob || this.st === 'idle') return; const w = this.w;
    if (this.st === 'wait') { this.bob.position.y = w.pond.z + 0.1 + Math.sin(t * 2) * 0.03; if (t > this.biteAt) { this.st = 'bite'; this.until = t + 1.7; try { ring(w.x, w.z, t, this.big ? 3.5 : 2) } catch (er) { } scBeep(this.big ? 330 : 520, this.big ? 0.3 : 0.12); scCard('Catch A Bass', [this.big ? 'BIG BITE! This one is heavy!' : 'BITE!'], [{ label: 'REEL IN NOW!', big: true, go: true, fn: () => this.reel() }]) } }
    else if (this.st === 'bite') { this.bob.position.y = w.pond.z - 0.12 + Math.sin(t * 22) * 0.06; if (t > this.until) { this.st = 'idle'; SC.grp.remove(this.bob); scMiss(); if (this.casts <= 0) scAward('fish', this.pts); this.show(['It got away! Reel as soon as the bobber dips.']) } }
  },
  stop() { this.st = 'idle' }
});

// ---- Night Sky Hunt. Real stars for the evening of 29 November at Aiken (about 9 pm), plus the farm's own fish and safari figures.
// taz = true compass bearing, el = height above the horizon, sz = half-size, all in degrees. Real figures are drawn simply and are approximate.
if (typeof SCOUT !== 'undefined' && SCOUT) { const T = { 'The Bass': 200, 'The Bream': 250, 'The Elephant': 150, 'The Giraffe': 300, 'The Lion': 55 }; for (const F of CSTL_F) if (T[F.n] !== undefined) F.taz = T[F.n] }   // keep the farm's own figures clear of the real ones
if (typeof SCOUT !== 'undefined' && SCOUT) CSTL_F.push(
  { n: 'Big Dipper', taz: 4, el: 9, sz: 12, real: 1, hint: 'Low in the north. Seven stars shaped like a pot with a long handle.', loop: [[0, 0], [0.08, -0.3], [0.55, -0.32], [0.6, 0.02]], lines: [[[-1, 0.05], [-0.62, 0], [-0.3, -0.02], [0, 0]]], stars: [] },
  { n: 'North Star', taz: 0, el: 33.6, sz: 2.5, real: 1, hint: 'Find the two stars at the end of the Dipper\'s bowl. Follow them straight up, about five times the gap between them.', loop: [], lines: [], stars: [[0, 0]] },
  { n: 'Cassiopeia', taz: 352, el: 60, sz: 7, real: 1, hint: 'High above the North Star. Five stars in a zig-zag like the letter W or M.', loop: [], lines: [[[-1, 0.3], [-0.5, -0.3], [0, 0.2], [0.5, -0.35], [1, 0.25]]], stars: [] },
  { n: 'Orion', taz: 100, el: 19, sz: 11, real: 1, hint: 'Rising in the east. Look for three stars in a short straight row: Orion\'s belt.', loop: [], lines: [[[-0.45, 0.6], [-0.15, 0.05], [0, 0], [0.15, -0.05], [0.5, -0.6]], [[0.35, 0.7], [0.15, -0.05]], [[-0.15, 0.05], [-0.35, -0.75]], [[-0.45, 0.6], [0.35, 0.7]]], stars: [] });
SC_MISSIONS.push({
  id: 'sky', name: 'Night Sky Hunt',
  start() {
    this.list = CSTL_F.filter(F => F.c); this.list.sort((a, b) => (b.real || 0) - (a.real || 0)); this.i = 0; this.pts = 0; this.hinted = false; this.tod = TOD; setTime(23); CSTL.on = true; for (const F of this.list) if (F.lab) F.lab.visible = false;
    const s = scOpenSpot(), n = Math.atan2(NORTH.x, NORTH.y); ctrl.walk = { pos: new THREE.Vector3(s[0], scY(s[0], s[1]) + 14, s[1]), yaw: n, pitch: 0.32 } /* lifted above the treetops so the low northern stars can be seen */; ctrl.update(); this.show();
  },
  show() {
    const F = this.list[this.i]; if (!F) return this.end();
    scCard('Night Sky Hunt ' + (this.i + 1) + ' Of ' + this.list.length, ['Find: ' + F.n, { small: this.hinted ? (F.hint || 'It is one of the farm\'s own star pictures, low over the trees. Turn all the way around.') : 'You are up above the treetops, facing north. Drag to look around the sky, then tap what you find.' }, { small: 'Points: ' + this.pts }],
      this.hinted ? [] : [{ label: 'Give Me A Hint (-25)', fn: () => { this.hinted = true; this.show() } }]);
  },
  pick(e) {
    const F = this.list[this.i]; if (!F) return true; const r = canvas.getBoundingClientRect(); mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1; ray.setFromCamera(mouse, cam);
    const ang = ray.ray.direction.angleTo(F.c) * 180 / Math.PI;
    if (ang < Math.max(F.sz * 1.1, 5)) { this.pts += this.hinted ? 75 : 100; if (F.lab) F.lab.visible = true; scWin(); toast('You found ' + F.n + '!'); this.i++; this.hinted = false; this.show() } else { scMiss(); toast('Not there. Keep looking!') } return true;
  },
  end() { const t = scAward('sky', this.pts); scCard('You Know The Sky!', ['Score: ' + t + ' points.', { small: 'Tonight, find the Big Dipper and the North Star for real. The North Star always shows which way is north. The fish and safari animals are just for fun: they are not real constellations.' }], [{ label: 'Home', go: true, fn: scHome }]) },
  stop() { for (const F of CSTL_F) if (F.lab) F.lab.visible = true; if (this.tod !== undefined) setTime(this.tod) }
});
