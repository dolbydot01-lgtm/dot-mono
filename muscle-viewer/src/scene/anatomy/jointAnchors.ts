import type { V3 } from '../geometry/shapes';

/** Joint centre positions (left side, +X). Midline joints are not mirrored. */
export const JOINT_ANCHORS: Record<string, { pos: V3; midline?: boolean }> = {
  neck: { pos: [0, 1.49, -0.03], midline: true },
  sternoclavicular: { pos: [0.022, 1.405, 0.072] },
  scapulothoracic: { pos: [0.105, 1.31, -0.1] },
  shoulder: { pos: [0.183, 1.378, -0.008] },
  elbow: { pos: [0.245, 1.105, -0.02] },
  radioulnar: { pos: [0.274, 0.985, 0.0] },
  wrist: { pos: [0.304, 0.858, 0.016] },
  spine: { pos: [0, 1.06, -0.045], midline: true },
  hip: { pos: [0.088, 0.9, 0.018] },
  knee: { pos: [0.096, 0.48, 0.008] },
  ankle: { pos: [0.1, 0.065, 0.0] },
};
