// ============================================================================
//  WHOLE HOUSE — every number in this file is in INCHES.
//  A single-story house with an attached two-car garage, Chelan, WA.
//  Source: the architectural drawing set, 9 sheets (C1.0 cover and site, A1.0 main floor
//  plan, A2.0/A2.1 elevations, A3.0 electrical, S1.0 foundation and deck framing, S2.0
//  roof framing, S3.0 bracing, S4.0 details). The wall, door and window positions were
//  read straight off the PDF's linework (to about ½″); heights come from the elevations:
//    100′-0″  finished floor (= 0 here)          98′-8″  garage slab (−16″)
//     99′-0″  top of foundation                 108′-1⅛″  plate of the 8′ back walls (97⅛″)
//    112′-0″  garage plate, outside wall (144″)  113′-6″  plate of the tall front wall (162″)
//    113′-6″ / 115′-4″  tops of the garage and house roofs
//  Sheet S3.1 (structural calcs & details) is listed on the cover but is not in the set.
//  Anything marked ⚠ is not on the drawings: assumed, scaled, or a placeholder finish.
//
//  How positions work
//  ------------------
//  • Directions in this file are PLAN directions, with the floor plan read the normal
//    way up: north = the top of A1.0 (the garage door), south = the deck. x = inches
//    east (right) of the garage's west outside face; z = inches south of its north
//    (garage-door) outside face. On the site the plan is turned about 63° (see
//    rooms/site.js), so the viewer calls the deck side west and the garage-door side
//    east; IDs and notes below are written in those TRUE directions.
//  • Walls are boxes: x0–x1 by z0–z1. `inside` names the side the (main) room is on,
//    which is the face that gets the window/door trim. A door's or window's `at` is its
//    distance from the wall's north end (walls running north–south) or west end
//    (walls running east–west), in plan directions; `bottom` is its sill above the
//    house floor (the garage slab is at −16).
//  • The ceilings follow the roofs (there is no attic): in the house it rises from 97⅛″
//    at the back wall to 162″ at the deck wall; in the garage from 97⅛″ by the house to
//    144″ at its outside wall. Every wall runs up to the ceiling over it, and the
//    outside walls carry their siding on up to the soffits.
// ============================================================================

import kitchen from './kitchen.js';
import { houseWiring } from './houseWiring.js';

// ---------- building lines (outside faces unless noted) ----------
const GX0 = 1, GX1 = 241; // garage west and east outside faces (20′-0″)
const GZ1 = 360; // garage south outside face (30′-0″)
const HX0 = 235, HX1 = 775.5; // house west and east outside faces (64′-6½″ overall)
const HZ0 = 240, HZ1 = 552; // house north (back) and south (deck) outside faces (20′ + 26′ = 46′)
const NX = 679.5, NZ = 408; // the deck notch: studio's east wall (outside) and the bedroom's south wall (outside)
const EXT = 6; // exterior wall: 2×6 studs, sheathing and siding

// ---------- ceilings (they follow the roof) ----------
const BACK = 97.125; // 8′ wall plate at the back wall (108′-1⅛″)
const FRONT = 162; // tall wall plate at the deck wall (113′-6″)
const K = (FRONT - BACK) / (HZ1 - EXT - (HZ0 + EXT)); // 0.21625″ per inch, about 2.6:12
const ceil = (z) => BACK + (z - (HZ0 + EXT)) * K;
const GK = (144 - BACK) / (235.4 - 6.4); // garage: 0.2047″ per inch, about 2.5:12
const ROOF_T = 11; // roof top above the ceiling: 9½″ TJIs, sheathing and roofing

// ---------- interior lines (faces read off the plan) ----------
const MUD_Z = 354.5, KIT_Z = 360; // the 2×6 wall between the mudroom/baths and the kitchen/living room
const BATH_X0 = 404.4, BATH_X1 = 476.4; // bath 1, inside faces
const BATH2_X0 = 479.9, BED_X0 = 601.4; // bath 2's west face; the bedroom's west face
const STUDIO_X0 = 551.6; // the studio curtain line

export const CEILING = { K, BACK, FRONT, GK, ceil };

