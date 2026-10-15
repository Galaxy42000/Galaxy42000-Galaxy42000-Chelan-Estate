import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { addBox, panelRects, freeIntervals, vaultHeight, vaultCeiling, vaultEnd } from './geometry.js';
import { createMaterials, sidingTexture, metalRoofTexture, concreteTexture, tileTexture, speckleTexture, grainTexture } from './materials.js';
import * as F from './fixtures.js';
import * as HF from './houseFixtures.js';
import { buildRoom, placeFootprint } from './roomBuilder.js';
import { buildDecks, buildStairs } from './deckBuilder.js';
import { buildPlumbing } from './plumbingBuilder.js';
import { buildWiring } from './wiringBuilder.js';
import { buildRoof, insidePoly } from './roofBuilder.js';
import { framingMaterial, wallFraming, roofFraming, gableFraming } from './framingBuilder.js';
import { fmtIn, fmtFt, fmtFtIn } from './units.js';
import { trueDir, capDir } from './compass.js';
import { terrainFn } from './terrain.js';

// Builds the whole building from a house config (see rooms/house.js): straight wall
// segments with doors and windows, floors, ceilings, room labels, plan dimensions and
// fixtures. Rooms modeled in detail (the kitchen) are built with buildRoom and dropped
// in without their own walls, floor and ceiling.
//
// Ceilings can slope (`ceilings` with a `plane`): every wall then runs up to the ceiling
// above it, and exterior walls carry their siding on up to the roof's soffit. Floors can
// sit at different levels (`level`, e.g. a garage slab below the house floor), walls can
// start below the floor (`base`), and the ground can slope (`terrain`).
//
// With `focus` set to a room name, the same model is built but cut down to that one
// room: `clip` is the box (inches) the viewer clips everything to, and the cut-away
// walls are the ones around the room.

// A wall's local frame depends on which side its room ("inside") is on. Local x runs
// along the wall, local z = 0 is the inside face and the wall body is z ∈ [-t, 0].
const SIDES = {
  south: { rot: 0, origin: (w) => [w.x0, w.z1], along: 'x', flip: false, normal: [0, 1], leftEnd: 'west' },
  north: { rot: Math.PI, origin: (w) => [w.x1, w.z0], along: 'x', flip: true, normal: [0, -1], leftEnd: 'east' },
  west: { rot: -Math.PI / 2, origin: (w) => [w.x0, w.z0], along: 'z', flip: false, normal: [-1, 0], leftEnd: 'north' },
  east: { rot: Math.PI / 2, origin: (w) => [w.x1, w.z1], along: 'z', flip: true, normal: [1, 0], leftEnd: 'south' },
};
const insideFace = (w) => ({ south: w.z1, north: w.z0, west: w.x0, east: w.x1 })[w.inside];

const CORNER_ROT = { 'north-west': 0, 'north-east': -Math.PI / 2, 'south-east': Math.PI, 'south-west': Math.PI / 2 };

// height of a sloped ceiling plane at a plan point
const planeY = (p) => (x, z) => p.at[2] + p.slope[0] * (x - p.at[0]) + p.slope[1] * (z - p.at[1]);

