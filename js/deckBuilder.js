import * as THREE from 'three';
import { woodTexture } from './materials.js';
import { slab } from './roomBuilder.js';
import { fmtIn, fmtFt } from './units.js';

// Decks and deck stairs (see `decks` and `stairs` in rooms/house.js). Each deck is a
// polygon in plan (x, z) giving the outside faces of its framing. Its ledger is on the
// house wall at x = wallX (a wall running along z) or z = wallZ (a wall running along x);
// edges listed in `houseEdges` also sit against the house, and edges in `joined` butt up
// to another deck. Those get no border, skirt or railing. Builds:
//  • decking: a picture-frame border board on every exposed edge (mitered), field boards
//    inside it running parallel to the ledger wall, and a skirt (fascia) below the border;
//  • a railing on the exposed edges (posts, a flat cap and horizontal metal bars), with
//    `gaps` (plan boxes) left open, e.g. at the top of a stair;
//  • posts on round concrete piers, down to the ground;
//  • the framing as a line drawing (ledger, rims, joists, beams, blocking) in `framing`,
//    which the viewer can switch on and off.

const BOARD = 5.5, GAP = 0.1875, THICK = 1; // deck board, 5½″ × 1″
const JOIST = 1.5, DEPTH = 7.25; // 2×8 framing

// ---------- polygon helpers (plan x/z) ----------
const area = (p) => p.reduce((s, [x, z], i) => { const [x2, z2] = p[(i + 1) % p.length]; return s + x * z2 - x2 * z; }, 0) / 2;

// Move each edge i inward by d[i] (negative = outward) and rejoin the corners.
function offset(p, d) {
  const sgn = area(p) > 0 ? 1 : -1, n = p.length;
  const lines = p.map(([x, z], i) => {
    const [x2, z2] = p[(i + 1) % n];
    const len = Math.hypot(x2 - x, z2 - z), ex = (x2 - x) / len, ez = (z2 - z) / len;
    const nx = -ez * sgn, nz = ex * sgn; // inward normal
    return { x: x + nx * d[i], z: z + nz * d[i], ex, ez };
  });
  return lines.map((b, i) => {
    const a = lines[(i - 1 + n) % n];
    const den = a.ex * b.ez - a.ez * b.ex;
    if (Math.abs(den) < 1e-9) return [b.x, b.z];
    const t = ((b.x - a.x) * b.ez - (b.z - a.z) * b.ex) / den;
    return [a.x + a.ex * t, a.z + a.ez * t];
  });
}

// Keep the part of polygon p where axis (0 = x, 1 = z) is >= v (keep = 1) or <= v (keep = -1).
function clip(p, axis, v, keep) {
  const inside = (q) => (q[axis] - v) * keep >= -1e-9;
  const out = [];
  p.forEach((a, i) => {
    const b = p[(i + 1) % p.length];
    if (inside(a)) out.push(a);
    if (inside(a) !== inside(b)) {
      const t = (v - a[axis]) / (b[axis] - a[axis]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  });
  return out;
}

// Where the line axis = v crosses the polygon: sorted values of the other coordinate.
function crossings(p, axis, v) {
  const o = 1 - axis, hits = [];
  p.forEach((a, i) => {
    const b = p[(i + 1) % p.length];
    if ((a[axis] - v) * (b[axis] - v) < 0) hits.push(a[o] + ((b[o] - a[o]) * (v - a[axis])) / (b[axis] - a[axis]));
  });
  return hits.sort((m, n) => m - n);
}

// ---------- line drawing of framing members ----------
// A member whose plan centerline runs a → b, w wide, from yTop down d.
function member(pos, a, b, w, yTop, d) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len < 0.5) return;
  const nx = (-(b[1] - a[1]) / len) * (w / 2), nz = ((b[0] - a[0]) / len) * (w / 2);
  const c = [];
  for (const [px, pz] of [a, b]) for (const s of [1, -1]) for (const y of [yTop, yTop - d]) c.push([px + nx * s, y, pz + nz * s]);
  for (const [i, j] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) pos.push(...c[i], ...c[j]);
}

