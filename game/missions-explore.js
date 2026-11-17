// ===== Missions: Scavenger Hunt, Compass Course, Follow The Raindrop, Wildlife Spotter =====

// ---- Scavenger Hunt: read the clue, find the place on the farm, tap it
SC_MISSIONS.push({
  id: 'hunt', name: 'Scavenger Hunt',
  start() { this.list = scShuffle(S.scout.marks).slice(0, 8); this.i = 0; this.pts = 0; this.hint = false; this.t0 = performance.now(); this.show() },
  show() {
    const m = this.list[this.i]; if (!m) return this.end();
    scCard('Scavenger Hunt ' + (this.i + 1) + ' Of ' + this.list.length, ['Clue: ' + m.c, { small: this.hint ? 'It is the ' + m.n + '.' : 'Look around the farm, then tap it. Points so far: ' + this.pts }],
      this.hint ? [] : [{ label: 'Give Me A Hint (-25)', fn: () => { this.hint = true; this.show() } }]);
  },
  pick(e) {
    const m = this.list[this.i], h = scHit(e); if (!m || !h) return true;
    if (Math.hypot(h[0] - m.p[0], h[1] - m.p[2]) <= m.r) { this.pts += this.hint ? 75 : 100; scFlag(m.p[0], m.p[2], 0x2fbf5a, m.n); scWin(); toast('Found it: ' + m.n + '!'); this.i++; this.hint = false; this.show() }
    else { scMiss(); toast('Not that one. Keep looking!') } return true;
  },
  end() { const s = Math.round((performance.now() - this.t0) / 1000), bonus = Math.max(0, 200 - s), tot = scAward('hunt', this.pts + bonus); scCard('Hunt Complete!', ['You found ' + this.list.length + ' places in ' + s + ' seconds.', 'Speed bonus: ' + bonus + '. Total: ' + tot + ' points.'], [{ label: 'Play Again', fn: () => scStart(this) }, { label: 'Home', go: true, fn: scHome }]) }
});

// ---- Compass Course: a bearing and a distance from a known start; tap where you think it ends
SC_MISSIONS.push({
  id: 'compass', name: 'Compass Course',
  legs: [['Fishing Lounge', 'Live Oak'], ['Cabin', 'Barn'], ['Barn', 'Main House'], ['Live Oak', 'Blueberry Patch'], ['Main House', 'Tiny House']],
  start() { this.i = 0; this.pts = 0; this.answered = false; this.show() },
  show() {
    scClear(); this.answered = false; const L = this.legs[this.i]; if (!L) return this.end(); const a = scMark(L[0]), b = scMark(L[1]); if (!a || !b) { this.i++; return this.show() }
    this.a = a; this.b = b; this.q = scBearing(a.p[0], a.p[2], b.p[0], b.p[2]); scFlag(a.p[0], a.p[2], 0xd8342b, 'Start: ' + a.n); scLookAt((a.p[0] + b.p[0]) / 2, (a.p[2] + b.p[2]) / 2, Math.max(70, this.q.ft / SCFT * 1.5));
    scCard('Compass Course ' + (this.i + 1) + ' Of ' + this.legs.length, ['Start at the red flag (' + a.n + ').', 'Walk ' + Math.round(this.q.ft / 5) * 5 + ' feet on a bearing of ' + Math.round(this.q.deg) + '° (' + scCompass(this.q.deg) + ').', 'Tap the spot where you end up.',
      { small: 'The yellow arrow in the corner points north. North is 0°, east 90°, south 180°, west 270°.' }]);
  },
  pick(e) {
    if (this.answered) return true; const h = scHit(e); if (!h) return true; this.answered = true; const err = Math.hypot(h[0] - this.b.p[0], h[1] - this.b.p[2]) * SCFT, p = Math.max(0, Math.round(100 - err / 2)); this.pts += p;
    scFlag(h[0], h[1], 0x3b82f6, 'Your Guess'); scFlag(this.b.p[0], this.b.p[2], 0x2fbf5a, this.b.n);
    scLine([[this.a.p[0], scY(this.a.p[0], this.a.p[2]) + 1.5, this.a.p[2]], [this.b.p[0], scY(this.b.p[0], this.b.p[2]) + 1.5, this.b.p[2]]], 0xf2c230); p >= 60 ? scWin() : scMiss();
    scCard(p >= 85 ? 'Right On Target!' : p >= 60 ? 'Close!' : 'Keep Practicing', ['The answer was the ' + this.b.n + '.', 'You were ' + Math.round(err) + ' feet away: ' + p + ' points.', { small: 'Outside, about 2 of your steps is 5 feet. Count your paces to measure distance.' }],
      [{ label: this.i + 1 < this.legs.length ? 'Next Leg' : 'Finish', go: true, fn: () => { this.i++; this.show() } }]); return true;
  },
  end() { const t = scAward('compass', this.pts); scCard('Course Complete!', ['Your score: ' + t + ' out of ' + this.legs.length * 100 + '.'], [{ label: 'Play Again', fn: () => scStart(this) }, { label: 'Home', go: true, fn: scHome }]) }
});