export function buildHouse(cfg, focus) {
  const H = cfg.height;
  const M = createMaterials(cfg.palette);
  const P = cfg.palette;
  const std = (color, roughness = 0.6, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const glulamMap = grainTexture(P.glulam || '#c9955c');
  glulamMap.rotation = Math.PI / 2;
  Object.assign(M, {
    porcelain: std('#fbfbf8', 0.18),
    porcelainSeat: std('#f4f4f1', 0.3),
    porcelainShade: std('#e3e4e2', 0.25),
    appliance: std('#f3f3f1', 0.35),
    mirror: std('#dfe6ea', 0.04, 1),
    beam: std('#3a302b', 0.6, 0.5),
    door: std(P.doors || P.trim, 0.45),
    // 12×24 porcelain, staggered; wall tile: 12×24 white, laid horizontally
    tileFloor: std('#ffffff', 0.4, 0, { map: tileTexture(P.tileFloor || '#a7a8a6', '#8b8c8a', 24, 12) }),
    wallTile: std('#ffffff', 0.15, 0, { map: tileTexture(P.wallTile || '#f3f3f1', '#d9d9d6', 24, 12) }),
    wallTileShade: std('#dcdcd8', 0.3),
    ledStrip: std('#ffffff', 0.4, 0, { emissive: '#f4f8ff', emissiveIntensity: 1.6 }),
    flame: std('#ff8a2a', 0.6, 0, { emissive: '#ff7a1a', emissiveIntensity: 2.2 }),
    ground: std(P.ground || '#d3d8cf', 0.95),
    concrete: std('#ffffff', 0.9, 0, { map: concreteTexture(P.concrete || '#a9a7a1') }),
    slab: std('#ffffff', 0.7, 0, { map: concreteTexture(P.slab || '#b9b6ae') }),
    siding: std('#ffffff', 0.6, 0, { map: sidingTexture(P.siding || '#78838f', P.sidingModule || 8) }),
    sidingBoth: std(P.siding || '#78838f', 0.6, 0, { side: THREE.DoubleSide }),
    exteriorTrim: std(P.exteriorTrim || '#f4f2ea', 0.5),
    windowFrame: std(P.windowFrame || '#1f1d1c', 0.45),
    roofing: std('#ffffff', 0.45, 0.55, { side: THREE.DoubleSide, map: metalRoofTexture(P.roofing || '#3b3e42') }),
    soffit: std(P.soffit || '#f2f0e8', 0.7),
    fascia: std(P.fascia || '#f4f2ea', 0.5, 0, { side: THREE.DoubleSide }),
    flue: std('#9ea3a8', 0.35, 0.8),
    wood: std('#b48a5a', 0.8),
    glulam: std('#ffffff', 0.55, 0, { map: glulamMap }),
    railing: std(P.railing || '#232527', 0.45, 0.5),
    obscureGlass: std('#e9eef0', 0.35, 0, { transparent: true, opacity: 0.7 }),
    garageDoor: std(P.garageDoor || P.siding || '#78838f', 0.5),
    dimension: new THREE.MeshBasicMaterial({ color: '#3d4b5c' }),
  });
  const floorMats = { wood: M.floor, tile: M.tileFloor, concrete: M.slab };
  const colors = {};
  const ctx = {
    M, style: cfg.style?.doorStyle || 'shaker', handle: cfg.style?.handle || 'bar', room: { height: H },
    windowTrim: cfg.style?.windowTrim, windowSill: cfg.style?.windowSill,
    color: (c, metal) => (colors[c + metal] ??= std(c, metal ? 0.35 : 0.5, metal ? 0.7 : 0)),
    lightEvery: cfg.lightEvery,
  };

  const root = new THREE.Group();
  root.name = cfg.id;
  const walls = [];
  const wallGroups = new Map();
  const labels = [];
  const tag = (obj, info) => ((obj.userData.info = info), obj);
  // an element's own materials, else the config's default for that kind of surface
  const mats = (own, surface) => own ?? cfg.surfaces?.[surface];
  const label = (parent, html, x, y, z, cls = '') => {
    const el = document.createElement('div');
    el.className = `dim-label ${cls}`;
    el.innerHTML = html;
    const o = new CSS2DObject(el);
    o.position.set(x, y, z);
    parent.add(o);
    labels.push(o);
    return o;
  };

  const xs = cfg.footprint.flatMap((r) => [r[0], r[2]]), zs = cfg.footprint.flatMap((r) => [r[1], r[3]]);
  const bbox = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };

  // ---------- ground ----------
  // ground level relative to the floor inside: a number, or `terrain` (see js/terrain.js)
  const grade = cfg.grade ?? 0;
  const natural = cfg.terrain ? terrainFn(cfg.terrain) : () => grade;
  // under the building the ground drops below its floors (a garage slab can sit lower
  // than the ground just outside it)
  const groundAt = (x, z) => {
    let y = natural(x, z);
    for (const [x0, z0, x1, z1, lv = 0] of cfg.footprint) if (x > x0 + 3 && x < x1 - 3 && z > z0 + 3 && z < z1 - 3) y = Math.min(y, lv - 4);
    return y;
  };
  const gm = 360;
  const gw = bbox.x1 - bbox.x0 + 2 * gm, gd = bbox.z1 - bbox.z0 + 2 * gm;
  const gGeo = new THREE.PlaneGeometry(gw, gd, Math.ceil(gw / 24), Math.ceil(gd / 24)).rotateX(-Math.PI / 2);
  const gp = gGeo.attributes.position, gcx = (bbox.x0 + bbox.x1) / 2, gcz = (bbox.z0 + bbox.z1) / 2;
  for (let i = 0; i < gp.count; i++) gp.setY(i, groundAt(gp.getX(i) + gcx, gp.getZ(i) + gcz) - 0.6);
  gGeo.computeVertexNormals();
  const ground = new THREE.Mesh(gGeo, M.ground);
  ground.position.set(gcx, 0, gcz);
  ground.receiveShadow = true;
  root.add(ground);

  // ---------- ceilings ----------
  // flat at H by default; `ceilings` entries with a `plane` slope ({ at: [x, z, y], slope:
  // [rise per inch along x, along z] }) over their box; with `height`, a lower flat one
  const planes = (cfg.ceilings || []).filter((c) => c.plane).map((c) => ({ ...c, y: planeY(c.plane) }));
  const vaults = cfg.vaults || [];
  const ceilingAt = (x, z) => {
    for (const c of planes) if (x >= c.x0 - 0.01 && x <= c.x1 + 0.01 && z >= c.z0 - 0.01 && z <= c.z1 + 0.01) return c.y(x, z);
    for (const c of cfg.ceilings || []) if (c.height !== undefined && x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1) return c.height;
    const v = vaults.find((a) => x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1);
    return v ? vaultHeight(v, H, x) : H;
  };
  const levelAt = (x, z) => {
    for (const r of cfg.rooms || []) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r.level ?? 0;
    return 0;
  };

  const ceiling = new THREE.Group();
  root.add(ceiling);
  tag(ceiling, { id: 'Ceiling', type: 'Ceiling', materials: mats(undefined, 'ceiling') });
  for (const [x0, z0, x1, z1, level = 0] of cfg.footprint) {
    // subfloor/slab a hair below the room floors so it only shows under walls and doorways
    tag(addBox(root, level < 0 ? M.slab : M.floor, x0, level - 1.05, z0, x1 - x0, 1, z1 - z0, { cast: false }), { id: 'Floor', type: 'Floor', materials: mats(undefined, 'floor') });
    // flat ceiling wherever no sloped, lowered or vaulted ceiling is
    let flat = [{ x: x0, y: z0, w: x1 - x0, h: z1 - z0 }];
    for (const v of [...vaults, ...(cfg.ceilings || [])]) flat = carve(flat, { x: v.x0, y: v.z0, w: v.x1 - v.x0, h: v.z1 - v.z0 });
    for (const r of flat) addBox(ceiling, M.ceiling, r.x, H, r.y, r.w, 1, r.h, { cast: false });
  }
  const ceilingBoth = Object.assign(M.ceiling.clone(), { side: THREE.DoubleSide });
  for (const c of cfg.ceilings || []) {
    if (c.plane) {
      const y = planeY(c.plane);
      const cg = new THREE.Group();
      const pos = [];
      for (const [x, z] of [[c.x0, c.z0], [c.x1, c.z0], [c.x1, c.z1], [c.x0, c.z0], [c.x1, c.z1], [c.x0, c.z1]]) pos.push(x, y(x, z), z);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, ceilingBoth);
      m.receiveShadow = true;
      cg.add(m);
      ceiling.add(cg);
      // heights at the inside faces of the walls (the box runs out to their outside faces)
      const e = c.inset ?? 6, cs = [[c.x0 + e, c.z0 + e], [c.x1 - e, c.z0 + e], [c.x0 + e, c.z1 - e], [c.x1 - e, c.z1 - e]].map(([x, z]) => y(x, z));
      const lo = Math.min(...cs), hi = Math.max(...cs);
      tag(cg, { id: c.id || 'Ceiling', type: 'Sloped ceiling (follows the roof)', height: hi, materials: mats(c.materials, 'ceiling'), notes: `Slopes from ${fmtFtIn(lo)} to ${fmtFtIn(hi)} above the floor.${c.notes ? ' ' + c.notes : ''}` });
    } else if (c.height !== undefined) {
      tag(addBox(ceiling, M.ceiling, c.x0, c.height, c.z0, c.x1 - c.x0, 1, c.z1 - c.z0, { cast: false }), { id: c.id || 'Ceiling', type: 'Ceiling', height: c.height, materials: mats(c.materials, 'ceiling'), notes: c.notes });
    }
  }
  for (const v of vaults) {
    const vg = new THREE.Group();
    ceiling.add(vg);
    vaultCeiling(vg, M.ceiling, v, H, v.z0, v.z1 - v.z0);
    for (const e of v.ends || []) vg.add(vaultEnd(M.wall, v, H, e.base, e.z, e.t));
    tag(vg, { id: v.id, type: v.type || 'Vaulted ceiling', width: v.x1 - v.x0, height: v.peak, materials: mats(v.materials, 'ceiling'), notes: v.notes });
  }

  // ---------- rooms (floors and labels) ----------
  for (const r of cfg.rooms || []) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0, lv = r.level ?? 0, kind = r.floor || 'wood';
    const f = addBox(root, floorMats[kind] || M.floor, r.x0, lv - (kind === 'tile' ? 0.75 : 1), r.z0, w, 1, d, { cast: false });
    const hc = [ceilingAt(r.x0 + 1, r.z0 + 1), ceilingAt(r.x1 - 1, r.z1 - 1)].map((y) => y - lv);
    const ceil = Math.abs(hc[0] - hc[1]) < 1 ? `Ceiling ${fmtFtIn(hc[0])}.` : `Ceiling slopes from ${fmtFtIn(Math.min(...hc))} to ${fmtFtIn(Math.max(...hc))}.`;
    tag(f, { id: r.name, type: 'Room', width: w, depth: d, materials: mats(r.materials, { wood: 'floor', tile: 'tileFloor', concrete: 'slab' }[kind]), notes: `${fmtFt(w)} ${trueDir('east–west')} × ${fmtFt(d)} ${trueDir('north–south')}, wall to wall. ${ceil}${lv ? ` Floor ${fmtIn(-lv)} below the house floor.` : ''}${r.notes ? ' ' + r.notes : ''}` });
    if (r.label !== false) label(root, `<b>${r.name}</b><br>${fmtFt(w)} × ${fmtFt(d)}`, r.lx ?? (r.x0 + r.x1) / 2, lv + 2, r.lz ?? (r.z0 + r.z1) / 2, 'room').userData.owner = f;
  }

  // ---------- rooms built in detail (kitchen) ----------
  const imported = [];
  for (const inc of cfg.include || []) {
    const rc = inc.config;
    const sub = buildRoom(rc, { ceilingAt: (x, z) => ceilingAt(inc.x + x, inc.z + z) });
    for (const w of sub.walls) w.group.removeFromParent();
    sub.root.getObjectByName('floor')?.removeFromParent();
    sub.ceiling.getObjectByName('ceiling')?.removeFromParent();
    sub.root.position.set(inc.x, 0, inc.z);
    root.add(sub.root);
    // keep the room's ceiling lights, hung from the house ceiling
    sub.ceiling.removeFromParent();
    sub.ceiling.position.set(inc.x, 0, inc.z);
    ceiling.add(sub.ceiling);
    if (inc.labels === false) sub.labels.forEach((l) => l.removeFromParent());
    else labels.push(...sub.labels);

    // the room's windows/doors move onto the house wall they sit in
    const { width: W, depth: D } = rc.room;
    for (const o of rc.openings || []) {
      const s = {
        north: { inside: 'south', face: inc.z, a: inc.x + o.start },
        east: { inside: 'west', face: inc.x + W, a: inc.z + o.start },
        south: { inside: 'north', face: inc.z + D, a: inc.x + W - o.start - o.width },
        west: { inside: 'east', face: inc.x, a: inc.z + D - o.start - o.width },
      }[o.wall];
      imported.push({ ...o, ...s, from: rc.name });
    }
  }

  // ---------- roof ----------
  const roof = cfg.roof ? buildRoof(cfg, M) : null;
  if (roof) {
    root.add(roof.group);
    tag(roof.group, { id: 'Roof', type: 'Roof', materials: mats(cfg.roof.materials, 'roof'), notes: cfg.roof.notes });
    for (const c of roof.group.children) if (c.userData.info) c.userData.info.materials ??= mats(undefined, 'siding');
  }

  // ---------- walls, doors, windows ----------
  // each wall's drywall/siding goes in its own `finish` group and its studs in a hidden
  // framing mesh, so the Framing checkbox can swap one for the other
  const FM = framingMaterial(), finish = [], framingLayers = [];
  for (const spec of cfg.walls) {
    const fr = SIDES[spec.inside];
    const L = fr.along === 'x' ? spec.x1 - spec.x0 : spec.z1 - spec.z0;
    const t = fr.along === 'x' ? spec.z1 - spec.z0 : spec.x1 - spec.x0;
    const min = fr.along === 'x' ? spec.x0 : spec.z0;
    const base = spec.base ?? 0;
    const g = new THREE.Group();
    const [ox, oz] = fr.origin(spec);
    g.position.set(ox, 0, oz);
    g.rotation.y = fr.rot;
    root.add(g);
    wallGroups.set(spec, g);
    const toWorld = (lx, lz) => [ox + lx * Math.cos(fr.rot) + lz * Math.sin(fr.rot), oz - lx * Math.sin(fr.rot) + lz * Math.cos(fr.rot)];
    const cl = (lx) => Math.min(L - 0.5, Math.max(0.5, lx));
    // the wall runs up to the ceiling over its inside face (or the higher of its two faces)
    const topAt = spec.top !== undefined ? () => spec.top
      : spec.exterior ? (lx) => ceilingAt(...toWorld(cl(lx), 0.5))
        : (lx) => Math.max(ceilingAt(...toWorld(cl(lx), 0.5)), ceilingAt(...toWorld(cl(lx), -t - 0.5)));
    let Hw = -Infinity, Hmin = Infinity;
    for (let lx = 0; lx <= L + 0.01; lx += Math.max(1, L / 40)) { Hw = Math.max(Hw, topAt(lx)); Hmin = Math.min(Hmin, topAt(lx)); }

    const own = (spec.openings || []).map((o) => ({ ...o }));
    for (const o of imported) {
      if (o.inside === spec.inside && Math.abs(o.face - insideFace(spec)) < 0.5 && o.a >= min - 0.01 && o.a + o.width <= min + L + 0.01) {
        own.push({ ...o, at: o.a - min, notes: o.notes });
        o.used = true;
      }
    }
    const ops = own.map((o) => ({
      bottom: base,
      height: o.type === 'window' ? 48 : 80,
      ...o,
      start: fr.flip ? L - o.at - o.width : o.at,
      hingeSide: o.hinge === fr.leftEnd ? 'left' : 'right',
    }));
    const rel = (yb) => ops.map((o) => ({ ...o, bottom: o.bottom - yb }));

    // steel beams running inside this wall are left exposed: cut the wall away around them
    let rects = panelRects(L, Hw - base, rel(base)).map((r) => ({ ...r, y: r.y + base }));
    const beamCuts = [];
    for (const b of cfg.beams || []) {
      const [bx0, bz0] = b.from, [bx1, bz1] = b.to;
      const [p0, p1, q0, q1] = fr.along === 'x' ? [bx0, bx1, bz0, bz1] : [bz0, bz1, bx0, bx1];
      const [w0, w1] = fr.along === 'x' ? [spec.z0, spec.z1] : [spec.x0, spec.x1];
      const y0 = b.bottom ?? H - b.depth;
      if (Math.abs(p1 - p0) < 0.01 && Math.max(q0, q1) > w0 && Math.min(q0, q1) < w1 && p0 > min && p0 < min + L) {
        const at = p0 - min - b.flange / 2;
        beamCuts.push({ a: fr.flip ? L - at - b.flange : at, b: (fr.flip ? L - at - b.flange : at) + b.flange, y0, y1: y0 + b.depth, along: false });
        continue;
      }
      if (Math.abs(q1 - q0) > 0.01 || q0 <= w0 || q0 >= w1) continue;
      const a = Math.max(Math.min(p0, p1), min), e = Math.min(Math.max(p0, p1), min + L);
      if (e <= a) continue;
      const at = a - min, w = e - a;
      rects = carve(rects, { x: fr.flip ? L - at - w : at, w, y: y0, h: b.depth });
      beamCuts.push({ a: fr.flip ? L - at - w : at, b: (fr.flip ? L - at - w : at) + w, y0, y1: y0 + b.depth, along: true });
    }
    const fin = new THREE.Group();
    g.add(fin);
    finish.push(fin);
    for (const pc of clipPieces(rects, topAt)) piece(fin, M.wall, pc, -t, t);

    // framing: studs from the wall's base up to its top
    const studs = wallFraming(FM, L, t, Hmin - base, rel(base), (lx) => topAt(lx) - base, beamCuts);
    studs.position.y = base;
    const sg = new THREE.Group();
    sg.add(studs);
    sg.visible = false;
    g.add(sg);
    framingLayers.push(sg);
    tag(sg, { id: `${spec.id} (framing)`, type: 'Wall framing', depth: t, materials: [t >= 5.5 ? 'studs2x6' : 'studs2x4'],
      notes: `${t >= 5.5 ? '2×6' : '2×4'} studs 16″ on centre on a bottom plate and a double top plate (raked where the ceiling slopes), with king and jack studs, headers and sills around the openings. ⚠ Stud layout drawn to standard spacing.` });

    if (spec.exterior) {
      // siding on the outside face, from its bottom up to the roof's soffit
      const sb = spec.sidingBottom ?? cfg.sidingBottom ?? base;
      const skinTop = (lx) => {
        const [wx, wz] = toWorld(cl(lx), -t - 0.6);
        return roof?.heightAt(wx, wz) ?? topAt(lx);
      };
      let sh = -Infinity;
      for (let lx = 0; lx <= L + 0.01; lx += Math.max(1, L / 40)) sh = Math.max(sh, skinTop(lx));
      const skin = new THREE.Group();
      const srects = panelRects(L, sh - sb, rel(sb)).map((r) => ({ ...r, y: r.y + sb }));
      for (const pc of clipPieces(srects, skinTop)) piece(skin, M.siding, pc, -t - 0.6, 0.6, true);
      tag(skin, { id: `${spec.id} (outside)`, type: 'Siding', materials: mats(spec.outsideMaterials, 'siding') });
      fin.add(skin);
    }
    tag(g, { id: spec.id, type: spec.exterior ? 'Exterior wall' : 'Interior wall', width: L, height: Hw - base, depth: t, materials: mats(spec.materials, spec.exterior ? 'exteriorWalls' : 'walls'), notes: spec.notes });

    const endA = fr.along === 'x' ? 'west' : 'north';
    for (const o of ops) {
      const og = new THREE.Group();
      g.add(og);
      if (o.door !== 'overhead') F.opening(og, ctx, o, t);
      if (!spec.exterior && o.type !== 'opening' && o.casing !== false) backCasing(og, M, o, t);
      if (o.type === 'door') doorLeaf(og, ctx, o, t);
      if (spec.exterior && o.type !== 'opening') exteriorTrim(og, M, o, t);
      const kind = o.type === 'window' ? 'Window' : o.type === 'opening' ? 'Cased opening' : { swing: 'Hinged door', pocket: 'Pocket door', bypass: 'Bypass (sliding) doors', slider: 'Sliding glass door', bifold: 'Bifold doors', overhead: 'Overhead garage door' }[o.door] || 'Doorway';
      tag(og, {
        id: o.id, type: o.kind || kind, wall: spec.id, width: o.width, height: o.height, bottom: o.bottom || undefined,
        materials: mats(o.materials, { window: 'windows', door: 'doors' }[o.type]),
        notes: `Starts ${fmtIn(o.at)} from the ${trueDir(endA)} end of the wall.${o.from ? ` (From the ${o.from} plan.)` : ''}${o.notes ? ' ' + o.notes : ''}`,
      });
      label(og, `${o.id} · ${fmtIn(o.width)}`, o.start + o.width / 2, o.bottom + o.height / 2, 1);
    }

    // baseboards on finished faces, broken at doorways
    if (cfg.style?.baseboard !== false && spec.baseboard !== false) {
      const doors = ops.filter((o) => o.bottom <= base + 0.5).map((o) => [o.start, o.start + o.width]);
      for (const [a, b] of freeIntervals(L, doors)) {
        if (spec.baseboard !== 'outside') addBox(fin, M.trim, a, base, 0, b - a, 4.5, 0.6, { cast: false });
        if (!spec.exterior && spec.baseboard !== 'inside') addBox(fin, M.trim, a, spec.backBase ?? base, -t - 0.6, b - a, 4.5, 0.6, { cast: false });
      }
    }

    if (spec.exterior) {
      const [nx, nz] = fr.normal;
      const center = new THREE.Vector3((spec.x0 + spec.x1) / 2, H / 2, (spec.z0 + spec.z1) / 2);
      center.x += (nx * t) / 2;
      center.z += (nz * t) / 2;
      walls.push({ name: spec.id, group: g, center, normal: new THREE.Vector3(nx, 0, nz) });
    }
  }
  for (const o of imported) if (!o.used) console.warn(`No house wall found for ${o.from} opening ${o.id}`);

  // ---------- foundation: concrete stem walls around the footprint ----------
  const fdn = cfg.foundation;
  if (fdn) {
    const fg = new THREE.Group();
    root.add(fg);
    for (const f of fdn.walls) {
      const [x0, z0, x1, z1] = f.box, top = f.top ?? -1;
      // down to below the lowest ground along it
      let low = Infinity;
      for (let k = 0; k <= 20; k++) low = Math.min(low, groundAt(x0 + ((x1 - x0) * k) / 20, z0 + ((z1 - z0) * k) / 20));
      addBox(fg, M.concrete, x0, low - 6, z0, x1 - x0, top - low + 6, z1 - z0);
    }
    tag(fg, { id: 'Foundation', type: 'Concrete stem wall', materials: fdn.materials, notes: fdn.notes });
  }

  // ---------- exposed glulam roof beams ----------
  if (roof) {
    const bg = new THREE.Group();
    ceiling.add(bg);
    for (const b of cfg.roof.framing?.beams || []) {
      if (!b.exposed) continue;
      const pl = roof.planes.find((p) => p.id === b.plane);
      const [ax, az] = b.exposed.from ?? b.from, [bx, bz] = b.exposed.to ?? b.to;
      const cover = cfg.roof.framing.cover ?? 1;
      const ya = pl.top(ax, az) - cover, yb = pl.top(bx, bz) - cover;
      const len = Math.hypot(bx - ax, bz - az, yb - ya);
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.width, b.depth, len), M.glulam);
      m.position.set((ax + bx) / 2, (ya + yb) / 2 - b.depth / 2, (az + bz) / 2);
      m.lookAt(new THREE.Vector3(bx, yb - b.depth / 2, bz).applyMatrix4(new THREE.Matrix4()));
      m.castShadow = m.receiveShadow = true;
      const one = new THREE.Group();
      one.add(m);
      bg.add(one);
      tag(one, { id: b.id, type: b.type || 'Glulam beam (exposed)', length: len, width: b.width, height: b.depth, materials: b.materials, notes: b.notes });
      label(one, `${b.id} · ${fmtIn(b.width)} × ${fmtIn(b.depth)}`, (ax + bx) / 2, (ya + yb) / 2 - b.depth - 3, (az + bz) / 2);
    }
  }

  // ---------- ceiling lights and wall lights ----------
  for (const l of cfg.lights || []) {
    const [x, z] = l.at;
    const lg = new THREE.Group();
    root.add(lg);
    if (l.kind === 'sconce') {
      // outside wall light: a small box with a glowing lens, on the wall facing `face`
      const n = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[l.face];
      const y = l.y ?? 78;
      const box = new THREE.Mesh(new THREE.BoxGeometry(n[0] ? 4 : 5, 9, n[0] ? 5 : 4), M.railing);
      box.position.set(x + n[0] * 2, y, z + n[1] * 2);
      const lens = new THREE.Mesh(new THREE.BoxGeometry(n[0] ? 0.3 : 3.6, 1, n[0] ? 3.6 : 0.3), M.canLens);
      lens.position.set(x + n[0] * 2, y - 4.6, z + n[1] * 2);
      lens.rotation.x = n[0] ? 0 : Math.PI / 2;
      lg.add(box, lens);
      tag(lg, { id: l.id, type: 'Wall light (outside)', bottom: y - 4.5, notes: l.notes });
      continue;
    }
    const cy = ceilingAt(x, z);
    const sx = (ceilingAt(x + 1, z) - ceilingAt(x - 1, z)) / 2, sz = (ceilingAt(x, z + 1) - ceilingAt(x, z - 1)) / 2;
    if (l.kind === 'pendant') {
      F.pendant(lg, ctx, x, l.bottom ?? 66, z, cy);
      tag(lg, { id: l.id, type: 'Pendant light', bottom: l.bottom ?? 66, notes: l.notes });
    } else if (l.kind === 'surface') {
      // flush-mount fixture
      const disc = new THREE.Group();
      disc.position.set(x, cy, z);
      disc.rotation.set(-Math.atan(sz), 0, Math.atan(sx));
      disc.add(new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 2.5, 28), M.canLens).translateY(-1.25));
      disc.add(new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.6, 0.6, 28), M.trim).translateY(-0.3));
      lg.add(disc);
      if (l.glow !== false) {
        const pl = new THREE.PointLight('#fff4e2', 2, 0, 2);
        pl.position.set(x, cy - 6, z);
        lg.add(pl);
      }
      tag(lg, { id: l.id, type: 'Surface-mount ceiling light', notes: l.notes });
    } else {
      F.recessedLight(lg, ctx, x, z, cy, Math.atan(sx), Math.atan(sz));
      tag(lg, { id: l.id, type: l.type || '6″ recessed can light', notes: l.notes });
    }
  }

  // ---------- fixtures ----------
  for (const it of cfg.fixtures || []) {
    let g;
    const lv = it.level ?? levelAt(it.x + 1, it.z + 1);
    if (it.kind === 'cornerShower') {
      g = new THREE.Group();
      g.position.set(it.x, 0, it.z);
      g.rotation.y = CORNER_ROT[it.corner] ?? 0;
      HF.cornerShower(g, ctx, it.size, it);
    } else if (it.kind === 'tank') {
      g = new THREE.Group();
      g.position.set(it.x, 0, it.z);
      HF.tank(g, ctx, it.width, it.height, it);
    } else if (it.kind === 'box') {
      // world-aligned: width runs east–west, depth north–south
      g = new THREE.Group();
      g.position.set(it.x, 0, it.z);
      HF.box(g, ctx, it.width, it.height, it.depth, it.bottom ?? 0, it);
    } else if (it.kind === 'roundTable') {
      g = new THREE.Group();
      g.position.set(it.x, 0, it.z);
      HF.roundTable(g, ctx, it.width, it.height, it);
    } else {
      g = placeFootprint(it.x, it.z, it.width, it.depth, it.facing || 'south');
      const fn = {
        toilet: () => HF.toilet(g, ctx, it.width, it.depth),
        vanity: () => HF.vanity(g, ctx, it.width, it.depth, it),
        laundry: () => HF.laundry(g, ctx, it.width, it.depth, it.height, it.unit),
        cabinet: () => F.tallCabinet(g, ctx, it.width, it.height, it.depth, 4, { fronts: 'doors', ...it }),
        base: () => { F.baseCabinet(g, ctx, it.width, { depth: it.depth - 1, height: 34.5, toeKick: 4 }, it.fronts || 'doors', it); addBox(g, M.counter, 0, 34.5, 0, it.width, 1.5, it.depth); },
        bed: () => HF.bed(g, ctx, it.width, it.depth, it),
        nightstand: () => HF.nightstand(g, ctx, it.width, it.depth, it.height, it),
        sofa: () => HF.sofa(g, ctx, it.width, it.depth, it),
        armchair: () => HF.armchair(g, ctx, it.width, it.depth, it),
        murphyBed: () => HF.murphyBed(g, ctx, it.width, it.depth, it.height, it),
        fireplace: () => HF.fireplace(g, ctx, it.width, it.depth, it.height, it),
        alcoveShower: () => HF.alcoveShower(g, ctx, it.width, it.depth, it),
        bench: () => { addBox(g, ctx.color(it.color || '#a77c52'), 0, 16, 0, it.width, 2, it.depth); addBox(g, ctx.color('#7a5a3e'), 0, 0, 0, it.width, 16, it.depth - 2); },
      }[it.kind];
      if (fn) fn();
    }
    g.position.y += lv;
    root.add(g);
    const size = it.kind === 'cornerShower' ? { width: it.size, depth: it.size } : { width: it.width, depth: it.depth, height: it.height };
    tag(g, { id: it.id, type: it.type, code: it.code, ...size, bottom: it.bottom || undefined, materials: it.materials, notes: it.notes });
    if (it.label !== false) {
      g.updateMatrixWorld(true);
      const c = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
      label(root, it.id, c.x, lv + (it.kind === 'cornerShower' ? 40 : (it.bottom ?? 0) + (it.height ?? 30) + 3), c.z).userData.owner = g;
    }
  }

  // ---------- structural steel ----------
  for (const b of cfg.beams || []) {
    const [x0, z0] = b.from, [x1, z1] = b.to;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const g = new THREE.Group();
    const bottom = b.bottom ?? H - b.depth;
    g.position.set(x0, bottom, z0);
    g.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    HF.steelBeam(g, ctx, len, b.depth, b.flange);
    root.add(g);
    tag(g, { id: b.id, type: b.type || 'Steel beam', length: len, width: b.flange, height: b.depth, bottom, materials: mats(b.materials, 'steel'), notes: b.notes });
    label(g, `${b.id} · ${fmtIn(b.flange)} × ${fmtIn(b.depth)}`, len / 2, -3, 0);
  }

  // ---------- plan dimensions (drawn on the ground) ----------
  for (const dm of cfg.dimensions || []) {
    const [x0, z0] = dm.from, [x1, z1] = dm.to;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const g = new THREE.Group();
    const y = Math.max(groundAt(x0, z0), groundAt(x1, z1), groundAt((x0 + x1) / 2, (z0 + z1) / 2)) + 0.5;
    g.position.set(x0, dm.y ?? y, z0);
    g.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    root.add(g);
    addBox(g, M.dimension, 0, -0.4, -0.4, len, 0.3, 0.8, { cast: false, receive: false });
    for (const e of [0, len]) {
      const tick = addBox(g, M.dimension, -0.4, -0.4, -6, 0.8, 0.3, 12, { cast: false, receive: false });
      tick.position.x = e;
      tick.rotation.y = Math.PI / 4;
    }
    tag(g, { id: dm.text, type: 'Plan dimension', width: len, notes: dm.notes });
    label(g, dm.text, len / 2, 1, 0, `dimension${dm.estimate ? ' estimate' : ''}`);
  }

  // ---------- decks and stairs (framing is a separate line drawing the viewer can toggle) ----------
  const deckFraming = buildDecks(root, ctx, cfg.decks, tag, label, groundAt);
  if (cfg.stairs?.length) buildStairs(root, ctx, cfg.stairs, tag, groundAt);
  const plumbing = buildPlumbing(root, cfg.plumbing, tag);
  const wiring = buildWiring(root, cfg.wiring, tag);
  if (deckFraming) framingLayers.push(deckFraming);
  if (roof) {
    const rf = roofFraming(cfg, FM);
    const rg = new THREE.Group();
    rg.add(rf);
    rg.visible = false;
    root.add(rg);
    framingLayers.push(rg);
    tag(rg, { id: 'Roof framing', type: 'Glulam beams and TJI joists', materials: cfg.roof.framing?.materials, notes: cfg.roof.framing?.notes });
  }
  const framing = { layers: framingLayers, finish };

  if (focus) {
    if (roof) roof.group.visible = false; // single-room views have no roof
    return { ...focusRoom(cfg, focus, { root, ceiling, labels, wallGroups, label, H, ceilingAt }), plumbing, wiring, framing, levelAt };
  }
  const roofInfo = roof && { group: roof.group, top: roof.top + 6, footprint: cfg.footprint };
  // the highest ceiling: the viewer hides the ceilings only once the camera is above it
  const Hmax = Math.max(H, ...planes.flatMap((c) => [c.y(c.x0, c.z0), c.y(c.x1, c.z0), c.y(c.x0, c.z1), c.y(c.x1, c.z1)]));
  return { root, walls, ceiling, labels, framing, plumbing, wiring, ground, levelAt, groundAt, roof: roofInfo, views: cfg.views, bounds: { W: bbox.x1 - bbox.x0, D: bbox.z1 - bbox.z0, H: Hmax, floor: bbox } };
}

