import * as THREE from 'three';
import type { Shape, SweepShape, V3 } from '../geometry/shapes';

/**
 * Procedural skeleton. Same conventions as muscleShapes.ts: metres, Y up,
 * the figure faces +Z, coordinates describe the LEFT side (+X) and
 * bilateral parts are mirrored at render time.
 *
 * Each bone has its bony `shapes`, optional `cartilage` (discs, costal
 * cartilage, menisci) and optional `cavities` (orbits, nasal aperture) that
 * are drawn in their own materials.
 */
export interface BonePart {
  boneId: string;
  midline?: boolean;
  shapes: Shape[];
  cartilage?: Shape[];
  cavities?: Shape[];
}

// ───────────────────────── helpers ─────────────────────────

const vec = (p: V3) => new THREE.Vector3(...p);
const arr = (p: THREE.Vector3) => p.toArray() as V3;

const ell = (center: V3, radii: V3, rotation?: V3): Shape => ({ kind: 'ellipsoid', center, radii, rotation });

/**
 * A long bone: thin shaft (diaphysis) flaring into rounded ends (epiphyses).
 * Radii are absolute (metres) at the proximal end, mid-shaft and distal end.
 */
function longBone(points: V3[], rProx: number, rMid: number, rDist: number, extra: Partial<SweepShape> = {}): SweepShape {
  return {
    kind: 'sweep',
    points,
    profile: [
      [0, rProx * 0.35],
      [0.02, rProx * 0.75],
      [0.05, rProx * 0.97],
      [0.09, rProx],
      [0.2, rMid * 1.18],
      [0.36, rMid],
      [0.64, rMid],
      [0.8, rMid * 1.18],
      [0.91, rDist],
      [0.95, rDist * 0.97],
      [0.98, rDist * 0.75],
      [1, rDist * 0.35],
    ],
    capEnds: true,
    ...extra,
  };
}

/** A bar of (roughly) constant radius with softly rounded ends. */
function bar(points: V3[], r: number, extra: Partial<SweepShape> = {}): SweepShape {
  return {
    kind: 'sweep',
    points,
    profile: [
      [0, r * 0.5],
      [0.06, r],
      [0.94, r],
      [1, r * 0.5],
    ],
    capEnds: true,
    ...extra,
  };
}

/** A bar that tapers from `r0` to `r1`. */
function taper(points: V3[], r0: number, r1: number, extra: Partial<SweepShape> = {}): SweepShape {
  return {
    kind: 'sweep',
    points,
    profile: [
      [0, r0 * 0.6],
      [0.08, r0],
      [0.9, r1],
      [1, r1 * 0.4],
    ],
    capEnds: true,
    ...extra,
  };
}

// ───────────────────────── skull ─────────────────────────

