import type { Localized } from '../data/types';
import { add, angleBetween, clamp, dist, easeInOut, lerp, normalize, perp, rad, scale, sub, type Vec } from './math';

/**
 * A simplified side-view (sagittal) model of the Bulgarian split squat.
 * World units are metres, y up, the athlete faces +x. The front (right)
 * leg is nearest the camera; the rear foot rests on a bench.
 * Everything here is a pure function of time so every scene stays in sync.
 */

// ───────────── rep clock ─────────────

/** Video time (s) at which the athlete starts repping. */
export const REP_START = 5;
export const REP_PERIOD = 5;
const TOP_HOLD = 0.6;
const DESCENT = 2.0;
const BOTTOM_HOLD = 0.5;
const ASCENT = 1.3;

export type RepPhase = 'top' | 'eccentric' | 'bottom' | 'concentric';

export interface RepState {
  /** 0 = standing, 1 = bottom of the squat. */
  depth: number;
  phase: RepPhase;
  /** 0–1 progress through the current phase. */
  phaseProgress: number;
}

export function repState(t: number): RepState {
  if (t < REP_START) return { depth: 0, phase: 'top', phaseProgress: 0 };
  const r = (t - REP_START) % REP_PERIOD;
  if (r < TOP_HOLD) return { depth: 0, phase: 'top', phaseProgress: r / TOP_HOLD };
  let x = r - TOP_HOLD;
  if (x < DESCENT) return { depth: easeInOut(x / DESCENT), phase: 'eccentric', phaseProgress: x / DESCENT };
  x -= DESCENT;
  if (x < BOTTOM_HOLD) return { depth: 1, phase: 'bottom', phaseProgress: x / BOTTOM_HOLD };
  x -= BOTTOM_HOLD;
  if (x < ASCENT) return { depth: 1 - easeInOut(x / ASCENT), phase: 'concentric', phaseProgress: x / ASCENT };
  return { depth: 0, phase: 'top', phaseProgress: 0 };
}

export const PHASE_NAMES: Record<RepPhase, Localized> = {
  top: { zh: '顶部站立', en: 'Top' },
  eccentric: { zh: '离心下降', en: 'Eccentric (lowering)' },
  bottom: { zh: '底部', en: 'Bottom' },
  concentric: { zh: '向心起身', en: 'Concentric (rising)' },
};

export const PHASE_COLORS: Record<RepPhase, string> = {
  top: '#8b93a7',
  eccentric: '#4dabf7',
  bottom: '#b197fc',
  concentric: '#ff922b',
};

// ───────────── pose ─────────────

export const SEG = { shank: 0.43, thigh: 0.43, trunk: 0.5, upperArm: 0.29, forearm: 0.27 };
export const BENCH = { x0: -1.12, x1: -0.64, top: 0.45 };
const FRONT_ANKLE: Vec = [0, 0.085];
const REAR_ANKLE: Vec = [-0.68, 0.53];

export interface Pose {
  frontAnkle: Vec;
  frontHeel: Vec;
  frontToe: Vec;
  frontKnee: Vec;
  hip: Vec;
  rearKnee: Vec;
  rearAnkle: Vec;
  rearToe: Vec;
  rearHeel: Vec;
  shoulder: Vec;
  neck: Vec;
  head: Vec;
  elbow: Vec;
  hand: Vec;
  /** Forward trunk lean (rad from vertical); the pelvis tilts with it. */
  trunkLean: number;
}

/** Two-link inverse kinematics: knee position given hip, ankle and segment lengths. */
function solveKnee(hip: Vec, ankle: Vec, l1: number, l2: number): Vec {
  const d = Math.min(dist(hip, ankle), l1 + l2 - 1e-4);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  const dir = normalize(sub(ankle, hip));
  const base = add(hip, scale(dir, a));
  const n = perp(dir);
  const k1 = add(base, scale(n, h));
  const k2 = sub(base, scale(n, h));
  // The rear knee always points down toward the floor.
  return k1[1] < k2[1] ? k1 : k2;
}

