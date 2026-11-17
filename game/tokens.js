// ===== Scout Adventure At Aiken Basserie: tokens, energy, the vending machine and the tackle shop =====
// Tokens are play money. A patrol earns them by finishing missions and catching fish, and spends them on
// snacks and drinks (which give energy back) and on fishing tackle. Playing uses energy. Running out never
// stops the game: a tired patrol just earns half the tokens until it eats or drinks.
// Everything is kept with the scores, in this browser on this device. Nothing is bought with real money.
const SC_ECON = {
  energyMax: 100,
  missionCost: 12,          // energy to start a mission
  castCost: 3,              // energy for each cast
  missionTokens: 10,        // for finishing any mission with a score
  fishTokens: inches => Math.max(1, Math.round(inches / 6)),   // for each fish landed
  trophyTokens: 5,          // extra for a trophy fish
  monsterTokens: 60,        // for landing a pond's monster
  vending: [
    { id: 'water', name: 'Water', cost: 1, energy: 20 },
    { id: 'lemonade', name: 'Lemonade', cost: 2, energy: 45 },
    { id: 'trailmix', name: 'Trail Mix', cost: 4, energy: 100 }],
  tackle: [
    { id: 'bait', name: 'Live Bait', cost: 4, give: 6, unit: 'worms', note: 'Fish bite sooner. One worm a cast.' },
    { id: 'spinner', name: 'Spinner Lure', cost: 15, keep: true, note: 'More trophy bites. Yours to keep.' },
    { id: 'line', name: 'Braided Line', cost: 25, keep: true, note: 'Strong enough for a monster. Yours to keep.' },
    { id: 'rod', name: 'Heavy Rod', cost: 35, keep: true, note: 'Strong enough for a monster. Yours to keep.' },
    { id: 'lure', name: 'Monster Lure', cost: 20, give: 1, unit: 'lure', note: 'The only thing a monster will bite. One try each.' }]
};

// a patrol's wallet: tokens, energy and tackle
function scBank(patrol) {
  const p = patrol || SC.save.patrol || 'Patrol 1', all = SC.save.bank || (SC.save.bank = {});
  return all[p] || (all[p] = { tokens: 0, energy: SC_ECON.energyMax, bait: 0, lure: 0, spinner: false, line: false, rod: false, monsters: [] });
}
const scTired = () => scBank().energy <= 0;
// earn tokens (halved, rounded up, when the patrol is out of energy); returns what was actually earned
function scEarn(n, why) {
  const b = scBank(); n = Math.max(0, Math.round(n)); if (!n) return 0; if (b.energy <= 0) n = Math.ceil(n / 2);
  b.tokens += n; scSave(); scHud(true); if (why) toast('+' + n + (n === 1 ? ' token' : ' tokens') + ' ' + why + (b.energy <= 0 ? ' (halved: out of energy)' : '')); return n;
}
function scUseEnergy(n) {
  const b = scBank(), was = b.energy; b.energy = Math.max(0, b.energy - n); scSave(); scHud();
  if (was > 0 && b.energy <= 0) toast('Out of energy! You earn half the tokens until you get a snack or a drink from the Vending Machine.');
}
function scBuy(item) {
  const b = scBank();
  if (item.keep && b[item.id]) { toast('You already have the ' + item.name + '.'); return false }
  if (item.energy && b.energy >= SC_ECON.energyMax) { toast('Your energy is already full.'); return false }
  if (b.tokens < item.cost) { toast('Not enough tokens. ' + item.name + ' costs ' + item.cost + ' and you have ' + b.tokens + '.'); scMiss(); return false }
  b.tokens -= item.cost;
  if (item.energy) b.energy = Math.min(SC_ECON.energyMax, b.energy + item.energy); else if (item.keep) b[item.id] = true; else b[item.id] = (b[item.id] || 0) + item.give;
  scSave(); scHud(true); scWin(); return true;
}

// ---- what is on screen
function scHud(flash) {      // the pill at the top of the button column: opens the shop
  const h = document.getElementById('schud'); if (!h) return; const b = scBank();
  h.textContent = 'Tokens ' + b.tokens + ' · Energy ' + b.energy; h.classList.toggle('low', b.energy <= 0);
  if (flash) { h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash') }
}
const scWallet = () => { const b = scBank(); return 'Tokens: ' + b.tokens + '. Energy: ' + b.energy + ' of ' + SC_ECON.energyMax + '.' + (b.energy <= 0 ? ' Out of energy: tokens are halved.' : '') };
function scShop() {
  scCard('Shop', [scWallet(), { small: 'Earn tokens by finishing missions and catching fish. Tokens are play money for this game only.' }],
    [{ label: 'Vending Machine', fn: scVending, go: true }, { label: 'Tackle Shop', fn: scTackle, go: true }, { label: 'Back', fn: scHome }]);
}
function scShelf(title, blurb, items, again) {
  const b = scBank();
  scCard(title, [scWallet(), { small: blurb }], items.map(it => ({
    label: it.name + ': ' + it.cost + (it.cost === 1 ? ' token' : ' tokens') + (it.energy ? ' (+' + it.energy + ' energy)' : it.keep ? (b[it.id] ? ' (you have it)' : '') : ' (you have ' + (b[it.id] || 0) + ')'),
    fn: () => { scBuy(it); again() }
  })).concat([{ label: 'Back', fn: scShop, go: true }]));
  // say what each thing does, under its button
  const row = document.querySelector('#sccard .scrow'), btns = row ? [...row.querySelectorAll('button')] : [];
  items.forEach((it, i) => { const e = btns[i]; if (!e) return; e.classList.add('scitem'); if (it.note) e.appendChild(scEl('span', 'scitemnote', it.note)); if (b.tokens < it.cost && !(it.keep && b[it.id])) e.classList.add('cant') });
}
const scVending = () => scShelf('Vending Machine', 'Snacks and drinks give your energy back.', SC_ECON.vending, scVending);
const scTackle = () => scShelf('Tackle Shop', 'To land a monster you need the Heavy Rod, the Braided Line and a Monster Lure.', SC_ECON.tackle, scTackle);

// ---- hooks into the game core (which is left unchanged)
let scPaidRun = null;      // the mission run that has already paid its finishing tokens
const scStartT0 = scStart;
scStart = function (m) { scPaidRun = null; scStartT0(m); if (m) scUseEnergy(SC_ECON.missionCost) };
const scAwardT0 = scAward;
scAward = function (id, pts) {
  const r = scAwardT0(id, pts);
  if (r > 0 && SC.cur && SC.cur.id === id && scPaidRun !== SC.cur) { scPaidRun = SC.cur; scEarn(SC_ECON.missionTokens, 'for finishing ' + SC.cur.name) }
  return r;
};
const scHomeT0 = scHome;
scHome = function () {
  scHomeT0(); scHud(); const c = document.getElementById('sccard'), row = c && c.querySelector('.scrow'); if (!row) return;
  c.insertBefore(scEl('p', '', scWallet()), row);
  const e = scEl('button', 'scbtn', 'Shop'); e.onclick = scShop; row.appendChild(e);
};
const scInitT0 = scInit;
scInit = function () {
  scInitT0(); const top = document.getElementById('sctop'); if (!top) return;
  const h = scEl('button', 'scbtn', ''); h.id = 'schud'; h.title = 'Tokens and energy. Opens the shop.'; h.setAttribute('aria-label', 'Tokens and energy. Opens the shop.'); h.onclick = scShop;
  top.insertBefore(h, top.firstChild); scHud();
};
