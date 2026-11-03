export interface SceneProps {
  /** Seconds since the scene started. */
  t: number;
  /** Scene length in seconds. */
  dur: number;
  /** Global video time, used for the shared rep clock. */
  g: number;
}

export const STAGE_W = 1280;
export const STAGE_H = 720;

/** Full-body side view shared by the movement and lever scenes. */
export const MOVEMENT_VIEW = { ox: 560, oy: 650, s: 330 };