// a box between two plan points (centre line), `w` wide, from y0 to y1 (a post, a rail…)
function bar(parent, mat, a, b, y0, y1, w) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || w;
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, y1 - y0, w), mat);
  m.position.set((a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2);
  m.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Railing along the line a → b (plan), standing on y = base: posts no more than
// `spacing` apart, a flat cap and `bars` horizontal metal bars.
function railing(parent, M, a, b, base, { height = 36, spacing = 66, bars = 7 } = {}) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len < 4) return;
  const n = Math.max(1, Math.ceil(len / spacing));
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    bar(parent, M.railing, p, p, base, base + height, 2.5);
  }
  bar(parent, M.railing, a, b, base + height, base + height + 1.5, 3.5); // cap
  for (let k = 0; k < bars; k++) {
    const y = base + 4 + ((height - 7) * k) / (bars - 1);
    bar(parent, M.railing, a, b, y, y + 0.75, 0.75);
  }
}

// ground level a deck or stair rests on: a number or a function of (x, z)
const groundFn = (g) => (typeof g === 'function' ? g : () => g ?? 0);

export function buildDecks(root, ctx, decks, tag, label, ground = 0) {
  const groundAt = groundFn(ground);
  const framing = new THREE.Group();
  framing.name = 'deck framing';
  framing.visible = false;
  root.add(framing);
  if (!decks?.length) return null;

  const color = decks[0].color || '#b1aca4';
  const tex = woodTexture(color, BOARD + GAP);
  const boardMats = {};
  // board material with its streaks running at `angle` (radians, plan) so each board's grain follows it
  const boardMat = (angle) => {
    const k = angle.toFixed(3);
    if (!boardMats[k]) {
      const t = tex.clone();
      t.rotation = angle;
      boardMats[k] = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, map: t });
    }
    return boardMats[k];
  };
  const skirtMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const shadowMat = new THREE.MeshStandardMaterial({ color: '#2a2a28', roughness: 1 });
  const lineMat = new THREE.LineBasicMaterial({ color: '#1d4f91', depthTest: false, transparent: true, opacity: 0.85 });
  const pierMat = new THREE.MeshStandardMaterial({ color: '#a9a7a1', roughness: 0.95 });
  const postMat = new THREE.MeshStandardMaterial({ color: '#8a6a48', roughness: 0.8 });
  const M = ctx.M;

  for (const dk of decks) {
    // a ledger along z = wallZ is built turned a quarter turn: local x = -z, local z = x
    const turned = dk.wallZ !== undefined;
    const toLocal = ([x, z]) => (turned ? [-z, x] : [x, z]);
    const g = new THREE.Group();
    if (turned) g.rotation.y = Math.PI / 2;
    root.add(g);
    const W = dk.outline, P = W.map(toLocal), n = P.length, top = dk.top;
    const wallX = turned ? -dk.wallZ : dk.wallX;
    const atHouse = P.map(([x], i) => (Math.abs(x - wallX) < 0.01 && Math.abs(P[(i + 1) % n][0] - wallX) < 0.01) || (dk.houseEdges || []).includes(i) || (dk.joined || []).includes(i));
    const exposed = (v, house = 0) => atHouse.map((h) => (h ? house : v));

    // decking: overhangs the skirt by 1½″; border boards on exposed edges, field boards inside
    const deckEdge = offset(P, exposed(-1.5));
    const borderIn = offset(deckEdge, exposed(BOARD));
    const field = offset(deckEdge, exposed(BOARD + GAP, 0.5));
    deckEdge.forEach((a, i) => {
      if (atHouse[i]) return;
      const b = deckEdge[(i + 1) % n];
      const piece = [a, b, borderIn[(i + 1) % n], borderIn[i]];
      g.add(slab(piece, THICK, top - THICK, boardMat(Math.atan2(-(b[1] - a[1]), b[0] - a[0]))));
    });
    const xs = field.map((q) => q[0]);
    for (let x = Math.min(...xs); x < Math.max(...xs) - 0.5; x += BOARD + GAP) {
      const strip = clip(clip(field, 0, x, 1), 0, x + BOARD, -1);
      if (strip.length >= 3) g.add(slab(strip, THICK, top - THICK, boardMat(-Math.PI / 2)));
    }
    g.add(slab(offset(deckEdge, exposed(0.3)), 0.2, top - THICK - 0.3, shadowMat)); // dark gaps between boards

    // skirt (fascia) on the exposed edges, under the border
    const skirt = new THREE.Group();
    const skirtOut = offset(P, exposed(-0.5));
    P.forEach((a, i) => {
      if (atHouse[i]) return;
      skirt.add(slab([a, P[(i + 1) % n], skirtOut[(i + 1) % n], skirtOut[i]], dk.skirt, top - THICK - dk.skirt, skirtMat));
    });
    g.add(skirt);

    // posts on round concrete piers, up to the bottom of the beam (plan x, z)
    const posts = new THREE.Group();
    root.add(posts);
    for (const [x, z] of dk.posts || []) {
      const gy = groundAt(x, z), bottom = top - THICK - DEPTH - (dk.beamDepth ?? 7.25);
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 8, 24), pierMat);
      pier.position.set(x, gy + 2, z);
      const p = new THREE.Mesh(new THREE.BoxGeometry(5.5, bottom - gy - 6, 5.5), postMat);
      p.position.set(x, (bottom + gy + 6) / 2, z);
      for (const m of [pier, p]) { m.castShadow = m.receiveShadow = true; posts.add(m); }
    }
    if (dk.posts?.length) tag(posts, { id: `${dk.id} posts`, type: '6×6 posts on 20″ concrete piers', materials: dk.postMaterials, notes: 'Posts on 20″ diameter × 24″ deep concrete piers (foundation plan S1.0). ⚠ Post positions follow the plan dimensions; heights follow the sloping ground as modeled.' });

    // railing on the exposed edges (world plan coordinates), skipping the gaps
    if (dk.railing) {
      const rg = new THREE.Group();
      root.add(rg);
      const rail = offset(W, W.map((_, i) => (atHouse[i] ? 0 : 2)));
      for (let i = 0; i < n; i++) {
        if (atHouse[i]) continue;
        const a = rail[i], b = rail[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        // split the edge where it runs through a gap box
        const inGap = (t) => {
          const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
          return (dk.railing.gaps || []).some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
        };
        let s0 = null;
        const steps = Math.ceil(len);
        for (let k = 0; k <= steps; k++) {
          const t = k / steps, open = k < steps && !inGap(t);
          if (open && s0 === null) s0 = t;
          if ((!open || k === steps) && s0 !== null) {
            const t1 = open ? 1 : t;
            railing(rg, M, [a[0] + (b[0] - a[0]) * s0, a[1] + (b[1] - a[1]) * s0], [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1], top, dk.railing);
            s0 = null;
          }
        }
      }
      tag(rg, { id: `${dk.id} railing`, type: 'Deck railing', height: dk.railing.height ?? 36, materials: dk.railing.materials, notes: dk.railing.notes });
    }

    const zs = P.map((q) => q[1]), px = P.map((q) => q[0]);
    const along = Math.max(...zs) - Math.min(...zs), out = Math.max(...px) - Math.min(...px);
    tag(g, { id: dk.id, type: 'Deck', width: along, depth: out, materials: dk.materials, notes: `${fmtFt(along)} along the house × ${fmtFt(out)} out (outside of the framing). Surface ${fmtIn(-top)} below the floor inside.${dk.notes ? ' ' + dk.notes : ''}` });
    tag(skirt, { id: `${dk.id} skirt`, type: 'Deck skirt (fascia)', height: dk.skirt, materials: dk.skirtMaterials });
    const cx = px.reduce((s, v) => s + v, 0) / n, cz = zs.reduce((s, v) => s + v, 0) / n;
    label(g, `<b>${dk.id}</b><br>${fmtFt(along)} × ${fmtFt(out)}`, dk.labelAt ? toLocal(dk.labelAt)[0] : cx, top + 2, dk.labelAt ? toLocal(dk.labelAt)[1] : cz, 'room');

    // framing line drawing (in the deck's own frame)
    const pos = [], yTop = top - THICK;
    const rim = offset(P, P.map(() => JOIST / 2));
    rim.forEach((a, i) => member(pos, a, rim[(i + 1) % n], JOIST, yTop, DEPTH)); // ledger + rim joists
    const z0 = Math.min(...zs), z1 = Math.max(...zs);
    for (let z = z0 + (dk.spacing || 16); z < z1 - JOIST; z += dk.spacing || 16) {
      const c = crossings(P, 1, z);
      for (let k = 0; k + 1 < c.length; k += 2) member(pos, [c[k] + JOIST, z], [c[k + 1] - JOIST, z], JOIST, yTop, DEPTH);
    }
    for (const [list, w, d] of [[dk.beams || [], 2 * JOIST, DEPTH], [dk.blocking || [], JOIST, DEPTH]]) {
      for (const bx of list) {
        const x = wallX + (turned ? -bx : bx), c = crossings(P, 0, x);
        for (let k = 0; k + 1 < c.length; k += 2) member(pos, [x, c[k] + JOIST], [x, c[k + 1] - JOIST], w, yTop - (list === dk.beams ? DEPTH : 0), d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(geo, lineMat);
    lines.renderOrder = 20;
    lines.raycast = () => {}; // not clickable
    const fg = new THREE.Group();
    if (turned) fg.rotation.y = Math.PI / 2;
    fg.add(lines);
    framing.add(fg);
  }
  return framing;
}

// Deck stairs running out from a deck edge toward +z (plan): open risers, treads of two
// deck boards, three stringers, a railing each side and a concrete landing pad at the
// bottom. The number of risers is fixed (`risers`); their height follows the ground.
export function buildStairs(root, ctx, stairs, tag, ground = 0) {
  const groundAt = groundFn(ground), M = ctx.M;
  const tread = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, map: woodTexture(stairs[0].color || '#b1aca4', BOARD + GAP) });
  const wood = new THREE.MeshStandardMaterial({ color: '#8a6a48', roughness: 0.8 });
  const pad = new THREE.MeshStandardMaterial({ color: '#a9a7a1', roughness: 0.95 });
  for (const s of stairs) {
    const g = new THREE.Group();
    root.add(g);
    const n = s.risers, run = s.run ?? 11, foot = s.z0 + (n - 1) * run;
    const bottom = s.bottom ?? groundAt((s.x0 + s.x1) / 2, foot + 12);
    const rise = (s.top - bottom) / n;
    for (let i = 1; i < n; i++) {
      const y = s.top - i * rise, z = s.z0 + (i - 1) * run;
      for (const k of [0, 1]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(s.x1 - s.x0, THICK, BOARD), tread);
        m.position.set((s.x0 + s.x1) / 2, y - THICK / 2, z + 0.5 + k * (BOARD + GAP) + BOARD / 2);
        m.castShadow = m.receiveShadow = true;
        g.add(m);
      }
    }
    // stringers from under the deck rim down to the landing pad
    const len = Math.hypot(n * run, s.top - bottom), ang = Math.atan2(s.top - bottom, n * run);
    for (const x of [s.x0 + 1, (s.x0 + s.x1) / 2, s.x1 - 1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 11.25, len), wood);
      m.position.set(x, (s.top + bottom) / 2 - 7, s.z0 + (n * run) / 2 - run / 2);
      m.rotation.x = ang;
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    }
    // landing pad (the 24″ × 108″ pier on the foundation plan)
    const p = new THREE.Mesh(new THREE.BoxGeometry(s.padWidth ?? 108, 6, s.padDepth ?? 24), pad);
    p.position.set((s.x0 + s.x1) / 2, bottom - 2, foot + (s.padDepth ?? 24) / 2 - 2);
    p.receiveShadow = true;
    g.add(p);
    // railings: posts at the top and bottom, a sloped cap and bars
    if (s.railing !== false) {
      for (const x of [s.x0 + 1.5, s.x1 - 1.5]) {
        const a = [x, s.z0], b = [x, foot];
        for (const [pz, py] of [[s.z0, s.top], [foot, bottom + rise]]) bar(g, M.railing, [x, pz], [x, pz], py - (pz === s.z0 ? 0 : rise), py + 36, 2.5);
        const cap = bar(g, M.railing, a, b, 0, 1.5, 3.5);
        cap.position.y = (s.top + bottom + rise) / 2 + 36;
        cap.rotation.z = -Math.atan2(s.top - bottom - rise, foot - s.z0); // falls toward +z
        for (let k = 0; k < 5; k++) {
          const r = bar(g, M.railing, a, b, 0, 0.75, 0.75);
          r.position.y = (s.top + bottom + rise) / 2 + 6 + k * 6;
          r.rotation.z = cap.rotation.z;
        }
      }
    }
    tag(g, { id: s.id, type: 'Deck stairs', width: s.x1 - s.x0, height: s.top - bottom, materials: s.materials, notes: `${n} risers of about ${fmtIn(rise)}, ${n - 1} treads ${fmtIn(run)} deep.${s.notes ? ' ' + s.notes : ''}` });
  }
}
