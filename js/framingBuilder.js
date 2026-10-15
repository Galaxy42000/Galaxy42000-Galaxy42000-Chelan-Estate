import * as THREE from 'three';
import { vaultHeight } from './geometry.js';

// Wood framing, shown with the viewer's "Framing" checkbox (the drywall, siding, ceilings
// and roofing are hidden while it is on):
//  • wallFraming: studs 16″ on centre, a bottom plate (broken at doorways), a double top
//    plate, and king studs, jack studs, headers, sills and cripples around each opening.
//    Built in the wall's own frame (x along the wall, y up, wall body z ∈ [-t, 0]) and
//    added to the wall's group, so it cuts away with the wall. Where a wall closes a
//    vault, a sloped ceiling or a gable, studs carry on up to `topAt(x)` under a raked plate;
//  • roofFraming: trusses 24″ on centre across the house (scissor trusses under the
//    kitchen/bathroom vault),
//    shed rafters and ceiling joists over the bedroom wing, and a stick-framed hip roof
//    (rafters, hips and jacks) over the living room.
// Every member is one instance of a unit box, so each wall (and the roof) is a single draw.

const T = 1.5; // thickness of a 2× member
const box = new THREE.BoxGeometry(1, 1, 1);
const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();
const mtx = new THREE.Matrix4();

// Collects members: each runs from a to b (centreline), `w` thick along n and `h` deep
// along n × (b − a).
class Members {
  constructor() { this.list = []; }
  add(a, b, n, w, h) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B);
    if (len < 0.3) return;
    X.subVectors(B, A).divideScalar(len);
    Z.set(...n).normalize();
    Y.crossVectors(Z, X).normalize();
    Z.crossVectors(X, Y);
    mtx.makeBasis(X.clone().multiplyScalar(len), Y.clone().multiplyScalar(h), Z.clone().multiplyScalar(w));
    mtx.setPosition(A.add(B).multiplyScalar(0.5));
    this.list.push(mtx.clone());
  }
  mesh(mat, name) {
    const m = new THREE.InstancedMesh(box, mat, this.list.length);
    this.list.forEach((x, i) => m.setMatrixAt(i, x));
    m.computeBoundingSphere();
    m.castShadow = m.receiveShadow = true;
    m.name = name;
    return m;
  }
}

export function framingMaterial() {
  return new THREE.MeshStandardMaterial({ color: '#d9b98a', roughness: 0.85 });
}

