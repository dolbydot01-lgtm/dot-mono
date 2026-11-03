import { useMemo } from 'react';
import * as THREE from 'three';
import { JOINT_TYPE_COLORS, JOINTS } from '../data/joints';
import { MUSCLES } from '../data/muscles';
import type { JointInfo } from '../data/types';
import { useViewerStore } from '../store/viewerStore';
import { JOINT_ANCHORS } from './anatomy/jointAnchors';
import { DofGizmo } from './DofGizmo';
import { Bilateral } from './parts/Bilateral';
import { PickableMesh } from './parts/PickableMesh';
import { PALETTE } from './palette';

const JOINT_RADIUS = 0.017;

function JointMarker({ joint }: { joint: JointInfo }) {
  const anchor = JOINT_ANCHORS[joint.id];
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(JOINT_RADIUS, 20, 14);
    g.translate(...anchor.pos);
    return g;
  }, [anchor]);

  const isSelected = useViewerStore((s) => s.selection?.kind === 'joint' && s.selection.id === joint.id);
  const isHovered = useViewerStore((s) => s.hover?.kind === 'joint' && s.hover.id === joint.id);
  const isHighlighted = useViewerStore(
    (s) =>
      s.highlight.joints.includes(joint.id) ||
      (s.selection?.kind === 'muscle' && !!JOINT_LINKS[s.selection.id]?.includes(joint.id)),
  );

  const color = JOINT_TYPE_COLORS[joint.type];
  const look = isSelected
    ? { color: PALETTE.selected, emissive: PALETTE.selected, emissiveIntensity: 0.6 }
    : isHighlighted
      ? { color, emissive: color, emissiveIntensity: 0.9 }
      : { color, emissive: color, emissiveIntensity: isHovered ? 0.7 : 0.25 };

  return (
    <>
      <Bilateral midline={anchor.midline}>
        {/* X-ray so joints stay visible and clickable inside muscles. */}
        <PickableMesh geometry={geometry} kind="joint" id={joint.id} look={{ ...look, roughness: 0.3 }} renderOrder={10} xray />
      </Bilateral>
      {isSelected && (
        <>
          <DofGizmo joint={joint} center={anchor.pos} />
          {!anchor.midline && <DofGizmo joint={joint} center={anchor.pos} mirror />}
        </>
      )}
    </>
  );
}

// muscle id → joint ids, used to glow the joints a selected muscle acts on.
const JOINT_LINKS: Record<string, string[]> = Object.fromEntries(MUSCLES.map((m) => [m.id, m.joints]));

export function JointLayer() {
  const visible = useViewerStore((s) => s.layers.joints);
  if (!visible) return null;
  return (
    <group>
      {JOINTS.map((j) => (
        <JointMarker key={j.id} joint={j} />
      ))}
    </group>
  );
}
