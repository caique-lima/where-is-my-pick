import * as THREE from 'three';

// Returns a point on the segment from→to at distance `dist` from `from`.
function along(from, to, dist) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const t = dist / len;
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}

// Classic pick: rounded top, sides taper to a pointed tip.
function shapeStandard(hw, hh, ts) {
  const shape = new THREE.Shape();
  const spread = hw * (0.06 + (1 - ts) * 0.36);

  shape.moveTo(0, -hh);

  // right side: tip → widest → right shoulder
  shape.bezierCurveTo(
    spread,    -hh + hh * 0.18,
    hw,        -hh * 0.05,
    hw * 0.54,  hh * 0.54,
  );
  // top arc: right shoulder → top → left shoulder
  shape.bezierCurveTo(
    hw * 0.28,  hh * 1.04,
    -hw * 0.28, hh * 1.04,
    -hw * 0.54, hh * 0.54,
  );
  // left side: left shoulder → widest → tip
  shape.bezierCurveTo(
    -hw,        -hh * 0.05,
    -spread,    -hh + hh * 0.18,
    0,          -hh,
  );

  shape.closePath();
  return shape;
}

// Jazz: slightly more compact and rounder — popular for lead playing.
function shapeJazz(hw, hh, ts) {
  const shape = new THREE.Shape();
  const spread = hw * (0.04 + (1 - ts) * 0.22);

  shape.moveTo(0, -hh);

  shape.bezierCurveTo(
    spread,    -hh + hh * 0.24,
    hw,         0,
    hw * 0.50,  hh * 0.64,
  );
  shape.bezierCurveTo(
    hw * 0.24,  hh * 1.08,
    -hw * 0.24, hh * 1.08,
    -hw * 0.50, hh * 0.64,
  );
  shape.bezierCurveTo(
    -hw,        0,
    -spread,   -hh + hh * 0.24,
    0,         -hh,
  );

  shape.closePath();
  return shape;
}

// Triangle: equilateral with rounded corners — three usable tips.
function shapeTriangle(hw, hh, ts) {
  const shape = new THREE.Shape();
  const r = Math.min(hw, hh) * 0.88;
  // corner rounding radius (more sharpness → smaller radius)
  const cr = r * (0.08 + (1 - ts) * 0.24);

  const top = [0,            r * 0.92];
  const br  = [ r * 0.796,  -r * 0.46];
  const bl  = [-r * 0.796,  -r * 0.46];

  const p0 = along(top, br, cr);
  shape.moveTo(p0[0], p0[1]);

  shape.lineTo(...along(br, top, cr));
  shape.quadraticCurveTo(br[0], br[1], ...along(br, bl, cr));

  shape.lineTo(...along(bl, br, cr));
  shape.quadraticCurveTo(bl[0], bl[1], ...along(bl, top, cr));

  shape.lineTo(...along(top, bl, cr));
  shape.quadraticCurveTo(top[0], top[1], p0[0], p0[1]);

  return shape;
}

// Teardrop: near-circular top, sharp pointed bottom tip.
function shapeTeardrop(hw, hh, ts) {
  const shape = new THREE.Shape();
  const tipY    = -hh;
  const circleY =  hh * 0.08;
  const spread  = hw * (0.03 + (1 - ts) * 0.16);

  shape.moveTo(0, tipY);

  // right side: tip → right edge of the circle
  shape.bezierCurveTo(
    spread,      tipY + hh * 0.42,
    hw * 0.92,   circleY - hh * 0.08,
    hw,          circleY,
  );
  // top semicircle (counterclockwise in math coords = goes through the top)
  shape.absarc(0, circleY, hw, 0, Math.PI, false);

  // left side: left edge of circle → tip
  shape.bezierCurveTo(
    -hw * 0.92,  circleY - hh * 0.08,
    -spread,     tipY + hh * 0.42,
    0,           tipY,
  );

  shape.closePath();
  return shape;
}

// Public API ─────────────────────────────────────────────────────────────────

export function createPickShape(type, width, height, tipSharpness) {
  const hw = width / 2;
  const hh = height / 2;
  const ts = tipSharpness / 100;   // normalise to [0, 1]

  switch (type) {
    case 'jazz':     return shapeJazz(hw, hh, ts);
    case 'triangle': return shapeTriangle(hw, hh, ts);
    case 'teardrop': return shapeTeardrop(hw, hh, ts);
    default:         return shapeStandard(hw, hh, ts);
  }
}

export function createPickGeometry(shape, thickness) {
  // Keep bevel proportional to thickness but capped so it doesn't eat the pick
  const bevel = Math.min(thickness * 0.22, 0.45);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth:          thickness,
    bevelEnabled:   true,
    bevelThickness: bevel,
    bevelSize:      bevel,
    bevelSegments:  4,
    curveSegments:  48,
  });

  // Centre the pick in Z so it sits symmetrically at the origin
  geo.translate(0, 0, -thickness / 2);
  return geo;
}
