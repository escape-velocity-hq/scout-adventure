// ===== Missions: Pitch Your Camp, Fire Class With Ember The Owl =====

// ---- Pitch Your Camp: place three tents, a dining fly and a fire ring, then get the site scored
SC_MISSIONS.push({
  id: 'camp', name: 'Pitch Your Camp',
  items: [['tent1', 'Tent 1'], ['tent2', 'Tent 2'], ['tent3', 'Tent 3'], ['fly', 'Dining Fly'], ['fire', 'Fire Ring']],
  start() { this.put = {}; this.sel = 'tent1'; const c = scMark('Cabin'); if (c) scLookAt(c.p[0] - 30, c.p[2] - 40, 130); this.show() },
  show() {
    const left = this.items.filter(i => !this.put[i[0]]).length;
    scCard('Pitch Your Camp', ['Pick an item, then tap the ground to place it. Tap again to move it.', { small: 'Good camps are on flat ground, away from the water, with the fire well clear of tents and trees.' }],
      this.items.map(i => ({ label: (this.put[i[0]] ? '✓ ' : '') + i[1], go: this.sel === i[0], fn: () => { this.sel = i[0]; this.show() } })).concat(left ? [] : [{ label: 'Score My Camp', big: true, go: true, fn: () => this.score() }]));
  },
  model(id) {
    const g = new THREE.Group(), M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide });
    if (id === 'fly') { const top = new THREE.Mesh(new THREE.BoxGeometry(4, 0.06, 4), M(0x2f6b3a)); top.position.y = 2.2; g.add(top); for (const [x, z] of [[1.9, 1.9], [-1.9, 1.9], [1.9, -1.9], [-1.9, -1.9]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), M(0xcccccc)); p.position.set(x, 1.1, z); g.add(p) } }
    else if (id === 'fire') { for (let i = 0; i < 10; i++) { const r = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), M(0x8d8a84)); r.position.set(Math.cos(i * 0.628) * 0.75, 0.12, Math.sin(i * 0.628) * 0.75); g.add(r) } }
    else { const sh = new THREE.Shape(); sh.moveTo(-1.1, 0); sh.lineTo(1.1, 0); sh.lineTo(0, 1.3); const t = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 2.2, bevelEnabled: false }), M(id === 'tent1' ? 0xd97a2b : id === 'tent2' ? 0x2b7ad9 : 0xd9c22b)); t.position.z = -1.1; g.add(t) }
    return g;
  },
  pick(e) {
    const h = groundHit(e); if (!h) return true; if (scPond(h[0], h[1])) { toast('That is in the pond!'); scMiss(); return true }
    let o = this.put[this.sel]; if (!o) { o = this.put[this.sel] = { g: this.model(this.sel) }; SC.grp.add(o.g) } o.x = h[0]; o.z = h[1]; o.g.position.set(h[0], scY(h[0], h[1]), h[1]); scBeep(440, 0.08);
    const next = this.items.find(i => !this.put[i[0]]); if (next) this.sel = next[0]; this.show(); return true;
  },
  score() {
    const P = this.put, tents = ['tent1', 'tent2', 'tent3'].map(k => P[k]), all = Object.values(P), out = []; let pts = 0;
    const slope = o => Math.hypot(groundAt(o.x + 2, o.z) - groundAt(o.x - 2, o.z), groundAt(o.x, o.z + 2) - groundAt(o.x, o.z - 2)) / 4;
    const water = o => { let d = 1e9; for (const p of S.ponds) for (const q of p.xy) d = Math.min(d, Math.hypot(q[0] - o.x, q[1] - o.z)); return d * SCFT };
    const crown = o => (S.trees || []).some(t => Math.hypot(t[0] - o.x, t[1] - o.z) < t[4] + 1), check = (ok, w, good, bad) => { if (ok) pts += w; out.push((ok ? '✓ ' : '✗ ') + (ok ? good : bad)) };
    check(tents.every(t => slope(t) < 0.06), 20, 'Tents are on flat ground.', 'A tent is on a slope. You would roll downhill in your sleep.');
    check(all.every(o => water(o) >= 200), 20, 'Everything is 200 feet or more from the water.', 'Too close to the water. Camp at least 200 feet (about 80 big steps) away.');
    check(tents.every(t => !crown(t)), 15, 'No tent is under a tree. No falling limbs.', 'A tent is under a tree. Look up for dead limbs before you pitch.');
    check(!crown(P.fire), 15, 'The fire has open sky above it.', 'The fire is under tree branches. Move it into the open.');
    check(tents.concat([P.fly]).every(o => Math.hypot(o.x - P.fire.x, o.z - P.fire.z) * SCFT >= 15), 15, 'The fire is 15 feet or more from the tents and the fly.', 'The fire is too close to a tent or the fly. Keep it 15 feet away.');
    check(Math.max(...tents.map(a => Math.max(...tents.map(b => Math.hypot(a.x - b.x, a.z - b.z))))) * SCFT <= 100, 15, 'The patrol is camped together.', 'The tents are too spread out. A patrol camps together.');
    const t = scAward('camp', pts); pts >= 70 ? scWin() : scMiss();
    scCard(pts === 100 ? 'Perfect Campsite!' : 'Your Camp: ' + pts + ' Out Of 100', [{ list: out }], [{ label: 'Move Things And Try Again', fn: () => this.show() }, { label: 'Home', go: true, fn: scHome }]);
  }
});

