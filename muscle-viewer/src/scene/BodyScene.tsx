import { ContactShadows } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import { Suspense } from 'react';
import { useViewerStore } from '../store/viewerStore';
import { CameraRig } from './CameraRig';
import { HoverLabel } from './HoverLabel';
import { JointLayer } from './JointLayer';
import { MuscleLayer } from './MuscleLayer';
import { SkeletonLayer } from './SkeletonLayer';

function Lights() {
  return (
    <>
      <hemisphereLight args={['#f4f1ff', '#2a2230', 0.9]} />
      <directionalLight position={[1.5, 3, 2.5]} intensity={1.6} />
      <directionalLight position={[-1.5, 2.5, -2.5]} intensity={1.3} />
      <directionalLight position={[-2.5, 1.2, 0.5]} intensity={0.5} color="#9fc4ff" />
      <directionalLight position={[0, -1, 2]} intensity={0.25} />
    </>
  );
}

function Floor() {
  return (
    <>
      <ContactShadows position={[0, 0, 0]} scale={2.2} blur={2.4} opacity={0.55} far={1.2} resolution={512} />
      <gridHelper args={[4, 20, '#2c3344', '#1d2230']} position={[0, -0.001, 0]} />
    </>
  );
}

export function BodyScene() {
  const clearHover = () => useViewerStore.getState().setHover(null);
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0.9, 1.27, 2.58], fov: 38, near: 0.05, far: 50 }}
      onPointerLeave={clearHover}
    >
      <Suspense fallback={null}>
        <Lights />
        <Floor />
        <SkeletonLayer />
        <MuscleLayer />
        <JointLayer />
        <HoverLabel />
        <CameraRig />
        {/* Screen-space ambient occlusion: darkens crevices so bones and muscles read as solid forms. */}
        <EffectComposer multisampling={4}>
          <N8AO aoRadius={0.06} distanceFalloff={0.6} intensity={2.2} halfRes />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
