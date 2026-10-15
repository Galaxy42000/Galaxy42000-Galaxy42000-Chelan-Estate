import * as THREE from 'three';
import { addBox, addMesh, panelRects } from './geometry.js';
import { slab } from './roomBuilder.js';
import * as F from './fixtures.js';

// Bath, laundry and mechanical fixtures for the whole-house view.
// Same conventions as fixtures.js: inches, back of the fixture at z = 0, front facing +z.

// Elliptical cylinder (rx across, rz deep) centered at x, y, z; rBottom tapers the bottom.
const ellipse = (rx, rz, h, mat, x, y, z, rBottom = 1) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rx, rx * rBottom, h, 32), mat);
  m.scale.z = rz / rx;
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
};

export function toilet(parent, ctx, w = 19, d = 28) {
  const P = ctx.M.porcelain, cx = w / 2;
  addBox(parent, P, cx - 9.5, 15, 0.5, 19, 14.5, 7.5); // tank
  addBox(parent, P, cx - 10, 29.5, 0.25, 20, 1, 8); // lid
  addBox(parent, P, cx - 4, 0, 4, 8, 15, 8); // neck under the tank
  parent.add(ellipse(7.5, 9.5, 15, P, cx, 7.5, d - 9.75, 0.72)); // bowl
  parent.add(ellipse(7.6, 9.6, 0.9, ctx.M.porcelainSeat, cx, 15.45, d - 9.75)); // seat
}

export function vanity(parent, ctx, w, d, item = {}) {
  const M = ctx.M;
  const h = item.height ?? 31; // cabinet box; top adds 1½″
  F.baseCabinet(parent, ctx, w, { depth: d - 1, height: h, toeKick: 4 }, 'doors', { doors: w >= 24 ? 2 : 1, ...item });
  addBox(parent, M.counter, 0, h, 0, w, 1.5, d);
  const top = h + 1.5;
  parent.add(ellipse(Math.min(8, w / 2 - 3), Math.min(6, d / 2 - 4), 0.2, M.porcelain, w / 2, top + 0.1, d / 2 + 1));
  parent.add(ellipse(Math.min(7, w / 2 - 4), Math.min(5, d / 2 - 5), 0.22, M.porcelainShade, w / 2, top + 0.12, d / 2 + 1));
  const tap = new THREE.Group();
  tap.scale.setScalar(0.6);
  tap.position.set(w / 2, top, 1.5);
  F.faucet(tap, ctx, 0, 0, 0);
  parent.add(tap);
  if (item.mirror === 'led') {
    // LED-backlit mirror: lit bars set into the glass near its edges
    const mw = item.mirrorWidth ?? 24, mh = item.mirrorHeight ?? 32, mx = (w - mw) / 2, my = item.mirrorBottom ?? top + 9;
    addBox(parent, M.black, mx, my, 0, mw, mh, 0.6);
    addBox(parent, M.mirror, mx + 0.3, my + 0.3, 0.6, mw - 0.6, mh - 0.6, 0.1);
    const bar = (x, y, bw, bh) => addBox(parent, M.ledStrip, mx + x, my + y, 0.72, bw, bh, 0.05, { cast: false });
    for (const y of [2.5, mh - 3.2]) { bar(2.5, y, mw / 2 - 4, 0.7); bar(mw / 2 + 1.5, y, mw / 2 - 4, 0.7); }
    for (const x of [2.5, mw - 3.2]) { bar(x, 2.5, 0.7, mh / 2 - 4); bar(x, mh / 2 + 1.5, 0.7, mh / 2 - 4); }
  } else if (item.mirror !== false) addBox(parent, M.mirror, 1, top + 7, 0, w - 2, 30, 0.5);
}