// ---- Fire Class With Ember The Owl (an original guide made for this game)
SC_MISSIONS.push({
  id: 'fire', name: 'Fire Class',
  steps: [
    ['Hoo-hoo! I am Ember The Owl. Let us learn to build a campfire the safe way. First: where is a safe place for a fire?', ['Under a low tree branch', 'A cleared spot, 10 feet from anything that can burn', 'Right beside the tent'], 1, 'spot', 'Right! Clear the ground down to bare dirt, 10 feet across.'],
    ['What do we build to keep the fire in one place?', ['A ring of rocks', 'A pile of dry leaves', 'Nothing at all'], 0, 'ring', 'Yes! A fire ring keeps the fire from creeping away.'],
    ['Before any match is struck, what must be sitting next to the fire?', ['Marshmallows', 'A bucket of water and a shovel', 'More matches'], 1, 'bucket', 'Always! Water and a shovel come first, every time.'],
    ['Now we lay the fire. What catches a spark first?', ['A big log', 'Green leaves', 'Tinder: dry grass, pine needles and tiny twigs'], 2, 'tinder', 'Tinder! A fluffy handful, about the size of your fist.'],
    ['What goes on top of the tinder?', ['Kindling: dry sticks thinner than your thumb', 'A whole log', 'Wet wood'], 0, 'kindling', 'Kindling! Lean the sticks together like a little tepee so air can get in.'],
    ['And what keeps the fire going?', ['Paper plates', 'Fuel wood: pieces about as thick as your wrist', 'Pine straw'], 1, 'fuel', 'Fuel wood! Add it a piece at a time. Keep the fire small.'],
    ['Who may light the fire?', ['Any Scout, any time', 'A Scout who has permission, with an adult leader right there', 'Whoever has the matches'], 1, 'light', 'Correct! Never light a fire without your leader\'s say-so.'],
    ['The fire is burning. May we all walk off for a minute?', ['Yes, just for a minute', 'Never. Someone watches the fire the whole time'], 1, null, 'Never leave a fire alone. Not even for a minute.'],
    ['Time for bed. How do we put the fire out?', ['Kick some dirt on it and go', 'Let it burn out by itself overnight', 'Drown it with water, stir it, and feel that it is cold'], 2, 'out', 'Drown, stir, and feel. If it is not cold to the touch, it is not out.']],
  start() {
    this.i = 0; this.pts = 0; this.miss = false; this.parts = {}; const s = scOpenSpot(); this.x = s[0]; this.z = s[1]; this.y = scY(s[0], s[1]);
    const o = scAnimal('owl'); const nk = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.22, 3), new THREE.MeshStandardMaterial({ color: 0xf2c230 })); nk.position.set(0, 0.44, 0.13); nk.rotation.x = Math.PI; o.add(nk);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.6, 10), new THREE.MeshStandardMaterial({ color: 0x6b4a2c })); st.position.set(this.x + 2.4, this.y + 0.3, this.z - 0.6); SC.grp.add(st);
    o.scale.setScalar(2.2); o.position.set(this.x + 2.4, this.y + 0.6, this.z - 0.6); o.lookAt(this.x, this.y + 0.9, this.z + 4); SC.grp.add(o); this.owl = o; const l = scLabel('Ember The Owl'); l.position.set(this.x + 2.4, this.y + 3.4, this.z - 0.6); SC.grp.add(l);
    flyTo({ p: [this.x - 2.5, this.y + 3.2, this.z + 7.5], t: [this.x + 0.6, this.y + 0.5, this.z] }); this.ask();
  },
  ask() {
    const s = this.steps[this.i]; if (!s) return this.end(); this.miss = false;
    scCard('Fire Class ' + (this.i + 1) + ' Of ' + this.steps.length, ['Ember says: ' + s[0]], s[1].map((label, k) => ({ label, fn: () => this.answer(k) }))); scSpeak(s[0]);
  },
  answer(k) {
    const s = this.steps[this.i]; if (k !== s[2]) { this.miss = true; scMiss(); toast('Ember shakes her head. Try again!'); return }
    this.pts += this.miss ? 5 : 12; scWin(); if (s[3]) this.build(s[3]); scCard('Fire Class', ['Ember says: ' + s[4]], [{ label: this.i + 1 < this.steps.length ? 'Next' : 'Finish', go: true, big: true, fn: () => { this.i++; this.ask() } }]); scSpeak(s[4]);
  },
  build(part) {
    const g = new THREE.Group(), M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }), add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m }; g.position.set(this.x, this.y, this.z);
    if (part === 'spot') add(new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.52, 0.04, 28), M(0x6e5a44)), 0, 0.03, 0);
    if (part === 'ring') for (let i = 0; i < 12; i++) add(new THREE.Mesh(new THREE.SphereGeometry(0.13 + (i % 3) * 0.02, 8, 6), M(0x8d8a84)), Math.cos(i * 0.5236) * 0.55, 0.1, Math.sin(i * 0.5236) * 0.55);
    if (part === 'bucket') { add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 12), M(0x3b82f6)), -1.15, 0.15, 0.5); const sh = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), M(0x8a6a45)), -1.25, 0.08, -0.3); sh.rotation.z = Math.PI / 2; add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.18), M(0x555555)), -1.9, 0.08, -0.3) }
    if (part === 'tinder') add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), M(0xd9c98a)), 0, 0.12, 0).scale.y = 0.6;
    if (part === 'kindling') for (let i = 0; i < 9; i++) { const s = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.5, 5), M(0x8a6a45)), Math.cos(i * 0.7) * 0.12, 0.25, Math.sin(i * 0.7) * 0.12); s.rotation.set(Math.sin(i * 0.7) * 0.5, 0, -Math.cos(i * 0.7) * 0.5) }
    if (part === 'fuel') for (let i = 0; i < 4; i++) { const s = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.75, 7), M(0x5d452c)), Math.cos(i * 1.571) * 0.2, 0.3, Math.sin(i * 1.571) * 0.2); s.rotation.set(Math.sin(i * 1.571) * 0.55, 0, -Math.cos(i * 1.571) * 0.55) }
    if (part === 'light') { this.flames = []; for (const [r, h, c] of [[0.24, 0.8, 0xff7a1a], [0.16, 0.6, 0xffc233], [0.09, 0.4, 0xfff2a8]]) this.flames.push(add(new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 })), 0, 0.3 + h / 2, 0)); this.lamp = new THREE.PointLight(0xff9a3c, 14, 14, 1.8); this.lamp.position.set(0, 0.9, 0); g.add(this.lamp); this.tod = TOD; setTime(19.5) }
    if (part === 'out') { for (const f of this.flames || []) f.visible = false; if (this.lamp) this.lamp.intensity = 0; this.steam = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.6 })), 0, 0.5, 0); add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 16), M(0x2a2622)), 0, 0.07, 0) }
    SC.grp.add(g); this.parts[part] = g;
  },
  tick(t, dt) {
    if (this.owl) this.owl.position.y = this.y + 0.6 + Math.abs(Math.sin(t * 2.2)) * 0.05;
    if (this.flames) this.flames.forEach((f, i) => { if (f.visible) { f.scale.set(1 + Math.sin(t * 9 + i) * 0.12, 1 + Math.sin(t * 13 + i * 2) * 0.18, 1 + Math.cos(t * 8 + i) * 0.12) } }); if (this.lamp && this.lamp.intensity > 0) this.lamp.intensity = 12 + Math.sin(t * 17) * 3;
    if (this.steam) { this.steam.position.y += dt * 0.5; this.steam.material.opacity = Math.max(0, this.steam.material.opacity - dt * 0.12); this.steam.scale.multiplyScalar(1 + dt * 0.3) }
  },
  end() { const t = scAward('fire', Math.round(this.pts * 100 / (this.steps.length * 12))); const m = 'You did it! Remember: clear the spot, ring it, water and shovel ready, small fire, never alone, and cold out before you go.'; scCard('Fire Class Complete!', ['Ember says: ' + m, 'Score: ' + t + ' out of 100.', { small: 'A real fire is only ever built and lit with your leaders, following your troop\'s rules.' }], [{ label: 'Home', go: true, fn: scHome }]); scSpeak(m) },
  stop() { this.flames = null; this.lamp = null; this.steam = null; this.owl = null; if (this.tod !== undefined) { setTime(this.tod); this.tod = undefined } }
});