export function poseAt(depth: number): Pose {
  const shankLean = rad(lerp(5, 28, depth)); // ankle dorsiflexion
  const thighAngle = rad(lerp(8, 82, depth)); // thigh from vertical
  const trunkLean = rad(lerp(5, 16, depth));

  const frontAnkle = FRONT_ANKLE;
  const frontKnee = add(frontAnkle, [Math.sin(shankLean) * SEG.shank, Math.cos(shankLean) * SEG.shank]);
  const hip = add(frontKnee, [-Math.sin(thighAngle) * SEG.thigh, Math.cos(thighAngle) * SEG.thigh]);
  const rearKnee = solveKnee(hip, REAR_ANKLE, SEG.thigh, SEG.shank);

  const up: Vec = [Math.sin(trunkLean), Math.cos(trunkLean)];
  const shoulder = add(hip, scale(up, SEG.trunk));
  const neck = add(shoulder, scale(up, 0.07));
  const head = add(shoulder, [Math.sin(trunkLean * 0.5) * 0.2, Math.cos(trunkLean * 0.5) * 0.2]);
  // Arms hang straight down holding dumbbells.
  const elbow = add(shoulder, [0.015, -SEG.upperArm]);
  const hand = add(elbow, [0.01, -SEG.forearm]);

  return {
    frontAnkle,
    frontHeel: [-0.065, 0.02],
    frontToe: [0.19, 0.015],
    frontKnee,
    hip,
    rearKnee,
    rearAnkle: REAR_ANKLE,
    rearToe: [-0.87, BENCH.top + 0.015],
    rearHeel: [-0.645, 0.59],
    shoulder,
    neck,
    head,
    elbow,
    hand,
    trunkLean,
  };
}

export interface JointAngles {
  kneeFlexion: number;
  hipFlexion: number;
  ankleDorsiflexion: number;
}

export function jointAngles(p: Pose): JointAngles {
  const kneeInterior = angleBetween(sub(p.hip, p.frontKnee), sub(p.frontAnkle, p.frontKnee));
  const hipInterior = angleBetween(sub(p.shoulder, p.hip), sub(p.frontKnee, p.hip));
  const shank = sub(p.frontKnee, p.frontAnkle);
  return {
    kneeFlexion: 180 - kneeInterior,
    hipFlexion: 180 - hipInterior,
    ankleDorsiflexion: angleBetween(shank, [0, 1]),
  };
}

// ───────────── forces (simplified static model) ─────────────

export const BODY_MASS = 70;
export const DUMBBELLS = 2 * 10;
const G = 9.81;
/** Share of the load carried by the front leg. */
export const FRONT_SHARE = 0.85;
/** Patellar-tendon moment arm about the knee (m). */
export const PATELLAR_ARM = 0.045;
/** Centre of pressure under the front foot. */
export const COP: Vec = [0.06, 0];

export interface Forces {
  /** Vertical ground reaction force on the front foot (N). */
  grf: number;
  kneeArm: number;
  hipArm: number;
  kneeMoment: number;
  hipMoment: number;
  /** Quadriceps force needed, as a multiple of body weight. */
  quadsBW: number;
}

export function forcesAt(p: Pose): Forces {
  const grf = FRONT_SHARE * (BODY_MASS + DUMBBELLS) * G;
  const kneeArm = Math.max(p.frontKnee[0] - COP[0], 0);
  const hipArm = Math.max(COP[0] - p.hip[0], 0);
  const kneeMoment = grf * kneeArm;
  const hipMoment = grf * hipArm;
  return { grf, kneeArm, hipArm, kneeMoment, hipMoment, quadsBW: kneeMoment / PATELLAR_ARM / (BODY_MASS * G) };
}

const MAX_FORCES = forcesAt(poseAt(1));

// ───────────── muscles ─────────────