// Cut the model down to one room (plus any rooms listed in its `with`): the clip box reaches through the walls around it
// (but not past them), and those walls become the ones that cut away.
function focusRoom(cfg, name, { root, ceiling, labels, wallGroups, label, H, ceilingAt }) {
  const find = (n) => {
    const rm = cfg.rooms.find((x) => x.name === n);
    if (!rm) throw new Error(`No room named "${n}" in the house plan`);
    return rm;
  };
  // a room open to another (no wall between them) can show both: with: ['Other room']
  const own = find(name), all = [own, ...(own.with || []).map(find)];
  const r = { x0: Math.min(...all.map((a) => a.x0)), x1: Math.max(...all.map((a) => a.x1)), z0: Math.min(...all.map((a) => a.z0)), z1: Math.max(...all.map((a) => a.z1)), views: own.views };
  const overlaps = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) > 1;
  const sides = {
    north: { inward: [0, 1], edge: [r.x0, r.z0, r.x1, r.z0], find: (w) => Math.abs(w.z1 - r.z0) < 0.6 && overlaps(w.x0, w.x1, r.x0, r.x1), t: (w) => w.z1 - w.z0 },
    south: { inward: [0, -1], edge: [r.x0, r.z1, r.x1, r.z1], find: (w) => Math.abs(w.z0 - r.z1) < 0.6 && overlaps(w.x0, w.x1, r.x0, r.x1), t: (w) => w.z1 - w.z0 },
    west: { inward: [1, 0], edge: [r.x0, r.z0, r.x0, r.z1], find: (w) => Math.abs(w.x1 - r.x0) < 0.6 && overlaps(w.z0, w.z1, r.z0, r.z1), t: (w) => w.x1 - w.x0 },
    east: { inward: [-1, 0], edge: [r.x1, r.z0, r.x1, r.z1], find: (w) => Math.abs(w.x0 - r.x1) < 0.6 && overlaps(w.z0, w.z1, r.z0, r.z1), t: (w) => w.x1 - w.x0 },
  };
  const margin = {};
  const walls = [];
  const lv = own.level ?? 0;
  for (const [side, s] of Object.entries(sides)) {
    const found = cfg.walls.filter(s.find);
    // stop just inside the wall's far face so nothing from the next room shows; open sides are cut at the room edge
    margin[side] = found.length ? Math.max(...found.map(s.t)) - 0.05 : 0;
    const [x0, z0, x1, z1] = s.edge;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const cy = ceilingAt((x0 + x1) / 2 + s.inward[0] * 2, (z0 + z1) / 2 + s.inward[1] * 2);
    const center = new THREE.Vector3((x0 + x1) / 2, (lv + cy) / 2, (z0 + z1) / 2);
    for (const w of found) walls.push({ name: w.id, group: wallGroups.get(w), center, normal: new THREE.Vector3(s.inward[0], 0, s.inward[1]) });
    if (found.length) label(root, `${capDir(side)} wall · ${fmtFtIn(len)}`, center.x + s.inward[0] * 2, cy - 6, center.z + s.inward[1] * 2, 'wall').userData.owner = wallGroups.get(found[0]);
    else label(root, `Open to ${trueDir(side)} · ${fmtFtIn(len)}`, center.x, lv + 2, center.z, 'wall');
  }
  const clip = { x0: r.x0 - margin.west, x1: r.x1 + margin.east, z0: r.z0 - margin.north, z1: r.z1 + margin.south };
  const Hr = Math.max(ceilingAt(r.x0 + 1, r.z0 + 1), ceilingAt(r.x1 - 1, r.z1 - 1), ceilingAt(r.x0 + 1, r.z1 - 1), ceilingAt(r.x1 - 1, r.z0 + 1));
  // by default a room's eye view looks from its south-west corner to the far corner, and a room can set its own
  return { root, walls, ceiling, labels, clip, views: { eye: { pos: [r.x0 + 10, lv + 64, r.z1 - 10], target: [r.x1, lv + 44, r.z0] }, ...r.views }, bounds: { W: r.x1 - r.x0, D: r.z1 - r.z0, H: Hr, floor: clip } };
}

