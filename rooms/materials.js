// Materials and finishes. Clicking something in the viewer lists the materials it is
// made of, with these attributes. `name` is the heading; every other entry is shown
// as "label: value", in the order written here, so add whatever attributes you like.
//
// Source: the architectural drawing set (C1.0–S4.0) for the house,
// Chelan, WA: general notes, the energy code worksheet (2021 WSEC), the framing,
// foundation and bracing plans and the details. Finishes the drawings don't specify
// (colors, flooring, cabinets, counters) are marked ⚠ and are placeholders.
//
// How things get their materials (rooms/house.js and rooms/kitchen.js):
//  • `surfaces` in a config sets defaults by kind of surface: floor, tileFloor, slab,
//    walls, exteriorWalls, ceiling, windows, doors, cabinets, counter, backsplash,
//    siding, roof.
//  • Any single element (a wall, room, door, cabinet, fixture…) can list its own
//    `materials: ['key', …]`, which replaces the default. An entry can also be an
//    object written out in place, in the same format as below.
export default {
  // ---------- floors ----------
  finishFloor: {
    name: 'Finished floor',
    Look: 'Wide-plank light oak ⚠',
    Note: '⚠ Floor finish is not on the drawings. Laid over the radiant-heated slab, so it needs to be rated for radiant heat.',
  },
  houseSlab: {
    name: 'Concrete slab on grade (house)',
    Thickness: '4″',
    Reinforcing: '#4 bars at 24″ on centre each way',
    Insulation: 'Rigid insulation under the slab: R-10 perimeter and under the entire slab (WSEC option 1.3)',
    Base: 'Compacted granular base',
    Heating: 'In-floor radiant heating (PEX loops in the slab)',
    Source: 'Foundation plan S1.0, details 1 and 5 on S4.0',
  },
  garageSlab: {
    name: 'Concrete slab on grade (garage)',
    Thickness: '4″',
    Level: '98′-8″ (16″ below the house floor at 100′-0″)',
    Reinforcing: '#4 bars at 24″ on centre each way',
    Base: 'Compacted granular base',
    Finish: 'Saw-cut control joints (max 10′-0″ each way)',
  },
  porcelainTile: {
    name: 'Floor tile',
    Look: 'Gray porcelain, 12″ × 24″ ⚠',
    Note: '⚠ Tile is not specified on the drawings.',
  },
  showerTile: {
    name: 'Shower walls',
    Look: 'White 12″ × 24″ porcelain ⚠',
  },

  // ---------- walls, ceilings ----------
  drywall: {
    name: 'Gypsum board',
    Thickness: '½″ ⚠',
    Finish: 'Painted, eggshell ⚠',
  },
  typeXGypsum: {
    name: 'Fire-rated gypsum board (garage side)',
    Thickness: '5⁄8″ Type X',
    Where: 'All garage–dwelling walls and ceilings (applied to the garage side), and all walls, beams and posts supporting them',
    Source: 'General note 9 (C1.0)',
  },
  ceilingDrywall: {
    name: 'Ceiling',
    Construction: 'Gypsum board on the underside of the roof joists (no attic: the ceiling follows the roof)',
    Insulation: 'R-60 advanced (WSEC option 1.3)',
  },
  studs2x6: {
    name: '2×6 wall framing',
    Studs: '2×6 at 16″ on centre, Douglas fir No. 2 or better',
    Plates: 'Double top plate, single bottom plate',
    Sheathing: '7⁄16″ OSB/plywood, APA 24/16, nailed 6″ edges / 12″ field',
    Insulation: 'Outside walls: R-20 cavity + R-5 continuous, or R-13 + R-10 (IRC table N1102.1.2)',
    Note: 'Any load-bearing wall over 10′ tall is 2×6. Shear walls and bracing per S3.0.',
  },
  studs2x4: {
    name: 'Interior wall framing',
    Studs: '2×4 at 16″ on centre (typical unless noted)',
    Note: 'Walls marked “2×6 WALL” on the floor plan (the mudroom/kitchen and bath/living walls) are 2×6.',
  },

  // ---------- outside ----------
  verticalSiding: {
    name: 'Siding',
    Style: '6″ vertical siding (A2.0)',
    Color: 'Charcoal ⚠',
    Note: '⚠ Siding material and color are not on the drawings.',
  },
  metalRoof: {
    name: 'Roofing',
    Type: 'Standing-seam metal roof (A2.0)',
    Color: 'Dark charcoal ⚠',
    Pitch: 'Shed roofs, about 2½:12 (drawn as 2:12)',
    Note: 'Roof penetrations and accessories color-matched to the roof and located on the rear (low side) of the roof.',
  },
  roofStructure: {
    name: 'Roof framing',
    Joists: '9½″ TJI 110 at 24″ on centre, ITS1.81/9.5 hangers each end',
    Sheathing: '7⁄16″ APA rated plywood (rated for 24″ span)',
    Beams: '6¾″ × 18″ 24F-V4 DF glulams (house), 5½″ × 13½″ 24F-V4 DF glulams (garage), sloping',
    Venting: 'Per IRC and local code: soffit and roof vents',
    Source: 'Roof framing plan S2.0',
  },
  glulamHouse: {
    name: 'Glulam beam',
    Size: '6¾″ × 18″',
    Grade: '24F-V4 Douglas fir',
    Note: 'Slopes with the roof, front to back. Drawn exposed below the ceiling (detail 13 on S4.0 shows the gypsum stopping at the beam). ⚠ Check whether it is to be wrapped.',
  },
  glulamGarage: {
    name: 'Glulam beam',
    Size: '5½″ × 13½″',
    Grade: '24F-V4 Douglas fir',
    Note: 'Slopes with the garage roof.',
  },
  soffit: {
    name: 'Soffit',
    Look: 'Tongue-and-groove cedar ⚠, with venting per the roof plan',
  },
  fascia: {
    name: 'Fascia',
    Look: 'Dark painted fascia, color-matched to the roof ⚠',
  },
  concreteFoundation: {
    name: 'Foundation',
    Walls: '6″ concrete stem wall',
    Footing: '16″ wide × 8″ deep continuous (CF16), (2) #4 horizontal continuous; 12″ × 8″ (CF12) at the pony wall',
    Pads: 'PF42: 42″ × 42″ × 8″ deep, (4) #4 each way, under point loads',
    'Top of foundation': '99′-0″ (field verify)',
    'Frost depth': '24″ minimum',
    'Soil bearing': '1,500 psf assumed (per engineer’s calcs)',
  },
  chimney: {
    name: 'Chimney',
    Construction: 'Framed chase with the flue inside ⚠ (the roof plan calls for chimney framing/venting)',
    Height: 'At least 24″ above the highest roof structure within 10′ of any chimney part',
  },

  // ---------- windows and doors ----------
  window: {
    name: 'Window',
    Performance: 'U-0.18 or better (WSEC option 1.3)',
    Frames: 'Black ⚠',
    Safety: 'Tempered where required: glazing within 24″ of a door edge, in shower/bath enclosures, or fixed panels over 9 sq ft with the bottom under 18″',
  },
  slidingDoor: {
    name: 'Sliding glass door',
    Performance: 'U-0.18 or better (WSEC option 1.3)',
    Glass: 'Tempered',
    Frames: 'Black ⚠',
  },
  exteriorDoor: {
    name: 'Exterior door',
    Material: 'Fiberglass (all exterior doors unless noted, A2.0)',
  },
  garageHouseDoor: {
    name: 'Garage to house door',
    Construction: 'Solid wood at least 1⅜″ thick, solid or honeycomb-core steel at least 1⅜″, or 20-minute fire-rated',
    Closer: 'Self-closing, tight-fitting',
    Source: 'General note 8 (C1.0)',
  },
  garageDoor: {
    name: 'Garage door',
    Size: '16′-0″ × 8′-0″',
    Type: 'Sectional overhead ⚠ (style and color not on the drawings)',
    Header: '2-1¾″ × 11⅞″ LVL, 20′-0″ (S2.0)',
  },
  interiorDoor: {
    name: 'Interior door',
    Look: 'Flat-panel, painted ⚠',
  },

  // ---------- kitchen ----------
  oakCabinets: {
    name: 'Cabinets',
    Look: 'Flat-slab white oak ⚠',
    Note: '⚠ Cabinets are not specified; the layout follows the floor plan.',
  },
  islandCabinets: {
    name: 'Island cabinets',
    Look: 'Painted charcoal ⚠',
  },
  quartz: {
    name: 'Countertop',
    Look: 'Light quartz ⚠',
    Thickness: '1½″ ⚠',
  },
  whiteTile: {
    name: 'Backsplash',
    Look: 'White tile ⚠',
  },

  // ---------- deck ----------
  decking: {
    name: 'Decking',
    Look: 'Cedar-tone boards ⚠ (decking finishes by owner, per S4.0)',
    Framing: '2×8 DF No. 2 joists at 16″ on centre with LUS26 hangers; doubled 2×8 beam on posts',
    Ledger: '2×10 DF No. 2 pressure-treated, (2) THDS5600-HG ½″ × 5″ screws at 24″ on centre (detail 1, S1.0)',
  },
  deckPosts: {
    name: 'Deck posts',
    Posts: '6×6 DF No. 2 with Simpson ABA66Z post base and LPC6Z post cap (or equal)',
    Piers: '20″ diameter × 24″ deep concrete piers',
  },
  railing: {
    name: 'Railing',
    Look: 'Black metal posts and horizontal rails ⚠ (railing finishes by owner)',
    Code: 'No opening may pass a 4″ sphere; 36″ high',
  },

  // ---------- mechanical, plumbing ----------
  boiler: {
    name: 'Boiler',
    Type: 'Gas or propane boiler, Energy Star (U.S. North), AFUE at least 90% (WSEC option 3.1A)',
    Serves: 'In-floor radiant heating in the slab',
  },
  waterHeater: {
    name: 'Water heater',
    Type: 'Gas or propane, UEF at least 0.91 (WSEC option 5.4)',
  },
  hrv: {
    name: 'Ventilation',
    Type: 'Heat-recovery ventilator, sensible recovery efficiency at least 0.80 (WSEC option 2.3)',
    Note: '⚠ Location not shown on the drawings.',
  },
  thermostat: {
    name: 'Thermostat',
    Type: 'Connected (smart) thermostat, Energy Star certified (WSEC option 3.11)',
  },
  energyStar: {
    name: 'Appliance',
    Standard: 'New and Energy Star rated (WSEC option 7.1): dishwasher, refrigerator, washer and dryer',
  },
  pexHot: { name: 'Hot water line', Pipe: 'PEX ⚠', Note: 'Proposed route.' },
  pexCold: { name: 'Cold water line', Pipe: 'PEX ⚠', Note: 'Proposed route.' },
  radiantPex: { name: 'Radiant floor loop', Pipe: '½″ PEX in the slab ⚠', Note: 'Loops drawn schematically, about 12″ apart. Spacing and zoning to be designed.' },
  pvcDwv: { name: 'Drain / vent', Pipe: 'PVC or ABS DWV ⚠', Note: 'Under the slab; vents on the rear (low) side of the roof.' },
  gasLine: { name: 'Gas line', Pipe: 'Propane or natural gas ⚠ (CSST or black steel)', Note: 'Proposed route; the drawings show a gas range, boiler, water heater and fireplace.' },
};
