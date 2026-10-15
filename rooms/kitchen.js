// ============================================================================
//  KITCHEN — every number in this file is in INCHES.
//  Source: main floor plan A1.0 (layout: L-shaped counter, range, refrigerator, sink
//  under the casement window, 3′ × 6′ island with three stools) and electrical plan
//  A3.0 (pendants over the island, recessed cans). Cabinet sizes are measured off the
//  plan's linework; finishes are not on the drawings and are placeholders (⚠).
//
//  How positions work
//  ------------------
//  • Walls are named by PLAN direction (north = top of the floor plan, toward the garage
//    door): `north` is the 2×6 wall shared with the mudroom (range and refrigerator),
//    `west` is the outside wall with the casement window (sink and dishwasher). The
//    east and south sides are open to the living room. In true directions (what the
//    viewer shows) the range wall is the east wall and the sink wall the north wall.
//  • The kitchen's (0, 0) is the corner of those two walls: x = inches east of the
//    window wall's inside face, z = inches south of the 2×6 wall's kitchen face.
//    In the house that corner is at plan x = 241, z = 360.
//  • "start" on a wall = distance from that wall's LEFT corner, as you stand in the
//    kitchen facing that wall (north wall: from the window wall; west wall: from the
//    south end of the counter run, 109½″ from the corner).
//  • Items in a run are listed left → right as you face them, and their widths add up.
// ============================================================================

const DEPTH = 109.5; // corner → south end of the window-wall counter (plan z 360 → 469½)
const SLOPE = 0.21625; // the ceiling rises 0.21625″ per inch toward the deck (follows the roof)
const H0 = 97.125 + (360 - 246) * SLOPE; // ceiling height at the 2×6 wall (121¾″)