// Wall pieces: each rectangle {x, y, w, h} (wall-local, absolute heights) trimmed at the
// top to topAt(x), so walls follow sloped ceilings and siding runs up to the soffit. A
// rectangle that fits under the top stays a box; one that doesn't becomes a polygon whose
// top follows topAt (sampled every 24″ and wherever it bends).
function clipPieces(rects, topAt) {
  const out = [];
  for (const r of rects) {
    const xs = [r.x];
    for (let x = Math.ceil(r.x / 24) * 24; x < r.x + r.w - 0.01; x += 24) if (x > r.x + 0.01) xs.push(x);
    xs.push(r.x + r.w);
    const y1 = r.y + r.h, tops = xs.map((x) => Math.min(y1, topAt(x)));
    if (tops.every((t) => t >= y1 - 0.01)) { out.push({ a: r.x, b: r.x + r.w, y0: r.y, ta: y1, flat: true }); continue; }
    // runs of samples where the top is above the bottom
    let run = [];
    const flush = () => {
      if (run.length >= 2) out.push({ poly: [[run[0][0], r.y], [run[run.length - 1][0], r.y], ...run.reverse()] });
      run = [];
    };
    xs.forEach((x, i) => {
      if (tops[i] > r.y + 0.05) run.push([x, tops[i]]);
      else flush();
    });
    flush();
  }
  return out;
}