// ---- Follow The Raindrop: water runs downhill. Tap the ground and see where the rain goes
SC_MISSIONS.push({
  id: 'rain', name: 'Follow The Raindrop',
  start() { this.n = 0; this.found = new Set(); this.drops = []; scCard('Follow The Raindrop', ['Tap anywhere on the ground. A raindrop lands there and runs downhill.', 'Can you find a spot that drains to each pond?', { small: 'The land that drains to one pond is called its watershed.' }]) },
  pick(e) {
    const h = groundHit(e); if (!h) return true; let x = h[0], z = h[1]; const pts = []; let end = null, len = 0; if (scPond(x, z)) { toast('That is already in the pond. Tap dry land!'); return true }
    for (let i = 0; i < 2500; i++) {
      const g = groundAt(x, z); if (g > 1e8) break; pts.push([x, g + 0.35, z]); const p = scPond(x, z); if (p) { end = p; break }
      let gx = (groundAt(x + 1.5, z) - groundAt(x - 1.5, z)) / 3, gz = (groundAt(x, z + 1.5) - groundAt(x, z - 1.5)) / 3; const s = Math.hypot(gx, gz); if (!(s > 0.002)) break; x -= gx / s * 0.9; z -= gz / s * 0.9; len += 0.9;
    }
    if (pts.length < 2) { toast('That spot is flat, so the rain soaks in right there. Try a slope.'); return true } scLine(pts, 0x58c7ff); const drop = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), new THREE.MeshBasicMaterial({ color: 0x9fe3ff })); SC.grp.add(drop); this.drops.push({ m: drop, pts, k: 0 });
    this.n++; if (end) { this.found.add(end.name); scWin() } const tot = scAward('rain', this.found.size * 60);
    scCard('Follow The Raindrop', [end ? 'Your raindrop ran ' + Math.round(len * SCFT) + ' feet downhill into ' + end.name + '.' : 'Your raindrop ran ' + Math.round(len * SCFT) + ' feet and soaked into a low spot.', 'Ponds reached: ' + this.found.size + ' of ' + S.ponds.length + ' (' + tot + ' points).', { small: 'Tap another spot. Try high ground far from the water.' }]); return true;
  },
  tick(t, dt) { for (const d of this.drops || []) { d.k = Math.min(d.pts.length - 1, d.k + dt * 28); const i = d.k | 0, a = d.pts[i], b = d.pts[Math.min(d.pts.length - 1, i + 1)], f = d.k - i; d.m.position.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f + 0.3, a[2] + (b[2] - a[2]) * f) } }
});