function skull(): BonePart {
  const shapes: Shape[] = [
    // Cranial vault — longer front-to-back, widest behind the ears.
    ell([0, 1.637, -0.014], [0.072, 0.073, 0.094]),
    ell([0, 1.615, -0.046], [0.063, 0.06, 0.058]),
    // Temporal regions, widening the skull at ear level.
    ell([0.054, 1.602, -0.01], [0.018, 0.03, 0.04]),
    ell([-0.054, 1.602, -0.01], [0.018, 0.03, 0.04]),
    // Frontal bone / forehead.
    ell([0, 1.645, 0.033], [0.059, 0.056, 0.05]),
    // Midface (maxilla) and cheekbones.
    ell([0, 1.567, 0.058], [0.044, 0.036, 0.038]),
    ell([0.04, 1.58, 0.064], [0.017, 0.015, 0.014]),
    ell([-0.04, 1.58, 0.064], [0.017, 0.015, 0.014]),
    // Brow ridge.
    bar([[-0.048, 1.604, 0.068], [-0.026, 1.611, 0.083], [0, 1.606, 0.088], [0.026, 1.611, 0.083], [0.048, 1.604, 0.068]], 0.0045, { aspect: [1, 0.8], n: [0, 0, 1] }),
    // Zygomatic arches.
    bar([[0.05, 1.578, 0.06], [0.064, 1.576, 0.035], [0.068, 1.578, 0.008], [0.066, 1.585, -0.012]], 0.0045, { aspect: [1.5, 0.7], n: [1, 0, 0] }),
    bar([[-0.05, 1.578, 0.06], [-0.064, 1.576, 0.035], [-0.068, 1.578, 0.008], [-0.066, 1.585, -0.012]], 0.0045, { aspect: [1.5, 0.7], n: [-1, 0, 0] }),
    // Nasal bones.
    bar([[0, 1.598, 0.092], [0, 1.585, 0.1]], 0.005, { aspect: [1.4, 0.6], n: [0, 0.3, 1] }),
    // Mastoid processes.
    ell([0.054, 1.565, -0.026], [0.009, 0.014, 0.01]),
    ell([-0.054, 1.565, -0.026], [0.009, 0.014, 0.01]),
    // Upper alveolar ridge.
    bar([[-0.028, 1.542, 0.05], [-0.022, 1.541, 0.072], [0, 1.54, 0.085], [0.022, 1.541, 0.072], [0.028, 1.542, 0.05]], 0.0055, { aspect: [1.2, 0.8], n: [0, 1, 0] }),
    // Mandible: body, chin and rami.
    bar(
      [[-0.048, 1.519, -0.004], [-0.043, 1.51, 0.032], [-0.03, 1.501, 0.062], [-0.012, 1.496, 0.078], [0, 1.495, 0.081], [0.012, 1.496, 0.078], [0.03, 1.501, 0.062], [0.043, 1.51, 0.032], [0.048, 1.519, -0.004]],
      0.0075,
      { aspect: [2, 0.75], radialFrom: [0, 0, 0.02] },
    ),
    // Chin (mental protuberance).
    ell([0, 1.486, 0.082], [0.014, 0.009, 0.008]),
    // Rami rising up and back to the jaw joint in front of the ear.
    bar([[0.048, 1.515, -0.004], [0.05, 1.54, -0.01], [0.054, 1.568, -0.012]], 0.0068, { aspect: [1.5, 0.55], n: [1, 0, 0] }),
    bar([[-0.048, 1.515, -0.004], [-0.05, 1.54, -0.01], [-0.054, 1.568, -0.012]], 0.0068, { aspect: [1.5, 0.55], n: [-1, 0, 0] }),
    // Coronoid processes.
    taper([[0.047, 1.528, 0.002], [0.048, 1.552, 0.016]], 0.0055, 0.0025),
    taper([[-0.047, 1.528, 0.002], [-0.048, 1.552, 0.016]], 0.0055, 0.0025),
  ];

  // Teeth: upper and lower arches, 8 per side.
  for (const side of [1, -1]) {
    for (let i = 0; i < 8; i++) {
      const s = i / 7;
      const x = side * (0.003 + 0.024 * Math.pow(s, 0.85));
      const z = 0.086 - 0.038 * Math.pow(s, 1.6);
      const w = 0.0025 + 0.0018 * s;
      shapes.push(ell([x, 1.53, z], [w, 0.0058 - 0.001 * s, 0.0026 + 0.0022 * s]));
      shapes.push(ell([x * 0.97, 1.516, z - 0.003], [w * 0.95, 0.0055 - 0.001 * s, 0.0024 + 0.0022 * s]));
    }
  }

  const cavities: Shape[] = [
    // Orbits.
    ell([0.027, 1.591, 0.079], [0.0165, 0.0155, 0.011]),
    ell([-0.027, 1.591, 0.079], [0.0165, 0.0155, 0.011]),
    // Nasal aperture (pear-shaped).
    ell([0, 1.566, 0.093], [0.011, 0.016, 0.006]),
    ell([0, 1.556, 0.093], [0.013, 0.008, 0.006]),
    // External ear canals.
    ell([0.068, 1.58, -0.012], [0.004, 0.005, 0.005]),
    ell([-0.068, 1.58, -0.012], [0.004, 0.005, 0.005]),
  ];

  return { boneId: 'skull', midline: true, shapes, cavities };
}

// ───────────────────────── spine ─────────────────────────

// Curve through the vertebral bodies from C1 down to L5.
const SPINE_CURVE = new THREE.CatmullRomCurve3(
  ([
    [0, 1.538, -0.015],
    [0, 1.43, -0.035],
    [0, 1.28, -0.068],
    [0, 1.12, -0.055],
    [0, 1.02, -0.03],
    [0, 0.968, -0.044],
  ] as V3[]).map(vec),
);

interface VertebraRegion {
  boneId: string;
  count: number;
  /** Body radius (depth); width is 1.3×. */
  r: number;
  /** Relative height weight. */
  weight: number;
  spinousLen: number;
  /** How far the spinous process slopes down, as a fraction of its length. */
  spinousDrop: number;
  transverseLen: number;
}

const REGIONS: VertebraRegion[] = [
  { boneId: 'cervical', count: 7, r: 0.0085, weight: 0.72, spinousLen: 0.016, spinousDrop: 0.35, transverseLen: 0.014 },
  { boneId: 'thoracic', count: 12, r: 0.0118, weight: 1, spinousLen: 0.028, spinousDrop: 0.75, transverseLen: 0.021 },
  { boneId: 'lumbar', count: 5, r: 0.017, weight: 1.38, spinousLen: 0.026, spinousDrop: 0.15, transverseLen: 0.028 },
];

