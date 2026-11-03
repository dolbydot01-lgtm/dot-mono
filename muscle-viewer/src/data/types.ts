export type Lang = 'zh' | 'en';

/** A piece of text available in every supported language. */
export type Localized = Record<Lang, string>;

export type MuscleLayer = 'superficial' | 'deep';

export type RegionId =
  | 'neck'
  | 'shoulder'
  | 'chest'
  | 'back'
  | 'arm'
  | 'core'
  | 'hip'
  | 'thigh'
  | 'leg';

export interface Exercise {
  name: Localized;
  equipment: Localized;
  level: 'beginner' | 'intermediate' | 'advanced';
  tip: Localized;
}

export interface MuscleInfo {
  id: string;
  name: Localized;
  latin: string;
  layer: MuscleLayer;
  region: RegionId;
  summary: Localized;
  functions: Localized[];
  origin: Localized;
  insertion: Localized;
  /** Joint ids this muscle crosses / moves. */
  joints: string[];
  exercises: Exercise[];
}

export type MotionPlane = 'sagittal' | 'frontal' | 'transverse';

export type JointType =
  | 'ball'
  | 'hinge'
  | 'pivot'
  | 'condyloid'
  | 'saddle'
  | 'plane'
  | 'functional'
  | 'cartilaginous';

/** Direction the gizmo arc starts from when the joint is in neutral position. */
export type DofReference = 'down' | 'up' | 'front' | 'lateral';

export interface DegreeOfFreedom {
  plane: MotionPlane;
  movement: Localized;
  /** Human readable range, e.g. "Flexion 180° / Extension 60°". */
  rangeText: Localized;
  /**
   * Rotation range in degrees around the plane's axis, right-hand rule,
   * starting from `ref`. Used to draw the arc in the 3D gizmo.
   */
  range: [number, number];
  ref: DofReference;
}

export interface JointInfo {
  id: string;
  name: Localized;
  type: JointType;
  summary: Localized;
  dofs: DegreeOfFreedom[];
  notes: Localized[];
}

export interface BoneInfo {
  id: string;
  name: Localized;
  latin: string;
  count: number;
  category: 'axial' | 'appendicular';
  summary: Localized;
  features: Localized[];
}

export interface ConceptPoint {
  term: Localized;
  text: Localized;
}

export interface Concept {
  id: string;
  icon: string;
  title: Localized;
  summary: Localized;
  body: Localized[];
  points: ConceptPoint[];
  related: {
    muscles?: string[];
    joints?: string[];
    layers?: Partial<Record<'skeleton' | 'superficial' | 'deep' | 'joints', boolean>>;
  };
}

export type SelectionKind = 'muscle' | 'joint' | 'bone';

export interface Selection {
  kind: SelectionKind;
  id: string;
}
