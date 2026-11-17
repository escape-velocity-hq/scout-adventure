# Scout Adventure At Aiken Basserie

A 3D game for visiting Scouts, played on the real farm at 717 Redds Branch Rd, Aiken SC.
It runs in a web browser on a phone, tablet or laptop. Nothing to install.

## Missions

| Mission | What The Scouts Do | What It Teaches |
|---|---|---|
| Scavenger Hunt | Read a clue, find the place, tap it | Observation |
| Compass Course | Follow a bearing and a distance from a start flag | Bearings and pacing |
| Follow The Raindrop | Tap the ground and watch the rain run downhill | Watersheds |
| Wildlife Spotter | Find seven animals hidden around the farm | Local wildlife |
| Catch A Bass | Cast, wait for the bite, reel in time | Patience, catch and release |
| Night Sky Hunt | Find the Big Dipper, North Star, Cassiopeia, Orion and the farm's own star pictures | Finding north at night |
| Pitch Your Camp | Place tents, a dining fly and a fire ring; get the site scored | Campsite selection |
| Fire Class | Answer Ember The Owl's questions and build a safe campfire step by step | Fire safety |
| Paintball Range | Splat pop-up targets against the clock (targets only, never people) | Aim, range safety |
| Horseshoes | Two presses per throw: aim, then power | Just fun |

Every mission earns points for the patrol that is playing. The Scoreboard ranks the patrols.

## Run It On Your Computer

The page loads its data with `fetch`, so it must be opened through a web server, not by double-clicking the file.

```
cd scout-adventure
python3 -m http.server 8000
```

Then open http://localhost:8000 in a browser.

## Put It On The Web With GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository: Settings, then Pages.
3. Under "Build and deployment" choose "Deploy from a branch", branch `main`, folder `/ (root)`, and save.
4. After a minute the game is live at `https://<your-user>.github.io/<repository>/`.

It can also be copied as-is into any folder of an ordinary website.

## What Is In Here

```
index.html                 the page: loads three.js, the engine, then the game
css/farm.css               the farm page's own styles
css/scout.css              the game's styles (phone first)
engine/farm-engine.js      the farm 3D engine: ground, ponds, fish, trees, sky, sound, camera
engine/i18n.js             the engine's text
game/scout-core.js         game core: mission bar, card, scores, helpers, engine hooks
game/missions-explore.js   Scavenger Hunt, Compass Course, Follow The Raindrop, Wildlife Spotter
game/missions-water-sky.js Catch A Bass, Night Sky Hunt
game/missions-camp-fire.js Pitch Your Camp, Fire Class With Ember The Owl
game/missions-games.js     Paintball Range, Horseshoes
scene.json, ground_tex.jpg the farm itself (generated from the farm model; do not edit by hand)
```

## How The Game Talks To The Engine

The engine calls three functions in `game/scout-core.js`:

- `scInit()` once the farm is built
- `scPick(e)` on every tap
- `scTick(t, dt)` every frame

## Add A Mission

Add an object to `SC_MISSIONS` in any file under `game/` (and add a `<script>` line in `index.html` if it is a new file):

```js
SC_MISSIONS.push({
  id: 'mine', name: 'My Mission',
  start() { scCard('My Mission', ['Tap the ground.']) },
  pick(e) { const h = groundHit(e); if (h) { scFlag(h[0], h[1], 0xf2c230, 'Here!'); scAward('mine', 50) } return true },
  tick(t, dt) { },
  stop() { }
});
```

Useful helpers: `scCard`, `scFlag`, `scLine`, `scLabel`, `scMark(name)`, `scBearing`, `scPond`, `scWater`, `scOpenSpot`, `scAward`, `scSpeak`, `scWin`, `scMiss`.

## Good To Know

- Scores are kept in the browser on each device. They are not shared between phones. For a campfire scoreboard, play on one device or read the totals out.
- Ember The Owl speaks using the browser's built-in voice where it is allowed; her words always show on the card as well.
- The real constellations are set for the evening of 29 November at Aiken (about 9 pm) and are drawn simply. The fish and safari star pictures are just for fun.
- The Compass Course and Scavenger Hunt use the farm's real landmarks, so the same course can be walked outside.
- A real campfire is only ever built and lit with adult leaders, following the troop's own rules.
