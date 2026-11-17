# Scout Adventure At Aiken Basserie

A 3D game for the Scouts visiting on November 29, 2026, played on the real farm at 717 Redds Branch Rd, Aiken SC.
It runs in a web browser on a phone, tablet or laptop. Nothing to install.

## Missions

| Mission | What The Scouts Do | What It Teaches |
|---|---|---|
| Scavenger Hunt | Read a clue, find the place, tap it | Observation |
| Compass Course | Follow a bearing and a distance from a start flag | Bearings and pacing |
| Follow The Raindrop | Tap the ground and watch the rain run downhill | Watersheds |
| Wildlife Spotter | Find seven animals hidden around the farm | Local wildlife |
| Catch A Bass | First-person fishing with a rod: wind up and cast, set the hook, and play the fish. About one bite in four is a trophy. | Patience, catch and release |
| Night Sky Hunt | Find the Big Dipper, North Star, Cassiopeia, Orion and the farm's own star pictures | Finding north at night |
| Pitch Your Camp | Place tents, a dining fly and a fire ring; get the site scored | Campsite selection |
| Fire Class | Answer Ember The Owl's questions and build a safe campfire step by step | Fire safety |
| Paintball Range | Splat pop-up targets against the clock (targets only, never people) | Aim, range safety |
| Horseshoes | Press to set the aim, then hold to build the power and let go to throw | Just fun |
| BB Gun Range | Agree to the range rules, then ten shots at paper targets 15 feet away | Range safety, sight picture |
| Archery Range | Choose an arrow tip, then twelve arrows at round targets and foam animals | Range safety, holding high for distance |

Every mission earns points for the patrol that is playing. The Scoreboard ranks the patrols.

## Walking The Farm

The game opens on foot, in first person, after the patrol chooses the Scout it plays as. Walk with W A S D or the arrow keys (Shift to jog), the on-screen stick on a phone or tablet, or a controller's left stick. Drag on the farm to look around. Ponds, tree trunks, buildings and the property line stop a Scout. The **Map** button lifts to the overhead view and flags where the Scout is standing. Missions run in the overhead view and hand the walk back at Home. Thirty metres on foot uses one energy. Settings: `SCW` at the top of `game/walk.js`.

## Vehicles

Two golf carts, two ATVs and a motorcycle are parked on the parking pad. Walk up and press Use (the yellow button, the E key, or X on a controller) to get on, and again to get off. Golf carts are free; the ATV rents for 5 tokens a ride and the motorcycle for 8. Ahead and back are the throttle; left and right steer. Riding uses no energy. Settings: `SC_RIDES` in `game/ride.js`.

## The Bear

A cartoon bear roams the farm. If it sees a Scout on foot within 45 metres it stares, then charges, and it is faster than a Scout can jog. If it reaches the Scout it takes 10 tokens and wanders off; nobody is hurt. A Scout on a vehicle, on the Map or in a mission is left alone.

Bear Spray (Camp Store, 6 tokens for three bursts) stops it, used the way the real thing is taught: keep it within reach, take the safety clip off, aim slightly down at the bear, and spray when it is 30 to 60 feet away. In the game the Bear Spray button (or F, or Y on a controller) takes the clip off on the first press and sprays on the next. The first good spray earns 10 tokens. The Bear Spray Class card lists the steps, which follow the guidance published by Yellowstone Forever, Be Bear Aware and REI. Settings: `SC_BEAR` in `game/bear.js`.

## The Ranges

Both ranges are shot in first person from a firing line on open ground, at targets only, and both open on the range rules, which the Scout has to agree to before anything will fire.

Every BB and every arrow is flown as a real projectile: it leaves at its own speed, gravity pulls it down, the air slows it and the wind pushes it sideways. A BB (350 feet a second) drops under an inch over 15 feet. An arrow at full draw (about 150 feet a second) falls about a metre below its line of aim by the time it reaches the 20 metre target, so far targets need the cross held high, and the game says how far off each shot landed.