function vertebrae(): BonePart[] {
  const weights = REGIONS.flatMap((g) => Array.from({ length: g.count }, () => g.weight));
  const total = weights.reduce((a, b) => a + b, 0);
  const parts: BonePart[] = [];
  const back = new THREE.Vector3(0, 0, -1);
  const lateral = new THREE.Vector3(1, 0, 0);

  let acc = 0;
  let k = 0;
  let prevTop: THREE.Vector3 | null = null;
  let prevR = 0;

  for (const g of REGIONS) {
    const shapes: Shape[] = [];
    const cartilage: Shape[] = [];
    for (let i = 0; i < g.count; i++, k++) {
      const t0 = acc / total;
      acc += weights[k];
      const t1 = acc / total;
      const span = t1 - t0;
      // Body occupies ~68% of the segment; the rest is the disc below it.
      const top = SPINE_CURVE.getPoint(t0 + span * 0.04);
      const bottom = SPINE_CURVE.getPoint(t1 - span * 0.28);
      const c = top.clone().add(bottom).multiplyScalar(0.5);
      const R = g.r * (0.9 + 0.2 * (i / Math.max(g.count - 1, 1)));
      const P = (b: number, l: number, up = 0) =>
        arr(c.clone().addScaledVector(back, b).addScaledVector(lateral, l).add(new THREE.Vector3(0, up, 0)));

      // Vertebral body: a short, slightly waisted cylinder.
      shapes.push({
        kind: 'sweep',
        points: [arr(bottom), arr(top)],
        profile: [
          [0, R * 0.96],
          [0.12, R],
          [0.5, R * 0.9],
          [0.88, R],
          [1, R * 0.96],
        ],
        aspect: [1.3, 1],
        n: [0, 0, 1],
        capEnds: true,
        segs: 6,
      });

      // Neural arch: pedicles and lamina forming a ring behind the body.
      shapes.push(
        bar([P(R * 0.7, R * 0.85), P(R * 1.6, R * 1.0), P(R * 2.25, R * 0.45), P(R * 2.4, 0), P(R * 2.25, -R * 0.45), P(R * 1.6, -R * 1.0), P(R * 0.7, -R * 0.85)], R * 0.26, {
          aspect: [1.4, 0.8],
          n: [0, 1, 0],
          capEnds: false,
        }),
      );

      // Spinous process: a tall thin blade sloping down and back.
      const spLen = g.spinousLen * (g.boneId === 'cervical' && i === g.count - 1 ? 1.6 : 1);
      shapes.push({
        kind: 'sweep',
        points: [P(R * 2.3, 0), P(R * 2.3 + spLen, 0, -spLen * g.spinousDrop)],
        profile: [
          [0, R * 0.45],
          [0.8, R * 0.32],
          [0.93, R * 0.38],
          [1, R * 0.15],
        ],
        aspect: [1.6, 0.55],
        n: [1, 0, 0],
        capEnds: true,
        segs: 8,
      });

      // Transverse processes.
      for (const s of [1, -1]) {
        shapes.push(
          taper([P(R * 1.5, s * R * 1.0), P(R * 1.5 + g.transverseLen * 0.45, s * (R + g.transverseLen))], R * 0.28, R * 0.2, {
            segs: 8,
          }),
        );
      }

      // Intervertebral disc between this body and the one above.
      if (prevTop) {
        const discR = (prevR + R) / 2;
        cartilage.push({
          kind: 'sweep',
          points: [arr(top), arr(prevTop)],
          profile: [
            [0, discR * 0.95],
            [0.5, discR * 1.02],
            [1, discR * 0.95],
          ],
          aspect: [1.3, 1],
          n: [0, 0, 1],
          capEnds: true,
          segs: 4,
        });
      }
      prevTop = bottom;
      prevR = R;
    }
    parts.push({ boneId: g.boneId, midline: true, shapes, cartilage });
  }
  return parts;
}

// ───────────────────────── thorax ─────────────────────────

/** Sternum surface position (midline) at a given height. */
function sternumZ(y: number) {
  return 0.072 + ((1.395 - y) / (1.395 - 1.18)) * 0.038;
}

