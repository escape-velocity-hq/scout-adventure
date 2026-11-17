// ===== Games: Paintball Target Range, Horseshoes =====

// ---- Paintball Target Range: targets only, never people. Tap a target to splat it before time runs out.
SC_MISSIONS.push({
  id: 'paint', name: 'Paintball Range',
  cols: [0xe23b2e, 0x2b7ad9, 0x2fbf5a, 0xf2c230, 0xb04fd8, 0xff7a1a],
  start() {
    this.pts = 0; this.shots = 0; this.hits = 0; this.tg = []; this.splats = []; this.end_t = 0; const s = scOpenSpot(); this.x = s[0]; this.z = s[1]; this.y = scY(s[0], s[1]);
    flyTo({ p: [this.x, this.y + 6, this.z + 19], t: [this.x, this.y + 1.2, this.z - 5] });
    scCard('Paintball Range', ['Targets pop up for a few seconds each. Tap one to splat it. Small and far targets score more.', { small: 'Range rule number one: we only ever shoot at targets, never at people or animals.' }], [{ label: 'Start (45 Seconds)', big: true, go: true, fn: () => { this.end_t = SC.t + 45; this.next = SC.t; scCard('Paintball Range', ['Go!']) } }]);
  },
  spawn() {
    const g = new THREE.Group(), r = scRnd(0.5, 1.0), x = this.x + scRnd(-11, 11), z = this.z + scRnd(-14, 2), y = scY(x, z), c = this.cols[(Math.random() * this.cols.length) | 0];
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0x8a6a45 })); post.position.y = 0.75; g.add(post);
    const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 20), new THREE.MeshBasicMaterial({ color: 0xffffff })); d.rotation.x = Math.PI / 2; d.position.y = 1.5 + r; g.add(d); const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.07, 16), new THREE.MeshBasicMaterial({ color: 0xd8342b })); b.rotation.x = Math.PI / 2; b.position.set(0, 1.5 + r, 0.01); g.add(b);
    g.position.set(x, y, z); g.userData = { disc: d, r, until: SC.t + scRnd(2.2, 4), c, pts: Math.round(40 / r + (this.z + 2 - z) * 2) }; SC.grp.add(g); this.tg.push(g);
  },
  pick(e) {
    if (!(SC.t < this.end_t)) return true; this.shots++; const r = canvas.getBoundingClientRect(); mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1; ray.setFromCamera(mouse, cam);
    const hit = ray.intersectObjects(this.tg.map(g => g.userData.disc), false)[0]; scBeep(180, 0.06);
    if (hit) { const g = hit.object.parent, u = g.userData; if (!u.dead) { u.dead = true; u.until = SC.t + 0.5; hit.object.material.color.setHex(this.cols[(Math.random() * 6) | 0]); this.pts += u.pts; this.hits++; scBeep(700, 0.1); toast('Splat! +' + u.pts) } }
    else { const h = groundHit(e); if (h) { const s = new THREE.Mesh(new THREE.CircleGeometry(scRnd(0.25, 0.5), 10), new THREE.MeshBasicMaterial({ color: this.cols[(Math.random() * 6) | 0] })); s.rotation.x = -Math.PI / 2; s.position.set(h[0], scY(h[0], h[1]) + 0.05, h[1]); SC.grp.add(s) } } return true;
  },
  tick(t) {
    if (!this.end_t) return; if (t < this.end_t) { if (t > this.next && this.tg.length < 5) { this.spawn(); this.next = t + scRnd(0.5, 1.1) } const el = document.querySelector('#sccard h2'); if (el) el.textContent = 'Paintball: ' + Math.ceil(this.end_t - t) + ' s · ' + this.pts + ' points' }
    for (let i = this.tg.length - 1; i >= 0; i--) { const g = this.tg[i]; if (t > g.userData.until || t > this.end_t) { SC.grp.remove(g); this.tg.splice(i, 1) } }
    if (t >= this.end_t) { this.end_t = 0; const tot = scAward('paint', this.pts), acc = this.shots ? Math.round(100 * this.hits / this.shots) : 0; scWin(); scCard('Time!', ['You splatted ' + this.hits + ' targets with ' + this.shots + ' shots (' + acc + '% on target).', 'Score: ' + tot + ' points.'], [{ label: 'Play Again', fn: () => scStart(this) }, { label: 'Home', go: true, fn: scHome }]) }
  },
  stop() { this.end_t = 0; this.tg = [] }
});