// Neo-angle shower in a corner: local x runs along one wall, z along the other.
// Frameless glass (two returns and a hinged door on the angled front, handle on its
// local-x end), an acrylic base, and optionally a tile surround up to `tile` inches
// with recessed niches: niches = [{ wall: 'x' | 'z', at, bottom, width, height }].
export function cornerShower(parent, ctx, a, { returnLen = 12, height = 72, tile = 0, niches = [] } = {}) {
  const M = ctx.M, r = returnLen, base = 4;
  parent.add(slab([[0, 0], [a, 0], [a, r], [r, a], [0, a]], base, 0, M.porcelain));
  const panel = (x0, z0, x1, z1, door) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const p = new THREE.Group();
    p.position.set(x0, base, z0);
    p.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    parent.add(p);
    addBox(p, M.glass, 0.25, 0, -0.19, len - 0.5, height, 0.375, { cast: false });
    for (const y of [0, height - 1.5]) addBox(p, M.steel, -0.4, y, -0.6, 0.6, 1.5, 1.2); // clips at the ends
    if (door) {
      for (const y of [6, height - 10]) addBox(p, M.steel, 0.2, y, -0.7, 2.6, 4, 1.4); // hinges
      addBox(p, M.steel, len - 3, 24, 1, 0.75, 22, 0.75); // pull bar, both sides
      addBox(p, M.steel, len - 3, 24, -1.75, 0.75, 22, 0.75);
    }
  };
  panel(r, a, 0, a);
  panel(a, r, r, a, true);
  panel(a, 0, a, r);
  if (tile > 0) {
    // tile on both walls, a little wider than the base; niches are recessed into the wall
    const w = a + 2, h = tile - base;
    for (const wall of ['x', 'z']) {
      const g = new THREE.Group();
      if (wall === 'z') { g.rotation.y = -Math.PI / 2; g.scale.z = -1; } // run along local z, facing +x
      parent.add(g);
      const ns = niches.filter((n) => n.wall === wall).map((n) => ({ start: n.at, width: n.width, bottom: n.bottom - base, height: n.height }));
      for (const q of panelRects(w, h, ns)) addBox(g, M.wallTile, q.x, base + q.y, 0, q.w, q.h, 0.4, { cast: false });
      for (const n of ns) {
        addBox(g, M.wallTileShade, n.start, base + n.bottom, -3.5, n.width, n.height, 0.4, { cast: false }); // back
        addBox(g, M.wallTile, n.start, base + n.bottom, -3.5, n.width, 0.4, 3.9, { cast: false }); // shelf
        addBox(g, M.wallTileShade, n.start, base + n.bottom + n.height - 0.4, -3.5, n.width, 0.4, 3.9, { cast: false });
        addBox(g, M.wallTileShade, n.start, base + n.bottom, -3.5, 0.4, n.height, 3.9, { cast: false });
        addBox(g, M.wallTileShade, n.start + n.width - 0.4, base + n.bottom, -3.5, 0.4, n.height, 3.9, { cast: false });
      }
    }
  }
  // valve and shower head on the wall along local z, in the photo's left-hand wall
  const sz = a / 2, wz = tile > 0 ? 0.4 : 0;
  addMesh(parent, new THREE.CylinderGeometry(2.6, 2.6, 0.5, 24).rotateZ(Math.PI / 2), M.steel, wz + 0.25, 46, sz);
  addBox(parent, M.steel, wz, 76, sz - 0.4, 7, 0.8, 0.8);
  addMesh(parent, new THREE.CylinderGeometry(3, 3, 0.6, 24), M.steel, wz + 7, 75.6, sz);
}

// Stacked washer + dryer: two machines, or one cabinet with both (unit = true).
export function laundry(parent, ctx, w = 27, d = 30, h = 77, unit = false) {
  const M = ctx.M, split = Math.min(39, h / 2);
  if (unit) addBox(parent, M.appliance, 0, 0, 0, w, h, d);
  for (const [y0, hh] of [[0, split], [split + 0.5, h - split - 0.5]]) {
    if (!unit) addBox(parent, M.appliance, 0, y0, 0, w, hh, d);
    addBox(parent, M.black, 1.5, y0 + hh - 4.5, d, w - 3, 3.25, 0.3, { cast: false }); // control strip
    const r = Math.min(8, w / 2 - 4);
    addMesh(parent, new THREE.CylinderGeometry(r, r, 1, 36).rotateX(Math.PI / 2), M.trim, w / 2, y0 + (hh - 5) / 2, d + 0.5);
    addMesh(parent, new THREE.CylinderGeometry(r - 1.8, r - 1.8, 1.1, 36).rotateX(Math.PI / 2), M.blackGlass, w / 2, y0 + (hh - 5) / 2, d + 0.6);
  }
}

// Wide-flange (I) steel beam along local x from 0 to len, bottom at y = 0, centered on z = 0.
export function steelBeam(parent, ctx, len, depth = 8, flange = 4, { web = 0.25, tf = 0.35 } = {}) {
  const S = ctx.M.beam;
  addBox(parent, S, 0, 0, -flange / 2, len, tf, flange);
  addBox(parent, S, 0, depth - tf, -flange / 2, len, tf, flange);
  addBox(parent, S, 0, tf, -web / 2, len, depth - 2 * tf, web);
}