function ribs(): BonePart {
  // [height at spine, half-width, angle where bone ends (deg), drop toward front, cartilage target]
  type RibSpec = [number, number, number, number, V3 | null];
  const specs: RibSpec[] = [
    [1.415, 0.058, 42, 0.03, [0.016, 1.384, sternumZ(1.384)]],
    [1.395, 0.088, 46, 0.045, [0.016, 1.355, sternumZ(1.355)]],
    [1.37, 0.108, 48, 0.055, [0.016, 1.325, sternumZ(1.325)]],
    [1.345, 0.122, 50, 0.068, [0.016, 1.295, sternumZ(1.295)]],
    [1.32, 0.132, 51, 0.078, [0.016, 1.265, sternumZ(1.265)]],
    [1.295, 0.138, 51, 0.088, [0.016, 1.235, sternumZ(1.235)]],
    [1.27, 0.142, 49, 0.095, [0.016, 1.205, sternumZ(1.205)]],
    [1.245, 0.144, 42, 0.095, [0.04, 1.18, 0.112]],
    [1.22, 0.143, 34, 0.09, [0.062, 1.158, 0.104]],
    [1.195, 0.14, 26, 0.085, [0.082, 1.135, 0.093]],
    [1.17, 0.133, 0, 0.05, null],
    [1.148, 0.118, -28, 0.03, null],
  ];
  const depth = 0.1;
  const zc = -0.005;
  const shapes: Shape[] = [];
  const cartilage: Shape[] = [];

  specs.forEach(([y, halfW, endDeg, drop, target], i) => {
    const d = depth * (i < 2 ? 0.82 : 1);
    const start = -78;
    const steps = 9;
    const spineZ = SPINE_CURVE.getPoint(1 - (y - 0.968) / (1.538 - 0.968)).z;
    // Head and neck of the rib articulate with the vertebra, then the rib
    // runs back before turning forward (the "angle" of the rib).
    const pts: V3[] = [[0.014, y + 0.004, spineZ - 0.006]];
    for (let s = 0; s <= steps; s++) {
      const deg = start + ((endDeg - start) * s) / steps;
      const rad = (deg * Math.PI) / 180;
      const f = s / steps;
      pts.push([halfW * Math.cos(rad), y - drop * f * f, d * Math.sin(rad) + zc]);
    }
    const ribHeight = i < 2 ? 0.0065 : 0.0085;
    shapes.push({
      kind: 'sweep',
      points: pts,
      profile: [
        [0, ribHeight * 0.5],
        [0.06, ribHeight * 0.7],
        [0.18, ribHeight],
        [0.92, ribHeight],
        [1, target ? ribHeight * 0.9 : ribHeight * 0.3],
      ],
      // Ribs are flat bands: tall and thin, facing outward.
      aspect: [1, 0.42],
      radialFrom: [0, y, zc],
      capEnds: true,
      segs: 40,
      radial: 10,
    });

    if (target) {
      const end = pts[pts.length - 1];
      const mid: V3 = [(end[0] + target[0]) / 2, (end[1] + target[1]) / 2, Math.max(end[2], target[2]) + 0.01];
      cartilage.push({
        kind: 'sweep',
        points: [end, mid, target],
        profile: [
          [0, ribHeight * 0.85],
          [0.85, ribHeight * 0.75],
          [1, ribHeight * 0.55],
        ],
        aspect: [0.85, 0.45],
        radialFrom: [0, y, zc],
        capEnds: true,
        segs: 14,
        radial: 10,
      });
    }
  });
  return { boneId: 'ribs', shapes, cartilage };
}

function sternum(): BonePart {
  // Rows from manubrium (top) to xiphoid; columns from right to left edge.
  const rows: [number, number][] = [
    [1.398, 0.025],
    [1.375, 0.027],
    [1.352, 0.017],
    [1.31, 0.019],
    [1.25, 0.021],
    [1.2, 0.016],
    [1.178, 0.007],
  ];
  const grid = rows.map(([y, w]) => [[-w, y, sternumZ(y)], [0, y, sternumZ(y) + 0.003], [w, y, sternumZ(y)]] as V3[]);
  return {
    boneId: 'sternum',
    midline: true,
    shapes: [
      { kind: 'patch', grid, thickness: 0.009, segU: 8, segV: 24 },
      // Sternal angle ridge.
      bar([[-0.016, 1.352, sternumZ(1.352) + 0.004], [0.016, 1.352, sternumZ(1.352) + 0.004]], 0.003),
    ],
  };
}

// ───────────────────────── shoulder girdle & arm ─────────────────────────

