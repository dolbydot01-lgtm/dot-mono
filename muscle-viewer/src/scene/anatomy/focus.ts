import type { Selection } from '../../data/types';
import { shapeCenter, type Shape, type V3 } from '../geometry/shapes';
import { JOINT_ANCHORS } from './jointAnchors';
import { MUSCLE_SHAPES } from './muscleShapes';
import { SKELETON_PARTS } from './skeletonShapes';

function average(shapes: Shape[]): V3 {
  const sum = shapes.map(shapeCenter).reduce<V3>((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]);
  return [sum[0] / shapes.length, sum[1] / shapes.length, sum[2] / shapes.length];
}

/**
 * The point the camera should orbit around for a selection. Structures are
 * bilateral, so we keep X on the midline and only follow height and depth.
 */
export function focusPointFor(selection: Selection): V3 | null {
  let p: V3 | null = null;
  if (selection.kind === 'muscle') {
    const spec = MUSCLE_SHAPES[selection.id];
    if (spec) p = average(spec.shapes);
  } else if (selection.kind === 'joint') {
    p = JOINT_ANCHORS[selection.id]?.pos ?? null;
  } else {
    const shapes = SKELETON_PARTS.filter((b) => b.boneId === selection.id).flatMap((b) => b.shapes);
    if (shapes.length) p = average(shapes);
  }
  return p ? [0, p[1], 0] : null;
}
