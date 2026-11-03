import * as THREE from 'three';
import { buildPatch, type PatchShape } from './patch';
import { buildSweep, type SweepShape } from './sweep';

export type { PatchShape, SweepShape };

export type V3 = [number, number, number];

/**
 * A fusiform "muscle belly" (also used for flat bones) swept along a
 * quadratic Bézier from `a` to `b`. The cross-section is an ellipse whose
 * thin axis points along `n` (usually the outward surface normal).
 */
export interface BellyShape {
  kind: 'belly';
  a: V3;
  b: V3;
  /** Explicit Bézier control point. Defaults to the midpoint pushed along `n` by `bow`. */
  c?: V3;
  bow?: number;
  /** Half width (across the surface). */
  w: number;
  /** Half thickness (along `n`). */
  t: number;
  n: V3;
  /** Where along the length the belly is thickest, 0–1. */
  peak?: number;
  /** Profile exponent: lower = boxier, higher = more spindle-like. */
  power?: number;
}

export interface EllipsoidShape {
  kind: 'ellipsoid';
  center: V3;
  radii: V3;
  rotation?: V3;
  /** Draw only the top half (domes such as the diaphragm). */
  dome?: boolean;
}

export interface RodShape {
  kind: 'rod';
  a: V3;
  b: V3;
  r: number;
  /** Radius at `b` if the rod tapers. */
  r2?: number;
}

export interface TubeShape {
  kind: 'tube';
  points: V3[];
  r: number;
}

export interface SphereShape {
  kind: 'sphere';
  center: V3;
  r: number;
}

/** A flat polygon extruded to a thin plate (e.g. the scapula). */
export interface PlateShape {
  kind: 'plate';
  points: V3[];
  thickness: number;
}

export type Shape = BellyShape | EllipsoidShape | RodShape | TubeShape | SphereShape | PlateShape | SweepShape | PatchShape;

const v = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);

function buildBelly(s: BellyShape): THREE.BufferGeometry {
  const A = v(s.a);
  const B = v(s.b);
  const N = v(s.n).normalize();
  const C = s.c ? v(s.c) : A.clone().add(B).multiplyScalar(0.5).addScaledVector(N, s.bow ?? 0);
  const peak = s.peak ?? 0.5;
  const power = s.power ?? 0.6;

  const segs = 32;
  const radial = 24;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const side = new THREE.Vector3();

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const mt = 1 - t;
    // Quadratic Bézier point and tangent.
    p.set(0, 0, 0).addScaledVector(A, mt * mt).addScaledVector(C, 2 * mt * t).addScaledVector(B, t * t);
    tan
      .set(0, 0, 0)
      .addScaledVector(C.clone().sub(A), 2 * mt)
      .addScaledVector(B.clone().sub(C), 2 * t)
      .normalize();
    nrm.copy(N).addScaledVector(tan, -N.dot(tan)).normalize();
    side.crossVectors(tan, nrm).normalize();

    // Remap t so the thickest point sits at `peak`.
    const u = t < peak ? (0.5 * t) / peak : 0.5 + (0.5 * (t - peak)) / (1 - peak);
    const r = Math.pow(Math.max(Math.sin(Math.PI * u), 0), power);

    // One extra column closes the ring with its own UVs (u = 1) so textures don't smear at the seam.
    for (let j = 0; j <= radial; j++) {
      const theta = (j / radial) * Math.PI * 2;
      const x = Math.cos(theta) * s.w * r;
      const y = Math.sin(theta) * s.t * r;
      positions.push(
        p.x + side.x * x + nrm.x * y,
        p.y + side.y * x + nrm.y * y,
        p.z + side.z * x + nrm.z * y,
      );
      // u runs around the belly, v along it — fibre lines in the texture follow v.
      uvs.push(j / radial, t);
    }
  }

  const row = radial + 1;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // The seam columns are separate vertices; average their normals so no crease shows.
  const normals = geo.getAttribute('normal');
  const n = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const first = i * row;
    const last = first + radial;
    n.fromBufferAttribute(normals, first).add(new THREE.Vector3().fromBufferAttribute(normals, last)).normalize();
    normals.setXYZ(first, n.x, n.y, n.z);
    normals.setXYZ(last, n.x, n.y, n.z);
  }
  return geo;
}

