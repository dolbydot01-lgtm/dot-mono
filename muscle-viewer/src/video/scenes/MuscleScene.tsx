import type { Localized } from '../../data/types';
import { useI18n } from '../../i18n/context';
import { PHASE_COLORS, sampleMotion, type MuscleId, type MuscleState } from '../kinematics';
import { add, ramp, scale, type Vec } from '../math';
import { Figure, Floor } from '../svg/Figure';
import { MuscleBands } from '../svg/MuscleBands';
import { Callout, Panel, PhaseBadge, SceneTitle } from '../svg/primitives';
import { SkeletonFigure } from '../svg/SkeletonFigure';
import { toScreen } from '../svg/view';
import { SCENES } from '../timeline';
import type { SceneProps } from './types';

const VIEW = { ox: 610, oy: 690, s: 440 };

const ROLE_NAMES: Record<MuscleState['role'], Localized> = {
  prime: { zh: '主动肌', en: 'Prime mover' },
  synergist: { zh: '协同肌', en: 'Synergist' },
  stabiliser: { zh: '稳定肌', en: 'Stabiliser' },
  stretched: { zh: '被拉伸', en: 'Stretched' },
};

const PANEL_ORDER: MuscleId[] = ['quads', 'gluteMax', 'adductor', 'hamstrings', 'rectus', 'gluteMed', 'soleus', 'rearFlexors'];

/** Which muscles to spotlight at each moment of the scene. */
function focusAt(t: number): MuscleId[] {
  if (t < 11) return ['quads', 'gluteMax', 'adductor'];
  if (t < 16) return ['quads', 'gluteMax', 'adductor', 'hamstrings', 'rectus'];
  return ['gluteMed', 'rearFlexors'];
}

/** Where to place each muscle's label, offset from its belly midpoint. */
const LABEL_OFFSET: Partial<Record<MuscleId, Vec>> = {
  quads: [120, -40],
  gluteMax: [-150, -60],
  adductor: [-170, 40],
  hamstrings: [-160, 90],
  rectus: [130, -110],
  gluteMed: [-120, -110],
  rearFlexors: [-150, 60],
};

export function MuscleScene({ t, g }: SceneProps) {
  const { l } = useI18n();
  const { pose, muscles, rep } = sampleMotion(g);
  const S = (p: Vec) => toScreen(VIEW, p);
  const title = SCENES.find((s) => s.id === 'muscles')!;
  const focus = focusAt(t);
  const byId = Object.fromEntries(muscles.map((m) => [m.id, m])) as Record<MuscleId, MuscleState>;

  const status =
    rep.phase === 'eccentric'
      ? { zh: '离心收缩：一边被拉长，一边发力“刹车”', en: 'Eccentric: lengthening while braking' }
      : rep.phase === 'concentric'
        ? { zh: '向心收缩：主动缩短，把身体推起', en: 'Concentric: shortening to drive up' }
        : rep.phase === 'bottom'
          ? { zh: '底部：等长发力，换向的瞬间', en: 'Bottom: isometric hold before reversing' }
          : { zh: '顶部：肌肉保持低水平张力', en: 'Top: low steady tension' };

  return (
    <g>
      <Floor view={VIEW} />
      <Figure pose={pose} view={VIEW} opacity={0.16} />
      <SkeletonFigure pose={pose} view={VIEW} opacity={0.45} />
      <MuscleBands muscles={muscles} view={VIEW} focus={focus} opacity={ramp(t, 0.3, 1.5)} />

      {focus.map((id) => {
        const m = byId[id];
        const mid = scale(add(m.points[0], m.points[1]), 0.5);
        const target = S(mid);
        const off = LABEL_OFFSET[id] ?? [100, 0];
        return (
          <Callout
            key={id}
            target={target}
            at={[target[0] + off[0], target[1] + off[1]]}
            text={l(m.name)}
            color={m.color}
            anchor={off[0] < 0 ? 'end' : 'start'}
            opacity={ramp(t, 0.8, 1.6)}
          />
        );
      })}

      <SceneTitle title={title.title} sub={{ zh: '谁在发力？它们在变长还是变短？', en: 'Who is working — and are they lengthening or shortening?' }} opacity={ramp(t, 0, 0.6)} />
      <PhaseBadge rep={rep} x={48} y={120} />
      <g opacity={ramp(t, 5.5, 6.5)}>
        <text x={48} y={210} fill={PHASE_COLORS[rep.phase]} fontSize={22} fontWeight={700}>
          {l(status)}
        </text>
      </g>

      <Panel x={920} y={90} w={330} h={612} opacity={ramp(t, 0.5, 1.5)}>
        <h4>{l({ zh: '实时：长度变化 / 激活程度', en: 'Live: length change / activation' })}</h4>
        <div className="muscle-table">
          {PANEL_ORDER.map((id) => {
            const m = byId[id];
            const delta = (m.lengthRatio - 1) * 100;
            const active = focus.includes(id);
            return (
              <div key={id} className={`muscle-row ${active ? 'is-active' : ''}`}>
                <div className="muscle-row__head">
                  <span className="muscle-row__dot" style={{ background: m.color }} />
                  <span className="muscle-row__name">{l(m.name)}</span>
                  <span className={`muscle-row__role role--${m.role}`}>{l(ROLE_NAMES[m.role])}</span>
                </div>
                <div className="muscle-row__bars">
                  <div className="len-bar" title="length">
                    <div className="len-bar__zero" />
                    <div
                      className="len-bar__fill"
                      style={{
                        left: delta >= 0 ? '50%' : `${50 + Math.max(delta, -25) * 2}%`,
                        width: `${Math.min(Math.abs(delta), 25) * 2}%`,
                        background: delta >= 0 ? '#4dabf7' : '#ff922b',
                      }}
                    />
                  </div>
                  <span className="len-value">{delta >= 0 ? '+' : ''}{delta.toFixed(0)}%</span>
                  <div className="act-bar">
                    <div className="act-bar__fill" style={{ width: `${m.activation * 100}%`, background: m.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="footnote">
          {l({
            zh: '蓝色 = 比站立时更长，橙色 = 更短；右侧条为估算的激活程度（示意，非实测肌电）。',
            en: 'Blue = longer than standing, orange = shorter; right bar = estimated activation (illustrative, not measured EMG).',
          })}
        </p>
      </Panel>
    </g>
  );
}
