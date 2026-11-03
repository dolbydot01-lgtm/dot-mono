import * as THREE from 'three';
import type { V3 } from './shapes';

/**
 * A cross-section swept along a smooth curve. The section is an ellipse
 * whose radius follows `profile` along the length, so one primitive covers
 * long bones (thick ends, thin shaft), flat ribs, cartilage and processes.
 */
export interface SweepShape {
  kind: 'sweep';
  points: V3[];
  /** [t, radius] keys along the curve (t in 0–1), smoothly interpolated. */
  profile: [number, number][];
  /** Scale of the section across [side, normal]. Default [1, 1]. */
  aspect?: [number, number];
  /** Direction the section's normal axis should point toward. */
  n?: V3;
  /** If set, the normal points horizontally away from this point (ribs, jaw). */
  radialFrom?: V3;
  /** Close the curve into a loop (rims). */
  closed?: boolean;
  /** Close flat ends with a cap (vertebral bodies, discs). */
  capEnds?: boolean;
  segs?: number;
  radial?: number;
}

/** Smoothly interpolate [t, value] keys. */
export function sampleProfile(profile: [number, number][], t: number): number {
  if (t <= profile[0][0]) return profile[0][1];
  for (let i = 1; i < profile.length; i++) {
    const [t1, r1] = profile[i];
    if (t <= t1) {
      const [t0, r0] = profile[i - 1];
      const f = (t - t0) / Math.max(t1 - t0, 1e-6);
      const s = f * f * (3 - 2 * f);
      return r0 + (r1 - r0) * s;
    }
  }
  return profile[profile.length - 1][1];
}

const AXES = [new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)];

/** The world axis least parallel to `dir`, used when no normal hint is given. */
function fallbackHint(dir: THREE.Vector3) {
  let best = AXES[0];
  let bestDot = Infinity;
  for (const a of AXES) {
    const d = Math.abs(a.dot(dir));
    if (d < bestDot) {
      bestDot = d;
      best = a;
    }
  }
  return best;
}

export function buildSweep(s: SweepShape): THREE.BufferGeometry {
  const pts = s.points.map((p) => new THREE.Vector3(...p));
  const curve: THREE.Curve<THREE.Vector3> =
    pts.length === 2 && !s.closed ? new THREE.LineCurve3(pts[0], pts[1]) : new THREE.CatmullRomCurve3(pts, !!s.closed, 'centripetal');

  const segs = s.segs ?? Math.max(16, pts.length * 10);
  const radial = s.radial ?? 16;
  const [ax, ay] = s.aspect ?? [1, 1];
  const fixedHint = s.n ? new THREE.Vector3(...s.n).normalize() : fallbackHint(pts[pts.length - 1].clone().sub(pts[0]).normalize());
  const radialFrom = s.radialFrom ? new THREE.Vector3(...s.radialFrom) : null;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const row = radial + 1;

  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const hint = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const side = new THREE.Vector3();

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, p);
    curve.getTangentAt(t, tan);
    if (radialFrom) hint.set(p.x - radialFrom.x, 0, p.z - radialFrom.z);
    else hint.copy(fixedHint);
    nrm.copy(hint).addScaledVector(tan, -hint.dot(tan));
    if (nrm.lengthSq() < 1e-8) nrm.copy(fallbackHint(tan)).addScaledVector(tan, -fallbackHint(tan).dot(tan));
    nrm.normalize();
    side.crossVectors(tan, nrm).normalize();

    const r = sampleProfile(s.profile, t);
    for (let j = 0; j <= radial; j++) {
      const theta = (j / radial) * Math.PI * 2;
      const x = Math.cos(theta) * r * ax;
      const y = Math.sin(theta) * r * ay;
      positions.push(p.x + side.x * x + nrm.x * y, p.y + side.y * x + nrm.y * y, p.z + side.z * x + nrm.z * y);
      uvs.push(j / radial, t);
    }
  }

  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  if (s.capEnds && !s.closed) {
    for (const end of [0, segs]) {
      const center = new THREE.Vector3();
      for (let j = 0; j < radial; j++) {
        const k = (end * row + j) * 3;
        center.x += positions[k];
        center.y += positions[k + 1];
        center.z += positions[k + 2];
      }
      center.divideScalar(radial);
      const ci = positions.length / 3;
      positions.push(center.x, center.y, center.z);
      uvs.push(0.5, end === 0 ? 0 : 1);
      for (let j = 0; j < radial; j++) {
        const a = end * row + j;
        // Wind so the cap faces outward at each end.
        if (end === 0) indices.push(ci, a, a + 1);
        else indices.push(ci, a + 1, a);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  fixSeamNormals(geo, segs, row);
  return geo;
}

/** Ring seams are duplicated vertices; average their normals to hide the crease. */
export function fixSeamNormals(geo: THREE.BufferGeometry, segs: number, row: number) {
  const normals = geo.getAttribute('normal');
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const first = i * row;
    const last = first + row - 1;
    a.fromBufferAttribute(normals, first).add(b.fromBufferAttribute(normals, last)).normalize();
    normals.setXYZ(first, a.x, a.y, a.z);
    normals.setXYZ(last, a.x, a.y, a.z);
  }
}