const clavicle: BonePart = {
  boneId: 'clavicle',
  shapes: [
    {
      kind: 'sweep',
      // S-curve: convex forward medially, concave laterally.
      points: [[0.018, 1.402, 0.074], [0.055, 1.41, 0.083], [0.1, 1.418, 0.066], [0.14, 1.426, 0.03], [0.168, 1.431, 0.0], [0.176, 1.432, -0.012]],
      profile: [
        [0, 0.006],
        [0.03, 0.0095],
        [0.12, 0.0085],
        [0.5, 0.0062],
        [0.85, 0.0068],
        [0.96, 0.0072],
        [1, 0.004],
      ],
      aspect: [1, 0.75],
      n: [0, 1, 0],
      capEnds: true,
      segs: 40,
    },
  ],
};

const scapula: BonePart = {
  boneId: 'scapula',
  shapes: [
    // Blade, curved to follow the rib cage. Rows: top → inferior angle; columns: medial → lateral.
    {
      kind: 'patch',
      grid: [
        [[0.066, 1.4, -0.099], [0.11, 1.396, -0.094], [0.15, 1.384, -0.072]],
        [[0.07, 1.33, -0.105], [0.118, 1.325, -0.1], [0.154, 1.34, -0.068]],
        [[0.078, 1.26, -0.104], [0.11, 1.255, -0.1], [0.136, 1.27, -0.084]],
        [[0.087, 1.215, -0.099], [0.093, 1.212, -0.099], [0.099, 1.214, -0.098]],
      ],
      thickness: 0.0045,
      segU: 14,
      segV: 18,
    },
    // Thickened lateral border.
    bar([[0.158, 1.355, -0.05], [0.142, 1.3, -0.075], [0.115, 1.25, -0.093], [0.093, 1.214, -0.099]], 0.0045),
    // Spine of the scapula rising to the acromion.
    {
      kind: 'sweep',
      points: [[0.07, 1.362, -0.105], [0.11, 1.375, -0.11], [0.15, 1.398, -0.098], [0.172, 1.418, -0.07], [0.18, 1.43, -0.04]],
      profile: [
        [0, 0.0025],
        [0.3, 0.005],
        [0.75, 0.0065],
        [1, 0.007],
      ],
      aspect: [1, 1.5],
      n: [0, 0.3, -1],
      capEnds: true,
      segs: 30,
    },
    // Acromion: flat, overhanging the shoulder joint.
    ell([0.181, 1.433, -0.022], [0.012, 0.0045, 0.019], [0, 0, -0.15]),
    // Coracoid process hooking forward.
    taper([[0.148, 1.382, -0.03], [0.155, 1.395, 0.0], [0.152, 1.39, 0.03]], 0.0065, 0.004),
    // Glenoid fossa and neck.
    ell([0.168, 1.372, -0.024], [0.0055, 0.019, 0.013]),
    ell([0.16, 1.372, -0.03], [0.008, 0.016, 0.012]),
  ],
};

const humerus: BonePart = {
  boneId: 'humerus',
  shapes: [
    // Head, facing medially and backward into the glenoid.
    ell([0.181, 1.377, -0.016], [0.021, 0.023, 0.022]),
    // Greater and lesser tubercles, blending into the neck of the humerus.
    ell([0.195, 1.378, -0.006], [0.011, 0.016, 0.014]),
    ell([0.185, 1.37, 0.008], [0.006, 0.008, 0.006]),
    longBone([[0.19, 1.36, -0.008], [0.217, 1.235, -0.011], [0.238, 1.13, -0.018]], 0.0145, 0.0098, 0.014, { aspect: [1.15, 1], n: [0, 0, 1] }),
    // Distal end: wide between the epicondyles, with trochlea and capitulum.
    ell([0.244, 1.113, -0.02], [0.028, 0.011, 0.012], [0, 0, 0.22]),
    ell([0.222, 1.108, -0.024], [0.008, 0.008, 0.008]),
    ell([0.267, 1.118, -0.021], [0.006, 0.007, 0.007]),
    ell([0.24, 1.103, -0.012], [0.012, 0.0095, 0.011]),
    ell([0.256, 1.106, -0.011], [0.0075, 0.008, 0.009]),
  ],
};

const ulna: BonePart = {
  boneId: 'ulna',
  shapes: [
    // Olecranon (point of the elbow) and trochlear notch.
    ell([0.237, 1.108, -0.036], [0.0085, 0.017, 0.0095]),
    ell([0.24, 1.095, -0.022], [0.008, 0.007, 0.008]),
    longBone([[0.237, 1.1, -0.03], [0.262, 0.98, -0.011], [0.286, 0.872, 0.003]], 0.0095, 0.0058, 0.0062),
    // Head and styloid process.
    ell([0.287, 0.869, 0.003], [0.0065, 0.006, 0.0065]),
    taper([[0.287, 0.866, -0.002], [0.289, 0.856, -0.003]], 0.003, 0.0015),
  ],
};