// ops: the wall's openings ({start, width, bottom, height, type}); topAt(x): height of the
// framing's top along the wall (the top of the top plates), or null for a flat wall H tall.
// A wall whose top slopes (under a shed roof or a sloped ceiling) gets full-height studs
// up to a raked double top plate.
export function wallFraming(mat, L, t, H, ops, topAt, cuts = []) {
  const fm = new Members();
  const d = t >= 5.5 ? 5.5 : Math.min(3.5, t), zc = -t / 2;
  const up = [0, 1, 0], along = [1, 0, 0], across = [0, 0, 1];
  const stud = (x, y0, y1) => y1 - y0 > 0.3 && fm.add([x, y0, zc], [x, y1, zc], along, T, d); // x = stud centre
  const flat = (x0, x1, y) => x1 - x0 > 0.3 && fm.add([x0, y, zc], [x1, y, zc], up, T, d); // plate, y = its centre
  const clampX = (x) => Math.min(L, Math.max(0, x));
  const topY = (x) => (topAt ? topAt(clampX(x)) : H);
  const plateTop = (x) => topY(x) - 2 * T; // underside of the double top plate

  // Steel beams: one running along inside the wall replaces the top plates, sitting on a
  // single plate with a doubled post under each end; one crossing the wall rests on a
  // doubled post, with short studs above it.
  const beamAlong = (x) => cuts.find((c) => c.along && x > c.a - T / 2 && x < c.b + T / 2);
  const beamAcross = (x) => cuts.find((c) => !c.along && x > c.a - T && x < c.b + T);
  const topOf = (x) => { const c = beamAlong(x); return c ? c.y0 - T : plateTop(x); };
  const tall = (x, y0, y1 = topOf(x)) => {
    const c = beamAcross(x);
    if (!c) return stud(x, y0, y1);
    stud(x, y0, Math.min(y1, c.y0));
    if (c.y1 + 1 < y1) stud(x, c.y1, y1);
  };

  // rough openings: 3″ of king + jack stud either side
  const rough = ops.filter((o) => o.type !== 'opening' || o.height < topY(o.start + o.width / 2) - 6).map((o) => {
    const top = Math.min(topOf(o.start), topOf(o.start + o.width), topOf(o.start + o.width / 2));
    const head = Math.min(o.bottom + o.height, top - 1);
    // an opening that reaches the plate or beam above it needs no header
    const hh = top - (o.bottom + o.height) < 1 ? 0 : Math.min(o.width > 48 ? 11.25 : 7.25, top - head);
    const j = o.width >= 72 ? 2 : 1; // jack studs each side (doubled under a wide header)
    return { ...o, j, top, a: Math.max(0, o.start - (1 + j) * T), b: Math.min(L, o.start + o.width + (1 + j) * T), head: hh ? head : top, hh };
  });
  const inOpening = (x) => rough.find((o) => x > o.a - T / 2 && x < o.b + T / 2);

  // bottom plate, broken at doorways
  let x0 = 0;
  for (const o of [...rough].filter((o) => o.bottom <= 0.5).sort((p, q) => p.a - q.a)) {
    flat(x0, o.a + (1 + o.j) * T, T / 2);
    x0 = o.b - (1 + o.j) * T;
  }
  flat(x0, L, T / 2);

  // double top plate: straight runs between the points where the top changes slope
  // (broken where a steel beam runs along the wall: a single plate under it)
  const bps = [0, L];
  if (topAt) for (let i = 1; i < 120; i++) {
    const x = (L * i) / 120, s = L / 120;
    if (Math.abs(topY(x - s) + topY(x + s) - 2 * topY(x)) > 0.05) bps.push(x);
  }
  for (const c of cuts.filter((c) => c.along)) bps.push(c.a, c.b);
  bps.sort((p, q) => p - q);
  for (let i = 0; i + 1 < bps.length; i++) {
    const xa = bps[i], xb = bps[i + 1];
    if (xb - xa < 0.3) continue;
    const c = beamAlong((xa + xb) / 2);
    if (c) {
      // under the beam, except over an opening that runs up to it
      let u0 = xa;
      for (const o of rough.filter((o) => !o.hh && o.a < xb && o.b > xa).sort((p, q) => p.a - q.a)) {
        flat(u0, o.a + (1 + o.j) * T, c.y0 - T / 2);
        u0 = o.b - (1 + o.j) * T;
      }
      flat(u0, xb, c.y0 - T / 2);
      continue;
    }
    const ya = topY(xa), yb = topY(xb), nrm = rakeNormal(xa, ya, xb, yb);
    for (const k of [0.5, 1.5]) fm.add([xa, ya - k * T, zc], [xb, yb - k * T, zc], nrm, T, d);
  }
  for (const c of cuts.filter((c) => c.along)) {
    for (const x of [c.a + T / 2, c.a + 1.5 * T, c.b - T / 2, c.b - 1.5 * T]) if (x > T && x < L - T && !inOpening(x)) stud(x, T, c.y0 - T);
  }
  // doubled post under a beam crossing the wall
  for (const c of cuts.filter((c) => !c.along)) {
    stud(c.a + T / 2, T, c.y0);
    stud(c.b - T / 2, T, c.y0);
    for (const x of [c.a + T / 2, c.b - T / 2]) if (c.y1 + 1 < plateTop(x)) stud(x, c.y1, plateTop(x));
  }

  // common studs: both ends, then 16″ on centre
  const xs = [T / 2, L - T / 2];
  for (let x = 16; x < L - T; x += 16) xs.push(x);
  for (const x of xs) {
    const o = inOpening(x);
    if (!o) tall(x, T);
    else if (x > o.a + (1 + o.j) * T && x < o.b - (1 + o.j) * T) {
      // cripples above the header and below the sill
      if (o.hh) tall(x, o.head + o.hh, topOf(x));
      if (o.bottom > 0.5) stud(x, T, o.bottom - T);
    }
  }
  for (const o of rough) {
    // king studs full height, jack studs up to the header
    tall(o.a + T / 2, T);
    tall(o.b - T / 2, T);
    for (let k = 1; k <= o.j; k++) {
      stud(o.a + (k + 0.5) * T, o.bottom <= 0.5 ? 0 : T, o.head);
      stud(o.b - (k + 0.5) * T, o.bottom <= 0.5 ? 0 : T, o.head);
    }
    // header (on edge, the full wall thickness) and the rough sill under a window
    if (o.hh) fm.add([o.a + T, o.head + o.hh / 2, zc], [o.b - T, o.head + o.hh / 2, zc], across, d, o.hh);
    if (o.bottom > 0.5) flat(o.a + (1 + o.j) * T, o.b - (1 + o.j) * T, o.bottom - T / 2);
  }
  return fm.mesh(mat, 'wall framing');
}