// Upright pressure tank (well system): cylinder with domed ends on a short base ring,
// diameter w across, h tall; x/z of the group = its footprint's north-west corner.
export function tank(parent, ctx, w, h, item = {}) {
  const r = w / 2, mat = ctx.color(item.color || '#2f6fb7');
  const dome = r * 0.35;
  addMesh(parent, new THREE.CylinderGeometry(r * 0.9, r * 0.9, 2, 32), ctx.M.black, r, 1, r);
  addMesh(parent, new THREE.CylinderGeometry(r, r, h - 2 - 2 * dome, 40), mat, r, 2 + dome + (h - 2 - 2 * dome) / 2, r);
  for (const [y, s] of [[h - dome, 1], [2 + dome, -1]]) {
    const d = addMesh(parent, new THREE.SphereGeometry(r, 40, 16, 0, Math.PI * 2, s > 0 ? 0 : Math.PI / 2, Math.PI / 2), mat, r, y, r);
    d.scale.y = dome / r;
  }
}

// Plain box in a given color (water heater, panel, A/C...). Optional round grille on the +z face.
export function box(parent, ctx, w, h, d, bottom, item = {}) {
  const mat = ctx.color(item.color || '#f2f2ef', item.metal);
  addBox(parent, mat, 0, bottom, 0, w, h, d);
  if (item.grille) {
    // on the +z face, or the -z face with grille: 'north' (plan direction)
    const r = Math.min(w, h) * 0.38;
    addMesh(parent, new THREE.CylinderGeometry(r, r, 0.4, 32).rotateX(Math.PI / 2), ctx.M.black, w / 2, bottom + h / 2, item.grille === 'north' ? -0.2 : d + 0.2, { cast: false });
  }
}

// ---------- furniture (as drawn on the floor plan) ----------
// Same frame as the fixtures above: width along x, back at z = 0, front toward +z.
const soft = (ctx, c) => ctx.color(c);

// Bed: frame, mattress, duvet, pillows; headboard against the wall (z = 0).
export function bed(parent, ctx, w, d, item = {}) {
  const frame = soft(ctx, item.frame || '#7a5a3e'), sheet = soft(ctx, item.sheet || '#f1eee7'), duvet = soft(ctx, item.color || '#b9c3c9');
  addBox(parent, frame, 0, 0, 0, w, 44, 3); // headboard
  addBox(parent, frame, 0, 4, 3, w, 8, d - 3); // frame rails
  addBox(parent, sheet, 1, 12, 3, w - 2, 9, d - 4); // mattress
  addBox(parent, duvet, 0.5, 15, d * 0.33, w - 1, 6.5, d * 0.67 - 0.5); // duvet, folded back
  const pw = Math.min(26, w / 2 - 3);
  for (const px of [w / 2 - pw - 1.5, w / 2 + 1.5]) addBox(parent, sheet, px, 21, 5, pw, 5, 16); // pillows
}

export function nightstand(parent, ctx, w, d, h = 24, item = {}) {
  const m = soft(ctx, item.color || '#7a5a3e');
  addBox(parent, m, 0, 0, 0, w, h, d);
  addBox(parent, ctx.M.hardware, w / 2 - 2, h - 5, d, 4, 0.6, 0.6);
}

// Sectional sofa: base, back cushions and arms; `chaise` adds a chaise on one end.
export function sofa(parent, ctx, w, d, item = {}) {
  const fab = soft(ctx, item.color || '#8f9396'), dark = soft(ctx, item.dark || '#7d8184');
  addBox(parent, dark, 0, 3, 0, w, 14, d); // base
  addBox(parent, fab, 6, 17, 9, w - 12, 5, d - 10); // seat cushions
  addBox(parent, fab, 0, 17, 0, w, 16, 9); // back
  for (const ax of [0, w - 6]) addBox(parent, fab, ax, 17, 0, 6, 8, d); // arms
  if (item.chaise) addBox(parent, dark, item.chaise === 'left' ? 0 : w - 30, 3, d, 30, 14, item.chaiseDepth ?? 30);
  if (item.pillow) addBox(parent, soft(ctx, '#d8d4cb'), w * 0.2, 22, 9, 16, 14, 5);
}

export function armchair(parent, ctx, w, d, item = {}) {
  const fab = soft(ctx, item.color || '#c4b8a6'), legs = ctx.M.stoolLeg;
  for (const [lx, lz] of [[2, 2], [w - 4, 2], [2, d - 4], [w - 4, d - 4]]) addBox(parent, legs, lx, 0, lz, 2, 7, 2);
  addBox(parent, fab, 0, 7, 0, w, 10, d); // seat
  addBox(parent, fab, 0, 17, 0, w, 14, 6); // back
  for (const ax of [0, w - 5]) addBox(parent, fab, ax, 17, 0, 5, 7, d); // arms
}