const house = {
  id: 'house',
  kind: 'house',
  name: 'Whole house',
  height: 97.125, // default flat ceiling (only used where no sloped ceiling is set)
  lightEvery: 2, // only every other ceiling light casts real light (performance on phones)

  // ground level relative to the floor inside: the site falls away toward the deck
  // (sketched from the elevations: about level with the garage slab behind the house,
  // 3′–4′ down at the deck, ~5′ at the foot of the stairs) ⚠
  terrain: {
    along: [0, 1],
    profile: [[-900, -24], [0, -17], [300, -15], [440, -18], [552, -34], [648, -46], [730, -54], [900, -74], [1500, -150], [2600, -270]],
    bumps: 10,
    quiet: [-200, -200, 1000, 900],
  },
  sidingBottom: -1,

  palette: {
    ...kitchen.palette,
    cabinets: '#f1efe9',
    cabinetGrain: false,
    doors: '#f4f3ef',
    tileFloor: '#b5b2ab',
    ground: '#b9ad85',
    siding: '#55595d', // charcoal ⚠
    sidingModule: 6, // 6″ vertical siding
    roofing: '#3a3d40', // dark standing-seam metal ⚠
    fascia: '#2c2e30',
    soffit: '#b58a5c', // cedar ⚠
    exteriorTrim: '#2c2e30',
    windowFrame: '#1b1b1b',
    railing: '#1f2123',
    garageDoor: '#3d4043',
    concrete: '#a8a59e',
    slab: '#b3b0a8',
    glulam: '#c99a63',
  },
  style: { ...kitchen.style, doorStyle: 'slab' },

  surfaces: {
    floor: ['finishFloor', 'houseSlab'],
    tileFloor: ['porcelainTile', 'houseSlab'],
    slab: ['garageSlab'],
    walls: ['drywall', 'studs2x4'],
    exteriorWalls: ['drywall', 'studs2x6', 'verticalSiding'],
    ceiling: ['ceilingDrywall'],
    windows: ['window'],
    doors: ['interiorDoor'],
    siding: ['verticalSiding'],
    roof: ['metalRoof', 'roofStructure', 'soffit', 'fascia'],
  },

  // floor outline: the garage (its slab 16″ down) and the house, less the deck notch
  footprint: [
    [GX0, 0, GX1, GZ1, -16],
    [HX0, HZ0, NX, HZ1],
    [NX, HZ0, HX1, NZ],
  ],

  // door: 'swing' | 'pocket' | 'bifold' | 'slider' | 'overhead'; hinge = which jamb the
  // hinges are on (plan direction); swing: 'out' swings away from the `inside` face
  walls: [
    // ---------------- garage ----------------
    {
      id: 'Garage east wall (garage door)', exterior: true, inside: 'south', x0: GX0, z0: 0, x1: GX1, z1: 5.5, base: -12, sidingBottom: -12, baseboard: false,
      notes: 'Garage door wall. 2′-0″ piers either side of the 16′ door (A1.0). 5⁄8″ Type X gypsum is required only on the garage–house walls and ceilings.',
      openings: [
        { id: 'GARAGE DOOR', type: 'door', door: 'overhead', at: 23.9, width: 192, bottom: -16, height: 96, sections: 4, materials: ['garageDoor'],
          notes: '16′-0″ × 8′-0″ sectional overhead door, centred, from the slab (98′-8″). Opener on the ceiling (A3.0).' },
      ],
    },
    {
      id: 'Garage north wall', exterior: true, inside: 'east', x0: GX0, z0: 5.5, x1: 6.4, z1: 354.5, base: -12, sidingBottom: -12, baseboard: false,
      openings: [
        { id: 'GW1', type: 'window', at: 104.5, width: 48, bottom: 34, height: 42, grid: [2, 1], materials: ['window'],
          notes: '4′-0″ × 3′-6″ slider, sill 50″ above the garage slab; centred 11′-2″ from the garage’s east face (A1.0).' },
        { id: 'GARAGE SIDE DOOR', type: 'door', door: 'swing', hinge: 'south', at: 264.5, width: 36, bottom: -16, height: 80, open: 0, materials: ['exteriorDoor'],
          notes: '3′-0″ door, centred 24′-0″ from the garage door wall; swings into the garage (A1.0). Shown closed. Wall light outside and two 3-way switches inside (A3.0).' },
      ],
    },
    { id: 'Garage west wall', exterior: true, inside: 'north', x0: GX0, z0: MUD_Z, x1: HX0 + 0.4, z1: GZ1, base: -12, sidingBottom: -12, baseboard: false,
      notes: 'The garage’s wall toward the deck side, beside the kitchen.' },
    { id: 'Garage south wall (outside)', exterior: true, inside: 'west', x0: 235.4, z0: 5.5, x1: GX1, z1: HZ0, base: -12, sidingBottom: -12, baseboard: false,
      notes: 'Outside wall behind the house. The main electrical panel is on its inside face (A3.0).' },
    {
      id: 'Garage / mudroom wall', inside: 'east', x0: 235.4, z0: HZ0, x1: GX1, z1: MUD_Z, baseboard: 'inside',
      materials: ['drywall', 'typeXGypsum', 'studs2x6'],
      notes: 'Fire separation between the garage and the house: 5⁄8″ Type X gypsum on the garage side (general note 9).',
      openings: [
        { id: 'D-GARAGE', type: 'door', door: 'swing', hinge: 'north', at: 28.8, width: 36, height: 80, open: 70, materials: ['garageHouseDoor'],
          notes: '3′-0″ door from the garage into the mudroom, swinging into the mudroom (A1.0); the garage floor is 16″ lower (a step down, ⚠ not drawn). Self-closing, 1⅜″ solid or 20-minute rated (general note 8).' },
      ],
    },
    // mechanical closet and storage at the deck end of the garage
    { id: 'Mechanical closet north wall', inside: 'east', x0: 123.9, z0: 314.5, x1: 127.4, z1: MUD_Z, base: -16, top: 112, baseboard: false },
    {
      id: 'Mechanical closet front', inside: 'south', x0: 123.9, z0: 314.5, x1: 235.4, z1: 318, base: -16, baseboard: false,
      openings: [{ id: 'D-MECH', type: 'door', door: 'bifold', at: 26.5, width: 62, bottom: -16, height: 80, leaves: 4, open: 0,
        notes: '5′-0″ bifold doors into the mechanical closet (A1.0), shown closed.' }],
    },

    // ---------------- house: outside walls ----------------
    {
      id: 'House east wall (back)', exterior: true, inside: 'south', x0: GX1, z0: HZ0, x1: HX1, z1: HZ0 + EXT,
      notes: 'The low (8′) back wall; the roof slopes down to it. Four high fixed windows (A1.0, A2.0).',
      openings: [
        { id: 'W1', type: 'window', at: 8.9, width: 48, bottom: 62, height: 18, notes: '4′-0″ × 1′-6″ fixed, sill 62″, over the mudroom bench.' },
        { id: 'W2', type: 'window', at: 175.4, width: 48, bottom: 62, height: 18, notes: '4′-0″ × 1′-6″ fixed, sill 62″, in bath 1 (tempered: bath enclosure).' },
        { id: 'W3', type: 'window', at: 245.4, width: 48, bottom: 62, height: 18, notes: '4′-0″ × 1′-6″ fixed, sill 62″, in the shower (tempered).' },
        { id: 'W4', type: 'window', at: 408.4, width: 72, bottom: 62, height: 18, notes: '6′-0″ × 1′-6″ fixed, sill 62″, over the bed in the primary bedroom.' },
      ],
    },
    {
      id: 'House north wall (kitchen, living room)', exterior: true, inside: 'east', x0: HX0, z0: GZ1, x1: HX0 + EXT, z1: HZ1,
      notes: 'The casement window over the sink comes from the kitchen plan (rooms/kitchen.js).',
      openings: [
        { id: 'W5', type: 'window', at: 126, width: 54, bottom: 0, height: 96, notes: '4′-6″ × 8′-0″ fixed, sill at the floor, in the living room (A1.0). Tempered (large fixed pane low to the floor).' },
        { id: 'W5-T', type: 'window', at: 126, width: 54, bottom: 102, height: 30, notes: 'Transom over W5, shown on the left elevation (A2.1). ⚠ Size assumed to match the studio’s 4′-6″ × 2′-6″ transoms; its top follows the roof slope on the elevation.' },
      ],
    },
    {
      id: 'House west wall (deck)', exterior: true, inside: 'north', x0: HX0, z0: HZ1 - EXT, x1: NX, z1: HZ1,
      notes: 'The tall (13′-6″) deck wall: three 10′-6″ × 8′-0″ sliding doors with 10′-6″ × 4′-6″ fixed clerestories above (A1.0, A2.0).',
      openings: [
        { id: 'SGD1', type: 'door', door: 'slider', panels: 3, at: 15.4, width: 126, height: 96, materials: ['slidingDoor'], notes: '10′-6″ × 8′-0″ sliding glass door, kitchen/living room, centred 6′-6″ from the house’s north corner.' },
        { id: 'C1', type: 'window', at: 15.4, width: 126, bottom: 102, height: 54, grid: [1, 1], notes: '10′-6″ × 4′-6″ fixed clerestory, sill 102″.' },
        { id: 'SGD2', type: 'door', door: 'slider', panels: 3, at: 159.4, width: 126, height: 96, materials: ['slidingDoor'], notes: '10′-6″ × 8′-0″ sliding glass door, living room, centred on the deck stairs.' },
        { id: 'C2', type: 'window', at: 159.4, width: 126, bottom: 102, height: 54, notes: '10′-6″ × 4′-6″ fixed clerestory, sill 102″.' },
        { id: 'SGD3', type: 'door', door: 'slider', panels: 3, at: 303.4, width: 126, height: 96, materials: ['slidingDoor'], notes: '10′-6″ × 8′-0″ sliding glass door, studio.' },
        { id: 'C3', type: 'window', at: 303.4, width: 126, bottom: 102, height: 54, notes: '10′-6″ × 4′-6″ fixed clerestory, sill 102″.' },
      ],
    },
    {
      id: 'Studio south wall', exterior: true, inside: 'west', x0: NX - EXT, z0: NZ, x1: NX, z1: HZ1 - EXT,
      notes: 'Faces the deck in the notch beside the bedroom. Two tall fixed windows, each with a transom (A1.0, A2.1).',
      openings: [
        { id: 'W6', type: 'window', at: 12, width: 54, bottom: 0, height: 96, notes: '4′-6″ × 8′-0″ fixed, sill at the floor (tempered).' },
        { id: 'W6-T', type: 'window', at: 12, width: 54, bottom: 102, height: 30, notes: '4′-6″ × 2′-6″ fixed transom, sill 102″ (its top follows the roof on A2.1).' },
        { id: 'W7', type: 'window', at: 78, width: 54, bottom: 0, height: 96, notes: '4′-6″ × 8′-0″ fixed, sill at the floor (tempered).' },
        { id: 'W7-T', type: 'window', at: 78, width: 54, bottom: 102, height: 30, notes: '4′-6″ × 2′-6″ fixed transom, sill 102″.' },
      ],
    },
    {
      id: 'Bedroom west wall', exterior: true, inside: 'north', x0: NX - EXT, z0: NZ - 5.5, x1: HX1, z1: NZ,
      openings: [
        { id: 'SGD4', type: 'door', door: 'slider', panels: 2, at: 17.9, width: 72, height: 96, materials: ['slidingDoor'], notes: '6′-0″ × 8′-0″ sliding glass door from the primary bedroom onto the deck.' },
        { id: 'C4', type: 'window', at: 17.9, width: 72, bottom: 104, height: 24, notes: '6′-0″ × 2′-0″ fixed transom, sill 104″.' },
      ],
    },
    {
      id: 'Bedroom south wall', exterior: true, inside: 'west', x0: HX1 - EXT, z0: HZ0 + EXT, x1: HX1, z1: NZ - 5.5,
      openings: [
        { id: 'W8', type: 'window', at: 18, width: 48, bottom: 12, height: 72, notes: '4′-0″ × 6′-0″ fixed, sill 12″ (tempered).' },
        { id: 'W9', type: 'window', at: 90, width: 48, bottom: 12, height: 72, notes: '4′-0″ × 6′-0″ fixed, sill 12″ (tempered).' },
      ],
    },

    // ---------------- house: inside walls ----------------
    {
      id: 'Mudroom / kitchen wall', inside: 'south', x0: GX1, z0: MUD_Z, x1: 426.9, z1: KIT_Z,
      materials: ['drywall', 'studs2x6'], notes: '2×6 wall (A1.0). The range and refrigerator are on its kitchen side, the washer and dryer on its mudroom side.',
      openings: [{ id: 'OPENING', type: 'opening', at: 145.9, width: 40, height: 84, notes: 'Cased opening between the mudroom and the kitchen/living room, under a header (dashed on A1.0). ⚠ Header height assumed (7′).' }],
    },
    { id: 'Bath / living room wall', inside: 'south', x0: 426.9, z0: MUD_Z, x1: 597.9, z1: KIT_Z, materials: ['drywall', 'studs2x6'],
      notes: '2×6 wall behind the fireplace and bath 2 (A1.0).' },
    { id: 'Bench end wall', inside: 'west', x0: 307.4, z0: HZ0 + EXT, x1: 310.9, z1: 274 },
    {
      id: 'Coat closet front', inside: 'south', x0: 310.9, z0: 270, x1: 400.9, z1: 274,
      openings: [{ id: 'D-COAT', type: 'door', door: 'bifold', at: 9, width: 72, height: 80, leaves: 4, open: 25, notes: '6′-0″ bifold doors (A1.0).' }],
    },
    { id: 'Bath 1 north wall', inside: 'west', x0: 400.9, z0: HZ0 + EXT, x1: BATH_X0, z1: 316 },
    { id: 'Bath 1 west wall', inside: 'north', x0: 400.9, z0: 312, x1: 430.9, z1: 316 },
    {
      id: 'Mudroom / bath 1 wall', inside: 'east', x0: 426.9, z0: 316, x1: 430.9, z1: MUD_Z,
      openings: [{ id: 'D-BATH1', type: 'door', door: 'swing', hinge: 'south', at: 2.2, width: 30, height: 80, open: 75, notes: '2′-6″ door from the mudroom, swinging into bath 1 (A1.0).' }],
    },
    {
      id: 'Bath 1 / bath 2 wall', inside: 'west', x0: BATH_X1, z0: HZ0 + EXT, x1: BATH2_X0, z1: MUD_Z,
      openings: [{ id: 'D-BATHS', type: 'door', door: 'pocket', at: 45, width: 30, height: 80, notes: '2′-6″ pocket door between the two baths (A1.0); shown open, slid into the wall.' }],
    },
    {
      id: 'Shower wall', inside: 'south', x0: BATH2_X0, z0: 284, x1: 540.9, z1: 287.5,
      openings: [{ id: 'D-SHOWER', type: 'door', door: 'swing', hinge: 'east', at: 29.6, width: 30, height: 76, lites: 1, clear: true, color: '#c9ccce', open: 30,
        notes: '2′-4″ glass shower door (A1.0).' }],
    },
    { id: 'Shower / closet wall', inside: 'east', x0: 540.9, z0: HZ0 + EXT, x1: 544.9, z1: 312 },
    { id: 'Walk-in closet west wall', inside: 'north', x0: 540.9, z0: 308, x1: 597.9, z1: 312 },
    {
      id: 'Primary bedroom north wall', inside: 'east', x0: 597.9, z0: HZ0 + EXT, x1: BED_X0, z1: 402,
      openings: [
        { id: 'D-WIC', type: 'door', door: 'pocket', at: 31, width: 28, height: 80, notes: '2′-4″ pocket door into the walk-in closet (A1.0).' },
        { id: 'D-BATH2', type: 'door', door: 'swing', swing: 'out', hinge: 'south', at: 74.7, width: 30, height: 80, open: 75, notes: '2′-6″ door from the bedroom, swinging into bath 2.' },
        { id: 'D-BED', type: 'door', door: 'swing', hinge: 'south', at: 120.5, width: 30, height: 80, open: 80, notes: '2′-6″ door from the hall, swinging into the bedroom.' },
      ],
    },
    { id: 'Bedroom / studio wall', inside: 'north', x0: 549.9, z0: 402, x1: NX - EXT, z1: 406 },
    { id: 'Studio stub wall', inside: 'east', x0: 549.9, z0: 406, x1: 553.4, z1: 428.5, notes: 'Short wall where the studio’s curtain hangs (the wavy line on A1.0).' },
    { id: 'Fireplace niche wall (north)', inside: 'west', x0: 483.9, z0: KIT_Z, x1: 487.4, z1: 384.5, top: 120 },
    { id: 'Fireplace niche wall (south)', inside: 'east', x0: 510.4, z0: KIT_Z, x1: 513.9, z1: 384.5, top: 120 },
  ],

  // Rooms: inside faces of their walls. Labels show their size. Each room also gets
  // its own entry in the room menu unless it has menu: false; `with` lists rooms its
  // view also shows; `level` is the floor height (garage slab −16).
  rooms: [
    { name: 'Garage', x0: 6.4, z0: 5.5, x1: 235.4, z1: 314.5, level: -16, floor: 'concrete', with: ['Garage storage', 'Mechanical closet'],
      notes: 'Two-car garage, 557 sq ft (area schedule, A1.0). Slab at 98′-8″, 16″ below the house.',
      views: { eye: { pos: [200, 48, 300], target: [60, 40, 20] } } },
    { name: 'Garage storage', x0: 6.4, z0: 314.5, x1: 123.9, z1: 354.5, level: -16, floor: 'concrete', menu: false, label: false, notes: 'Storage along the garage’s west wall (“STORAGE”, 10′-3″, A1.0).' },
    { name: 'Mechanical closet', x0: 127.4, z0: 318, x1: 235.4, z1: 354.5, level: -16, floor: 'concrete', notes: 'Boiler and water heater (A1.0, A3.0).' },
    { name: 'Mudroom', x0: GX1, z0: 274, x1: 400.9, z1: MUD_Z, with: ['Mudroom (bench)', 'Mudroom (by bath 1)'], lz: 300,
      notes: 'Washer, dryer and a counter on the kitchen wall; bench and coat closet on the back wall (A1.0).',
      views: { eye: { pos: [395, 64, 345], target: [250, 50, 250] } } },
    { name: 'Mudroom (bench)', x0: GX1, z0: HZ0 + EXT, x1: 307.4, z1: 274, menu: false, label: false },
    { name: 'Mudroom (by bath 1)', x0: 400.9, z0: 316, x1: 426.9, z1: MUD_Z, menu: false, label: false },
    { name: 'Coat closet', x0: 310.9, z0: HZ0 + EXT, x1: 400.9, z1: 270, menu: false },
    { name: 'Bath 1', x0: BATH_X0, z0: HZ0 + EXT, x1: BATH_X1, z1: 312, floor: 'tile', with: ['Bath 1 (door side)'], lz: 290,
      notes: '6′-0″ × 9′-6″ (A1.0). Vanity (V36D) and toilet; fan and a pendant (A3.0).',
      views: { eye: { pos: [470, 64, 302], target: [415, 42, 252] } } },
    { name: 'Bath 1 (door side)', x0: 430.9, z0: 316, x1: BATH_X1, z1: MUD_Z, floor: 'tile', menu: false, label: false },
    { name: 'Bath 2', x0: BATH2_X0, z0: 287.5, x1: 597.9, z1: MUD_Z, floor: 'tile', with: ['Shower'],
      notes: '9′-10″ × 5′-6½″ (A1.0), with the 5′-1″ × 3′-8″ shower in the alcove behind it. Pocket door to bath 1, door to the bedroom. No vanity or toilet is drawn in it.',
      views: { eye: { pos: [590, 64, 345], target: [500, 50, 260] } } },
    { name: 'Shower', x0: BATH2_X0, z0: HZ0 + EXT, x1: 540.9, z1: 284, floor: 'tile', menu: false },
    { name: 'Walk-in closet', x0: 544.9, z0: HZ0 + EXT, x1: 597.9, z1: 308, notes: '4′-5½″ × 5′-8½″ with L-shaped shelving (A1.0).' },
    { name: 'Primary bedroom', x0: BED_X0, z0: HZ0 + EXT, x1: HX1 - EXT, z1: 402, notes: '14′-6″ × 13′-6½″ (A1.0). Sliding door to the deck.',
      views: { eye: { pos: [612, 64, 395], target: [740, 40, 260] } } },
    { name: 'Kitchen', x0: GX1, z0: KIT_Z, x1: 386.9, z1: HZ1 - EXT, notes: 'Detailed in the Kitchen view.', menu: false, lz: 500 },
    { name: 'Living room', x0: 386.9, z0: 384.5, x1: STUDIO_X0, z1: HZ1 - EXT, with: ['Kitchen', 'Entry passage', 'Living (by niche)'],
      notes: '15′-11½″ deep (A1.0). Open to the kitchen; fireplace on the wall shared with the baths.',
      views: { eye: { pos: [250, 64, 535], target: [500, 70, 380] } } },
    { name: 'Entry passage', x0: 386.9, z0: KIT_Z, x1: 426.9, z1: 384.5, menu: false, label: false },
    { name: 'Living (by niche)', x0: 513.9, z0: KIT_Z, x1: STUDIO_X0, z1: 384.5, menu: false, label: false },
    { name: 'Hall', x0: STUDIO_X0, z0: KIT_Z, x1: 597.9, z1: 402, notes: 'Between the living room, the bedroom door and the studio.', menu: false },
    { name: 'Studio', x0: STUDIO_X0, z0: 406, x1: NX - EXT, z1: HZ1 - EXT, notes: '12′-2″ × 12′-2″ (A1.0). Murphy bed on the bedroom wall; a curtain closes it off from the living room.',
      views: { eye: { pos: [560, 64, 540], target: [660, 50, 410] } } },
  ],

  include: [{ config: kitchen, x: GX1, z: KIT_Z, labels: false }],

  // the sloped ceilings, under each roof (see `roof` below)
  ceilings: [
    { id: 'Garage ceiling', x0: GX0, z0: 0, x1: GX1, z1: GZ1, plane: { at: [6.4, 0, 144], slope: [-GK, 0] }, materials: ['typeXGypsum'],
      notes: 'Follows the garage roof: 144″ at the garage’s west wall down to 97⅛″ at the house. 5⁄8″ Type X gypsum.' },
    { id: 'House ceiling', x0: HX0, z0: HZ0, x1: NX, z1: HZ1, plane: { at: [0, HZ0 + EXT, BACK], slope: [0, K] },
      notes: 'Follows the roof: 8′ (97⅛″) at the back wall up to 13′-6″ (162″) at the deck wall. R-60 above.' },
    { id: 'Bedroom ceiling', x0: NX, z0: HZ0, x1: HX1, z1: NZ, plane: { at: [0, HZ0 + EXT, BACK], slope: [0, K] },
      notes: 'Same plane as the rest of the house roof.' },
  ],

  // ceiling and wall lights from the electrical plan (A3.0); kind: can | surface | pendant | sconce
  lights: [
    // garage
    { id: 'L-G1', kind: 'surface', at: [121, 139] }, { id: 'L-G2', kind: 'surface', at: [121, 264] },
    { id: 'L-MECH', kind: 'surface', at: [180, 337], glow: false },
    // mudroom
    { id: 'L-M1', at: [292, 309] }, { id: 'L-M2', at: [350, 309] }, { id: 'L-M3', at: [407, 335] },
    // bath 1: cans and a pendant by the vanity
    { id: 'L-B1', at: [440, 287] }, { id: 'L-B2', at: [453, 335] },
    { id: 'P-B1', kind: 'pendant', at: [412, 256], bottom: 66, notes: 'Pendant beside the vanity (“P”, A3.0).' },
    // bath 2, shower, closet
    { id: 'L-B3', at: [510, 321] }, { id: 'L-B4', at: [568, 335] },
    { id: 'L-SHOWER', type: 'Shower trim light (wet-rated can)', at: [510, 264] },
    { id: 'L-WIC', at: [570, 278] },
    // kitchen / living room (the kitchen's own cans are in rooms/kitchen.js)
    { id: 'L-K5', at: [287, 484] }, { id: 'L-K6', at: [287, 520] }, { id: 'L-K7', at: [346, 519] },
    { id: 'L-L1', at: [405, 411] }, { id: 'L-L2', at: [405, 465] }, { id: 'L-L3', at: [405, 519] },
    { id: 'L-L4', at: [511, 411] }, { id: 'L-L5', at: [511, 465] }, { id: 'L-L6', at: [511, 519] },
    // hall, studio, bedroom
    { id: 'L-H1', at: [560, 381] },
    { id: 'L-S1', at: [613, 453] }, { id: 'L-S2', at: [613, 507] },
    { id: 'L-BR1', at: [634, 279] }, { id: 'L-BR2', at: [634, 369] }, { id: 'L-BR3', at: [736, 279] }, { id: 'L-BR4', at: [736, 369] },
    // outside wall lights
    { id: 'X-1', kind: 'sconce', at: [13, -0.5], face: 'north', y: 74, notes: 'Beside the garage door.' },
    { id: 'X-2', kind: 'sconce', at: [227, -0.5], face: 'north', y: 74, notes: 'Beside the garage door.' },
    { id: 'X-3', kind: 'sconce', at: [GX0 - 0.5, 252], face: 'west', y: 70, notes: 'Beside the garage side door.' },
    { id: 'X-4', kind: 'sconce', at: [243, HZ1 + 0.5], face: 'south', y: 84, notes: 'Deck light, north end.' },
    { id: 'X-5', kind: 'sconce', at: [385.4, HZ1 + 0.5], face: 'south', y: 84, notes: 'Deck light.' },
    { id: 'X-6', kind: 'sconce', at: [529.4, HZ1 + 0.5], face: 'south', y: 84, notes: 'Deck light.' },
    { id: 'X-7', kind: 'sconce', at: [NX - 7, HZ1 + 0.5], face: 'south', y: 84, notes: 'Deck light, south end.' },
    { id: 'X-8', kind: 'sconce', at: [769, NZ + 0.5], face: 'south', y: 84, notes: 'Beside the bedroom’s sliding door.' },
  ],

  // Placed like the kitchen's free-standing items: x/z = north-west corner of the
  // footprint, width across the front, front facing `facing`. 'box' items are
  // world-aligned (width east–west, depth north–south).
  fixtures: [
    // garage and mechanical closet
    { id: 'WH', type: 'Water heater (tank)', kind: 'tank', x: 128.5, z: 325, width: 20, height: 60, color: '#e9e8e4', materials: ['waterHeater'],
      notes: 'Round tank in the mechanical closet (A1.0, A3.0). Gas or propane, UEF ≥ 0.91 (WSEC option 5.4). ⚠ Size typical (50 gal).' },
    { id: 'BOILER', type: 'Boiler', kind: 'box', x: 206, z: 325, width: 27, depth: 22, height: 34, bottom: 0, color: '#d9dadb', materials: ['boiler'],
      notes: 'The square unit in the mechanical closet (A1.0, A3.0), feeding the radiant slab. Gas or propane, AFUE ≥ 90% (WSEC option 3.1A). ⚠ Drawn floor-standing; size scaled from the plan.' },
    { id: 'RADIANT MANIFOLD', type: 'Radiant floor manifold', kind: 'box', x: 160, z: 350.5, width: 26, depth: 4, height: 14, bottom: 30, color: '#b87333', metal: true,
      notes: 'Supply and return manifold for the in-floor radiant loops. ⚠ Location assumed.' },
    { id: 'ELEC PANEL', type: 'Main electrical panel', kind: 'box', x: 231.4, z: 214, width: 4, depth: 14.5, height: 36, bottom: 48, color: '#a7abaf', metal: true,
      notes: 'On the garage’s house-side wall (“ELEC. PANEL”, A3.0). ⚠ Size and rating not on the drawings.' },
    { id: 'GARAGE OPENER', type: 'Garage door opener', kind: 'box', x: 113, z: 82, width: 16, depth: 16, height: 7, bottom: 104, color: '#e5e5e2',
      notes: 'Ceiling-mounted opener (A3.0).' },
    // outside: meter and A/C condenser (A3.0's "AC" symbol behind the house)
    { id: 'METER', type: 'Electric meter', kind: 'box', x: GX1, z: 214, width: 6, depth: 9, height: 14, bottom: 48, color: '#9ea3a8', metal: true,
      notes: '⚠ Not on the drawings: placed outside, back-to-back with the panel.' },
    { id: 'A/C', type: 'Air-conditioning condenser (outside)', kind: 'box', x: 290, z: 186, width: 32, depth: 30, height: 30, bottom: -14, color: '#eeeeea', grille: 'north',
      notes: 'The “AC” unit symbol behind the house by the mudroom (A3.0). ⚠ Size typical.' },
    // mudroom
    { id: 'BENCH', type: 'Mudroom bench', kind: 'bench', x: GX1, z: HZ0 + EXT, width: 66.4, depth: 16, height: 18, facing: 'south', notes: 'Bench under W1 (A1.0).' },
    { id: 'WASHER', type: 'Washer', kind: 'laundry', x: 242, z: 328, width: 30, depth: 26.5, height: 38, facing: 'north', materials: ['energyStar'], notes: 'Energy Star (WSEC option 7.1).' },
    { id: 'DRYER', type: 'Dryer', kind: 'laundry', x: 275, z: 328, width: 30, depth: 26.5, height: 38, facing: 'north', materials: ['energyStar'], notes: 'Vented outside, at least 3′ from any opening (electrical note 1).' },
    { id: 'MUD COUNTER', type: 'Base cabinets with counter', kind: 'base', x: 306.4, z: 329, width: 62, depth: 25, height: 36, facing: 'north', notes: 'Grey counter beside the washer and dryer, 6′-8½″ from the back wall (A1.0).' },
    { id: 'COAT SHELF', type: 'Closet shelf and rod', kind: 'box', x: 311.4, z: 246, width: 89, depth: 14, height: 1, bottom: 66, color: '#efece6' },
    // bath 1
    { id: 'V36D', type: 'Vanity (36″)', code: 'V36D', kind: 'vanity', x: BATH_X0 + 0.5, z: HZ0 + EXT, width: 37, depth: 22, height: 32.5, facing: 'south', notes: 'Vanity “V36D” (A1.0). GFCI receptacle beside it at 3′-6″ (A3.0).' },
    { id: 'WC1', type: 'Toilet', kind: 'toilet', x: 450, z: HZ0 + EXT, width: 19, depth: 28, height: 30, facing: 'south' },
    // bath 2
    { id: 'SHOWER', type: 'Shower (5′-1″ × 3′-8″)', kind: 'alcoveShower', x: BATH2_X0, z: HZ0 + EXT, width: 61, depth: 38, height: 84, facing: 'south', tile: 84, front: false,
      materials: ['showerTile'], notes: 'Shower in the alcove behind bath 2, entered through the glass door (A1.0). Shower-trim light above (A3.0).' },
    { id: 'WIC SHELVES', type: 'Closet shelving (L-shaped)', kind: 'box', x: 544.9, z: HZ0 + EXT, width: 52, depth: 16, height: 1, bottom: 66, color: '#efece6' },
    { id: 'WIC SHELVES 2', type: 'Closet shelving', kind: 'box', x: 544.9, z: 262, width: 16, depth: 46, height: 1, bottom: 66, color: '#efece6', label: false },
    // living room
    { id: 'FIREPLACE', type: 'Fireplace', kind: 'fireplace', x: 427.4, z: KIT_Z, width: 56, depth: 24, height: 54, facing: 'south', fireWidth: 40,
      notes: 'Fireplace on the 2×6 wall, 7′-2½″ including its niche (A1.0). The chimney chase above it runs up through the roof (S2.0). ⚠ Type (gas or wood) not on the drawings.' },
    { id: 'NICHE', type: 'Niche beside the fireplace', kind: 'box', x: 487.4, z: KIT_Z, width: 23, depth: 20, height: 30, bottom: 0, color: '#3d3f42', label: false },
    { id: 'SOFA', type: 'Sectional sofa (as drawn)', kind: 'sofa', x: 515, z: 438, width: 92, depth: 36, height: 32, facing: 'west', chaise: 'left', notes: 'Furniture as drawn on A1.0.' },
    { id: 'CHAIR 1', type: 'Armchair (as drawn)', kind: 'armchair', x: 425, z: 410, width: 32, depth: 32, height: 31, facing: 'south', label: false },
    { id: 'CHAIR 2', type: 'Armchair (as drawn)', kind: 'armchair', x: 425, z: 480, width: 32, depth: 32, height: 31, facing: 'north', label: false },
    { id: 'COFFEE TABLE', type: 'Round coffee table (as drawn)', kind: 'roundTable', x: 470, z: 455, width: 36, height: 16, label: false },
    // studio and bedroom
    { id: 'MURPHY BED', type: 'Murphy bed (folded up)', kind: 'murphyBed', x: 570, z: 406, width: 60, depth: 16, height: 84, facing: 'south', notes: 'Wall bed on the bedroom wall (A1.0).' },
    { id: 'BED', type: 'Bed (as drawn)', kind: 'bed', x: 652.4, z: HZ0 + EXT, width: 66, depth: 84, height: 44, facing: 'south', notes: 'Queen bed under W4, as drawn on A1.0.' },
    { id: 'NIGHTSTAND 1', type: 'Nightstand', kind: 'nightstand', x: 622, z: HZ0 + EXT, width: 24, depth: 16, height: 24, facing: 'south', label: false },
    { id: 'NIGHTSTAND 2', type: 'Nightstand', kind: 'nightstand', x: 727, z: HZ0 + EXT, width: 24, depth: 16, height: 24, facing: 'south', label: false },
  ],

  // Roof (see js/roofBuilder.js): two shed roofs of standing-seam metal. Outlines and
  // overhangs from the roof framing plan (S2.0): 3′ overhangs, 4′ over the deck wall
  // and in front of the bedroom; the house roof overlaps the garage roof at a valley.
  roof: {
    thickness: ROOF_T,
    fascia: 12,
    planes: [
      {
        id: 'House roof',
        // high along the deck wall, falling ~2½:12 to the back; slopes down toward the garage door
        at: [0, HZ0 + EXT, BACK + ROOF_T], slope: [0, K],
        outline: [[276, 204], [810.5, 204], [810.5, 456], [714.5, 456], [714.5, 600], [198.5, 600], [198.5, 283.5]],
        valleys: [6],
        notes: 'Shed roof over the whole house, 115′-4″ at the deck edge, falling to the back (DN arrow, S2.0).',
      },
      {
        id: 'Garage roof',
        at: [6.4, 0, 144 + ROOF_T], slope: [-GK, 0],
        outline: [[-36, -36], [276, -36], [276, 204], [198.5, 283.5], [198.5, 396], [-36, 396]],
        valleys: [2, 3],
        notes: 'Shed roof over the garage, 113′-6″ at its outer edge, falling toward the house; it runs under the house roof at the valley (“overbuild cricket under overlapping roof”, S2.0).',
      },
    ],
    // siding closing the triangle between the garage roof and the house roof's soffit
    fillers: [{ points: [[GX1, 106, 285], [GX1, 106, GZ1], [GX1, ceil(GZ1) + 1.5, GZ1]] }],
    chimneys: [{ id: 'CHIMNEY', x: 428, z: MUD_Z, w: 58, d: 24, top: 188, materials: ['chimney'],
      notes: 'Chimney chase over the fireplace (“chimney framing/venting to extend min 24″ above highest roof structure within a 10′-0″ radius”, S2.0). ⚠ Height set to clear the roof within 10′.' }],
    framing: {
      cover: 1,
      // 6¾″ × 18″ glulams front to back over the house, 5½″ × 13½″ across the garage (S2.0);
      // the two in the open living spaces are exposed below the ceiling
      beams: [
        { id: 'GLB-1', plane: 'House roof', from: [238, 204], to: [238, 600], width: 6.75, depth: 18 },
        { id: 'GLB-2', plane: 'House roof', from: [384.5, 204], to: [384.5, 600], width: 6.75, depth: 18, exposed: { from: [384.5, HZ0 + EXT], to: [384.5, HZ1 - EXT] }, materials: ['glulamHouse'],
          notes: '6¾″ × 18″ 24F-V4 DF glulam, sloping (S2.0). Carries the 9½″ TJIs on hangers, so it hangs about 8½″ below the ceiling.' },
        { id: 'GLB-3', plane: 'House roof', from: [528.5, 204], to: [528.5, 600], width: 6.75, depth: 18, exposed: { from: [528.5, HZ0 + EXT], to: [528.5, HZ1 - EXT] }, materials: ['glulamHouse'],
          notes: '6¾″ × 18″ 24F-V4 DF glulam, sloping (S2.0).' },
        { id: 'GLB-4', plane: 'House roof', from: [676.5, 204], to: [676.5, 600], width: 6.75, depth: 18 },
        { id: 'GLB-5', plane: 'House roof', from: [772.5, 204], to: [772.5, 456], width: 6.75, depth: 18 },
        { id: 'GLB-G1', plane: 'Garage roof', from: [-36, 2.75], to: [276, 2.75], width: 5.5, depth: 13.5 },
        { id: 'GLB-G2', plane: 'Garage roof', from: [-36, 121], to: [276, 121], width: 5.5, depth: 13.5, exposed: { from: [6.4, 121], to: [235.4, 121] }, materials: ['glulamGarage'],
          notes: '5½″ × 13½″ 24F-V4 DF glulam, sloping (S2.0).' },
        { id: 'GLB-G3', plane: 'Garage roof', from: [-36, 239], to: [238, 239], width: 5.5, depth: 13.5, exposed: { from: [6.4, 239], to: [235.4, 239] }, materials: ['glulamGarage'],
          notes: '5½″ × 13½″ 24F-V4 DF glulam, sloping (S2.0).' },
        { id: 'GLB-G4', plane: 'Garage roof', from: [-36, 357], to: [198.5, 357], width: 5.5, depth: 13.5 },
      ],
      joists: [
        { plane: 'House roof', axis: 'x', from: 216, to: 588, spacing: 24, depth: 9.5, width: 1.75 },
        { plane: 'Garage roof', axis: 'z', from: -24, to: 264, spacing: 24, depth: 9.5, width: 1.75 },
      ],
      materials: ['roofStructure', 'glulamHouse', 'glulamGarage'],
      notes: '9½″ TJI 110 joists at 24″ on centre (ITS1.81/9.5 hangers each end) between sloping glulams: 6¾″ × 18″ front to back over the house, 5½″ × 13½″ across the garage. 7⁄16″ plywood roof sheathing. From the roof framing plan S2.0.',
    },
    notes: 'Two shed roofs in standing-seam metal (A2.0): the house roof is high along the deck wall and falls about 2½:12 to the back; the garage roof is high on its outer wall and falls toward the house. The house roof overlaps the garage roof at a valley (S2.0). ⚠ Color not specified.',
  },

  foundation: {
    materials: ['concreteFoundation'],
    notes: '6″ concrete stem walls on continuous footings (S1.0); top of foundation 99′-0″ at the garage. The house and garage slabs sit inside them. Where the ground falls away toward the deck the stem wall shows.',
    walls: [
      { box: [GX0, 0, GX1, 6], top: -12 }, { box: [GX0, 0, GX0 + 6, GZ1], top: -12 }, { box: [GX0, GZ1 - 6, HX0, GZ1], top: -12 }, { box: [235.4, 0, GX1, HZ0], top: -12 },
      { box: [HX0, HZ0, GX1, GZ1], top: 0 },
      { box: [GX1, HZ0, HX1, HZ0 + 6], top: -1 }, { box: [HX0, GZ1, HX0 + 6, HZ1], top: -1 }, { box: [HX0, HZ1 - 6, NX, HZ1], top: -1 },
      { box: [NX - 6, NZ - 6, NX, HZ1], top: -1 }, { box: [NX - 6, NZ - 6, HX1, NZ], top: -1 }, { box: [HX1 - 6, HZ0, HX1, NZ], top: -1 },
    ],
  },

  // Plan dimensions on the ground outside the walls, as written on A1.0.
  dimensions: [
    { from: [GX0, -70], to: [HX1, -70], text: '64′-6½″', notes: 'Overall width (A1.0).' },
    { from: [GX1, -40], to: [HX1, -40], text: '44′-6½″', notes: 'House, from the garage’s outside face (A1.0).' },
    { from: [GX0, -40], to: [GX1, -40], text: '20′-0″', notes: 'Garage (A1.0).' },
    { from: [-60, 0], to: [-60, HZ1], text: '46′-0″', notes: 'Overall depth, garage door to deck wall (A1.0).' },
    { from: [-30, 0], to: [-30, GZ1], text: '30′-0″', notes: 'Garage depth (A1.0).' },
    { from: [HX1 + 60, HZ0], to: [HX1 + 60, NZ], text: '14′-0″', notes: 'Primary bedroom wing (A1.0).' },
    { from: [HX0, 740], to: [NX, 740], text: '37′-0″', notes: 'Deck along the living spaces (A1.0).' },
    { from: [NX, 740], to: [HX1, 740], text: '8′-0″', notes: 'Deck in the notch (A1.0).' },
  ],

  // Decks (see js/deckBuilder.js): ledger on the house wall at z = wallZ; outline =
  // outside of the framing; top = deck surface relative to the floor inside.
  decks: [
    {
      id: 'Deck', wallZ: HZ1, top: -1.5, skirt: 9.25,
      outline: [[HX0, HZ1], [NX, HZ1], [NX, 648], [HX0, 648]],
      joined: [1],
      beams: [80],
      posts: [[247, 632], [331, 632], [415, 632], [499, 632], [587, 632], [675, 632]],
      railing: { height: 36, gaps: [[408, 620, 507, 670]], materials: ['railing'] },
      materials: ['decking'], postMaterials: ['deckPosts'],
      labelAt: [400, 600],
      notes: '37′-0″ along the living spaces × 8′-0″ out; 505 sq ft of deck in all, with the notch and the stairs (area schedule). Joists run out from the ledger to a doubled beam on posts (S1.0). The floor plan hatches the boards running out from the house; they are drawn here across the joists. ⚠ Check which way the owner wants them.',
    },
    {
      id: 'Bedroom deck', wallZ: NZ, top: -1.5, skirt: 9.25,
      outline: [[NX, NZ], [HX1, NZ], [HX1, 648], [NX, 648]],
      houseEdges: [3],
      beams: [64, 150, 224],
      posts: [[690, 472], [764, 472], [690, 558], [764, 558], [764, 632]],
      railing: { height: 36, materials: ['railing'] },
      materials: ['decking'], postMaterials: ['deckPosts'],
      notes: '8′-0″ wide in the notch between the studio and the bedroom, running out 20′ to the line of the main deck (A1.0). Joists hang off a ledger on the bedroom wall (S1.0).',
    },
  ],
  stairs: [
    { id: 'Deck stairs', x0: 409.7, x1: 505.7, z0: 648, top: -1.5, risers: 7, run: 11, materials: ['decking', 'railing'],
      notes: '8′ wide, centred on the middle sliding door, down to a 24″ × 108″ concrete pad (S1.0). ⚠ Rise depends on the finished grade.' },
  ],

  // Plumbing (proposed): kind hot | cold | main | drain | vent | radiant | gas;
  // path = [x, y, z] points. Filled in below.
  plumbing: [],

  // Surroundings: dry shrub-steppe hillside above Lake Chelan: cured bunchgrass, big
  // sagebrush and bitterbrush, scattered ponderosa pines and boulders, a gravel driveway
  // to the garage door and the well (C1.0 shows the well north-east of the building).
  // ⚠ Placed to suit the site plan's sketch, not surveyed.
  environment: {
    center: [400, 330],
    radius: 3200,
    lawn: 'dryGrass',
    beds: [
      // gravel driveway and turnaround at the garage door, running off toward the road
      { kind: 'gravel', shape: [[-200, -40], [330, -40], [360, -260], [200, -700], [40, -1200], [-120, -1200], [10, -700], [-60, -300], [-200, -230]], feather: 30, wobble: 0.04 },
      // bare dirt along the foundation
      { kind: 'dirt', shape: [480, 300, 480, 320, 1], feather: 40, wobble: 0.04 },
    ],
    trees: [
      { kind: 'ponderosa', x: -420, z: 120, height: 820 },
      { kind: 'ponderosa', x: -560, z: 520, height: 700 },
      { kind: 'ponderosa', x: 1050, z: 120, height: 900 },
      { kind: 'ponderosa', x: 1180, z: 700, height: 640 },
      { kind: 'ponderosa', x: 300, z: -900, height: 760 },
      { kind: 'ponderosa', x: 820, z: -620, height: 820 },
      { kind: 'ponderosa', x: -620, z: 1650, height: 560 },
      { kind: 'ponderosa', x: 700, z: 1500, height: 600 },
    ],
    woods: { kind: 'ponderosa', count: 34, r0: 1500, r1: 2900, spacing: 300, gaps: [[60, 140]] },
    shrubs: [
      { kind: 'sage', scatter: [700, 2600], count: 160, size: 44, seed: 5, avoid: [[-220, -1300, 380, -20]] },
      { kind: 'bunchgrass', scatter: [600, 2400], count: 140, size: 22, seed: 9, avoid: [[-220, -1300, 380, -20]] },
      { kind: 'rock', scatter: [900, 2600], count: 30, size: 40, seed: 12, avoid: [[-220, -1300, 380, -20]] },
      { kind: 'sage', x: -120, z: 620, size: 50 }, { kind: 'sage', x: 860, z: 300, size: 46 }, { kind: 'sage', x: 900, z: 520, size: 40 },
      { kind: 'rock', x: -160, z: 420, size: 46 }, { kind: 'rock', x: 920, z: 660, size: 36 },
    ],
    notes: 'Shrub-steppe hillside. ⚠ Positions are rough.',
  },

  views: {
    outside: { pos: [-260, 160, 1320], target: [420, 60, 330] }, // from the deck side, below the house
    eye: { pos: [300, 64, 535], target: [500, 70, 380] },
  },
};

