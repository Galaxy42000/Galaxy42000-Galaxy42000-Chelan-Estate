import site from '../rooms/site.js';

// Converts plan directions (north = top of the drawing) into true compass directions.
// site.planNorthBearing is the true bearing (degrees clockwise from north) that the top
// of the plan points to; site.planNorthIs ('north' | 'east' | 'south' | 'west') is the
// older quarter-turn form. Names (wall names, notes) snap to the nearest of N/E/S/W;
// the compass needle uses the exact angle.
const ORDER = ['north', 'east', 'south', 'west'];
const BEARING = site.planNorthBearing ?? ORDER.indexOf(site.planNorthIs || 'north') * 90;
const TURN = ((Math.round(BEARING / 90) % 4) + 4) % 4; // quarter turns clockwise, plan → true (for names)
const RANK = { north: 0, south: 1, east: 2, west: 3 };

// 'north' → 'east', 'north-east' → 'south-east', 'east–west' → 'north–south'
export function trueDir(plan) {
  const sep = plan.includes('–') ? '–' : '-';
  return plan
    .split(sep)
    .map((w) => ORDER[(ORDER.indexOf(w) + TURN) % 4])
    .sort((a, b) => RANK[a] - RANK[b])
    .join(sep);
}

export const capDir = (plan) => {
  const d = trueDir(plan);
  return d[0].toUpperCase() + d.slice(1);
};

// Model-space (x, z) unit vector pointing toward a true compass direction (exact angle).
// In the model, plan north is -z and plan east is +x.
const TRUE_BEARING = { north: 0, east: 90, south: 180, west: 270 };
export const trueVec = (dir) => {
  const a = ((TRUE_BEARING[dir] - BEARING) * Math.PI) / 180; // angle from plan north, clockwise
  return [Math.sin(a), -Math.cos(a)];
};

export const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