const radius: BonePart = {
  boneId: 'radius',
  shapes: [
    // Disc-shaped head.
    {
      kind: 'sweep',
      points: [[0.258, 1.097, -0.012], [0.259, 1.085, -0.011]],
      profile: [
        [0, 0.0085],
        [1, 0.0085],
      ],
      capEnds: true,
      segs: 2,
    },
    longBone([[0.259, 1.085, -0.011], [0.29, 0.975, 0.006], [0.312, 0.874, 0.02]], 0.006, 0.0062, 0.0125, { aspect: [1.25, 0.8], n: [0, 0, 1] }),
    // Radial styloid.
    taper([[0.319, 0.868, 0.02], [0.322, 0.858, 0.02]], 0.004, 0.002),
  ],
};

function hand(): BonePart {
  const shapes: Shape[] = [];
  // Carpals: two rows of four.
  const carpalX = [0.292, 0.301, 0.31, 0.319];
  carpalX.forEach((x, i) => {
    shapes.push(ell([x, 0.857, 0.014 + i * 0.001], [0.0048, 0.0045, 0.0058]));
    shapes.push(ell([x + 0.001, 0.846, 0.016 + i * 0.001], [0.0047, 0.0048, 0.006]));
  });

  // Fingers from little (medial) to index (lateral). Palm faces +Z.
  const fingers: { x: number; len: number[] }[] = [
    { x: 0.291, len: [0.043, 0.021, 0.014, 0.013] },
    { x: 0.3, len: [0.05, 0.027, 0.018, 0.015] },
    { x: 0.309, len: [0.053, 0.03, 0.019, 0.015] },
    { x: 0.318, len: [0.05, 0.027, 0.017, 0.014] },
  ];
  fingers.forEach((f, i) => {
    const spread = (i - 1.5) * 0.06;
    const dir = new THREE.Vector3(0.2 + spread, -0.98, 0.05).normalize();
    let p = new THREE.Vector3(f.x, 0.838, 0.017);
    f.len.forEach((l, j) => {
      const q = p.clone().addScaledVector(dir, l);
      const r = j === 0 ? 0.0034 : j === 3 ? 0.0026 : 0.003;
      shapes.push(longBone([arr(p), arr(q)], r * 1.35, r, r * 1.25, { segs: 12, radial: 10 }));
      p = q.addScaledVector(dir, 0.0015);
    });
  });

  // Thumb: metacarpal and two phalanges, angled forward.
  const thumb: V3[] = [[0.322, 0.842, 0.021], [0.336, 0.812, 0.033], [0.346, 0.789, 0.041], [0.353, 0.769, 0.047]];
  for (let j = 0; j < 3; j++) {
    const r = j === 0 ? 0.0036 : 0.0031;
    shapes.push(longBone([thumb[j], thumb[j + 1]], r * 1.35, r, r * 1.25, { segs: 12, radial: 10 }));
  }
  return { boneId: 'hand', shapes };
}

// ───────────────────────── pelvis ─────────────────────────

