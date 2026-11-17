// ===== Scout Adventure At Aiken Basserie: playing with the pond fountains =====
// The Scouts run the fountains: off, gentle, tall, or EXTREME, which throws the water about 100 feet up.
// They can also pick the nozzle pattern and the LED light colour (best at night). Every pond's fountains change together.
// The engine draws the fountains; this file only changes the height and width it is asked to draw.
const SC_FOUNTAINS = {
  modes: [
    { id: 'plan', name: 'Normal', say: 'The fountains are back to normal.' },
    { id: 'gentle', name: 'Gentle', h: 6, w: 18, say: 'The fountains are down to a gentle 6 feet.' },
    { id: 'tall', name: 'Tall', h: 25, w: 14, say: 'The fountains are up to 25 feet.' },
    { id: 'extreme', name: 'EXTREME', h: 100, w: 24, say: 'EXTREME! The fountains are shooting 100 feet into the air!' },
    { id: 'off', name: 'Off', say: 'The fountains are off.' }],
  // nozzle patterns: the engine's own spray shapes, under names a Scout can picture
  nozzles: [
    { id: 'plan', name: 'Standard' }, { id: 'V', name: 'Wide Spray' }, { id: 'Redwood', name: 'Geyser' }, { id: 'Balsam', name: 'Three Tier' },
    { id: 'Cypress', name: 'Crown Jets' }, { id: 'Linden', name: 'Trumpet' }, { id: 'Sequoia', name: 'Spire And Ring' }],
  // LED lights: the engine's light colours
  leds: [
    { id: 'plan', name: 'Standard' }, { id: 'off', name: 'Off' }, { id: 'warm', name: 'Warm White' }, { id: 'cool', name: 'Cool White' }, { id: 'blue', name: 'Blue' },
    { id: 'green', name: 'Green' }, { id: 'amber', name: 'Amber' }, { id: 'red', name: 'Red' }, { id: 'change', name: 'Colour Change' }],
  mode: 'plan', nozzle: 'plan', led: 'plan', lights: false, plan: null
};
// feet of height and width for the mode in play, in place of the catalogue size (the size always comes from the planned nozzle, so every nozzle works on every pump)
const scSpec0 = spec;
spec = function (pond) {
  const F = SC_FOUNTAINS, c = FC[pond], keep = c.pattern, P = F.plan && F.plan[pond]; if (P) c.pattern = P.pattern;
  let s; try { s = scSpec0(pond) } finally { c.pattern = keep }
  const m = F.modes.find(q => q.id === F.mode); return m && m.h ? Object.assign({}, s, { h: m.h, w: m.w }) : s
};
// scFountainSet(mode, led, nozzle): any of the three may be left out. led may be true / false (colour change on / off) as before.
function scFountainSet(id, led, nozzle) {
  const F = SC_FOUNTAINS; if (!S.fountains) return; if (!F.plan) { F.plan = {}; for (const k in FC) F.plan[k] = Object.assign({}, FC[k]) }
  if (id) F.mode = id; if (led !== undefined && led !== null) F.led = led === true ? 'change' : led === false ? 'plan' : led; if (nozzle) F.nozzle = nozzle;
  F.lights = F.led === 'change';
  for (const k in FC) { const p = F.plan[k]; FC[k].count = F.mode === 'off' ? 0 : p.count; FC[k].light = F.led === 'plan' ? p.light : F.led; FC[k].pattern = F.nozzle === 'plan' ? p.pattern : F.nozzle }
  buildFountains(); try { shadowDirty = true } catch (e) { }
}
function scFountainCard() {
  const F = SC_FOUNTAINS, cur = F.modes.find(m => m.id === F.mode), nz = F.nozzles.find(n => n.id === F.nozzle), ld = F.leds.find(n => n.id === F.led);
  scCard('Fountains', ['You run the pond fountains. Height: ' + cur.name + '. Nozzle: ' + nz.name + '. LED lights: ' + ld.name + '.', { small: 'EXTREME throws the water about 100 feet up. The LED lights show best at night (Day / Night).' }],
    F.modes.map(m => ({ label: m.name, go: m.id === F.mode, big: m.id === 'extreme', fn: () => { scFountainSet(m.id); toast(m.say); if (m.id === 'extreme') scWin(); scFountainCard() } }))
      .concat([{ label: 'Nozzle: ' + nz.name, fn: scFountainNozzles }, { label: 'LED Lights: ' + ld.name, fn: scFountainLeds }, { label: 'Back', fn: scHome }]));
}
function scFountainNozzles() {
  const F = SC_FOUNTAINS;
  scCard('Fountain Nozzles', ['Pick the spray pattern. Every pond changes together.'],
    F.nozzles.map(n => ({ label: n.name, go: n.id === F.nozzle, fn: () => { scFountainSet(F.mode === 'off' ? 'plan' : null, null, n.id); toast('Nozzle: ' + n.name + '.'); scFountainNozzles() } })).concat([{ label: 'Back', fn: scFountainCard }]));
}
function scFountainLeds() {
  const F = SC_FOUNTAINS;
  scCard('Fountain LED Lights', ['Pick the light colour.', { small: 'The lights show best at night. Press Day / Night to see them glow.' }],
    F.leds.map(n => ({ label: n.name, go: n.id === F.led, fn: () => { scFountainSet(null, n.id); toast('LED lights: ' + n.name + '.'); scFountainLeds() } })).concat([{ label: 'Back', fn: scFountainCard }]));
}
const scHomeFn0 = scHome;
scHome = function () { scHomeFn0(); const row = document.querySelector('#sccard .scrow'); if (!row || !S.fountains || !document.querySelector('#sccard .scclose')) return; const e = scEl('button', 'scbtn', 'Fountains'); e.onclick = scFountainCard; row.insertBefore(e, row.lastChild) };

// A Fountains button in the side column, right after Home, so it is always in reach (inside "Games & More" on a phone).
(function scFountBtn() {
  const top = document.getElementById('sctop'); if (!top) return setTimeout(scFountBtn, 300);
  if (document.getElementById('scfount') || !S.fountains) return;
  const b = scEl('button', 'scbtn', 'Fountains'); b.id = 'scfount'; b.title = 'Play with the pond fountains'; b.setAttribute('aria-label', b.title); b.onclick = scFountainCard;
  const home = [...top.children].find(e => e.textContent.trim() === 'Home'); top.insertBefore(b, home ? home.nextSibling : null);
})();
