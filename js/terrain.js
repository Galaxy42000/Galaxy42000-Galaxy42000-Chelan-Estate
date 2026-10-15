// Ground level around the house (see `terrain` in rooms/house.js), in inches relative to
// the finished floor inside. The site slopes one way: `profile` lists [distance, height]
// pairs along the direction `along` (a plan unit vector), measured from the plan origin,
// and the ground is interpolated between them (flat past both ends). `bumps` adds gentle
// rolls so the hillside doesn't look machined.
export function terrainFn(t) {
  const [ax, az] = t.along ?? [0, 1];
  const pts = [...t.profile].sort((a, b) => a[0] - b[0]);
  const at = (s) => {
    if (s <= pts[0][0]) return pts[0][1];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [s0, y0] = pts[i], [s1, y1] = pts[i + 1];
      if (s <= s1) {
        const k = (s - s0) / (s1 - s0), e = k * k * (3 - 2 * k); // smooth between points
        return y0 + (y1 - y0) * (t.smooth === false ? k : e);
      }
    }
    return pts[pts.length - 1][1];
  };
  const amp = t.bumps ?? 0;
  // keep the area right around the house as drawn: rolls fade in past `quiet` inches from it
  const [qx0, qz0, qx1, qz1] = t.quiet ?? [0, 0, 0, 0];
  return (x, z) => {
    let y = at(x * ax + z * az);
    if (amp) {
      const dx = Math.max(qx0 - x, 0, x - qx1), dz = Math.max(qz0 - z, 0, z - qz1);
      const fade = Math.min(1, Math.hypot(dx, dz) / 400);
      y += fade * amp * (Math.sin(x / 310 + 1.3) * Math.cos(z / 270 + 0.4) + 0.5 * Math.sin((x + z) / 170));
    }
    return y;
  };
}
