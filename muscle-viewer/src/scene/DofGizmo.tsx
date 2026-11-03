import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PLANE_COLORS } from '../data/joints';
import type { DegreeOfFreedom, DofReference, JointInfo, MotionPlane } from '../data/types';
import { useViewerStore } from '../store/viewerStore';
import type { V3 } from './geometry/shapes';

// Each motion plane rotates about the axis perpendicular to it.
const PLANE_AXIS: Record<MotionPlane, THREE.Vector3> = {
  sagittal: new THREE.Vector3(1, 0, 0),
  frontal: new THREE.Vector3(0, 0, 1),
  transverse: new THREE.Vector3(0, 1, 0),
};

const REF_DIR: Record<DofReference, THREE.Vector3> = {
  down: new THREE.Vector3(0, -1, 0),
  up: new THREE.Vector3(0, 1, 0),
  front: new THREE.Vector3(0, 0, 1),
  lateral: new THREE.Vector3(1, 0, 0),
};

const DEG = Math.PI / 180;

const MIRROR = new THREE.Vector3(-1, 1, 1);

function arcPoints(axis: THREE.Vector3, ref: THREE.Vector3, radius: number, from: number, to: number, mirror: boolean): V3[] {
  const steps = Math.max(8, Math.ceil(Math.abs(to - from) / 4));
  const q = new THREE.Quaternion();
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = (from + ((to - from) * i) / steps) * DEG;
    q.setFromAxisAngle(axis, angle);
    const p = ref.clone().applyQuaternion(q).multiplyScalar(radius);
    if (mirror) p.multiply(MIRROR);
    return p.toArray() as V3;
  });
}

interface DofRingProps {
  dof: DegreeOfFreedom;
  index: number;
  dimmed: boolean;
  emphasised: boolean;
  mirror: boolean;
}

function DofRing({ dof, index, dimmed, emphasised, mirror }: DofRingProps) {
  const axis = PLANE_AXIS[dof.plane];
  const ref = REF_DIR[dof.ref];
  const radius = 0.065 + index * 0.016;
  const color = PLANE_COLORS[dof.plane];
  const [min, max] = dof.range;

  const circle = useMemo(() => arcPoints(axis, ref, radius, 0, 360, mirror), [axis, ref, radius, mirror]);
  const arc = useMemo(() => arcPoints(axis, ref, radius, min, max, mirror), [axis, ref, radius, min, max, mirror]);
  const axisLine = useMemo<V3[]>(() => [axis.clone().multiplyScalar(-radius * 1.25).toArray() as V3, axis.clone().multiplyScalar(radius * 1.25).toArray() as V3], [axis, radius]);

  const marker = useRef<THREE.Mesh>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useFrame(({ clock }) => {
    if (!marker.current) return;
    // Sweep back and forth across the range of motion.
    const s = (Math.sin(clock.elapsedTime * 1.3 + index * 1.7) + 1) / 2;
    q.setFromAxisAngle(axis, (min + (max - min) * s) * DEG);
    marker.current.position.copy(ref).applyQuaternion(q).multiplyScalar(radius);
    if (mirror) marker.current.position.multiply(MIRROR);
  });

  const opacity = dimmed ? 0.18 : 1;
  return (
    <group>
      <Line points={circle} color={color} lineWidth={1} transparent opacity={0.25 * opacity} depthTest={false} />
      <Line points={arc} color={color} lineWidth={emphasised ? 6 : 3.5} transparent opacity={opacity} depthTest={false} />
      <Line points={axisLine} color={color} lineWidth={1.5} dashed dashSize={0.008} gapSize={0.006} transparent opacity={0.7 * opacity} depthTest={false} />
      <mesh ref={marker} renderOrder={20}>
        <sphereGeometry args={[emphasised ? 0.009 : 0.0065, 14, 10]} />
        <meshBasicMaterial color={color} depthTest={false} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

/**
 * Visualises each degree of freedom of a joint as a coloured ring + sweeping marker.
 * `mirror` draws the right-side copy; fat lines don't survive a negatively scaled
 * parent, so the mirroring is applied to the points instead.
 */
export function DofGizmo({ joint, center, mirror = false }: { joint: JointInfo; center: V3; mirror?: boolean }) {
  const activeDof = useViewerStore((s) => s.activeDof);
  const position: V3 = mirror ? [-center[0], center[1], center[2]] : center;
  return (
    <group position={position}>
      {joint.dofs.map((dof, i) => (
        <DofRing
          key={i}
          dof={dof}
          index={i}
          dimmed={activeDof !== null && activeDof !== i}
          emphasised={activeDof === i}
          mirror={mirror}
        />
      ))}
    </group>
  );
}