const pelvis: BonePart = {
  boneId: 'pelvis',
  shapes: [
    // Iliac wing: a curved fan rising from the acetabulum to the iliac crest.
    // Rows: bottom → crest; columns: front (ASIS) → back (PSIS).
    {
      kind: 'patch',
      grid: [
        [[0.096, 0.918, 0.044], [0.088, 0.926, 0.004], [0.062, 0.93, -0.046]],
        [[0.112, 0.948, 0.062], [0.12, 0.966, 0.004], [0.066, 0.966, -0.062]],
        [[0.116, 0.963, 0.076], [0.14, 1.004, 0.008], [0.058, 0.998, -0.068]],
      ],
      thickness: 0.0075,
      segU: 18,
      segV: 14,
    },
    // Iliac crest — thickened rim from ASIS round to PSIS.
    bar([[0.116, 0.961, 0.078], [0.131, 0.988, 0.05], [0.14, 1.004, 0.008], [0.122, 1.006, -0.04], [0.084, 0.998, -0.066], [0.056, 0.975, -0.07]], 0.0058),
    // Body of the ilium joining the sacrum (auricular surface).
    ell([0.054, 0.948, -0.062], [0.012, 0.032, 0.018], [0.3, 0, 0.15]),
    // Acetabulum: rim + bony mass behind it.
    {
      kind: 'sweep',
      points: Array.from({ length: 9 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const centre = new THREE.Vector3(0.088, 0.9, 0.02);
        const face = new THREE.Vector3(0.8, -0.3, 0.5).normalize();
        const u = new THREE.Vector3(0, 1, 0).cross(face).normalize();
        const w = face.clone().cross(u).normalize();
        return arr(centre.addScaledVector(u, Math.cos(a) * 0.025).addScaledVector(w, Math.sin(a) * 0.025).addScaledVector(face, -0.004));
      }),
      profile: [
        [0, 0.005],
        [1, 0.005],
      ],
      closed: true,
      segs: 40,
      radial: 10,
    },
    ell([0.074, 0.9, 0.016], [0.02, 0.028, 0.027]),
    // Superior pubic ramus to the symphysis.
    bar([[0.08, 0.906, 0.04], [0.052, 0.893, 0.064], [0.024, 0.878, 0.074], [0.007, 0.87, 0.077]], 0.0072),
    // Body of the pubis.
    ell([0.012, 0.86, 0.075], [0.008, 0.017, 0.008]),
    // Inferior pubic + ischial ramus, closing the obturator foramen.
    bar([[0.01, 0.848, 0.071], [0.03, 0.832, 0.052], [0.05, 0.822, 0.016], [0.062, 0.824, -0.026]], 0.0062),
    // Ischium body and tuberosity (sitting bone).
    bar([[0.062, 0.826, -0.03], [0.072, 0.858, -0.022], [0.078, 0.885, -0.004]], 0.0105),
    ell([0.062, 0.822, -0.036], [0.011, 0.015, 0.013]),
    // Ischial spine.
    taper([[0.07, 0.87, -0.04], [0.058, 0.872, -0.056]], 0.005, 0.002),
  ],
  cartilage: [
    // Pubic symphysis.
    ell([0.003, 0.862, 0.077], [0.004, 0.015, 0.008]),
  ],
};

const sacrum: BonePart = {
  boneId: 'sacrum',
  midline: true,
  shapes: [
    // Curved triangular plate, concave forward. Rows: base → apex.
    {
      kind: 'patch',
      grid: [
        [[-0.046, 0.972, -0.054], [0, 0.976, -0.05], [0.046, 0.972, -0.054]],
        [[-0.038, 0.935, -0.07], [0, 0.937, -0.068], [0.038, 0.935, -0.07]],
        [[-0.026, 0.895, -0.08], [0, 0.896, -0.079], [0.026, 0.895, -0.08]],
        [[-0.009, 0.857, -0.076], [0, 0.856, -0.075], [0.009, 0.857, -0.076]],
      ],
      thickness: 0.017,
      segU: 12,
      segV: 16,
    },
    // Median sacral crest (fused spinous processes).
    bar([[0, 0.965, -0.064], [0, 0.93, -0.083], [0, 0.89, -0.092], [0, 0.865, -0.087]], 0.0035, { aspect: [0.7, 1.3], n: [0, 0, -1] }),
    // Coccyx: small tapering segments.
    taper([[0, 0.855, -0.075], [0, 0.838, -0.066], [0, 0.826, -0.054]], 0.0055, 0.0025),
  ],
};

// ───────────────────────── leg ─────────────────────────

const femur: BonePart = {
  boneId: 'femur',
  shapes: [
    ell([0.087, 0.9, 0.02], [0.021, 0.022, 0.022]),
    // Neck, angled ~125° to the shaft.
    bar([[0.092, 0.897, 0.018], [0.115, 0.884, 0.011], [0.136, 0.872, 0.004]], 0.0115, { aspect: [1, 0.8], n: [0, 0, 1] }),
    // Greater and lesser trochanters.
    ell([0.148, 0.884, -0.006], [0.013, 0.024, 0.018]),
    ell([0.113, 0.845, -0.008], [0.008, 0.009, 0.008]),
    // Shaft with a slight forward bow.
    longBone([[0.14, 0.868, 0.0], [0.128, 0.7, 0.016], [0.103, 0.53, 0.004]], 0.019, 0.0122, 0.022, { aspect: [1, 1.1], n: [0, 0, 1] }),
    // Linea aspera ridge on the back of the shaft.
    bar([[0.133, 0.8, -0.01], [0.124, 0.7, 0.0], [0.114, 0.6, -0.005]], 0.003),
    // Condyles.
    ell([0.08, 0.49, -0.003], [0.016, 0.022, 0.03]),
    ell([0.113, 0.492, -0.003], [0.016, 0.021, 0.028]),
    ell([0.097, 0.512, 0.008], [0.03, 0.022, 0.021]),
  ],
};

