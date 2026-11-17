// ===== Scout Adventure At Aiken Basserie: the monster fish =====
// One abnormally large fish in each pond, there to get the players excited. Every so often one of them
// leaps clear of the water and comes down with a big splash. They are ordinary pond fish from the farm's
// 3D engine, grown: the engine draws each fish at its own length, so nothing in the engine is changed.
const SC_MONSTERS = {
  // how much longer than the biggest ordinary fish of its kind (abnormal, not crazy)
  grow: { lmb: [1.55, 1.75], f1: [1.5, 1.7], cat: [1.45, 1.65], gc: [1.25, 1.4], koi: [1.25, 1.4] },
  names: { lmb: ['Old Mossback', 'Bucketmouth'], f1: ['Tiger Tom', 'Stripes'], cat: ['Big Whiskers', 'Mudcat Moe'], gc: ['Goliath', 'The Lawnmower'], koi: ['The Golden Ghost', 'Sunset Sally'] },
  want: [['lmb', 'f1', 'cat', 'gc', 'koi'], ['cat', 'gc', 'lmb', 'f1', 'koi'], ['f1', 'lmb', 'koi', 'cat', 'gc'], ['gc', 'koi', 'cat', 'lmb', 'f1']],   // first choice of kind, pond by pond
  every: [9, 17],        // seconds between leaps
  list: [], next: 0, ready: false
};

function scMonsterSetup() {
  const M = SC_MONSTERS; M.ready = true; const ponds = [], used = {};
  for (const f of FISH) if (!ponds.includes(f.pond)) ponds.push(f.pond);
  ponds.forEach((pond, i) => {
    const inPond = FISH.filter(f => f.pond === pond && !f.leader && !f.sp.school && !f.monster);
    let f = null; for (const sk of M.want[i % M.want.length]) { if (used[sk]) continue; f = inPond.find(q => q.sp.sk === sk); if (f) break }
    if (!f) for (const sk of M.want[i % M.want.length]) { f = inPond.find(q => q.sp.sk === sk); if (f) break }
    if (!f) return;
    const g = M.grow[f.sp.sk]; let L = f.sp.L[1] * scRnd(g[0], g[1]), dep0 = Math.min(f.dep0, 0.55);
    // it has to fit: shrink it until the pond has room for it to swim
    const room = len => pond.pts.filter(p => p[2] >= Math.max(0.4, dep0 + 0.16 + 0.13 * len)).length;
    while (room(L) < 8 && dep0 > 0.3) dep0 -= 0.05;
    while (room(L) < 8 && L > f.sp.L[1] * 1.15) L *= 0.95;
    if (room(L) < 8) return;
    f.L = L; f.dep0 = dep0; f.need = Math.max(0.4, dep0 + 0.16 + 0.13 * L); f.tt = 0;
    const k = used[f.sp.sk] || 0, name = M.names[f.sp.sk][k] || 'The Monster Of ' + pondName(pond.name); used[f.sp.sk] = k + 1;
    f.monster = { name, inches: Math.round(L / 0.0254), st: 0 }; M.list.push(f);
  });
}
// leap: higher and longer than an ordinary fish's jump; false if there is no room to land
function scMonsterLeap(f, t) {
  if (f.jump) return false; const vh = scRnd(1.6, 2.3), vv = scRnd(4.7, 5.6), T = 2 * vv / 9.81, pz = f.pond.z;
  const lx = f.x + Math.cos(f.th) * vh * (T + 0.6), lz = f.z + Math.sin(f.th) * vh * (T + 0.6);
  if (pz - groundAt(lx, lz) < 0.7 || pz - groundAt(f.x, f.z) < 0.5 || !inPoly(lx, lz, f.pond.poly)) return false;
  f.jump = { t0: t, vh, vv, T, x0: f.x, z0: f.z, d0: f.dep, st: 0 }; f.monster.st = 0; return true;
}
function scMonsterTick(t) {
  const M = SC_MONSTERS; if (!M.ready) { if (typeof FISH !== 'undefined' && FISH.length && fishMesh) scMonsterSetup(); M.next = t + 6; return }
  if (!M.list.length || !fishMesh.visible) return;
  // the splash: the engine makes an ordinary one; the monster adds a big one on the way out and a bigger one coming down
  for (const f of M.list) {
    const j = f.jump, m = f.monster; if (!j) { m.st = 0; continue }
    if (j.st >= 1 && m.st < 1) { m.st = 1; ring(f.x, f.z, t, 2.2); burst(f.x, f.pond.z + 0.05, f.z, t, 1.6) }
    if (j.st >= 2 && m.st < 2) { m.st = 2; ring(f.x, f.z, t, 3.4); burst(f.x, f.pond.z + 0.05, f.z, t, 2.6); setTimeout(() => { try { ring(f.x, f.z, SC.t, 2.4) } catch (e) { } }, 220) }
  }
  if (t < M.next) return; M.next = t + scRnd(M.every[0], M.every[1]);
  // the one nearest to where the players are looking leaps most often
  const w = M.list.map(f => { if (f.jump) return 0; const d = Math.hypot(f.x - ctrl.target.x, f.z - ctrl.target.z); return 1 / (1 + (d / 70) * (d / 70)) }), sum = w.reduce((a, b) => a + b, 0);
  let u = Math.random() * sum, f = null; for (let i = 0; i < w.length; i++) { u -= w[i]; if (u <= 0) { f = M.list[i]; break } } if (!f) return;
  if (!scMonsterLeap(f, t)) { M.next = t + 1.5; return }
  if (!SC.cur && Math.hypot(f.x - ctrl.target.x, f.z - ctrl.target.z) < 220) toast(f.monster.name + ' just jumped in ' + pondName(f.pond.name) + '! A ' + f.monster.inches + ' inch ' + trn('sp', f.sp.sk) + '.');
}
// hook into the game core (left unchanged): run after the game's own tick, every frame
const scTick0 = scTick;
scTick = function (t, dt) { scTick0(t, dt); try { scMonsterTick(t) } catch (e) { if (!SC_MONSTERS.err) { SC_MONSTERS.err = e; console.error(e) } } };
