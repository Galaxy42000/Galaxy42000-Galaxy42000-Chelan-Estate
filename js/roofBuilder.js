import * as THREE from 'three';

// Roof for the house (see `roof` in rooms/house.js), in plan x/z inches. The roof is a
// set of flat (planar) roof surfaces, each one a shed roof:
//  • `planes`: each has an outline in plan [[x, z], …] (the outside edge of the roof,
//    overhangs included), the height of its top surface at one point `at: [x, z, y]` and
//    its `slope: [rise per inch along x, rise per inch along z]`;
//  • the roof is a slab `thickness` deep: metal roofing on top, the soffit (underside)
//    below it, and a fascia band `fascia` deep around every edge, except the edges listed
//    in `valleys` (edge i runs from outline point i to point i + 1), where two roofs meet;
//  • `fillers`: patches of siding closing gaps between roofs, as plan quads with heights;
//  • `chimneys`: framed chimney chases sided like the walls, with a metal cap and flue;
//  • `lights`: recessed lights in the soffits.
// heightAt(x, z) is the height of the roof's underside at a point (the highest one there,
// or null outside the roof), used to run the siding up to the soffit.

// Planar polygon [[x, y, z], ...] → mesh; uv: u along `along` (unit plan vector), v up the slope.
function face(pts, mat, along) {
  const pos = [], uv = [];
  const [o] = pts;
  for (let i = 1; i + 1 < pts.length; i++) {
    for (const p of [pts[0], pts[i], pts[i + 1]]) {
      pos.push(...p);
      const dx = p[0] - o[0], dz = p[2] - o[2];
      const u = dx * along[0] + dz * along[1];
      const flat = -dx * along[1] + dz * along[0];
      uv.push(u, Math.hypot(flat, p[1] - o[1]) * Math.sign(p[1] - o[1] || 1));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// A board hanging below the line a → b (plan points with heights), `drop` deep, 1″ thick,
// on the side given by out = outward plan unit vector.
function board(parent, mat, a, b, drop, out) {
  const d = 1, ox = out[0] * d, oz = out[1] * d;
  const p = (q, dy, s) => [q[0] + ox * s, q[1] + dy, q[2] + oz * s];
  const quads = [
    [p(a, 0.5, 1), p(b, 0.5, 1), p(b, -drop, 1), p(a, -drop, 1)], // outer face
    [p(a, -drop, 0), p(b, -drop, 0), p(b, -drop, 1), p(a, -drop, 1)], // bottom
    [p(a, 0.5, 0), p(b, 0.5, 0), p(b, 0.5, 1), p(a, 0.5, 1)], // top
  ];
  const along = [b[0] - a[0], b[2] - a[2]], len = Math.hypot(...along) || 1;
  for (const q of quads) parent.add(face(q, mat, [along[0] / len, along[1] / len]));
}

// A flat polygon in plan at heights y(x, z), triangulated; `down` turns it to face down.
function sheet(outline, y, mat, { down = false, along = [1, 0] } = {}) {
  const tris = THREE.ShapeUtils.triangulateShape(outline.map(([x, z]) => new THREE.Vector2(x, z)), []);
  const pos = [], uv = [];
  for (const t of tris) {
    // wind each triangle to face up (+y), or down
    const [a, b, c] = t.map((i) => outline[i]);
    const ny = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
    const idx = (ny > 0) !== down ? t : [t[0], t[2], t[1]];
    for (const i of idx) {
      const [x, z] = outline[i];
      pos.push(x, y(x, z), z);
      uv.push(x * along[0] + z * along[1], -x * along[1] + z * along[0]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export const insidePoly = (poly, x, z) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};
const area = (p) => p.reduce((s, [x, z], i) => { const [x2, z2] = p[(i + 1) % p.length]; return s + x * z2 - x2 * z; }, 0) / 2;

// top-surface height of a roof plane at a plan point
export const planeTop = (pl) => (x, z) => pl.at[2] + pl.slope[0] * (x - pl.at[0]) + pl.slope[1] * (z - pl.at[1]);

export function buildRoof(cfg, M) {
  const R = cfg.roof;
  const group = new THREE.Group();
  group.name = 'roof';
  const T = R.thickness ?? 11, F = R.fascia ?? T + 1;
  const top = new THREE.Group();
  group.add(top);
  let maxTop = -Infinity;
  const planes = R.planes.map((pl) => ({ ...pl, top: planeTop(pl) }));

  for (const pl of planes) {
    const P = pl.outline, n = P.length, y = pl.top;
    // contours run across the slope; the standing seams run down it
    const [sx, sz] = pl.slope, sl = Math.hypot(sx, sz) || 1;
    const along = [-sz / sl, sx / sl];
    top.add(sheet(P, y, M.roofing, { along }));
    // soffit: the underside of the slab (inside the house it sits just above the ceiling)
    top.add(sheet(P, (x, z) => y(x, z) - T + 1.5, M.soffit, { down: true, along }));
    for (const [x, z] of P) maxTop = Math.max(maxTop, y(x, z));
    // fascia on every edge that isn't a valley, facing out
    const sgn = area(P) > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      if ((pl.valleys || []).includes(i)) continue;
      const [ax, az] = P[i], [bx, bz] = P[(i + 1) % n], len = Math.hypot(bx - ax, bz - az);
      const out = [((bz - az) / len) * sgn, (-(bx - ax) / len) * sgn];
      board(group, M.fascia, [ax, y(ax, az), az], [bx, y(bx, bz), bz], F, out);
    }
  }

  // underside height at a point: the highest roof whose outline contains it
  const heightAt = (x, z) => {
    let best = null;
    for (const pl of planes) if (insidePoly(pl.outline, x, z)) best = Math.max(best ?? -Infinity, pl.top(x, z) - T + 1.5);
    return best;
  };

  // siding patches closing the gaps between roofs: [[x, y, z], …] planar quads
  for (const f of R.fillers || []) {
    const pts = f.points;
    const along = [pts[1][0] - pts[0][0], pts[1][2] - pts[0][2]], len = Math.hypot(...along) || 1;
    const m = face(pts, M.sidingGable ??= Object.assign(M.siding.clone(), { side: THREE.DoubleSide }), [along[0] / len, along[1] / len]);
    top.add(m);
  }

  // chimney chases: from below the roof up to `top`, sided, with a metal cap and a flue
  for (const c of R.chimneys || []) {
    const cg = new THREE.Group();
    const y0 = (heightAt(c.x + c.w / 2, c.z + c.d / 2) ?? cfg.height) - 12;
    const h = c.top - y0;
    const chase = new THREE.Mesh(new THREE.BoxGeometry(c.w, h, c.d), M.siding);
    chase.position.set(c.x + c.w / 2, y0 + h / 2, c.z + c.d / 2);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(c.w + 3, 2, c.d + 3), M.fascia);
    cap.position.set(c.x + c.w / 2, c.top + 1, c.z + c.d / 2);
    const flue = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 14, 20), M.flue);
    flue.position.set(c.x + c.w / 2, c.top + 9, c.z + c.d / 2);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(7, 4, 20), M.flue);
    hat.position.set(c.x + c.w / 2, c.top + 18, c.z + c.d / 2);
    for (const m of [chase, cap, flue, hat]) { m.castShadow = m.receiveShadow = true; cg.add(m); }
    cg.userData.info = { id: c.id || 'Chimney', type: 'Chimney chase', width: c.w, depth: c.d, height: c.top, materials: c.materials, notes: c.notes };
    group.add(cg);
    maxTop = Math.max(maxTop, c.top + 20);
  }

  // recessed lights in the soffits
  for (const [x, z] of R.lights || []) {
    const y = heightAt(x, z);
    if (y === null) continue;
    const l = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.3, 20), M.canLens);
    l.position.set(x, y - 0.2, z);
    group.add(l);
  }

  return { group, heightAt, planes, thickness: T, top: maxTop };
}
