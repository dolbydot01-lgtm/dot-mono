import { useMemo } from 'react';
import { useViewerStore } from '../store/viewerStore';
import { SKELETON_PARTS, type BonePart } from './anatomy/skeletonShapes';
import { buildMergedGeometry } from './geometry/shapes';
import { getBoneTexture } from './materials/boneTexture';
import { Bilateral } from './parts/Bilateral';
import { PickableMesh, type MaterialLook } from './parts/PickableMesh';
import { PALETTE } from './palette';

function BoneMesh({ part }: { part: BonePart }) {
  const bone = useMemo(() => buildMergedGeometry(part.shapes), [part]);
  const cartilage = useMemo(() => (part.cartilage?.length ? buildMergedGeometry(part.cartilage) : null), [part]);
  const cavities = useMemo(() => (part.cavities?.length ? buildMergedGeometry(part.cavities) : null), [part]);

  const isSelected = useViewerStore((s) => s.selection?.kind === 'bone' && s.selection.id === part.boneId);
  const isHovered = useViewerStore((s) => s.hover?.kind === 'bone' && s.hover.id === part.boneId);

  let boneLook: MaterialLook = { color: PALETTE.bone, roughness: 0.78 };
  let cartilageLook: MaterialLook = { color: PALETTE.cartilage, roughness: 0.35 };
  if (isSelected) {
    boneLook = { color: PALETTE.selected, emissive: PALETTE.selected, emissiveIntensity: 0.25, roughness: 0.55 };
    cartilageLook = { ...cartilageLook, emissive: PALETTE.selected, emissiveIntensity: 0.2 };
  } else if (isHovered) {
    boneLook = { color: PALETTE.boneHover, emissive: PALETTE.bone, emissiveIntensity: 0.18, roughness: 0.7 };
    cartilageLook = { ...cartilageLook, emissive: PALETTE.cartilage, emissiveIntensity: 0.2 };
  }

  return (
    <Bilateral midline={part.midline}>
      <PickableMesh geometry={bone} kind="bone" id={part.boneId} look={boneLook} texture={getBoneTexture()} bumpScale={1.5} />
      {cartilage && <PickableMesh geometry={cartilage} kind="bone" id={part.boneId} look={cartilageLook} />}
      {cavities && <PickableMesh geometry={cavities} kind="bone" id={part.boneId} look={{ color: PALETTE.cavity, roughness: 1 }} />}
    </Bilateral>
  );
}

export function SkeletonLayer() {
  const visible = useViewerStore((s) => s.layers.skeleton);
  if (!visible) return null;
  return (
    <group>
      {SKELETON_PARTS.map((part) => (
        <BoneMesh key={part.boneId} part={part} />
      ))}
    </group>
  );
}
