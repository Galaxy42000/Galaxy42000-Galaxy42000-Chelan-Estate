// ============================================================================
//  WIRING LAYOUT for rooms/house.js — inches, plan coordinates (x east, z south, y up
//  from the house floor), like the rest of the house. Notes are in true directions.
//
//  Device positions come from the electrical plan A3.0: every receptacle, switch, light,
//  smoke alarm, the thermostat, the bath fan and the panel location were read off the
//  sheet's linework. Mounting heights follow its notes: receptacles 1′-6″ to centre,
//  kitchen receptacles 3′-10″, bathroom GFCIs 3′-6″ (switches 48″ ⚠). Which breaker
//  feeds what, and how the cables run, is a proposed layout to code-typical practice:
//  every run is ⚠ until a licensed electrician designs it (electrical note 3).
//
//  Cables leave the top of the panel on the garage's house-side wall and run in the
//  joist bays just above the sloped ceilings, dropping down inside the walls to each
//  device; the island receptacle is fed in conduit under the slab.
// ============================================================================

export function houseWiring({ house, CEILING }) {
  const { ceil, GK } = CEILING;
  const inGarage = (x, z) => x < 235.4 && z < 360 && x > -20 && z > -20;
  const ceilingAt = (x, z) => (inGarage(x, z) ? 144 - (x - 6.4) * GK : ceil(z));
  const levelAt = (x, z) => (inGarage(x, z) && x > 6 && z > 5 ? -16 : 0);
  const over = (x, z) => ceilingAt(x, z) + 3; // in the joist bay above the ceiling
  const SLAB = -8; // conduit under the slab

  // wall faces, for setting devices into the nearest wall
  const faces = [];
  for (const w of house.walls) {
    if (w.x1 - w.x0 >= w.z1 - w.z0) {
      const mid = (w.z0 + w.z1) / 2;
      faces.push({ axis: 'z', v: w.z0, a: w.x0, b: w.x1, out: -1, mid }, { axis: 'z', v: w.z1, a: w.x0, b: w.x1, out: 1, mid });
    } else {
      const mid = (w.x0 + w.x1) / 2;
      faces.push({ axis: 'x', v: w.x0, a: w.z0, b: w.z1, out: -1, mid }, { axis: 'x', v: w.x1, a: w.z0, b: w.z1, out: 1, mid });
    }
  }
  // the wall face nearest a plan point: the device sits in the wall there, and its cable
  // runs up the middle of the stud cavity
  const snap = (x, z) => {
    let best = null;
    for (const f of faces) {
      const along = f.axis === 'z' ? x : z, across = f.axis === 'z' ? z : x;
      if (along < f.a - 1 || along > f.b + 1) continue;
      const d = Math.abs(across - f.v);
      if (!best || d < best.d) best = { f, d };
    }
    if (!best || best.d > 14) return null;
    const { f } = best, inset = -f.out * 1.4;
    return f.axis === 'z'
      ? { at: [x, f.v + inset], cav: [x, f.mid], face: 'z' }
      : { at: [f.v + inset, z], cav: [f.mid, z], face: 'x' };
  };

  const runs = [], devices = [];
  let slot = 0;
  // sample a straight run over the ceiling (or under the slab), turning x first then z
  const sample = (a, b, y) => {
    const out = [], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 12));
    for (let i = 1; i <= n; i++) {
      const x = a[0] + ((b[0] - a[0]) * i) / n, z = a[1] + ((b[1] - a[1]) * i) / n;
      out.push([x, y ? y(x, z) : over(x, z), z]);
    }
    return out;
  };
  // a stop: a device in a wall, a light or box in the ceiling, or a point
  const KINDS_IN_CEILING = new Set(['light', 'smoke', 'fan', 'ceilingOutlet']);
  const stopOf = (s) => {
    const [x, z] = s.at, lv = levelAt(x, z);
    if (KINDS_IN_CEILING.has(s.kind)) {
      const y = ceilingAt(x, z);
      return { ...s, top: [x, y, z], cav: [x, z], up: true };
    }
    const sn = snap(x, z);
    const h = s.y ?? { switch: 48, gfci: 18, outlet: 18, r240: 24, data: 18, thermostat: 54, junction: 60, point: 80, disconnect: 40 }[s.kind] ?? 18;
    const y = lv + h;
    const p = sn ? sn.at : [x, z];
    return { ...s, face: sn?.face ?? 'z', pos: [p[0], y, p[1]], cav: sn ? sn.cav : [x, z] };
  };
  // the cable from one stop to the next
  const hop = (a, b) => {
    const pts = [];
    const ca = a.cav, cb = b.cav;
    const ya = a.up ? a.top[1] : a.pos[1], yb = b.up ? b.top[1] : b.pos[1];
    pts.push(a.up ? a.top : a.pos, [ca[0], ya, ca[1]]);
    if (b.floor) {
      const corner = [cb[0], ca[1]];
      pts.push([ca[0], SLAB, ca[1]], ...sample(ca, corner, () => SLAB), ...sample(corner, cb, () => SLAB), [cb[0], yb, cb[1]]);
    } else {
      const corner = b.turn === 'zx' ? [ca[0], cb[1]] : [cb[0], ca[1]];
      pts.push([ca[0], over(...ca), ca[1]], ...sample(ca, corner), ...sample(corner, cb), [cb[0], yb, cb[1]]);
    }
    pts.push(b.up ? b.top : b.pos);
    return pts;
  };
  const PANEL = { id: 'ELEC PANEL', pos: [233.5, 84, 221], cav: [238.2, 221] };
  // a circuit: a home run from the panel, then on from stop to stop
  const circuit = (name, cable, stops, notes) => {
    const ss = stops.map(stopOf);
    const n = ++slot;
    const start = { ...PANEL, pos: [PANEL.pos[0], PANEL.pos[1], PANEL.pos[2] - 6 + (n % 12)], cav: [PANEL.cav[0], PANEL.cav[1] - 6 + (n % 12)] };
    const path = [];
    let prev = start;
    for (const s of ss) { path.push(...hop(prev, s)); prev = s; }
    runs.push({ id: `Circuit ${n}: ${name}`, cable, path, notes: notes ? `${notes} ⚠ Proposed route.` : '⚠ Proposed route.' });
    for (const s of ss) {
      if (s.kind === 'light' || s.kind === 'point') continue;
      if (s.up) {
        const sx = (ceilingAt(s.at[0] + 1, s.at[1]) - ceilingAt(s.at[0] - 1, s.at[1])) / 2, sz = (ceilingAt(s.at[0], s.at[1] + 1) - ceilingAt(s.at[0], s.at[1] - 1)) / 2;
        devices.push({ id: s.id, kind: s.kind === 'ceilingOutlet' ? 'ceilingBox' : s.kind === 'fan' ? 'bathFan' : 'smoke', face: 'y', at: [s.at[0], s.top[1] - 0.8, s.at[1]], rot: [-Math.atan(sz), 0, Math.atan(sx)], notes: `${s.notes ? s.notes + ' ' : ''}Circuit ${n} (${name}).` });
      } else devices.push({ id: s.id, kind: s.kind, gang: s.gang, face: s.face, at: s.pos, notes: `${s.notes ? s.notes + ' ' : ''}Circuit ${n} (${name}).` });
    }
  };
  const O = (id, x, z, extra) => ({ id, kind: 'outlet', at: [x, z], ...extra });
  const G = (id, x, z, extra) => ({ id, kind: 'gfci', at: [x, z], ...extra });
  const SW = (id, x, z, extra) => ({ id, kind: 'switch', at: [x, z], ...extra });
  const L = (id, x, z) => ({ id, kind: 'light', at: [x, z] });

  // ---------- garage ----------
  circuit('Garage receptacles (GFCI)', '12/2', [
    G('R-G1', 232, 175, { notes: 'GFCI (all garage receptacles).' }), O('R-G2', 182, 351), O('R-G3', 66, 351), O('R-G4', 10, 180),
    G('R-WP1', -4, 171, { y: 2, notes: 'Weatherproof GFCI outside the garage (WP on A3.0).' }),
  ], '20 A, GFCI-protected: the garage receptacles and the weatherproof one outside the side door.');
  circuit('Garage lights and door opener', '14/2', [
    SW('S-G1', 233, 259, { gang: 1, notes: 'Garage lights, beside the mudroom door (garage side).' }),
    L('L-G2', 121, 264), L('L-G1', 121, 139),
    { id: 'R-OPENER', kind: 'ceilingOutlet', at: [121, 104], notes: 'Ceiling receptacle for the garage door opener.' },
    SW('S-G2', 7, 252, { gang: 2, notes: 'Two 3-way switches by the side door (A3.0).' }),
    SW('S-MECH', 215, 316, { notes: 'Mechanical closet light.' }), L('L-MECH', 180, 337),
  ], '15 A: garage lights (3-way from the side door and the mudroom door), the opener and the closet light.');
  circuit('Outside lights, garage door', '14/2', [
    SW('S-G3', 231, 252, { notes: 'Outside lights at the garage door.' }),
    { id: 'X-1', kind: 'point', at: [13, -1.5], y: 70 }, { id: 'X-2', kind: 'point', at: [227, -1.5], y: 70 }, { id: 'X-3', kind: 'point', at: [-1.5, 252], y: 66 },
  ], '15 A: the wall lights either side of the garage door and at the side door.');
  circuit('Boiler and water heater', '14/2', [
    { id: 'J-BOILER', kind: 'junction', at: [219, 351], y: 40, notes: 'Boiler (120 V) and the radiant pumps.' },
    O('R-WH', 140, 351, { y: 30, notes: 'Water heater (igniter / power vent).' }),
  ], '15 A: boiler, circulator pumps and the gas water heater.');

  // ---------- mudroom, laundry ----------
  circuit('Washer', '12/2', [O('R-W', 258, 351, { y: 42, notes: 'Washer.' })], '20 A dedicated laundry circuit.');
  circuit('Dryer (240 V)', '10/3', [{ id: 'R-D', kind: 'r240', at: [291, 351], y: 36, notes: '30 A, 240 V dryer receptacle (⚠ or 120 V if the dryer is gas).' }], '30 A, 240 V.');
  circuit('Mudroom receptacles', '12/2', [
    G('R-M1', 311, 351, { y: 46, notes: 'GFCI at the counter.' }), G('R-M2', 355, 351, { y: 46 }),
    O('R-M3', 244, 330), O('R-M4', 274, 249), O('R-M5', 397, 295), O('R-M6', 414, 319),
  ], '20 A.');
  circuit('Mudroom lights', '14/2', [
    SW('S-M1', 244, 312, { gang: 2, notes: 'Two 3-way switches by the garage door (A3.0).' }),
    L('L-M1', 292, 309), L('L-M2', 350, 309), L('L-M3', 407, 335),
    SW('S-M2', 379, 352, { notes: '3-way, by the opening to the kitchen.' }),
  ], '15 A.');

  // ---------- baths ----------
  circuit('Bath 1 (GFCI)', '12/2', [
    G('R-B1', 408, 260, { y: 42, notes: 'GFCI beside the vanity at 3′-6″ (electrical note 6).' }), O('R-B2', 418, 308), O('R-B3', 453, 351), O('R-B4', 473, 268),
  ], '20 A bathroom circuit.');
  circuit('Bath 1 lights and fan', '14/3', [
    SW('S-B1', 433, 318, { notes: 'By the door from the mudroom.' }),
    L('L-B2', 453, 335), L('L-B1', 440, 287), { id: 'P-B1', kind: 'light', at: [412, 256] },
    { id: 'FAN-B1', kind: 'fan', at: [459, 264], notes: 'Bath exhaust fan, ducted outside at least 3′ from openings (note 1).' },
    SW('S-B2', 474, 277, { gang: 2, notes: 'By the toilet: light and fan (A3.0).' }),
  ], '15 A.');
  circuit('Bath 2, shower and closet', '14/2', [
    SW('S-B3', 593, 316, { notes: '3-way, by the bedroom door.' }),
    L('L-B3', 510, 321), L('L-B4', 568, 335), L('L-SHOWER', 510, 264),
    SW('S-WIC', 588, 304, { notes: 'Closet light.' }), L('L-WIC', 570, 278),
  ], '15 A.');
  circuit('Bath 2 receptacles (GFCI)', '12/2', [G('R-B5', 538, 351, { y: 42 }), O('R-B6', 567, 315), O('R-B7', 537, 291), O('R-WIC', 548, 276)], '20 A.');

  // ---------- kitchen ----------
  circuit('Kitchen counter A (GFCI)', '12/2', [
    G('R-K1', 244, 372, { y: 46, notes: 'Counter receptacles at 3′-10″ (electrical note 5).' }), G('R-K2', 267, 363, { y: 46 }),
    O('R-RANGE', 306, 363, { y: 8, notes: 'Behind the gas range.' }), G('R-K3', 332, 363, { y: 46 }),
  ], '20 A small-appliance circuit.');
  circuit('Kitchen counter B and island (GFCI)', '12/2', [
    G('R-K4', 244, 462, { y: 46 }),
    G('R-ISL', 304, 449, { y: 14, floor: true, notes: 'Island receptacle, in conduit under the slab.' }),
  ], '20 A small-appliance circuit; the island is fed under the slab.');
  circuit('Refrigerator', '12/2', [O('R-FRIDGE', 362, 363, { y: 54, notes: 'Refrigerator.' })], '20 A dedicated.');
  circuit('Dishwasher', '12/2', [{ id: 'J-DW', kind: 'junction', at: [244, 444], y: 8, notes: 'Dishwasher (and disposal) under the counter.' }], '20 A dedicated.');
  circuit('Kitchen and living room lights', '14/3', [
    SW('S-K1', 244, 475, { notes: 'By the living room window.' }),
    L('L-K6', 287, 520), L('L-K5', 287, 484), L('L-K7', 346, 519),
    { id: 'P-ISLAND', kind: 'light', at: [343, 449] },
    L('L-L3', 405, 519), L('L-L2', 405, 465), L('L-L1', 405, 411),
    SW('S-L1', 423, 379, { notes: '3-way, on the fireplace wall.' }),
    L('L-L4', 511, 411), L('L-L5', 511, 465), L('L-L6', 511, 519),
    SW('S-L2', 388, 543, { gang: 2, notes: 'Between the first two sliding doors.' }),
    SW('S-L3', 529, 543, { gang: 2, notes: 'Between the last two sliding doors.' }),
  ], '15 A. The kitchen cans (rooms/kitchen.js) are on this circuit too.');
  circuit('Deck lights', '14/2', [
    SW('S-X1', 393, 541, { notes: 'Deck lights (3-way with S-L3).' }),
    { id: 'X-4', kind: 'point', at: [243, 553.5] }, { id: 'X-5', kind: 'point', at: [385.4, 553.5] },
    { id: 'X-6', kind: 'point', at: [529.4, 553.5] }, { id: 'X-7', kind: 'point', at: [672.5, 553.5] },
    G('R-WP2', 534, 556, { y: 18, notes: 'Weatherproof GFCI on the deck (WP on A3.0).' }),
  ], '15 A: the four deck wall lights and the weatherproof receptacle.');

  // ---------- living room, studio, hall ----------
  circuit('Living room receptacles', '12/2', [
    O('R-L1', 245, 543), O('R-L2', 384, 543), O('R-L3', 525, 543), O('R-L4', 546, 415), O('R-L5', 556, 363), O('R-L6', 573, 399),
  ], '20 A, AFCI.');
  circuit('Studio receptacles', '12/2', [O('R-S1', 565, 409), O('R-S2', 614, 409), O('R-S3', 659, 409), O('R-S4', 670, 447), O('R-S5', 670, 515)], '20 A, AFCI.');
  circuit('Studio and hall lights', '14/2', [
    SW('S-H1', 557, 400, { gang: 2, notes: 'Hall and studio lights.' }),
    L('L-H1', 560, 381), L('L-S1', 613, 453), L('L-S2', 613, 507),
  ], '15 A.');

  // ---------- primary bedroom ----------
  circuit('Bedroom receptacles', '12/2', [
    O('R-BR1', 605, 313), O('R-BR2', 628, 249), O('R-BR3', 743, 249), O('R-BR4', 766, 325), O('R-BR5', 663, 399),
    G('R-WP3', 780, 252, { y: 18, notes: 'Weatherproof GFCI outside the bedroom’s south wall (WP on A3.0).' }),
  ], '20 A, AFCI.');
  circuit('Bedroom lights', '14/3', [
    SW('S-BR1', 603, 359, { notes: '3-way, by the door.' }),
    L('L-BR2', 634, 369), L('L-BR1', 634, 279), L('L-BR3', 736, 279), L('L-BR4', 736, 369),
    SW('S-BR2', 684, 400, { notes: '3-way, by the sliding door.' }),
    SW('S-X2', 766, 394, { notes: 'Wall light outside the sliding door.' }), { id: 'X-8', kind: 'point', at: [769, 409.5] },
  ], '15 A.');

  // ---------- heating, cooling, alarms ----------
  circuit('A/C condenser (240 V)', '10/3', [
    { id: 'DISC', kind: 'disconnect', at: [306, 239], y: 40, notes: 'A/C disconnect on the back wall by the condenser (“AC”, A3.0).' },
    { id: 'A/C', kind: 'point', at: [306, 214], y: 0 },
  ], '30 A, 240 V ⚠ size to the unit.');
  circuit('Smoke / CO alarms', '14/3', [
    { id: 'SMOKE-1', kind: 'smoke', at: [263, 283], notes: 'Mudroom (A3.0).' },
    { id: 'SMOKE-2', kind: 'smoke', at: [575, 383], notes: 'Hall (A3.0).' },
    { id: 'SMOKE-3', kind: 'smoke', at: [616, 384], notes: 'Primary bedroom (A3.0).' },
  ], '15 A, interconnected (14/3) hard-wired alarms.');
  runs.push({ id: 'Thermostat wire', cable: 'tstat', notes: 'Thermostat cable from the smart thermostat (WSEC option 3.11) to the boiler. ⚠ Proposed route.',
    path: hop(stopOf({ kind: 'thermostat', at: [545, 361] }), stopOf({ kind: 'junction', at: [219, 351], y: 40 })) });
  devices.push({ id: 'THERMOSTAT', kind: 'thermostat', face: 'z', at: [545, 54, 361.4], notes: 'Smart thermostat (“T”, A3.0), Energy Star connected (WSEC option 3.11).' });

  // service entrance: meter outside to the panel
  runs.push({ id: 'Service entrance', cable: 'service', notes: 'From the meter outside (⚠ location assumed) through the wall to the main panel.', path: [[244, 55, 218], [238.2, 55, 218], [238.2, 84, 218], [235.4, 84, 218]] });

  return { runs, devices };
}
