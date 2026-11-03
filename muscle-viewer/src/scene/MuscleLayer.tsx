import { useMemo } from 'react';
import { MUSCLES } from '../data/muscles';
import type { MuscleInfo } from '../data/types';
import { PICK_THROUGH_OPACITY, useViewerStore } from '../store/viewerStore';
import { MUSCLE_SHAPES } from './anatomy/muscleShapes';
import { buildMergedGeometry } from './geometry/shapes';
import { getFiberTexture } from './materials/fiberTexture';
import { Bilateral } from './parts/Bilateral';
import { PickableMesh, type MaterialLook } from './parts/PickableMesh';
import { PALETTE } from './palette';

function MuscleMesh({ muscle }: { muscle: MuscleInfo }) {
  const spec = MUSCLE_SHAPES[muscle.id];
  const geometry = useMemo(() => buildMergedGeometry(spec.shapes), [spec]);

  const isSelected = useViewerStore((s) => s.selection?.kind === 'muscle' && s.selection.id === muscle.id);
  const isHovered = useViewerStore((s) => s.hover?.kind === 'muscle' && s.hover.id === muscle.id);
  const isHighlighted = useViewerStore(
    (s) =>
      s.highlight.muscles.includes(muscle.id) ||
      (s.selection?.kind === 'joint' && muscle.joints.includes(s.selection.id)),
  );
  const superficialOpacity = useViewerStore((s) => s.superficialOpacity);
  const showFibers = useViewerStore((s) => s.showFibers);

  const isSuperficial = muscle.layer === 'superficial';
  const opacity = isSuperficial && !isSelected ? superficialOpacity : 1;
  const pickable = !isSuperficial || superficialOpacity >= PICK_THROUGH_OPACITY;

  const base = isSuperficial ? PALETTE.muscle : PALETTE.deepMuscle;
  let look: MaterialLook = { color: base, opacity, roughness: 0.55 };
  if (isSelected) look = { color: PALETTE.selected, emissive: PALETTE.selected, emissiveIntensity: 0.35, roughness: 0.45 };
  else if (isHighlighted) look = { color: PALETTE.highlight, emissive: PALETTE.highlight, emissiveIntensity: 0.25, opacity: Math.max(opacity, 0.85) };
  else if (isHovered) look = { ...look, emissive: base, emissiveIntensity: 0.45 };

  return (
    <Bilateral midline={spec.midline}>
      <PickableMesh
        geometry={geometry}
        kind="muscle"
        id={muscle.id}
        look={look}
        pickable={pickable}
        texture={showFibers ? getFiberTexture() : null}
        bumpScale={1.2}
        renderOrder={isSuperficial ? 2 : 1}
      />
    </Bilateral>
  );
}

export function MuscleLayer() {
  const showSuperficial = useViewerStore((s) => s.layers.superficial);
  const showDeep = useViewerStore((s) => s.layers.deep);

  return (
    <group>
      {MUSCLES.filter((m) => (m.layer === 'deep' ? showDeep : showSuperficial)).map((m) => (
        <MuscleMesh key={m.id} muscle={m} />
      ))}
    </group>
  );
}
