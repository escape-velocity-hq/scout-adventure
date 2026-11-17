// ===== Scout Adventure At Aiken Basserie: small landmarks the aerial photo only showed as a blur =====
// Each one is built from simple shapes where the photo showed it, can be tapped for its name, and is solid
// to a walking Scout. The farm's own model (scene.json) is not changed.
const SC_LANDMARKS = [
  // the well house: a small white block building with a low metal roof, beside the driveway
  { name: 'Well House', tip: 'Well house: the well and pump that water the farm.', x: -113.32, z: -27.81, rot: -2.101, w: 2.6, d: 2.6, h: 2.0, wall: 0xe9e6dc, roof: 0x8d9499, door: 0x5b6b4d }];

function scLandmarks() {
  for (const L of SC_LANDMARKS) {
    const g = new THREE.Group(), tipf = () => L.tip, add = (geo, color, x, y, z, ry, rz) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9 })); m.position.set(x, y, z); if (ry) m.rotation.y = ry; if (rz) m.rotation.z = rz;
      m.castShadow = true; m.receiveShadow = true; m.userData = { tipf, solid: true }; g.add(m); picks.push(m); return m;
    };
    add(new THREE.BoxGeometry(L.w, L.h, L.d), L.wall, 0, L.h / 2, 0);
    const run = L.w / 2 + 0.25, rise = 0.55, len = Math.hypot(run, rise), ang = Math.atan2(rise, run);      // a low gable roof, two sloping sheets
    add(new THREE.BoxGeometry(len, 0.07, L.d + 0.5), L.roof, -run / 2, L.h + rise / 2, 0, 0, ang);
    add(new THREE.BoxGeometry(len, 0.07, L.d + 0.5), L.roof, run / 2, L.h + rise / 2, 0, 0, -ang);
    const gable = new THREE.Shape(); gable.moveTo(-L.w / 2, 0); gable.lineTo(L.w / 2, 0); gable.lineTo(0, rise * (L.w / 2) / run); gable.closePath();
    for (const s of [1, -1]) { const m = add(new THREE.ShapeGeometry(gable), L.wall, 0, L.h, s * L.d / 2); m.material.side = THREE.DoubleSide }
    add(new THREE.BoxGeometry(0.85, 1.7, 0.06), L.door, 0, 0.85, L.d / 2 + 0.02);
    g.position.set(L.x, scY(L.x, L.z) - 0.05, L.z); g.rotation.y = L.rot; scene.add(g); L.obj = g;
  }
  // the game does not show the yellow drive route, its dashed alternative or the blue parking pad (the P sign stays)
  try { for (const o of routeObjs) if (o && !o.isSprite && !(o.geometry && o.geometry.type === 'CylinderGeometry')) o.visible = false } catch (e) { }
  if (typeof SCW !== 'undefined') SCW.solids = null;      // walking: count the new buildings as solid
  try { shadowDirty = true } catch (e) { }
}
const scInitL0 = scInit;
scInit = function () { scInitL0(); try { scLandmarks() } catch (e) { console.error(e) } };