function buildEllipsoid(s: EllipsoidShape): THREE.BufferGeometry {
  const geo = s.dome
    ? new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
    : new THREE.SphereGeometry(1, 28, 20);
  geo.scale(...s.radii);
  if (s.rotation) geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...s.rotation)));
  geo.translate(...s.center);
  return geo;
}

function buildRod(s: RodShape): THREE.BufferGeometry {
  const A = v(s.a);
  const B = v(s.b);
  const len = A.distanceTo(B);
  const geo = new THREE.CylinderGeometry(s.r2 ?? s.r, s.r, len, 12, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  geo.applyQuaternion(q);
  const mid = A.add(B).multiplyScalar(0.5);
  geo.translate(mid.x, mid.y, mid.z);
  return geo;
}

function buildTube(s: TubeShape): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(s.points.map(v));
  return new THREE.TubeGeometry(curve, Math.max(12, s.points.length * 6), s.r, 8, false);
}

function buildSphere(s: SphereShape): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(s.r, 20, 14);
  geo.translate(...s.center);
  return geo;
}

function buildPlate(s: PlateShape): THREE.BufferGeometry {
  const pts = s.points.map(v);
  // Newell's method for a robust polygon normal.
  const normal = new THREE.Vector3();
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i];
    const next = pts[(i + 1) % pts.length];
    normal.x += (cur.y - next.y) * (cur.z + next.z);
    normal.y += (cur.z - next.z) * (cur.x + next.x);
    normal.z += (cur.x - next.x) * (cur.y + next.y);
  }
  normal.normalize();
  const origin = pts[0];
  const xAxis = pts[1].clone().sub(origin).normalize();
  const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize();

  const shape = new THREE.Shape(
    pts.map((p) => {
      const d = p.clone().sub(origin);
      return new THREE.Vector2(d.dot(xAxis), d.dot(yAxis));
    }),
  );
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: s.thickness,
    bevelEnabled: true,
    bevelThickness: s.thickness * 0.5,
    bevelSize: s.thickness * 0.6,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -s.thickness / 2);
  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, normal).setPosition(origin);
  geo.applyMatrix4(basis);
  geo.computeVertexNormals();
  return geo;
}

export function buildGeometry(shape: Shape): THREE.BufferGeometry {
  switch (shape.kind) {
    case 'belly':
      return buildBelly(shape);
    case 'ellipsoid':
      return buildEllipsoid(shape);
    case 'rod':
      return buildRod(shape);
    case 'tube':
      return buildTube(shape);
    case 'sphere':
      return buildSphere(shape);
    case 'plate':
      return buildPlate(shape);
    case 'sweep':
      return buildSweep(shape);
    case 'patch':
      return buildPatch(shape);
  }
}

/** Rough centre of a shape, used to focus the camera. */
export function shapeCenter(shape: Shape): V3 {
  switch (shape.kind) {
    case 'belly':
    case 'rod':
      return [(shape.a[0] + shape.b[0]) / 2, (shape.a[1] + shape.b[1]) / 2, (shape.a[2] + shape.b[2]) / 2];
    case 'ellipsoid':
    case 'sphere':
      return shape.center;
    case 'tube':
    case 'plate':
    case 'sweep':
    case 'patch': {
      const points = shape.kind === 'patch' ? shape.grid.flat() : shape.points;
      const n = points.length;
      const sum = points.reduce<V3>((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
      return [sum[0] / n, sum[1] / n, sum[2] / n];
    }
  }
}

/** Merge several shapes into a single geometry (fewer draw calls). */
export function buildMergedGeometry(shapes: Shape[]): THREE.BufferGeometry {
  const parts = shapes.map((s) => {
    const g = buildGeometry(s);
    return g.index ? g.toNonIndexed() : g;
  });
  let count = 0;
  for (const g of parts) count += g.getAttribute('position').count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let offset = 0;
  for (const g of parts) {
    const p = g.getAttribute('position');
    pos.set(p.array as Float32Array, offset * 3);
    nor.set(g.getAttribute('normal').array as Float32Array, offset * 3);
    const u = g.getAttribute('uv');
    if (u) uv.set(u.array as Float32Array, offset * 2);
    offset += p.count;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return merged;
}