// One wall piece as a box (flat top) or a prism with a sloped top, `d` thick from z.
// UVs follow the wall (u = x, v = y), so siding battens line up across pieces.
function piece(parent, mat, pc, z, d, uvWall = false) {
  if (pc.flat) {
    const m = addBox(parent, mat, pc.a, pc.y0, z, pc.b - pc.a, pc.ta - pc.y0, d, { cast: false });
    if (uvWall) {
      const pos = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) + (pc.a + pc.b) / 2, pos.getY(i) + (pc.y0 + pc.ta) / 2);
    }
    return m;
  }
  const sh = new THREE.Shape(pc.poly.map(([x, y]) => new THREE.Vector2(x, y)));
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }), mat);
  m.position.z = z;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Remove rectangle c from a list of rectangles {x, y, w, h} (wall x/y, or plan x/z).
function carve(rects, c) {
  const out = [];
  for (const r of rects) {
    const x0 = Math.max(r.x, c.x), x1 = Math.min(r.x + r.w, c.x + c.w);
    const y0 = Math.max(r.y, c.y), y1 = Math.min(r.y + r.h, c.y + c.h);
    if (x1 <= x0 || y1 <= y0) { out.push(r); continue; }
    if (x0 > r.x) out.push({ x: r.x, y: r.y, w: x0 - r.x, h: r.h });
    if (x1 < r.x + r.w) out.push({ x: x1, y: r.y, w: r.x + r.w - x1, h: r.h });
    if (y0 > r.y) out.push({ x: x0, y: r.y, w: x1 - x0, h: y0 - r.y });
    if (y1 < r.y + r.h) out.push({ x: x0, y: y1, w: x1 - x0, h: r.y + r.h - y1 });
  }
  return out;
}

