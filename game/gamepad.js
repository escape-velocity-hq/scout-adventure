// ===== Scout Adventure At Aiken Basserie: game controllers =====
// Xbox, PlayStation and any other controller the browser reports through the Gamepad API.
// Nothing here changes the game: the controller drives an on-screen pointer and the farm camera,
// and its "tap" button does exactly what a finger tap or mouse click does.
//
//   Left stick      on foot: walk.  On the Map: move the pointer (push it past the screen edge to travel)
//   D-pad           on foot: move the pointer.  On the Map: travel around the farm
//   Right stick     turn and tilt the view (with the pointer on a long card: scroll the card)
//   LT / RT         zoom out / zoom in            (PlayStation: L2 / R2)
//   A               tap what the pointer is on    (PlayStation: Cross)
//   B               Home                          (PlayStation: Circle)
//   X               use what is in front of you, or centre the pointer   (PlayStation: Square)
//   Y               day / night                   (PlayStation: Triangle)
//   LB / RB         step through the missions     (PlayStation: L1 / R1)
//   Menu            jump to the card's buttons    (PlayStation: Options)
//   View            show or hide the help         (PlayStation: Create / Share)
(function () {
  'use strict';
  if (!navigator.getGamepads) return;

  const DEAD = 0.18;                       // stick dead zone: ignores a worn stick's drift
  const NAMES = {
    xbox: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', menu: 'Menu', view: 'View' },
    ps: { a: 'Cross', b: 'Circle', x: 'Square', y: 'Triangle', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', menu: 'Options', view: 'Create' }
  };
  const GP = { x: 0, y: 0, shown: false, was: [], last: 0, idx: -1, kind: '', hover: null, mis: -1, helpT: 0, seen: false };

  // ---- what is on screen: the pointer and the help card
  const css = document.createElement('style');
  css.textContent =
    '#gpptr{position:fixed;z-index:60;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid #f2c230;' +
    'box-shadow:0 0 0 2px rgba(10,14,11,.85),inset 0 0 0 2px rgba(10,14,11,.85);pointer-events:none;will-change:transform}' +
    '#gpptr::after{content:"";position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#f2c230;box-shadow:0 0 0 2px rgba(10,14,11,.85)}' +
    '#gpptr.tap{border-color:#fff;width:26px;height:26px;margin:-13px 0 0 -13px}' +
    '.gphover{outline:3px solid #f2c230!important;outline-offset:2px}' +
    '#gphelp{position:fixed;z-index:55;left:50%;top:50%;transform:translate(-50%,-50%);width:min(430px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;' +
    'background:rgba(22,30,24,.95);color:#f4f1e6;border:1px solid rgba(242,194,48,.55);border-radius:14px;padding:12px 16px;font:15px/1.4 Inter,system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.45);pointer-events:none}' +
    '#gphelp h2{margin:0 0 6px;font:600 18px/1.2 "Space Grotesk",Inter,system-ui,sans-serif;color:#f2c230}' +
    '#gphelp table{border-collapse:collapse;width:100%}#gphelp td{padding:3px 0;vertical-align:top}#gphelp td:first-child{white-space:nowrap;padding-right:14px;font-weight:600;color:#f2c230}' +
    '#gphelp p{margin:8px 0 0;font-size:13px;opacity:.85}' +
    '@media (max-height:520px){#gphelp{font-size:13px;line-height:1.25;padding:8px 12px}#gphelp h2{font-size:15px;margin-bottom:3px}#gphelp td{padding:1px 0}#gphelp p{display:none}}';
  document.head.appendChild(css);
  const ptr = document.createElement('div'); ptr.id = 'gpptr'; ptr.hidden = true; ptr.setAttribute('aria-hidden', 'true');
  const help = document.createElement('div'); help.id = 'gphelp'; help.hidden = true; help.setAttribute('role', 'status');
  const mount = () => { document.body.append(ptr, help) };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  function kindOf(id) { id = id || ''; if (/xbox|xinput|microsoft|045e/i.test(id)) return 'xbox'; return /playstation|dualsense|dualshock|sony|054c|^wireless controller/i.test(id) ? 'ps' : 'xbox' }
  function showHelp(on) {
    clearTimeout(GP.helpT);
    if (!on) { help.hidden = true; return }
    const n = NAMES[GP.kind || 'xbox'], rows = [
      ['Left stick', 'On foot: walk. On the Map: move the pointer.'],
      ['D-pad', 'On foot: move the pointer. On the Map: travel.'],
      ['Right stick', 'Turn and tilt the view'],
      [n.lt + ' / ' + n.rt, 'Zoom out / zoom in'],
      [n.a, 'Tap what the pointer is on. Fishing: hold to wind up and to reel.'],
      [n.b, 'Home'],
      [n.lb + ' / ' + n.rb, 'Step through the missions'],
      [n.menu, 'Jump to the card’s buttons'],
      [n.x, 'Use what is in front of you, or centre the pointer'],
      [n.y, 'Day / night. When a bear is after you: Bear Spray.'],
      [n.view, 'Show or hide this help']];
    help.textContent = '';
    const h = document.createElement('h2'); h.textContent = (GP.kind === 'ps' ? 'PlayStation' : 'Xbox') + ' Controller Connected'; help.appendChild(h);
    const t = document.createElement('table');
    for (const r of rows) { const tr = document.createElement('tr'); for (const c of r) { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td) } t.appendChild(tr) }
    help.appendChild(t);
    const p = document.createElement('p'); p.textContent = 'Typing a patrol name still needs the keyboard or the screen.'; help.appendChild(p);
    help.hidden = false; GP.helpT = setTimeout(() => { help.hidden = true }, 12000);
  }
  function show(on) {
    if (on === GP.shown) return; GP.shown = on; ptr.hidden = !on;
    if (!on) setHover(null);
  }
  function place() { ptr.style.transform = 'translate(' + GP.x.toFixed(1) + 'px,' + GP.y.toFixed(1) + 'px)' }
  function setHover(el) { if (GP.hover === el) return; if (GP.hover) GP.hover.classList.remove('gphover'); GP.hover = el; if (el) el.classList.add('gphover') }
  const control = el => el && el.closest ? el.closest('button,a[href],input,select,textarea,[role="button"]') : null;
  // a mouse or a finger takes over: put the pointer away until the controller is used again
  for (const ev of ['mousemove', 'touchstart']) window.addEventListener(ev, () => show(false), { passive: true });

  // ---- reading the controller
  function pick1() {      // the controller in use: the one being touched right now, otherwise the last one used
    const all = navigator.getGamepads(); let keep = null;
    for (const g of all) {
      if (!g || !g.connected) continue;
      if (g.buttons.some(b => b.pressed) || g.axes.some(a => Math.abs(a) > 0.5)) return g;
      if (g.index === GP.idx || !keep) keep = g;
    }
    return keep;
  }
  const axis = v => { const a = Math.abs(v || 0); if (a < DEAD) return 0; const k = (a - DEAD) / (1 - DEAD); return Math.sign(v) * k * k };   // squared: fine aim near the centre, fast at the rim
  const val = (g, i) => { const b = g.buttons[i]; return b ? (typeof b === 'object' ? (b.value || (b.pressed ? 1 : 0)) : b) : 0 };
  const stop = () => { try { if (typeof stopDrive === 'function') stopDrive(); fly = null } catch (e) { } };   // the same as touching the screen: end any fly-to in progress

  // ---- the actions
  function tap() {
    ptr.classList.add('tap'); setTimeout(() => ptr.classList.remove('tap'), 130);
    const el = document.elementFromPoint(GP.x, GP.y); if (!el) return;
    if (el === canvas) { stop(); pick({ clientX: GP.x, clientY: GP.y, button: 0, pointerId: -1 }); return }
    const c = control(el); if (!c) return;
    if (c.matches('input,textarea,select')) c.focus(); else c.click();
  }
  function jump(el) {      // put the pointer on a button
    if (!el) return; try { el.scrollIntoView({ block: 'nearest', inline: 'center' }) } catch (e) { }
    const r = el.getBoundingClientRect(); GP.x = r.left + r.width / 2; GP.y = r.top + r.height / 2; place(); setHover(control(el));
  }
  function stepMission(d) {
    const b = [...document.querySelectorAll('#scbar .scbtn')]; if (!b.length) return;
    const cur = b.findIndex(e => e === GP.hover);
    GP.mis = cur >= 0 ? (cur + d + b.length) % b.length : GP.mis < 0 ? (d > 0 ? 0 : b.length - 1) : (GP.mis + d + b.length) % b.length;
    jump(b[GP.mis]);
  }
  function stepCard() {
    const b = [...document.querySelectorAll('#sccard button, #sccard input')].filter(e => e.offsetParent !== null); if (!b.length) return;
    const cur = b.findIndex(e => e === GP.hover); jump(b[cur >= 0 ? (cur + 1) % b.length : 0]);      // from the first button, unless the pointer is already on one
  }
  function travel(mx, my, dt) {      // move the look-at point over the ground: mx to the right, my away from the camera
    if (!mx && !my || ctrl.walk) return;
    const th = ctrl.sph.theta, s = Math.max(6, ctrl.sph.radius) * 0.9 * dt, T = ctrl.target;
    const dx = (Math.cos(th) * mx - Math.sin(th) * my) * s, dz = (-Math.sin(th) * mx - Math.cos(th) * my) * s;
    const ok = (x, z) => groundAt(x, z) < 1e8;          // stay on the farm
    if (ok(T.x + dx, T.z + dz)) { T.x += dx; T.z += dz } else if (ok(T.x + dx, T.z)) T.x += dx; else if (ok(T.x, T.z + dz)) T.z += dz; else return;
    const g = groundAt(T.x, T.z); if (g < 1e8) T.y += (g - T.y) * Math.min(1, dt * 6);
  }

  // ---- every frame
  let t0 = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, t0 ? (now - t0) / 1000 : 0.016); t0 = now;
    if (!window.__ready || typeof ctrl === 'undefined' || !ctrl) return;
    const walking = typeof SCW !== 'undefined' && SCW.on; if (typeof SCW !== 'undefined') SCW.pad = [0, 0];
    const fishing = typeof SCF !== 'undefined' && SCF.on; if (typeof SCF !== 'undefined') SCF.pad = false;
    const g = pick1(); if (!g) { if (GP.shown) show(false); GP.was = []; return }
    const W = window.innerWidth, H = window.innerHeight;
    const lx = axis(g.axes[0]), ly = axis(g.axes[1]), rx = axis(g.axes[2]), ry = axis(g.axes[3]);
    const zin = val(g, 7) - val(g, 6), dx = val(g, 15) - val(g, 14), dy = val(g, 12) - val(g, 13);
    const down = g.buttons.map(b => !!(b && b.pressed)), hit = i => down[i] && !GP.was[i];
    const busy = lx || ly || rx || ry || Math.abs(zin) > 0.05 || down.some(Boolean);
    if (busy) {
      if (g.index !== GP.idx || !GP.seen) { GP.idx = g.index; GP.kind = kindOf(g.id); if (!GP.seen) { GP.seen = true; GP.x = W / 2; GP.y = H / 2; showHelp(true) } }
      if (!GP.shown) { GP.x = Math.min(W - 4, Math.max(4, GP.x || W / 2)); GP.y = Math.min(H - 4, Math.max(4, GP.y || H / 2)); show(true); place() }
      GP.last = now;
    }
    if (!GP.shown) { GP.was = down; return }

    // on foot the left stick walks and the D-pad moves the pointer; on the Map the left stick moves the pointer and the D-pad travels
    if (walking) SCW.pad = [lx, -ly];
    const px = walking ? dx * 0.8 : lx, py = walking ? -dy * 0.8 : ly;
    let mx = walking ? 0 : dx, my = walking ? 0 : dy;
    if (px || py) {
      const v = Math.max(W, H) * 0.75 * dt, nx = GP.x + px * v, ny = GP.y + py * v;
      if (!walking) { if (nx < 4 && lx < 0 || nx > W - 4 && lx > 0) mx += lx; if (ny < 4 && ly < 0 || ny > H - 4 && ly > 0) my -= ly }
      GP.x = Math.min(W - 4, Math.max(4, nx)); GP.y = Math.min(H - 4, Math.max(4, ny)); place();
    }
    let moved = false;
    if (mx || my) { stop(); travel(Math.max(-1, Math.min(1, mx)), Math.max(-1, Math.min(1, my)), dt); moved = true }
    // view: turn, tilt, zoom
    const over = document.elementFromPoint(GP.x, GP.y), card = over && over.closest ? over.closest('#sccard') : null;
    if (card && ry && card.scrollHeight > card.clientHeight + 1) { card.scrollTop += ry * 700 * dt; }   // pointer on a long card: the right stick scrolls it
    const ty = card && card.scrollHeight > card.clientHeight + 1 ? 0 : ry;
    if (rx || ty) {
      stop();
      if (ctrl.walk) { ctrl.walk.yaw -= rx * 1.6 * dt; ctrl.walk.pitch = Math.min(1.25, Math.max(-1.25, ctrl.walk.pitch - ty * 1.2 * dt)) }
      else { ctrl.sph.theta -= rx * 1.9 * dt; ctrl.sph.phi = Math.min(Math.PI / 2 - 0.01, Math.max(0.03, ctrl.sph.phi - ty * 1.2 * dt)) }
      moved = true;
    }
    if (Math.abs(zin) > 0.05) { stop(); ctrl.zoom(Math.exp(-zin * 1.5 * dt)); moved = true }
    if (moved) ctrl.update();

    // what the pointer is over
    setHover(over && over !== canvas ? control(over) : null);

    // buttons (acted on once per press)
    if (fishing && !GP.hover) SCF.pad = down[0]; else if (hit(0)) tap();      // fishing: A is the rod (hold to wind up and to reel), unless the pointer is on a button
    if (hit(1) && typeof scHome === 'function') scHome();
    if (hit(2)) { if (walking && typeof scwUse === 'function' && scwUse()) { } else { GP.x = W / 2; GP.y = H / 2; place() } }
    if (hit(3)) { if (typeof scBearKey === 'function' && scBearKey()) { } else if (typeof setTime === 'function') setTime(NIGHT > 0.5 ? 15 : 22.5) }
    if (hit(4)) stepMission(-1);
    if (hit(5)) stepMission(1);
    if (hit(8)) showHelp(help.hidden);
    if (hit(9)) stepCard();
    GP.was = down;
  }
  requestAnimationFrame(frame);
  window.addEventListener('gamepaddisconnected', () => { if (!pick1()) { show(false); showHelp(false) } });
  window.__gp = { state: () => GP };   // test hook
})();
