import { Html } from '@react-three/drei';
import { BONE_MAP } from '../data/bones';
import { JOINT_MAP } from '../data/joints';
import { MUSCLE_MAP } from '../data/muscles';
import type { Localized, SelectionKind } from '../data/types';
import { useI18n } from '../i18n/context';
import { useViewerStore } from '../store/viewerStore';

function lookupName(kind: SelectionKind, id: string): Localized | undefined {
  if (kind === 'muscle') return MUSCLE_MAP[id]?.name;
  if (kind === 'joint') return JOINT_MAP[id]?.name;
  return BONE_MAP[id]?.name;
}

export function HoverLabel() {
  const hover = useViewerStore((s) => s.hover);
  const { l } = useI18n();
  if (!hover) return null;
  const name = lookupName(hover.kind, hover.id);
  if (!name) return null;

  return (
    <Html position={hover.point} style={{ pointerEvents: 'none' }} zIndexRange={[20, 10]}>
      <div className={`hover-label hover-label--${hover.kind}`}>{l(name)}</div>
    </Html>
  );
}