const patella: BonePart = {
  boneId: 'patella',
  shapes: [
    {
      kind: 'sweep',
      points: [[0.097, 0.52, 0.042], [0.097, 0.478, 0.044]],
      profile: [
        [0, 0.012],
        [0.35, 0.02],
        [0.7, 0.016],
        [1, 0.004],
      ],
      aspect: [1, 0.45],
      n: [0, 0, 1],
      capEnds: true,
      segs: 12,
    },
  ],
};

const tibia: BonePart = {
  boneId: 'tibia',
  shapes: [
    // Tibial plateau and proximal flare.
    ell([0.095, 0.463, 0.004], [0.039, 0.011, 0.029]),
    ell([0.094, 0.443, 0.006], [0.03, 0.024, 0.024]),
    // Tibial tuberosity (patellar tendon insertion).
    ell([0.097, 0.425, 0.028], [0.008, 0.012, 0.006]),
    // Shaft — triangular in section, so flatten it slightly.
    longBone([[0.093, 0.44, 0.008], [0.092, 0.26, 0.012], [0.091, 0.09, 0.003]], 0.02, 0.0105, 0.016, { aspect: [0.9, 1.1], n: [0, 0, 1] }),
    // Anterior border (shin).
    bar([[0.096, 0.41, 0.026], [0.095, 0.26, 0.024], [0.092, 0.14, 0.017]], 0.0028),
    // Medial malleolus.
    ell([0.079, 0.07, 0.0], [0.008, 0.017, 0.011]),
  ],
  cartilage: [
    // Menisci.
    ell([0.08, 0.473, 0.0], [0.015, 0.0028, 0.021]),
    ell([0.112, 0.473, 0.0], [0.014, 0.0028, 0.019]),
  ],
};

const fibula: BonePart = {
  boneId: 'fibula',
  shapes: [
    ell([0.128, 0.443, -0.013], [0.0085, 0.011, 0.0085]),
    longBone([[0.128, 0.44, -0.013], [0.126, 0.26, -0.015], [0.122, 0.085, -0.012]], 0.0065, 0.0048, 0.0068),
    // Lateral malleolus (sits lower than the medial one).
    ell([0.122, 0.062, -0.012], [0.0075, 0.018, 0.011]),
  ],
};

function foot(): BonePart {
  const shapes: Shape[] = [
    // Talus with its rounded dome.
    ell([0.1, 0.053, 0.004], [0.016, 0.012, 0.023]),
    // Calcaneus: the heel bone, extending back and down.
    longBone([[0.1, 0.04, 0.016], [0.101, 0.03, -0.018], [0.102, 0.024, -0.05]], 0.012, 0.0125, 0.016, { aspect: [0.85, 1.3], n: [0, 1, 0] }),
    // Navicular, cuboid and three cuneiforms.
    ell([0.092, 0.046, 0.034], [0.013, 0.01, 0.008]),
    ell([0.116, 0.03, 0.034], [0.01, 0.01, 0.012]),
    ell([0.085, 0.042, 0.05], [0.006, 0.011, 0.009]),
    ell([0.095, 0.042, 0.05], [0.005, 0.01, 0.008]),
    ell([0.104, 0.038, 0.05], [0.005, 0.009, 0.008]),
  ];
  // Metatarsals and toes; the big toe has two phalanges, the rest three.
  for (let i = 0; i < 5; i++) {
    const base: V3 = [0.084 + i * 0.009, 0.034 - i * 0.003, 0.059 - i * 0.002];
    const head: V3 = [0.077 + i * 0.013, 0.012, 0.118 - i * 0.009];
    const r = i === 0 ? 0.0058 : 0.0038;
    shapes.push(longBone([base, head], r * 1.4, r, r * 1.35, { segs: 14, radial: 10 }));
    const lens = i === 0 ? [0.026, 0.02] : [0.018 - i * 0.002, 0.009, 0.008];
    let p = vec(head).add(new THREE.Vector3(0, -0.001, 0.003));
    const dir = new THREE.Vector3(i * -0.03 + 0.02, -0.12, 1).normalize();
    lens.forEach((l, j) => {
      const q = p.clone().addScaledVector(dir, l);
      const pr = r * (j === 0 ? 0.85 : 0.7);
      shapes.push(longBone([arr(p), arr(q)], pr * 1.3, pr, pr * 1.2, { segs: 10, radial: 10 }));
      p = q.addScaledVector(dir, 0.0012);
    });
  }
  return { boneId: 'foot', shapes };
}

export const SKELETON_PARTS: BonePart[] = [
  skull(),
  ...vertebrae(),
  sacrum,
  ribs(),
  sternum(),
  clavicle,
  scapula,
  humerus,
  ulna,
  radius,
  hand(),
  pelvis,
  femur,
  patella,
  tibia,
  fibula,
  foot(),
];