export function roundTable(parent, ctx, dia, h = 16, item = {}) {
  const m = soft(ctx, item.color || '#6e5641');
  addMesh(parent, new THREE.CylinderGeometry(dia / 2, dia / 2, 1.5, 40), m, dia / 2, h - 0.75, dia / 2);
  addMesh(parent, new THREE.CylinderGeometry(dia * 0.18, dia * 0.22, h - 1.5, 24), m, dia / 2, (h - 1.5) / 2, dia / 2);
}

// Wall bed folded up into its cabinet, as drawn on the plan.
export function murphyBed(parent, ctx, w, d, h = 84, item = {}) {
  const m = soft(ctx, item.color || '#e7e2d8');
  addBox(parent, m, 0, 0, 0, w, h, d);
  addBox(parent, soft(ctx, '#d9d3c7'), 2, 3, d, w - 4, h - 6, 0.5); // face of the folded bed
  for (const px of [w * 0.3, w * 0.7]) addBox(parent, ctx.M.hardware, px - 3, h * 0.45, d + 0.5, 6, 1, 1);
}

// Fireplace: a box with a black firebox, glass front and a hearth. The firebox opens
// toward +z.
export function fireplace(parent, ctx, w, d, h, item = {}) {
  const M = ctx.M, surround = soft(ctx, item.surround || '#3d3f42');
  addBox(parent, surround, 0, 0, 0, w, h, d);
  const fw = Math.min(w - 8, item.fireWidth ?? w - 10), fh = item.fireHeight ?? 22, fy = item.fireBottom ?? 16;
  addBox(parent, M.black, (w - fw) / 2, fy, d - 0.4, fw, fh, 0.6, { cast: false });
  addBox(parent, M.blackGlass, (w - fw) / 2 + 1, fy + 1, d + 0.1, fw - 2, fh - 2, 0.2, { cast: false });
  // flames: a soft glowing strip low in the firebox
  addBox(parent, M.flame, (w - fw) / 2 + 4, fy + 2, d - 0.1, fw - 8, 4, 0.1, { cast: false });
  addBox(parent, soft(ctx, item.hearth || '#55585c'), -2, 0, d, w + 4, 2, 14); // hearth
  const light = new THREE.PointLight('#ff9c4a', 0.8, 120, 2);
  light.position.set(w / 2, fy + 6, d + 6);
  parent.add(light);
}

// Shower in an alcove: a low base, tiled back walls, a glass door across the front.
export function alcoveShower(parent, ctx, w, d, item = {}) {
  const M = ctx.M;
  addBox(parent, M.porcelain, 0, 0, 0, w, 4, d);
  addBox(parent, M.wallTile, 0, 4, 0, w, (item.tile ?? 84) - 4, 0.4, { cast: false });
  for (const sx of [0, w - 0.4]) addBox(parent, M.wallTile, sx, 4, 0, 0.4, (item.tile ?? 84) - 4, d, { cast: false });
  // shower head and valve on the back wall
  addMesh(parent, new THREE.CylinderGeometry(3, 3, 0.6, 24), M.steel, w * 0.25, 80, 4).rotation.x = 0.5;
  addBox(parent, M.steel, w * 0.25 - 0.4, 72, 0.4, 0.8, 8, 3);
  addMesh(parent, new THREE.CylinderGeometry(1.4, 1.4, 1, 20).rotateX(Math.PI / 2), M.steel, w * 0.25, 46, 1);
  // frameless glass: a fixed panel and a door (front: false when the glass is in the wall)
  if (item.front === false) return;
  const gh = item.glass ?? 76, door = item.door ?? 28;
  addBox(parent, M.glass, 0.5, 4, d - 0.4, w - door - 1, gh, 0.4, { cast: false });
  addBox(parent, M.glass, w - door - 0.5, 4, d - 0.4, door, gh, 0.4, { cast: false });
  addBox(parent, M.steel, w - door + 1.5, 40, d, 0.8, 10, 1.2);
}

// Sectional overhead garage door, seen from inside: horizontal panels in the opening,
// drawn by the wall's opening code; this adds the track and the opener on the ceiling.
export function garageOpener(parent, ctx, len, y) {
  const M = ctx.M;
  addBox(parent, M.steel, -1, y - 2, 0, 2, 2, len);
  addBox(parent, ctx.color('#e9e9e6'), -7, y - 9, len - 16, 14, 7, 16);
}