// ---- Wildlife Spotter: animals that really live around a South Carolina farm pond
function scAnimal(kind) {
  const g = new THREE.Group(), M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }), B = (geo, c, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.scale.set(sx || 1, sy || sx || 1, sz || sx || 1); g.add(m); return m };
  const sp = new THREE.SphereGeometry(1, 12, 10), cy = new THREE.CylinderGeometry(1, 1, 1, 8), co = new THREE.ConeGeometry(1, 1, 8);
  if (kind === 'heron') { B(cy, 0x3a3a3a, -0.08, 0.45, 0, 0.02, 0.9, 0.02); B(cy, 0x3a3a3a, 0.08, 0.45, 0, 0.02, 0.9, 0.02); B(sp, 0x7f93a8, 0, 1.05, 0, 0.22, 0.2, 0.42); B(cy, 0x93a5b8, 0, 1.45, 0.3, 0.045, 0.75, 0.045).rotation.x = 0.35; B(sp, 0xe9edf2, 0, 1.85, 0.42, 0.09); B(co, 0xe0a22a, 0, 1.84, 0.62, 0.03, 0.3, 0.03).rotation.x = Math.PI / 2 }
  else if (kind === 'turtle') { B(sp, 0x3f5a2c, 0, 0.12, 0, 0.28, 0.13, 0.34); B(sp, 0x6b7f3a, 0, 0.12, 0.36, 0.08); for (const [x, z] of [[.24, .2], [-.24, .2], [.24, -.2], [-.24, -.2]]) B(sp, 0x55682f, x, 0.05, z, 0.07, 0.04, 0.09) }
  else if (kind === 'deer') { for (const [x, z] of [[.14, .4], [-.14, .4], [.14, -.4], [-.14, -.4]]) B(cy, 0x8a6a45, x, 0.4, z, 0.035, 0.8, 0.035); B(sp, 0x9a7650, 0, 0.98, 0, 0.26, 0.26, 0.6); B(cy, 0x9a7650, 0, 1.35, 0.55, 0.09, 0.6, 0.09).rotation.x = 0.5; B(sp, 0x9a7650, 0, 1.62, 0.72, 0.12, 0.12, 0.18); B(co, 0x9a7650, 0.1, 1.8, 0.66, 0.04, 0.16, 0.04); B(co, 0x9a7650, -0.1, 1.8, 0.66, 0.04, 0.16, 0.04); B(sp, 0xf4f1e6, 0, 1.05, -0.62, 0.09) }
  else if (kind === 'owl') { B(sp, 0x7a5a3c, 0, 0.3, 0, 0.2, 0.3, 0.18); B(sp, 0x8b6a48, 0, 0.66, 0, 0.19, 0.17, 0.17); for (const x of [-0.08, 0.08]) { B(sp, 0xf7e9b0, x, 0.68, 0.14, 0.055); B(sp, 0x111111, x, 0.68, 0.185, 0.025) } B(co, 0xe0a22a, 0, 0.62, 0.17, 0.025, 0.07, 0.025).rotation.x = Math.PI / 2 }
  else if (kind === 'frog') { B(sp, 0x4f9a3a, 0, 0.1, 0, 0.16, 0.1, 0.2); for (const x of [-0.07, 0.07]) B(sp, 0xd8e86a, x, 0.19, 0.12, 0.04); for (const x of [-0.17, 0.17]) B(sp, 0x3f8030, x, 0.05, -0.1, 0.08, 0.04, 0.12) }
  else if (kind === 'hawk') { B(sp, 0x6e4a2e, 0, 0.3, 0, 0.14, 0.26, 0.15); B(sp, 0x7d573a, 0, 0.6, 0.03, 0.1); B(co, 0xe0c22a, 0, 0.58, 0.14, 0.02, 0.07, 0.02).rotation.x = Math.PI / 2; B(sp, 0xb5552f, 0, 0.1, -0.16, 0.08, 0.03, 0.18) }
  else if (kind === 'squirrel') { B(sp, 0x8d8d8d, 0, 0.16, 0, 0.09, 0.13, 0.11); B(sp, 0x8d8d8d, 0, 0.33, 0.06, 0.07); B(sp, 0xa3a3a3, 0, 0.24, -0.16, 0.06, 0.2, 0.08) }
  return g;
}
SC_MISSIONS.push({
  id: 'wild', name: 'Wildlife Spotter',
  facts: {
    heron: ['Great Blue Heron', 'It stands perfectly still in shallow water, then spears a fish in a flash. Its wings spread about 6 feet.'],
    turtle: ['Yellow-Bellied Slider', 'This pond turtle climbs onto logs to warm up in the sun, and slides off the moment it sees you.'],
    deer: ['White-Tailed Deer', 'When it senses danger it lifts its tail to flash the white underside as a warning to other deer.'],
    owl: ['Barred Owl', 'Its call sounds like "Who cooks for you? Who cooks for you all?" It hunts at night and flies almost silently.'],
    frog: ['American Bullfrog', 'The biggest frog in North America. Its deep "jug-o-rum" call carries half a mile on a summer night.'],
    hawk: ['Red-Tailed Hawk', 'It can spot a mouse from 100 feet up. Look for the rust-red tail when it soars.'],
    squirrel: ['Eastern Gray Squirrel', 'It buries thousands of acorns each fall and forgets some of them. Those grow into new oak trees.']
  },
  start() {
    this.found = new Set(); this.objs = []; const P = S.ponds, edge = (p, k) => { const q = p.xy[Math.floor(p.xy.length * k)]; return [q[0], q[1], p.z] }, oak = scMark('Live Oak'), lt = scMark('Area Light'), barn = scMark('Barn');
    const put = (kind, x, y, z, s, ry) => { const g = scAnimal(kind); g.position.set(x, y, z); g.scale.setScalar(s); g.rotation.y = ry || 0; g.userData.kind = kind; SC.grp.add(g); this.objs.push(g) };
    if (P[0]) { const e = edge(P[0], 0.2); put('heron', e[0], e[2] - 0.15, e[1], 1.5, 1) } if (P[2]) { const e = edge(P[2], 0.6); put('turtle', e[0], e[2] + 0.02, e[1], 2.2, 2) } if (P[1]) { const e = edge(P[1], 0.4); put('frog', e[0], e[2] + 0.02, e[1], 2.4, 4) }
    let d = null, bd = -1; for (const t of S.trees || []) { let near = 1e9; for (const m of S.scout.marks) near = Math.min(near, Math.hypot(m.p[0] - t[0], m.p[2] - t[1])); if (near > 55 && near < 140 && near > bd) { bd = near; d = t } }
    if (d) put('deer', d[0] + 4, scY(d[0] + 4, d[1] + 3), d[1] + 3, 1.3, 2.4); if (oak) put('owl', oak.p[0] + 3.5, oak.g + 6.2, oak.p[2] + 1.5, 2.2, 0.6); if (lt) put('hawk', lt.p[0], lt.p[1] + 0.1, lt.p[2], 2.2, 3); if (barn) put('squirrel', barn.p[0] + barn.r - 1, scY(barn.p[0] + barn.r - 1, barn.p[2] + 3), barn.p[2] + 3, 3, 1);
    this.show();
  },
  show(extra) { scCard('Wildlife Spotter', (extra || []).concat(['Animals found: ' + this.found.size + ' of ' + this.objs.length + '.', { small: 'Look along the pond edges, in the big oak, on top of poles and at the edge of the woods. Tap an animal when you spot it.' }])) },
  pick(e) {
    const r = canvas.getBoundingClientRect(); mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1; ray.setFromCamera(mouse, cam); let best = null, bd = 0.03;
    for (const g of this.objs) { const v = g.position.clone().add(new THREE.Vector3(0, 0.6 * g.scale.x, 0)).sub(ray.ray.origin), along = v.dot(ray.ray.direction); if (along <= 0) continue; const off = Math.sqrt(Math.max(0, v.lengthSq() - along * along)) / along; if (off < bd) { bd = off; best = g } }
    if (!best) return false; const k = best.userData.kind, f = this.facts[k], isNew = !this.found.has(k); this.found.add(k); if (isNew) { scWin(); const l = scLabel(f[0]); l.position.set(best.position.x, best.position.y + 2.2 * best.scale.x * 0.6 + 1.5, best.position.z); SC.grp.add(l) }
    scAward('wild', this.found.size * 50); this.show([f[0] + '!', f[1]]); scSpeak(f[0] + '. ' + f[1]); return true;
  },
  tick(t) { for (const g of this.objs || []) if (g.userData.kind === 'heron' || g.userData.kind === 'owl') g.rotation.y += Math.sin(t * 0.6 + g.position.x) * 0.002 }
});
