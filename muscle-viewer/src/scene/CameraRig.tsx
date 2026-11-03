import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useViewerStore, type ViewPreset } from '../store/viewerStore';
import { focusPointFor } from './anatomy/focus';

export const DEFAULT_TARGET = new THREE.Vector3(0, 0.95, 0);
const DISTANCE = 2.7;

const PRESET_DIRECTIONS: Record<ViewPreset, THREE.Vector3> = {
  front: new THREE.Vector3(0, 0.05, 1),
  back: new THREE.Vector3(0, 0.05, -1),
  // The figure's left side is +X.
  left: new THREE.Vector3(1, 0.05, 0),
  right: new THREE.Vector3(-1, 0.05, 0),
  reset: new THREE.Vector3(0.35, 0.12, 1),
};

/**
 * Orbit controls plus smooth transitions: view presets move the camera,
 * selections re-centre the orbit target on the chosen structure.
 */
export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const goalTarget = useRef<THREE.Vector3 | null>(null);
  const goalPosition = useRef<THREE.Vector3 | null>(null);

  const viewRequest = useViewerStore((s) => s.viewRequest);
  const selection = useViewerStore((s) => s.selection);

  useEffect(() => {
    const target = viewRequest.preset === 'reset' ? DEFAULT_TARGET.clone() : (controls.current?.target.clone() ?? DEFAULT_TARGET.clone());
    goalTarget.current = target;
    goalPosition.current = target.clone().addScaledVector(PRESET_DIRECTIONS[viewRequest.preset].clone().normalize(), DISTANCE);
  }, [viewRequest]);

  useEffect(() => {
    if (!selection) return;
    const p = focusPointFor(selection);
    if (p) goalTarget.current = new THREE.Vector3(...p);
  }, [selection]);

  // Cancel any running transition as soon as the user grabs the controls.
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const stop = () => {
      goalTarget.current = null;
      goalPosition.current = null;
    };
    c.addEventListener('start', stop);
    return () => c.removeEventListener('start', stop);
  }, []);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const k = 1 - Math.exp(-dt * 6);
    if (goalTarget.current) {
      const delta = goalTarget.current.clone().sub(c.target).multiplyScalar(k);
      c.target.add(delta);
      // Without a position goal, translate the camera with the target so the view just pans.
      if (!goalPosition.current) camera.position.add(delta);
      if (c.target.distanceTo(goalTarget.current) < 1e-4) goalTarget.current = null;
    }
    if (goalPosition.current) {
      camera.position.lerp(goalPosition.current, k);
      if (camera.position.distanceTo(goalPosition.current) < 1e-4) goalPosition.current = null;
    }
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={DEFAULT_TARGET}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.35}
      maxDistance={6}
    />
  );
}