- **BB Gun Range:** five paper targets at 15 feet, ten shots, scored by ring.
- **Archery Range:** round targets at 10, 15 and 20 metres, and three foam animals (turkey, deer, bear) scored 10 for the centre of the vital ring, 8 inside it and 5 for a body hit. Hold the button to draw, let go to loose.
- **Arrow tips:** Field Point, Bullet Point, Blunt and Judo Point, each with its own drag; blunts and judo points bounce off instead of sticking. Broadheads are hunting tips, are not used on a Scout range, and are not offered.

Aim by dragging, with the arrow keys (Shift for finer), or with a controller's right stick. Settings: `SC_RANGE` at the top of `game/range.js`.

## Fountain Play

The Fountains button on the Welcome card lets the Scouts run the pond fountains: Normal, Gentle (6 ft), Tall (25 ft), EXTREME (about 50 ft), or Off, with colour-changing lights that show best at night. Every pond changes together. Settings: `SC_FOUNTAINS` in `game/fountains.js`.

## Controllers

Plug in or pair an Xbox or PlayStation controller and press any button. A yellow pointer appears and a help card lists the buttons.

| Xbox | PlayStation | What It Does |
|---|---|---|
| Left stick | Left stick | On foot: walk. On the Map: move the pointer. |
| D-pad | D-pad | On foot: move the pointer. On the Map: travel. |
| Right stick | Right stick | Turn and tilt the view |
| LT / RT | L2 / R2 | Zoom out / zoom in |
| A | Cross | Tap what the pointer is on |
| B | Circle | Home |
| LB / RB | L1 / R1 | Step through the missions |
| Menu | Options | Jump to the card's buttons |
| X | Square | Use what is in front of you, or centre the pointer |
| Y | Triangle | Day / night. When a bear is after you: Bear Spray. |
| View | Create | Show or hide the help |

Touch and mouse keep working; moving the mouse or touching the screen puts the pointer away. Typing a patrol name still needs the keyboard or the screen.

## Badges

Each mission has a badge, earned the first time a patrol scores in it. The Home card shows how many the patrol holds, and the Badges card shows all twelve and the patrol's standing (Trail Scout, Farm Ranger, Pond Master, Basserie Legend). These are the farm's own badges, not Scouting America ranks or merit badges.

## Fishing With A Rod

Fishing is in first person, from the bank of any pond or from the lower or upper deck of the Fishing Lounge. Walk to the water and press Use ("Fish Here"), or by the lounge ("Fish From The Lounge"), or press Catch A Bass to be walked to the nearest bank.

- **Cast:** hold the big button (or Space, or A on a controller) to wind up, and let go. The lure flies in a real arc; a longer wind-up carries it farther, up to about 26 metres of throw.
- **Wait:** the fish are the ones swimming in the pond. The nearest one notices the lure and swims to it. Holding the button reels the lure slowly in.
- **Strike:** when it bites, press to set the hook.
- **Fight:** hold to reel, let go to give line. A fish's pull comes from its weight, worked out from its length. It runs and rests. Reel against a strong run and the tension passes what the line can take and it snaps; leave the line slack and the hook pulls out; let it take all 45 metres of line and it breaks off. Tension tires the fish.
- **Land:** the fish is lifted out of the water on the line. Let it go, or put it in the keep net: a hoop and mesh bag standing in the water, where up to five fish wait alive and can be seen swimming. Emptying the net, or finishing, lets them all go. Trophies and monsters always go straight back.
- **On the move:** with the line in, the Scout walks the bank at full pace with the rod. With the line out or a fish on, they can take slow steps any way, and they turn with the fish by themselves.

Tackle changes the physics: Live Bait doubles how far away a fish notices the lure, Braided Line takes about 1.7 times the tension, and the Heavy Rod reels 35 percent harder. All the numbers are in `SC_FISHING` at the top of `game/fishing.js`.

## Trophy Fish

