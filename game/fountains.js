// ===== Scout Adventure At Aiken Basserie: playing with the pond fountains =====
// The Scouts run the fountains: off, gentle, tall, or EXTREME, which throws the water about 50 feet up.
// They can also switch on colour-changing lights (best at night). Every pond's fountains change together.
// The engine draws the fountains; this file only changes the height and width it is asked to draw.
const SC_FOUNTAINS = {
  modes: [
    { id: 'plan', name: 'Normal', say: 'The fountains are back to normal.' },
    { id: 'gentle', name: 'Gentle', h: 6, w: 18, say: 'The fountains are down to a gentle 6 feet.' },
    { id: 'tall', name: 'Tall', h: 25, w: 14, say: 'The fountains are up to 25 feet.' },
    { id: 'extreme', name: 'EXTREME', h: 50, w: 16, say: 'EXTREME! The fountains are shooting 50 feet into the air!' },
    { id: 'off', name: 'Off', say: 'The fountains are off.' }],
  mode: 'plan', lights: false, plan: null
};
// feet of height and width for the mode in play, in place of the catalogue size
const scSpec0 = spec;
spec = function (pond) { const s = scSpec0(pond), m = SC_FOUNTAINS.modes.find(q => q.id === SC_FOUNTAINS.mode); return m && m.h ? Object.assign({}, s, { h: m.h, w: m.w }) : s };
function scFountainSet(id, lights) {
  const F = SC_FOUNTAINS; if (!S.fountains) return; if (!F.plan) { F.plan = {}; for (const k in FC) F.plan[k] = Object.assign({}, FC[k]) }
  if (id) F.mode = id; if (lights !== undefined) F.lights = lights;
  for (const k in FC) { const p = F.plan[k]; FC[k].count = F.mode === 'off' ? 0 : p.count; FC[k].light = F.lights ? 'change' : p.light }
  buildFountains(); try { shadowDirty = true } catch (e) { }
}
function scFountainCard() {
  const F = SC_FOUNTAINS, cur = F.modes.find(m => m.id === F.mode);
  scCard('Fountains', ['You run the pond fountains. They are on: ' + cur.name + (F.lights ? ', with colour lights.' : '.'), { small: 'EXTREME throws the water about 50 feet up. The colour lights show best at night (Day / Night).' }],
    F.modes.map(m => ({ label: m.name, go: m.id === F.mode, big: m.id === 'extreme', fn: () => { scFountainSet(m.id); toast(m.say); if (m.id === 'extreme') scWin(); scFountainCard() } }))
      .concat([{ label: F.lights ? 'Colour Lights Off' : 'Colour Lights On', fn: () => { scFountainSet(null, !F.lights); scFountainCard() } }, { label: 'Back', fn: scHome }]));
}
const scHomeFn0 = scHome;
scHome = function () { scHomeFn0(); const row = document.querySelector('#sccard .scrow'); if (!row || !S.fountains || !document.querySelector('#sccard .scclose')) return; const e = scEl('button', 'scbtn', 'Fountains'); e.onclick = scFountainCard; row.insertBefore(e, row.lastChild) };
