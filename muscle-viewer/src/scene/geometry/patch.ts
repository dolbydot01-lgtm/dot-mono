import * as THREE from 'three';
import type { V3 } from './shapes';

/**
 * A smooth curved plate through a grid of control points (rows × columns),
 * given thickness. Used for flat bones: iliac wing, scapula, sternum, sacrum.
 * Thickness tapers toward the rim so edges look rounded rather than cut.
 */
export interface PatchShape {
  kind: 'patch';
  grid: V3[][];
  thickness: number;
  segU?: number;
  segV?: number;
}

function curveThrough(points: THREE.Vector3[]): THREE.Curve<THREE.Vector3> {
  return points.length === 2 ? new THREE.LineCurve3(points[0], points[1]) : new THREE.CatmullRomCurve3(points, false, 'centripetal');
}

export function buildPatch(s: PatchShape): THREE.BufferGeometry {
  const segU = s.segU ?? 16;
  const segV = s.segV ?? 16;

  // Interpolate along each row, then along each resulting column.
  const rowCurves = s.grid.map((r) => curveThrough(r.map((p) => new THREE.Vector3(...p))));
  const surface: THREE.Vector3[][] = [];
  const columns: THREE.Curve<THREE.Vector3>[] = [];
  for (let iu = 0; iu <= segU; iu++) {
    columns.push(curveThrough(rowCurves.map((c) => c.getPoint(iu / segU))));
  }
  for (let iv = 0; iv <= segV; iv++) {
    surface.push(columns.map((c) => c.getPoint(iv / segV)));
  }

  const at = (iu: number, iv: number) => surface[Math.min(Math.max(iv, 0), segV)][Math.min(Math.max(iu, 0), segU)];
  const normalAt = (iu: number, iv: number) => {
    const du = at(iu + 1, iv).clone().sub(at(iu - 1, iv));
    const dv = at(iu, iv + 1).clone().sub(at(iu, iv - 1));
    return du.cross(dv).normalize();
  };

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const row = segU + 1;
  const layer = row * (segV + 1);
  const half = s.thickness / 2;

  // Two layers: 0 = front (+normal), 1 = back.
  const offsets: THREE.Vector3[][] = [];
  for (const sign of [1, -1]) {
    for (let iv = 0; iv <= segV; iv++) {
      const rowOffsets: THREE.Vector3[] = [];
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const v = iv / segV;
        const edge = Math.min(u, 1 - u, v, 1 - v) * 6;
        const taper = 0.3 + 0.7 * Math.sqrt(Math.min(edge, 1));
        const p = at(iu, iv).clone().addScaledVector(normalAt(iu, iv), sign * half * taper);
        positions.push(p.x, p.y, p.z);
        uvs.push(u, v);
        rowOffsets.push(p);
      }
      offsets.push(rowOffsets);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * row + iu;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
      indices.push(layer + a, layer + c, layer + b, layer + b, layer + c, layer + d);
    }
  }

  // Rim: connect matching boundary vertices of the two layers. Both windings are
  // emitted on separate vertices so the visible one is always front-facing.
  const boundary: number[] = [];
  for (let iu = 0; iu < segU; iu++) boundary.push(iu);
  for (let iv = 0; iv < segV; iv++) boundary.push(iv * row + segU);
  for (let iu = segU; iu > 0; iu--) boundary.push(segV * row + iu);
  for (let iv = segV; iv > 0; iv--) boundary.push(iv * row);
  for (const flip of [false, true]) {
    const base = positions.length / 3;
    for (const idx of boundary) {
      for (const l of [0, layer]) {
        const k = (idx + l) * 3;
        positions.push(positions[k], positions[k + 1], positions[k + 2]);
        uvs.push(0, 0);
      }
    }
    const n = boundary.length;
    for (let i = 0; i < n; i++) {
      const a = base + i * 2;
      const b = base + ((i + 1) % n) * 2;
      if (flip) indices.push(a, a + 1, b, b, a + 1, b + 1);
      else indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
