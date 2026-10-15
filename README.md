# Chelan Estate: 3D house viewer

An interactive 3D model of a house in Chelan, WA, built in the browser with [Three.js](https://threejs.org/) from its 9-sheet architectural drawing set. (The drawings themselves are kept out of this repository.) It uses the same viewer as TuPeek. Use the menu at the top left to switch between the **Whole house**, the detailed **Kitchen**, and each room on its own: garage, mechanical closet, mudroom, bath 1, bath 2, walk-in closet, primary bedroom, living room, studio.

## Using the viewer

| Control | What it does |
| --- | --- |
| Drag | Orbit around the room |
| Right-drag / two-finger drag | Pan |
| Scroll / pinch | Zoom |
| Click an object | Shows its ID, measurements, notes (with the drawing sheet they came from) and the materials it's made of |
| **Overview / Eye level / Top down** | Camera presets |
| **Walk** | First-person mode: drag to look, W A S D or arrow keys to move (Shift moves faster), Esc to leave. Touch screens get an on-screen pad. Your eye height follows the floor, so it drops 16″ in the garage. |
| **All labels** | Labels (IDs, widths, room sizes, dimensions) are hidden until you click something. Tick this to show them all. |
| **Cut away walls** | Hides the walls between the camera and the room, dollhouse style |
| **Outside** / **Roof** | (Whole house) Outside views the finished exterior from the deck side, below the house. Untick Roof to hide the roofs. |
| **Plumbing** | A proposed layout: water lines from the well and water heater (red hot, blue cold), drains and vents, the radiant floor loops in the slab (orange) and the gas lines (yellow). Click a pipe for what it does. |
| **Wiring** | Every receptacle, switch, light, smoke alarm, the thermostat, bath fan and panel from the electrical plan (A3.0), wired with a proposed set of circuits. Cables are colour-coded like NM-B (yellow 12 AWG / 20 A, white 14 AWG / 15 A, orange 10 AWG / 30 A). Click a cable for its circuit, or a box for what it is. |
| **Surroundings** | (Whole house) The hillside: cured bunchgrass, sagebrush, ponderosa pines, boulders, the gravel driveway to the garage door, and the well |
| **Framing** | Hides the drywall, siding, ceilings and roofing and shows the framing: 2×6 and 2×4 studs with raked top plates, headers, the glulam beams and TJI roof joists, and the deck framing as a blue line drawing |
| Compass (bottom left) | Always points to true north and shows which way you're facing |

## What the model is built from

All nine sheets of the drawing set were used:

| Sheet | Used for |
| --- | --- |
| C1.0 Cover | General notes, energy-code table, site plan (building orientation, well location), lot requirements |
| A1.0 Main floor plan | Every wall, door and window. Positions were read straight off the PDF's vector linework, to about ½″. Window sizes and sill heights, room sizes, the kitchen layout, the furniture as drawn, the area schedule, the WSEC worksheet (materials) |
| A2.0 / A2.1 Elevations | Plate and roof heights, overhangs, the metal roof and 6″ vertical siding, the deck railings, the grade |
| A3.0 Electrical | Positions of all the lights, receptacles, switches, smoke alarms, the thermostat, the bath fan, the A/C unit and the panel. Mounting heights from its notes |
| S1.0 Foundation and deck framing | Stem walls and footings, deck joists, ledger, beam, posts and piers, the stair pad |
| S2.0 Roof framing | Roof outlines and overhangs, the valley, glulam sizes and positions, TJI layout, the chimney |
| S3.0 Bracing | Wall framing notes |
| S4.0 Details | Wall sections, deck and roof details |

The cover sheet's index also lists **S3.1 (structural calcs & details)**, which isn't in the set.

Values marked ⚠ in the configs and in the viewer's notes are **not** on the drawings. They're assumed (finishes and colors, flooring, cabinet style, the plumbing and circuit routing, the ground's exact shape) or scaled. Everything else came from the sheets.

## Directions

The floor plan is drawn with the garage door at the top and the deck at the bottom. The site plan on the cover shows the building turned so the deck faces west-southwest. The top of the floor plan points to a bearing of about 63°. This is set in [`rooms/site.js`](rooms/site.js) as `planNorthBearing`; the compass uses the exact angle, and wall names snap to the nearest of N/E/S/W (the deck side is "west", the garage-door side "east"). The site plan marks the building location as approximate, so adjust it there if needed.

The config files use **plan directions** for positions (north = top of the floor plan, `x` = left to right, `z` = top to bottom, in inches from the garage's outside corner). Everything the viewer shows uses **true directions**.

## Heights and the roof

Finished floor (100′-0″ on the drawings) is height 0. The garage slab is 16″ lower (98′-8″). There's no attic: the ceilings follow the roofs. The house roof is one shed roof, high along the deck wall (13′-6″ plate) and falling about 2½:12 to the 8′ back wall. The garage roof falls from its outer wall (12′ plate) toward the house, and the house roof overlaps it at the valley drawn on S2.0. The two exposed 6¾″ × 18″ glulams in the living spaces hang below the ceiling, because the TJI joists hang between them. Ceilings are set by `ceilings` (with `plane`) in [`rooms/house.js`](rooms/house.js) and the roofs by `roof.planes`. Every wall runs up to the ceiling over it, and the outside walls carry their siding up to the soffits.

## Materials

What things are made of is recorded in [`rooms/materials.js`](rooms/materials.js), mostly from the drawing notes (framing, sheathing, insulation, glazing U-values, slab, foundation, deck hardware, mechanical equipment from the WSEC worksheet). It shows up when you click an object. Each material has a `name` plus any attributes:

```js
glulamHouse: { name: 'Glulam beam', Size: '6¾″ × 18″', Grade: '24F-V4 Douglas fir' },
```

- `surfaces` in `rooms/house.js` or `rooms/kitchen.js` sets the default for a kind of surface: `floor`, `tileFloor`, `slab`, `walls`, `exteriorWalls`, `ceiling`, `windows`, `doors`, `cabinets`, `counter`, `backsplash`, `siding`, `roof`.
- Any single element can have its own `materials: ['key', …]` list, which replaces the default.
- Colors are in each config's `palette`. They're placeholders (⚠), since the drawings don't give any.

## Changing the building

Everything is in **inches**.

- [`rooms/house.js`](rooms/house.js): walls (with doors and windows), rooms, floor levels, ceilings, roofs and their framing, lights, fixtures and furniture, foundation, decks, stairs, plumbing, the terrain and the surroundings.
- [`rooms/kitchen.js`](rooms/kitchen.js): the kitchen cabinets, appliances, island and lights; it's dropped into the house unchanged.
- [`rooms/houseWiring.js`](rooms/houseWiring.js): the circuits. Device positions are from A3.0.

A door's or window's `at` is its distance from the wall's north end (walls running north–south) or west end (walls running east–west), in plan directions. Every element has an ID (W1, SGD2, GLB-3, V36D, R-K1, S-L2…); click it in the viewer to see it, and refer to it when asking for a change, e.g. "make SGD3 a 12′ door".

## Project layout

```
index.html          page shell + import map (no build step)
sw.js               service worker that turns off caching (always loads the latest version)
css/style.css       UI styles
js/main.js          renderer, cameras, walk mode, click-to-inspect
js/houseBuilder.js  the house config → walls (sloped tops, floor levels), floors, ceilings, foundation, lights, fixtures
js/roomBuilder.js   a room config (the kitchen) → 3D, with a sloped ceiling
js/roofBuilder.js   shed roofs: metal roofing, soffits, fascia, valleys, siding fillers, chimney
js/framingBuilder.js wall studs, raked plates, headers; glulams and TJI roof joists (Framing checkbox)
js/deckBuilder.js   deck boards, skirt, railings, posts on piers, stairs, and the framing line drawing
js/terrain.js       the sloping ground
js/fixtures.js      cabinets, appliances, sink, windows, lights, stools
js/houseFixtures.js toilet, vanity, shower, laundry, furniture, fireplace, mechanical boxes
js/plumbingBuilder.js  plumbing runs (x-ray layer)
js/wiringBuilder.js    electrical cables and boxes (x-ray layer)
js/environmentBuilder.js  the hillside: grass, sagebrush, pines, rocks, driveway (Surroundings)
js/materials.js     materials + procedural textures (wood, siding, metal roof, concrete, tile)
js/compass.js       plan → true directions
js/overlapCheck.js  finds faces that share a plane (flicker) and pulls them apart
rooms/index.js      list of views in the menu
rooms/house.js      the building  ← edit this
rooms/kitchen.js    kitchen layout  ← edit this
rooms/houseWiring.js circuits  ← edit this
rooms/materials.js  materials & finishes shown when you click something  ← edit this
rooms/site.js       which way the plans face
vendor/three/       Three.js r169 (MIT), vendored so the site has no CDN dependency
```

## Running it

**Live site (after GitHub Pages is turned on):** https://galaxy42000.github.io/Galaxy42000-Galaxy42000-Chelan-Estate/

To turn on Pages: **Settings → Pages**, set **Source** to **Deploy from a branch**, choose **main** and **/ (root)**, and save. After a minute or two the site is live.

To run it locally (ES modules need to be served over HTTP):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Flickering surfaces (z-fighting)

Every time a view loads, `js/overlapCheck.js` finds faces that share a plane and pushes the smaller one out by 0.03″. In the browser console, `chelan.checkOverlaps()` lists any still sharing a plane; `?check` in the address bar prints that list after loading, and `?raw` skips the fix.