// A short gable wall standing on a beam or a wall top and closing the end of a vault (as
// over BEAM-2 in the photo): a plate along x at `base`, studs 16″ on centre up to the
// raked plate under topAt(x), which is straight between the breakpoints xs. The wall
// body runs from z0 to z0 + t.
export function gableFraming(mat, xs, base, z0, t, topAt) {
  const fm = new Members();
  const d = Math.min(3.5, t), zc = z0 + t / 2, x0 = xs[0], x1 = xs[xs.length - 1];
  fm.add([x0, base + T / 2, zc], [x1, base + T / 2, zc], [0, 1, 0], T, d);
  const studs = [];
  for (let x = x0 + T / 2; x < x1 - T / 2; x += 16) studs.push(x);
  studs.push(x1 - T / 2);
  for (const x of studs) if (topAt(x) - T > base + T + 0.3) fm.add([x, base + T, zc], [x, topAt(x) - T, zc], [1, 0, 0], T, d);
  for (let i = 0; i + 1 < xs.length; i++) {
    const xa = xs[i], xb = xs[i + 1], ya = topAt(xa), yb = topAt(xb);
    const nrm = rakeNormal(xa, ya, xb, yb);
    fm.add([xa, ya - T / 2, zc], [xb, yb - T / 2, zc], [nrm[0], nrm[1], 0], T, d);
  }
  return fm.mesh(mat, 'gable framing');
}

// A raked plate lies flat on the studs: its thickness is perpendicular to the slope,
// in the wall's plane.
function rakeNormal(xa, ya, xb, yb) {
  const len = Math.hypot(xb - xa, yb - ya) || 1;
  return [-(yb - ya) / len, (xb - xa) / len, 0];
}

// Roof framing for the shed roofs (see roof.framing in rooms/house.js): beams (glulams) and
// joists (TJIs), each lying under the roof plane it carries, their tops `cover` inches
// below the roof surface (sheathing and roofing). Joists are laid at `spacing` across a
// range and clipped to the roof's outline.
export function roofFraming(cfg, mat) {
  const R = cfg.roof, fm = new Members();
  const cover = R.framing?.cover ?? 1;
  const planes = Object.fromEntries(R.planes.map((p) => [p.id, p]));
  const yTop = (p, x, z) => p.at[2] + p.slope[0] * (x - p.at[0]) + p.slope[1] * (z - p.at[1]);
  // a member under plane p from (x0, z0) to (x1, z1), its top `cover` below the roof
  const under = (p, a, b, w, h, drop = 0) => {
    const ya = yTop(p, a[0], a[1]) - cover - drop - h / 2, yb = yTop(p, b[0], b[1]) - cover - drop - h / 2;
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
    fm.add([a[0], ya, a[1]], [b[0], yb, b[1]], [-dz / len, 0, dx / len], w, h);
  };
  for (const b of R.framing?.beams || []) under(planes[b.plane], b.from, b.to, b.width, b.depth, b.drop ?? 0);
  for (const j of R.framing?.joists || []) {
    const p = planes[j.plane], P = p.outline, ax = j.axis === 'x'; // joists run along x or z
    const c = ax ? 1 : 0, r = 1 - c; // c: the coordinate held constant along a joist
    for (let s = j.from; s <= j.to + 0.01; s += j.spacing) {
      // where the line (z = s for joists along x, x = s along z) crosses the outline
      const hits = [];
      P.forEach((a, i) => {
        const b = P[(i + 1) % P.length], ka = a[c], kb = b[c];
        if ((ka - s) * (kb - s) < 0) hits.push(a[r] + ((b[r] - a[r]) * (s - ka)) / (kb - ka));
      });
      hits.sort((m, n) => m - n);
      for (let k = 0; k + 1 < hits.length; k += 2) {
        const a0 = Math.max(hits[k], j.min ?? -Infinity), a1 = Math.min(hits[k + 1], j.max ?? Infinity);
        if (a1 - a0 < 2) continue;
        const pa = ax ? [a0, s] : [s, a0], pb = ax ? [a1, s] : [s, a1];
        under(p, pa, pb, j.width ?? 1.75, j.depth ?? 9.5);
      }
    }
  }
  return fm.mesh(mat, 'roof framing');
}
