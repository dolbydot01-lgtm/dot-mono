import { BONE_MAP } from '../../data/bones';
import { JOINT_MAP } from '../../data/joints';
import { MUSCLE_MAP } from '../../data/muscles';
import { useViewerStore } from '../../store/viewerStore';
import { BoneDetail } from './BoneDetail';
import { EmptyState } from './EmptyState';
import { JointDetail } from './JointDetail';
import { MuscleDetail } from './MuscleDetail';
import './info.css';

export function InfoPanel() {
  const selection = useViewerStore((s) => s.selection);

  let content = <EmptyState />;
  if (selection?.kind === 'muscle' && MUSCLE_MAP[selection.id]) content = <MuscleDetail muscle={MUSCLE_MAP[selection.id]} />;
  else if (selection?.kind === 'joint' && JOINT_MAP[selection.id]) content = <JointDetail joint={JOINT_MAP[selection.id]} />;
  else if (selection?.kind === 'bone' && BONE_MAP[selection.id]) content = <BoneDetail bone={BONE_MAP[selection.id]} />;

  return (
    <aside className="info-panel" key={selection ? `${selection.kind}:${selection.id}` : 'empty'}>
      {content}
    </aside>
  );
}