// Outside of a window or door in an exterior wall: trim on the siding, and the
// window's dark exterior frame.
function exteriorTrim(parent, M, o, t) {
  const cw = 3.5, z = -t - 0.6 - 0.75, { start: x, width: w, bottom: y, height: h } = o;
  const T = M.exteriorTrim;
  addBox(parent, T, x - cw, y, z, cw, h + cw, 0.75);
  addBox(parent, T, x + w, y, z, cw, h + cw, 0.75);
  addBox(parent, T, x - cw, y + h, z, w + 2 * cw, cw, 0.75);
  if (o.type === 'window') {
    addBox(parent, T, x - cw - 0.5, y - cw, z - 0.5, w + 2 * cw + 1, cw, 1.25); // sill
    const fz = -t / 2 - 1.6, fw = 1.75, Fm = M.windowFrame;
    addBox(parent, Fm, x, y, fz, fw, h, 0.8);
    addBox(parent, Fm, x + w - fw, y, fz, fw, h, 0.8);
    addBox(parent, Fm, x, y, fz, w, fw, 0.8);
    addBox(parent, Fm, x, y + h - fw, fz, w, fw, 0.8);
    const [cols, rows] = o.grid || [1, 1];
    for (let c = 1; c < cols; c++) addBox(parent, Fm, x + (w * c) / cols - 1, y, fz, 2, h, 0.8);
    for (let r = 1; r < rows; r++) addBox(parent, Fm, x, y + (h * r) / rows - 1, fz, w, 2, 0.8);
  }
}