export type MuscleId = 'quads' | 'rectus' | 'gluteMax' | 'adductor' | 'hamstrings' | 'gastrocnemius' | 'soleus' | 'gluteMed' | 'rearFlexors';

export interface MuscleState {
  id: MuscleId;
  name: Localized;
  /** Path through origin → (via) → insertion, in world coords. */
  points: Vec[];
  /** The belly bulges away from this point (the bone it lies on). */
  bulgeAway: Vec;
  width: number;
  color: string;
  /** Current length / standing length. */
  lengthRatio: number;
  /** 0–1 estimated activation. */
  activation: number;
  role: 'prime' | 'synergist' | 'stabiliser' | 'stretched';
}

function segmentPoint(a: Vec, b: Vec, s: number, anterior: number): Vec {
  // `anterior` offsets toward the front of the limb (perp CCW of a downward segment points +x).
  const dir = normalize(sub(b, a));
  return add(add(a, scale(sub(b, a), s)), scale(perp(dir), anterior));
}

function pelvisPoint(p: Pose, forward: number, upward: number): Vec {
  const f: Vec = [Math.cos(p.trunkLean), -Math.sin(p.trunkLean)];
  const u: Vec = [Math.sin(p.trunkLean), Math.cos(p.trunkLean)];
  return add(add(p.hip, scale(f, forward)), scale(u, upward));
}

function patellaPoint(knee: Vec, hip: Vec, ankle: Vec): Vec {
  const thighAnt = perp(normalize(sub(knee, hip)));
  const shankAnt = perp(normalize(sub(ankle, knee)));
  return add(knee, scale(normalize(add(thighAnt, shankAnt)), 0.055));
}

interface MuscleGeometry {
  id: MuscleId;
  name: Localized;
  points: Vec[];
  bulgeAway: Vec;
  width: number;
  color: string;
  role: MuscleState['role'];
}

function muscleGeometry(p: Pose): MuscleGeometry[] {
  const patella = patellaPoint(p.frontKnee, p.hip, p.frontAnkle);
  const rearPatella = patellaPoint(p.rearKnee, p.hip, p.rearAnkle);
  const thighMid = segmentPoint(p.hip, p.frontKnee, 0.5, 0);
  const shankMid = segmentPoint(p.frontKnee, p.frontAnkle, 0.45, 0);
  const heel: Vec = add(p.frontHeel, [0.005, 0.035]);
  return [
    {
      id: 'gluteMed',
      name: { zh: '臀中肌', en: 'Gluteus medius' },
      points: [pelvisPoint(p, -0.02, 0.12), segmentPoint(p.hip, p.frontKnee, 0.06, -0.01)],
      bulgeAway: p.hip,
      width: 0.06,
      color: '#e8590c',
      role: 'stabiliser',
    },
    {
      id: 'adductor',
      name: { zh: '大收肌', en: 'Adductor magnus' },
      points: [pelvisPoint(p, -0.03, -0.065), segmentPoint(p.hip, p.frontKnee, 0.82, -0.015)],
      bulgeAway: thighMid,
      width: 0.06,
      color: '#d6336c',
      role: 'prime',
    },
    {
      id: 'hamstrings',
      name: { zh: '腘绳肌', en: 'Hamstrings' },
      points: [pelvisPoint(p, -0.055, -0.05), segmentPoint(p.frontKnee, p.frontAnkle, 0.08, -0.03)],
      bulgeAway: thighMid,
      width: 0.065,
      color: '#c2255c',
      role: 'synergist',
    },
    {
      id: 'gluteMax',
      name: { zh: '臀大肌', en: 'Gluteus maximus' },
      points: [pelvisPoint(p, -0.11, 0.05), segmentPoint(p.hip, p.frontKnee, 0.24, -0.025)],
      bulgeAway: p.hip,
      width: 0.1,
      color: '#f03e3e',
      role: 'prime',
    },
    {
      id: 'soleus',
      name: { zh: '比目鱼肌', en: 'Soleus' },
      points: [segmentPoint(p.frontKnee, p.frontAnkle, 0.22, -0.02), heel],
      bulgeAway: shankMid,
      width: 0.045,
      color: '#a61e4d',
      role: 'stabiliser',
    },
    {
      id: 'gastrocnemius',
      name: { zh: '腓肠肌', en: 'Gastrocnemius' },
      points: [segmentPoint(p.hip, p.frontKnee, 0.95, -0.025), heel],
      bulgeAway: shankMid,
      width: 0.055,
      color: '#e64980',
      role: 'stabiliser',
    },
    {
      id: 'quads',
      name: { zh: '股四头肌（股肌）', en: 'Quadriceps (vasti)' },
      points: [segmentPoint(p.hip, p.frontKnee, 0.14, 0.03), patella, segmentPoint(p.frontKnee, p.frontAnkle, 0.13, 0.028)],
      bulgeAway: thighMid,
      width: 0.095,
      color: '#ff6b6b',
      role: 'prime',
    },
    {
      id: 'rectus',
      name: { zh: '股直肌', en: 'Rectus femoris' },
      points: [pelvisPoint(p, 0.06, 0.015), patella],
      bulgeAway: thighMid,
      width: 0.045,
      color: '#ff8787',
      role: 'synergist',
    },
    {
      id: 'rearFlexors',
      name: { zh: '后腿股直肌', en: 'Rear-leg rectus femoris' },
      // Crosses the front of the hip and, via the kneecap, the front of the knee.
      points: [pelvisPoint(p, 0.06, 0.015), rearPatella, segmentPoint(p.rearKnee, p.rearAnkle, 0.12, 0.028)],
      bulgeAway: segmentPoint(p.hip, p.rearKnee, 0.5, 0),
      width: 0.045,
      color: '#748ffc',
      role: 'stretched',
    },
  ];
}