// ---- Horseshoes: stake 30 feet away (the youth distance). Two taps per throw: one sets your aim, one sets your power.
SC_MISSIONS.push({
  id: 'shoes', name: 'Horseshoes',
  start() {
    this.n = 6; this.pts = 0; this.st = 'aim'; this.fly = null; this.ch = null; const s = scOpenSpot(); this.x = s[0]; this.z = s[1]; this.y = scY(s[0], s[1]); this.d = 30 / SCFT;
    const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }); this.sy = scY(this.x, this.z - this.d); const pit = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 1.3), M(0xd8c79a)); pit.position.set(this.x, this.sy + 0.03, this.z - this.d); SC.grp.add(pit);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), M(0xcccccc)); st.position.set(this.x, this.sy + 0.22, this.z - this.d); st.rotation.x = 0.1; SC.grp.add(st);
    this.arrow = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0xf2c230 })); this.arrow.rotation.x = -Math.PI / 2; SC.grp.add(this.arrow);
    this.bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 1), new THREE.MeshBasicMaterial({ color: 0x2fbf5a })); SC.grp.add(this.bar); this.bar.visible = false;
    flyTo({ p: [this.x, this.y + 2.0, this.z + 3.2], t: [this.x, this.sy + 0.3, this.z - this.d] }); this.show();
  },
  show(extra) {
    const b = this.n > 0 ? [{ label: this.st === 'aim' ? 'Set My Aim' : 'Throw!', big: true, go: true, fn: () => this.tap() }] : [{ label: 'Play Again', fn: () => scStart(this) }, { label: 'Home', go: true, fn: scHome }];
    scCard('Horseshoes', (extra || []).concat([this.n > 0 ? (this.st === 'aim' ? 'The yellow arrow swings left and right. Press when it points at the stake.' : 'You set the power. Hold the button down: the green bar grows the longer you hold. Let go when it reaches the stake.') : '', 'Shoes left: ' + this.n + '. Points: ' + this.pts, { small: 'A ringer (around the stake) is 3. Within 6 inches is 1.' }]).filter(Boolean), this.st === 'fly' ? [] : b);
    if (this.st === 'power' && this.n > 0) this.powerButton();
  },
  // the power is the player's: hold to build it, let go to throw. (A controller or the keyboard presses once to start and again to throw.)
  powerButton() {
    const e = document.querySelector('#sccard .scrow .scbtn'); if (!e) return; e.textContent = 'Hold To Throw'; e.style.touchAction = 'none'; let ptr = 0;
    e.onclick = () => { if (performance.now() - ptr < 500) return; if (this.ch) this.release(); else this.hold() };
    e.onpointerdown = ev => { ptr = performance.now(); ev.preventDefault(); this.hold() }; e.onpointerup = e.onpointercancel = e.onpointerleave = () => { if (this.ch) { ptr = performance.now(); this.release() } };
  },
  hold() { if (this.st === 'power' && !this.ch) { this.ch = SC.t; scBeep(240, 0.05) } },
  release() { if (this.st !== 'power' || !this.ch) return; if (SC.t - this.ch < 0.12) { this.ch = null; return } this.tap() },
  shoe() { const sh = new THREE.Shape(); sh.absarc(0, 0, 0.1, Math.PI * 0.15, Math.PI * 0.85, true); sh.absarc(0, 0, 0.07, Math.PI * 0.85, Math.PI * 0.15, false); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.015, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xb9bcc2, metalness: 0.7, roughness: 0.4 })); m.rotation.x = -Math.PI / 2; return m },
  tap() {
    if (this.n <= 0 || this.st === 'fly') return;
    if (this.st === 'aim') { this.aim = this.cur_aim; this.st = 'power'; this.ch = null; this.bar.visible = true; return this.show() }
    if (!this.ch) return this.hold();
    const pw = this.cur_pw; this.ch = null; this.bar.visible = false; this.st = 'fly'; this.n--; const tx = this.x + Math.sin(this.aim) * this.d * pw, tz = this.z - Math.cos(this.aim) * this.d * pw; this.fly = { m: this.shoe(), t0: SC.t, T: 1.1, tx, tz }; SC.grp.add(this.fly.m); scBeep(300, 0.1); this.show();
  },
  tick(t) {
    this.cur_aim = Math.sin(t * 1.7) * 0.09; this.cur_pw = this.ch ? Math.min(1.4, 0.25 + (t - this.ch) * 0.5) : 0.25;      // a quarter of the way at first touch, then half the distance again each second, up to well past the stake
    if (this.arrow) { const a = this.st === 'aim' ? this.cur_aim : (this.aim || 0); this.arrow.position.set(this.x + Math.sin(a) * 2.2, this.y + 0.35, this.z - Math.cos(a) * 2.2); this.arrow.rotation.z = -a; this.arrow.visible = this.st !== 'fly' && this.n > 0 }
    if (this.bar && this.bar.visible) { const L = this.d * this.cur_pw, a = this.aim; this.bar.scale.z = L; this.bar.rotation.y = -a; this.bar.position.set(this.x + Math.sin(a) * L / 2, this.y + 0.12, this.z - Math.cos(a) * L / 2) }
    const f = this.fly; if (!f) return; const k = Math.min(1, (t - f.t0) / f.T); f.m.position.set(this.x + (f.tx - this.x) * k, this.y + 1 + (scY(f.tx, f.tz) - this.y - 1) * k + Math.sin(k * Math.PI) * 2.6, this.z + (f.tz - this.z) * k); f.m.rotation.z = k * 12;
    if (k >= 1) { this.fly = null; f.m.rotation.z = Math.random() * 6; f.m.position.y = scY(f.tx, f.tz) + 0.07; const d = Math.hypot(f.tx - this.x, f.tz - (this.z - this.d)), inch = d * 39.37; let msg, p = 0; if (inch <= 3) { p = 3; msg = 'RINGER! 3 points!'; scWin() } else if (inch <= 6) { p = 1; msg = 'Close! Within 6 inches: 1 point.'; scWin() } else { msg = 'That one landed ' + (inch < 36 ? Math.round(inch) + ' inches' : (d * SCFT).toFixed(1) + ' feet') + ' from the stake.'; scMiss() }
      this.pts += p; this.st = 'aim'; if (this.n <= 0) { scAward('shoes', this.pts * 25); msg += ' Game over: ' + this.pts + ' points (' + this.pts * 25 + ' on the scoreboard).' } this.show([msg]) }
  },
  stop() { this.fly = null; this.arrow = null; this.bar = null; this.ch = null }
});