export default {
  id: 'kitchen',
  name: 'Kitchen',

  room: {
    width: 145.9, // 2×6 wall, window-wall face → end of the wall at the cased opening (plan x 241 → 386.9)
    depth: DEPTH,
    height: H0,
    slope: { dz: SLOPE }, // sloped ceiling under the shed roof
    wallThickness: 5.5,
    walls: {
      north: { extendLeft: 0, extendRight: 0 },
      west: {},
    },
    // floor continues into the living room past the open east and south sides
    floorMargin: { east: 60, south: 76 },
  },

  palette: {
    walls: '#eceae4',
    ceiling: '#f6f5f2',
    trim: '#f3f2ee',
    floor: '#c9a77c', // light oak look ⚠
    floorPlankWidth: 7,
    floorBoards: 'east-west',
    cabinets: '#cfb08a', // flat-slab white oak ⚠
    island: '#3a434a', // painted charcoal ⚠
    cabinetGrain: true,
    counter: '#e9e7e2', // light quartz ⚠
    backsplash: '#f4f3ef', // white tile ⚠
    grout: '#d9d7d1',
    hardware: '#1e1e1e', // matte black
    stoolSeat: '#7c6a58',
    stoolFrame: '#2a2a2a',
    stoolLegs: '#2a2a2a',
    pendant: '#2b2b2b',
    cherry: '#b48a5a',
  },

  surfaces: {
    floor: ['finishFloor', 'houseSlab'],
    walls: ['drywall'],
    ceiling: ['ceilingDrywall'],
    windows: ['window'],
    counter: ['quartz'],
    cabinets: ['oakCabinets'],
    backsplash: ['whiteTile'],
  },

  style: {
    doorStyle: 'slab',
    handle: 'bar',
    baseboard: true,
  },

  // the casement window over the sink, carried onto the house's west (plan) wall
  openings: [
    { id: 'W-KIT', type: 'window', wall: 'west', start: 13, width: 72, bottom: 42, height: 54, grid: [2, 1], materials: ['window'],
      notes: '6′-0″ × 4′-6″ casement, sill at 42″ (A1.0). Centred 5′-0½″ south of the garage’s front wall line; the sink sits a little north of its centre, as drawn.' },
  ],

  baseRuns: [
    {
      id: 'Range wall run',
      wall: 'north',
      start: 36, // after the corner cabinet
      items: [
        { id: 'B1', width: 12.4, fronts: 'doors', doors: 1 },
        { id: 'RANGE', kind: 'range', width: 31, cooktop: 'gas', materials: ['energyStar'], notes: 'Gas range (drawn with four burner grates on A1.0; a 120 V receptacle behind it on A3.0). 31″ space on the plan. ⚠ Model not specified.' },
        { id: 'B2', width: 24, fronts: 'door-drawer' },
      ],
    },
    {
      id: 'Window wall run',
      wall: 'west',
      start: 0, // from the south end of the run, toward the corner
      extendRight: 0.5,
      items: [
        { id: 'B3', width: 13, fronts: 'doors', doors: 1, notes: 'End cabinet at the south end of the run.' },
        { id: 'DW', kind: 'dishwasher', width: 24, materials: ['energyStar'], notes: 'Dishwasher, Energy Star (WSEC option 7.1). Shown dashed on A1.0.' },
        { id: 'SINK', kind: 'sink', width: 36, bowlWidth: 30, bowlDepth: 16, notes: 'Sink base under the casement window (A1.0).' },
      ],
    },
  ],

  corners: [
    { id: 'B4', corner: 'north-west', kind: 'base', size: 36.4, depth: 24, fronts: 'doors', notes: 'Corner cabinet where the two runs meet (drawn as a blind L on the plan; modeled as a 45° corner).' },
    { id: 'U1', corner: 'north-west', kind: 'wall', size: 24, depth: 12, bottom: 54, height: 36 },
  ],

  wallRuns: [
    {
      id: 'Range wall uppers',
      wall: 'north',
      start: 24,
      bottom: 54,
      height: 36,
      items: [
        { id: 'U2', width: 24.4 },
        { id: 'HOOD', kind: 'hood', width: 31, bottom: 66, depth: 20, notes: 'Range hood (the uppers stop either side of the range on A1.0). ⚠ Assumed.' },
        { id: 'U3', width: 24, hinge: 'right' },
      ],
    },
    {
      id: 'Over the refrigerator',
      wall: 'north',
      start: 104.4,
      items: [{ id: 'U4', width: 36, bottom: 72, height: 18, depth: 24, doors: 2, notes: 'Over the refrigerator.' }],
    },
  ],

  tall: [
    { id: 'FRIDGE', type: 'fridge', wall: 'north', start: 104.4, width: 36, height: 70, depth: 30, materials: ['energyStar'], notes: 'Refrigerator, Energy Star. 36″ space at the east end of the range wall (A1.0).' },
  ],

  islands: [
    {
      id: 'ISLAND',
      // 3′ × 6′ island (labelled on A1.0): plan x 306.4–380.4, z 431.5–469.5
      counter: { x: 65.4, z: 71.5, width: 74, depth: 38 },
      rows: [
        {
          facing: 'north', x: 66.4, z: 72.5, depth: 24,
          items: [
            { id: 'I1', width: 24, fronts: 'drawers3' },
            { id: 'I2', width: 24, fronts: 'doors', doors: 2 },
            { id: 'I3', width: 24, fronts: 'drawers3' },
          ],
        },
      ],
      stools: { side: 'south', count: 3, offset: 10, back: 'low', height: 25 },
      notes: 'Seating on the living-room side under a 14″ overhang (three stools drawn on A1.0). A receptacle on its west end (A3.0), fed under the slab.',
    },
  ],

  lighting: {
    // two pendants over the island, 32″ apart (the "P" symbols on A3.0)
    pendants: [{ over: 'ISLAND', count: 2, spacing: 32, bottom: 66 }],
    // recessed cans over the kitchen (A3.0); the rest of the row is in the living room
    cans: [[46, 50], [46, 86], [84, 50], [122, 50]],
  },

  views: {
    eye: { pos: [140, 64, 150], target: [30, 44, 10] },
  },
};