const pathLength = (pts: Vec[]) => pts.slice(1).reduce((s, q, i) => s + dist(pts[i], q), 0);
const REST_LENGTHS = Object.fromEntries(muscleGeometry(poseAt(0)).map((m) => [m.id, pathLength(m.points)])) as Record<MuscleId, number>;

/** Rough activation estimates driven by the joint moments the muscle must supply. */
function activationFor(id: MuscleId, f: Forces, phase: RepPhase): number {
  const knee = f.kneeMoment / MAX_FORCES.kneeMoment;
  const hip = f.hipMoment / MAX_FORCES.hipMoment;
  // The same force needs less activation while lengthening (force–velocity relationship).
  const ecc = phase === 'eccentric' ? 0.8 : 1;
  switch (id) {
    case 'quads':
      return clamp((0.15 + 0.85 * knee) * ecc);
    case 'rectus':
      return clamp((0.1 + 0.45 * knee) * ecc);
    case 'gluteMax':
      return clamp((0.12 + 0.88 * hip) * ecc);
    case 'adductor':
      return clamp((0.1 + 0.75 * hip) * ecc);
    case 'hamstrings':
      return clamp((0.15 + 0.3 * hip) * ecc);
    case 'gluteMed':
      return 0.5;
    case 'gastrocnemius':
      return 0.3;
    case 'soleus':
      return 0.38;
    case 'rearFlexors':
      return 0.08;
  }
}

export function musclesAt(p: Pose, phase: RepPhase): MuscleState[] {
  const f = forcesAt(p);
  return muscleGeometry(p).map((m) => ({
    ...m,
    lengthRatio: pathLength(m.points) / REST_LENGTHS[m.id],
    activation: activationFor(m.id, f, phase),
  }));
}

/** Everything a scene needs for one instant of the video. */
export function sampleMotion(t: number) {
  const rep = repState(t);
  const pose = poseAt(rep.depth);
  return { rep, pose, angles: jointAngles(pose), forces: forcesAt(pose), muscles: musclesAt(pose, rep.phase) };
}
export type MotionSample = ReturnType<typeof sampleMotion>;
