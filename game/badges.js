// ===== Scout Adventure At Aiken Basserie: badges, and the note for parents =====
// One badge per mission, earned the first time a patrol scores in it. Badges are worked out from the
// scores the game already keeps, so they are saved with them (in this browser, on this device).
// These are the farm's own badges. They are not Scouting America ranks or merit badges.
const SC_BADGES = [
  { id: 'hunt', name: 'Sharp Eyes', icon: '🔍' },
  { id: 'compass', name: 'Pathfinder', icon: '🧭' },
  { id: 'rain', name: 'Watershed Wise', icon: '💧' },
  { id: 'wild', name: 'Wildlife Spotter', icon: '🦌' },
  { id: 'fish', name: 'Patient Angler', icon: '🎣' },
  { id: 'sky', name: 'Star Finder', icon: '⭐' },
  { id: 'camp', name: 'Camp Builder', icon: '⛺' },
  { id: 'fire', name: 'Fire Safe', icon: '🔥' },
  { id: 'paint', name: 'Steady Aim', icon: '🎯' },
  { id: 'shoes', name: 'Ringer', icon: '🐴' }];
// a patrol's standing, by how many badges it holds
const SC_STANDING = [[10, 'Basserie Legend'], [7, 'Pond Master'], [4, 'Farm Ranger'], [1, 'Trail Scout'], [0, 'New Arrival']];

const scHasBadge = (patrol, id) => ((SC.save.scores[patrol] || {})[id] || 0) > 0;
const scBadgeCount = patrol => SC_BADGES.filter(b => scHasBadge(patrol, b.id)).length;
const scStanding = n => SC_STANDING.find(s => n >= s[0])[1];

function scBadgeCard() {
  const p = SC.save.patrol || 'Patrol 1', n = scBadgeCount(p), bc = typeof scBigCatch === 'function' ? scBigCatch(p) : null;
  scCard('Badges', [p + ': ' + n + ' of ' + SC_BADGES.length + ' badges. Standing: ' + scStanding(n) + '.', bc ? 'Biggest catch: ' + bc.inches + ' inch ' + bc.name + (bc.trophy ? ' (trophy)' : '') + '.' : '', (typeof scBank === 'function' && scBank(p).monsters.length) ? 'Monsters landed: ' + scBank(p).monsters.join(', ') + '.' : '', { small: 'Score in a mission to earn its badge. They are in the same order as the missions at the bottom.' }], [{ label: 'Back', fn: scHome, go: true }]);
  const c = document.getElementById('sccard'), g = scEl('div', 'scbadges');
  for (const b of SC_BADGES) {
    const m = SC_MISSIONS.find(x => x.id === b.id), got = scHasBadge(p, b.id), d = scEl('div', 'scbadge' + (got ? ' got' : ''));
    d.title = (got ? 'Earned: ' : 'Not yet: ') + (m ? m.name : b.id);
    d.append(scEl('span', 'scbadgeicon', b.icon), scEl('span', 'scbadgename', b.name));
    g.appendChild(d);
  }
  c.insertBefore(g, c.querySelector('.scrow'));
}
function scParents() {
  scCard('For Parents', ['Suitable for all ages. Made for Scouts visiting the farm.',
    { list: ['Nothing violent. The paintball range is pop-up targets only, never people or animals. Fishing is catch and release.',
      'A cartoon bear roams the farm. If it reaches a Scout on foot it takes some play tokens and wanders off. Nobody is hurt, and a class teaches how Bear Spray is really used.',
      'No ads, no purchases, no chat, no accounts and no links to other websites.',
      'The tokens are play money, earned by playing. They cannot be bought and are not worth real money. The snacks and tackle they buy exist only in the game.',
      'Nothing your child types is sent anywhere. Patrol names, scores and badges stay in this browser on this device.',
      'The page loads its 3D library and its lettering from two public services (cdnjs and Google Fonts). Like any website, they see the device’s internet address.'] },
    { small: 'This is the farm’s own description. It is not an official ESRB or PEGI rating.' }], [{ label: 'Back', fn: scHome, go: true }]);
}

// ---- hooks into the game core (which is left unchanged)
// award: tell the patrol when a score has just earned a new badge
const scAward0 = scAward;
scAward = function (id, pts) {
  const p = SC.save.patrol || 'Patrol 1', had = scHasBadge(p, id), r = scAward0(id, pts), b = SC_BADGES.find(x => x.id === id);
  if (b && !had && scHasBadge(p, id)) setTimeout(() => { try { toast('Badge earned: ' + b.name + ' ' + b.icon) } catch (e) { } }, 900);
  return r;
};
// home card: two more buttons
const scHome0 = scHome;
scHome = function () {
  scHome0(); const c = document.getElementById('sccard'), row = c && c.querySelector('.scrow'); if (!row) return;
  const add = (label, fn) => { const e = scEl('button', 'scbtn', label); e.onclick = fn; row.appendChild(e) };
  add('Badges (' + scBadgeCount(SC.save.patrol || 'Patrol 1') + ' of ' + SC_BADGES.length + ')', scBadgeCard); add('For Parents', scParents);
};