// Casing on the second face of an interior wall (fixtures.opening trims the inside face).
function backCasing(parent, M, o, t) {
  const cw = 3.5, { start: x, width: w, bottom: y, height: h } = o;
  addBox(parent, M.trim, x - cw, y, -t - 0.75, cw, h + cw, 0.75);
  addBox(parent, M.trim, x + w, y, -t - 0.75, cw, h + cw, 0.75);
  addBox(parent, M.trim, x - cw - 0.5, y + h, -t - 0.9, w + 2 * cw + 1, cw + 0.5, 0.9);
}

function doorLeaf(parent, ctx, o, t) {
  const M = ctx.M, x = o.start, w = o.width, y0 = o.bottom;
  const lw = w - 1.5, lh = o.height - 0.875, th = 1.75;
  const knob = (p, kx, kz) => {
    const k = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), M.hardware);
    k.position.set(kx, y0 + 36, kz);
    p.add(k);
  };
  if (o.door === 'swing') {
    const right = o.hingeSide === 'right', out = o.swing === 'out';
    const pivot = new THREE.Group();
    pivot.position.set(right ? x + w - 0.75 : x + 0.75, 0, out ? -t : 0);
    const ang = THREE.MathUtils.degToRad(o.open ?? 80);
    pivot.rotation.y = (right ? 1 : -1) * (out ? -1 : 1) * ang;
    const zf = out ? 0 : -th;
    const x0 = right ? -lw : 0;
    if (o.lites) {
      // glass door: a frame in the door's color around `lites` stacked panes of glass
      const mat = o.color ? ctx.color(o.color) : M.door;
      const stile = 4.75, top = 4.75, bottom = 9, rail = 2.75;
      const lite = (lh - top - bottom - rail * (o.lites - 1)) / o.lites;
      addBox(pivot, mat, x0, y0, zf, stile, lh, th);
      addBox(pivot, mat, x0 + lw - stile, y0, zf, stile, lh, th);
      for (let i = 0; i <= o.lites; i++) {
        const y = i === 0 ? 0 : bottom + i * lite + (i - 1) * rail;
        addBox(pivot, mat, x0 + stile, y0 + y, zf, lw - 2 * stile, i === 0 ? bottom : i === o.lites ? top : rail, th);
        if (i < o.lites) addBox(pivot, o.clear ? M.glass : M.obscureGlass, x0 + stile, y0 + bottom + i * (lite + rail), zf + th / 2 - 0.1, lw - 2 * stile, lite, 0.2, { cast: false });
      }
    } else addBox(pivot, o.color ? ctx.color(o.color) : M.door, x0, y0, zf, lw, lh, th);
    const kx = right ? -lw + 2.75 : lw - 2.75;
    knob(pivot, kx, zf - 1);
    knob(pivot, kx, zf + th + 1);
    parent.add(pivot);
  } else if (o.door === 'bifold') {
    // two pairs of bifold leaves meeting in the middle, each pair folded open `open`
    // degrees toward the room side (local +z); louvered leaves get horizontal slats
    const leaves = o.leaves ?? 4, lw2 = (w - 1.5) / leaves - 0.125, ang = THREE.MathUtils.degToRad(o.open ?? 0);
    const leaf = (g) => addBox(g, M.door, 0, y0, -0.56, lw2, lh, 1.125);
    for (const side of [1, -1]) {
      const pair = new THREE.Group();
      pair.position.set(side > 0 ? x + 0.75 : x + w - 0.75, 0, -1);
      pair.scale.x = side;
      const a = new THREE.Group();
      a.rotation.y = -ang;
      leaf(a);
      const b = new THREE.Group();
      b.position.set(lw2 * Math.cos(ang), 0, lw2 * Math.sin(ang));
      b.rotation.y = ang;
      leaf(b);
      knob(b, lw2 - 1.5, 0.9);
      pair.add(a, b);
      parent.add(pair);
    }
  } else if (o.door === 'bypass') {
    const pw = lw / 2 + 1;
    addBox(parent, M.door, x + 0.75, y0, -t / 2 - 1.5, pw, lh, 1.25);
    addBox(parent, M.door, x + w - 0.75 - pw, y0, -t / 2 + 0.25, pw, lh, 1.25);
  } else if (o.door === 'slider') {
    // sliding patio door: `panels` glass panels in dark frames, alternating tracks
    const n = o.panels ?? 2, pw = (w - 1.5) / n + 1, fh = o.height - 0.75, Fm = o.frame === 'light' ? M.trim : M.windowFrame;
    for (let i = 0; i < n; i++) {
      const px = x + 0.75 + i * (pw - 1), pz = i % 2 ? -t / 2 + 0.25 : -t / 2 - 1.75;
      addBox(parent, Fm, px, y0, pz, 2.75, fh, 1.5);
      addBox(parent, Fm, px + pw - 2.75, y0, pz, 2.75, fh, 1.5);
      addBox(parent, Fm, px + 2.75, y0, pz, pw - 5.5, 3.5, 1.5);
      addBox(parent, Fm, px + 2.75, y0 + fh - 2.75, pz, pw - 5.5, 2.75, 1.5);
      addBox(parent, M.glass, px + 2.75, y0 + 3.5, pz + 0.7, pw - 5.5, fh - 6.25, 0.1, { cast: false });
    }
  } else if (o.door === 'overhead') {
    // sectional overhead door, closed: horizontal panels across the opening
    const n = o.sections ?? 4, sh = o.height / n, mat = M.garageDoor;
    for (let i = 0; i < n; i++) {
      addBox(parent, mat, x, y0 + i * sh + 0.15, -t / 2 - 1, w, sh - 0.3, 1.75);
      addBox(parent, M.windowFrame, x + 2, y0 + i * sh + sh * 0.25, -t / 2 - 1.2, w - 4, 0.4, 0.3, { cast: false });
    }
  }
  // pocket doors are shown open (slid into the wall)
}
