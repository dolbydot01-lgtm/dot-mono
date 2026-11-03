import type { ComponentType } from 'react';
import { fadeWindow } from '../math';
import { FiberScene } from '../scenes/FiberScene';
import { IntroScene } from '../scenes/IntroScene';
import { LeverScene } from '../scenes/LeverScene';
import { MovementScene } from '../scenes/MovementScene';
import { MuscleScene } from '../scenes/MuscleScene';
import { RecapScene } from '../scenes/RecapScene';
import { SarcomereScene } from '../scenes/SarcomereScene';
import { STAGE_H, STAGE_W, type SceneProps } from '../scenes/types';
import { CleanFrameContext } from '../svg/cleanFrame';
import { StageDefs } from '../svg/primitives';
import { sceneAt, type SceneId } from '../timeline';

const SCENE_COMPONENTS: Record<SceneId, ComponentType<SceneProps>> = {
  intro: IntroScene,
  movement: MovementScene,
  levers: LeverScene,
  muscles: MuscleScene,
  fibres: FiberScene,
  sarcomere: SarcomereScene,
  recap: RecapScene,
};

/**
 * Renders the frame at time `time`. Every scene is a pure function of time,
 * so seeking anywhere shows exactly what playback would show there.
 */
export function Stage({ time, clean = false }: { time: number; clean?: boolean }) {
  const scene = sceneAt(time);
  const Scene = SCENE_COMPONENTS[scene.id];
  const local = time - scene.start;
  const first = scene.start === 0;
  const fade = first ? fadeWindow(local + 1, 0, scene.duration + 1, 0.5) : fadeWindow(local, 0, scene.duration, 0.5);
  return (
    <svg className="stage" viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} preserveAspectRatio="xMidYMid meet">
      <StageDefs />
      <rect width={STAGE_W} height={STAGE_H} fill="url(#vignette)" />
      <CleanFrameContext.Provider value={clean}>
        <g opacity={fade} key={scene.id}>
          <Scene t={local} dur={scene.duration} g={time} />
        </g>
      </CleanFrameContext.Provider>
    </svg>
  );
}