In Catch A Bass any of the nine kinds of fish stocked in the ponds can bite: largemouth bass, F1 tiger bass, bream, redear sunfish, warmouth, channel catfish, tilapia, butterfly koi and grass carp. About one bite in four is a "BIG BITE", A trophy is 8 to 22 percent longer than the biggest of its kind swimming in the ponds and scores 100 bonus points. The game remembers each patrol's biggest catch. The settings are at the top of `game/missions-water-sky.js` (`SC_TROPHY`).

## Monster Fish

Each pond holds one abnormally large fish (1.25 to 1.75 times the biggest ordinary fish of its kind), with a name. Every 9 to 17 seconds one of them leaps and comes down with a big splash, and the game says which one. Settings are at the top of `game/monsters.js`.

To land one, a patrol needs the Heavy Rod, the Braided Line and a Monster Lure, and has to cast close to where the monster is swimming. It weighs many times what an ordinary fish does, so it has to be played patiently: reel only while it rests. Snap the line or lose the hook and the lure goes with it. Landing one pays 60 tokens. Settings: `SC_MONSTER_CATCH` in `game/missions-water-sky.js`.

## Tokens, Energy And The Shop

Tokens are play money. They are earned by playing and cannot be bought.

| Earned For | Tokens |
|---|---|
| Finishing any mission with a score | 10 |
| Each fish landed | 1 for every 6 inches |
| A trophy fish | 5 more |
| Landing a monster | 60 |

Starting a mission (or a fishing session) uses 12 energy and each cast uses 3. Running out never stops the game: a tired patrol earns half the tokens until it eats or drinks.

| Vending Machine | Tokens | Gives |
|---|---|---|
| Water | 1 | 20 energy |
| Lemonade | 2 | 45 energy |
| Trail Mix | 4 | 100 energy |

| Tackle Shop | Tokens | What It Does |
|---|---|---|
| Live Bait (6 worms) | 4 | Fish bite sooner. One worm a cast. |
| Spinner Lure | 15 | Trophy bites go from one in four to two in five. Kept. |
| Braided Line | 25 | Needed for a monster. Kept. |
| Heavy Rod | 35 | Needed for a monster. Kept. |
| Monster Lure | 20 | One try at a monster. |

All the prices and amounts are in `SC_ECON` at the top of `game/tokens.js`.

## What Is Saved

Patrol name, troop number, each patrol's best score per mission, its biggest catch, its tokens, energy and tackle, and its badges are kept in the browser on that device. They are still there after the page is closed. A half-played mission is not saved. Nothing is shared between devices.

## For Parents

Suitable for all ages. This is the farm's own description, not an official ESRB or PEGI rating.

- Nothing violent. The paintball, BB gun and archery ranges shoot at targets only (paper, round targets and foam animal targets), never at people or real animals, and open with the range safety rules. Fishing is catch and release: a fish goes straight back, or waits alive in a keep net in the water and is let go when the patrol is done.
- A cartoon bear roams the farm. If it reaches a Scout on foot it takes some play tokens and wanders off. Nobody is hurt, and a class teaches how Bear Spray is really used.
- No ads, no purchases, no chat, no accounts and no links to other websites.
- The tokens are play money, earned by playing. They cannot be bought and are not worth real money. The snacks and tackle they buy exist only in the game.
- Nothing a child types is sent anywhere. Patrol names, scores and badges stay in the browser on that device.
- The page loads its 3D library and its lettering from two public services (cdnjs and Google Fonts). Like any website, they see the device's internet address.

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
game/monsters.js           one monster fish in each pond that leaps and splashes
game/badges.js             one badge per mission, the Badges card, the For Parents card
game/tokens.js             tokens, energy, the vending machine and the tackle shop
game/walk.js               first-person walking, the Scout chooser, the Map button
game/ride.js               golf carts, ATVs and the motorcycle
game/bear.js               the bear, Bear Spray and the Bear Spray class
game/fishing.js            first-person fishing with a rod (takes the place of the fishing in missions-water-sky.js)
game/fountains.js          fountain play, up to 50 ft
game/range.js              the BB gun range and the archery range
game/landmarks.js          the well house
game/gamepad.js            Xbox and PlayStation controllers
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