// The well, out past the garage-door end (C1.0 "approx. well location") ⚠
house.fixtures.push({ id: 'WELL', type: 'Well head (approx. location)', kind: 'box', x: 820, z: -760, width: 8, depth: 8, height: 18, bottom: -20, color: '#4a6fa5', metal: true,
  level: 0, notes: 'Approximate well location from the site plan (C1.0), north-east of the building. ⚠ Not surveyed; placed for reference only.' });

// ---------- plumbing (proposed) ----------
// Water comes in from the well to the mechanical closet in the garage; hot water from the
// water heater there. Supply lines run in the walls and under the slab; drains run under
// the slab to a building drain leaving toward the downhill side (cleanout at least 8′
// out, site note 2) and on to the septic ⚠; vents go up through the back (low) side of
// the roof (electrical/mechanical note 2). Radiant loops in the slab come off the boiler's
// manifold. Gas (propane ⚠) feeds the boiler, water heater, range and fireplace.
// Every route here is ⚠ proposed.
{
  const S = -6; // under the slab
  const P = house.plumbing;
  const pipe = (id, kind, path, notes, mats) => P.push({ id, kind, path, notes, materials: mats ?? [{ hot: 'pexHot', cold: 'pexCold', main: 'pexCold', drain: 'pvcDwv', vent: 'pvcDwv', radiant: 'radiantPex', gas: 'gasLine' }[kind]] });
  // water: well line → closet → heater; cold and hot mains under the slab
  pipe('Well line', 'main', [[160, -40, -200], [160, -40, 300], [140, 8, 338], [140, 24, 338]], 'From the well (⚠ route assumed) under the garage slab, up in the mechanical closet to the water heater and the cold manifold.');
  pipe('Cold main', 'cold', [[142, 24, 338], [232, 24, 338], [232, S, 340], [300, S, 340], [300, S, 420], [256, S, 420]], 'Cold water from the closet, through the garage wall and under the slab to the kitchen.');
  pipe('Hot main', 'hot', [[138, 58, 334], [138, 70, 334], [232, 70, 336], [232, S - 2, 342], [302, S - 2, 342], [302, S - 2, 424], [256, S - 2, 424]], 'Hot water from the water heater, under the slab to the kitchen.');
  pipe('Kitchen sink cold', 'cold', [[256, S, 420], [246, S, 418], [246, 20, 418]], 'Up the window wall to the sink.');
  pipe('Kitchen sink hot', 'hot', [[256, S - 2, 424], [246, S - 2, 412], [246, 20, 412]], 'Up the window wall to the sink and dishwasher.');
  pipe('Fridge water', 'cold', [[300, S, 380], [362, S, 380], [362, S, 362], [362, 6, 362]], 'Ice-maker line to the refrigerator.');
  pipe('Laundry cold', 'cold', [[232, S, 340], [262, S, 340], [262, S, 356], [262, 42, 356]], 'To the washer box on the mudroom side of the 2×6 wall.');
  pipe('Laundry hot', 'hot', [[232, S - 2, 342], [266, S - 2, 342], [266, S - 2, 356.5], [266, 42, 356.5]], 'To the washer box.');
  pipe('Bath cold', 'cold', [[300, S, 340], [440, S, 340], [440, S, 300], [420, S, 260], [420, 20, 247], [462, S, 290], [462, 8, 252], [520, S, 290], [520, S, 250], [520, 46, 247.5]], 'Under the slab to bath 1 (vanity, toilet) and the shower valve.');
  pipe('Bath hot', 'hot', [[302, S - 2, 342], [444, S - 2, 342], [444, S - 2, 296], [426, S - 2, 260], [426, 20, 247], [524, S - 2, 296], [524, S - 2, 250], [524, 46, 247.5]], 'Under the slab to the bath 1 vanity and the shower valve.');
  // drains and vents
  pipe('Building drain', 'drain', [[520, S - 10, 262], [520, S - 10, 300], [462, S - 12, 300], [424, S - 13, 300], [300, S - 16, 348], [300, S - 18, 420], [250, S - 20, 420], [200, S - 22, 470], [120, -40, 520], [80, -48, 620]], 'Building drain under the slab, from the shower past bath 1, the laundry and the kitchen, out under the north wall to a cleanout ⚠ and the septic (location not on the drawings).');
  pipe('Shower drain', 'drain', [[510, 0, 265], [510, S - 10, 265], [520, S - 10, 262]], 'Shower drain and trap under the slab.');
  pipe('Toilet', 'drain', [[460, 0, 262], [460, S - 12, 268], [462, S - 12, 300]], '3″ closet bend under the slab.');
  pipe('Vanity drain', 'drain', [[422, 18, 247], [422, S - 13, 252], [424, S - 13, 300]], 'Vanity drain down the back wall.');
  pipe('Laundry drain', 'drain', [[264, 30, 357], [264, S - 16, 357], [300, S - 16, 348]], 'Standpipe for the washer.');
  pipe('Kitchen sink drain', 'drain', [[250, 18, 415], [250, S - 20, 418], [250, S - 20, 420]], 'Sink and dishwasher drain.');
  pipe('Vent stack', 'vent', [[470, 0, 248.5], [470, 125, 248.5]], 'Vent stack in the back wall, out through the low side of the roof.', ['pvcDwv']);
  pipe('Kitchen vent', 'vent', [[238, 18, 415], [238, 150, 415]], 'Kitchen sink vent up the outside wall (⚠ or an air admittance valve under the sink).', ['pvcDwv']);
  // radiant loops in the slab: one serpentine per zone, about 12″ apart, off the manifold
  const loop = (id, x0, z0, x1, z1, step = 12) => {
    const path = [[173, 30, 352], [173, S + 3, 352], [x0, S + 3, 352]];
    let up = true;
    for (let x = x0; x <= x1; x += step) { path.push([x, S + 3, up ? z0 : z1], [x, S + 3, up ? z1 : z0]); up = !up; }
    pipe(id, 'radiant', path, 'Radiant floor loop in the slab (zone schematic, ⚠ spacing and zoning to be designed).');
  };
  loop('Radiant: kitchen/living', 250, 366, 545, 540, 14);
  loop('Radiant: studio', 560, 412, 668, 540, 14);
  loop('Radiant: mudroom/baths', 250, 252, 590, 350, 16);
  loop('Radiant: bedroom', 608, 252, 762, 396, 14);
  // gas (propane tank outside the garage ⚠)
  pipe('Gas service', 'gas', [[-180, -24, 300], [-10, -10, 300], [-10, 30, 300], [-10, 30, 330], [128, 30, 330], [128, 12, 330]], 'From a propane tank outside the garage (⚠ location assumed) into the mechanical closet to the water heater.');
  pipe('Gas to boiler', 'gas', [[128, 30, 330], [218, 30, 330], [218, 18, 330]], 'To the boiler.');
  pipe('Gas to range', 'gas', [[218, 30, 330], [230, 30, 330], [230, S - 4, 338], [305, S - 4, 338], [305, S - 4, 362], [305, 4, 362]], 'Under the slab to the gas range.');
  pipe('Gas to fireplace', 'gas', [[305, S - 4, 338], [455, S - 4, 338], [455, S - 4, 368], [455, 6, 368]], 'Under the slab to the fireplace (⚠ if gas).');
}

// Electrical wiring (the viewer's "Wiring" checkbox), laid out in rooms/houseWiring.js
house.wiring = houseWiring({ house, CEILING, kitchenAt: [GX1, KIT_Z] });

export default house;
