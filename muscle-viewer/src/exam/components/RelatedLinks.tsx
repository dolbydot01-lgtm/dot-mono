import { BONE_MAP } from '../../data/bones';
import { JOINT_MAP, JOINT_TYPE_COLORS } from '../../data/joints';
import { MUSCLE_MAP } from '../../data/muscles';
import type { SelectionKind } from '../../data/types';
import { useI18n } from '../../i18n/context';
import { PALETTE } from '../../scene/palette';
import { useViewerStore } from '../../store/viewerStore';
import { formatTime } from '../../video/timeline';
import type { QuestionRefs } from '../types';

/** Jump to the 3D explorer with a structure selected. The exam session is saved, so coming back resumes it. */
function open3d(kind: SelectionKind, id: string) {
  useViewerStore.getState().select({ kind, id });
  window.location.hash = '';
}

export function RelatedLinks({ refs }: { refs: QuestionRefs }) {
  const { t, l } = useI18n();
  const items = [
    ...(refs.muscles ?? []).map((id) => ({ kind: 'muscle' as const, id, name: MUSCLE_MAP[id].name, color: MUSCLE_MAP[id].layer === 'deep' ? PALETTE.deepMuscle : PALETTE.muscle })),
    ...(refs.joints ?? []).map((id) => ({ kind: 'joint' as const, id, name: JOINT_MAP[id].name, color: JOINT_TYPE_COLORS[JOINT_MAP[id].type] })),
    ...(refs.bones ?? []).map((id) => ({ kind: 'bone' as const, id, name: BONE_MAP[id].name, color: PALETTE.bone })),
  ];
  if (!items.length && refs.video === undefined) return null;

  return (
    <div className="related">
      <span className="related__label">{t('exam.related')}</span>
      {items.map((it) => (
        <button key={`${it.kind}-${it.id}`} type="button" className="chip chip--button" style={{ ['--chip-color' as string]: it.color }} onClick={() => open3d(it.kind, it.id)} title={t('exam.open3d')}>
          <span className="chip__dot" />
          {l(it.name)}
        </button>
      ))}
      {refs.video !== undefined && (
        <button type="button" className="chip chip--button related__video" onClick={() => (window.location.hash = `video?t=${refs.video}`)}>
          ▶ {t('exam.watch', { t: formatTime(refs.video) })}
        </button>
      )}
    </div>
  );
}
