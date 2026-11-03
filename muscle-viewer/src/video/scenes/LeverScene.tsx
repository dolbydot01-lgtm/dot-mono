import { useI18n } from '../../i18n/context';
import { BODY_MASS, COP, DUMBBELLS, FRONT_SHARE, PATELLAR_ARM, sampleMotion } from '../kinematics';
import { ramp, type Vec } from '../math';
import { Figure, Floor } from '../svg/Figure';
import { Arrow, Panel, PhaseBadge, SceneTitle } from '../svg/primitives';
import { SkeletonFigure } from '../svg/SkeletonFigure';
import { toScreen } from '../svg/view';
import { SCENES } from '../timeline';
import { MOVEMENT_VIEW, type SceneProps } from './types';

const KNEE_COLOR = '#ffb547';
const HIP_COLOR = '#b197fc';
const GRF_COLOR = '#4dabf7';

/** A curved arrow around a joint whose thickness shows the torque. */
function TorqueArc({ c, r, strength, color, clockwise }: { c: Vec; r: number; strength: number; color: string; clockwise: boolean }) {
  const a0 = clockwise ? -2.4 : -0.7;
  const a1 = clockwise ? -0.7 : -2.4;
  const p0: Vec = [c[0] + Math.cos(a0) * r, c[1] + Math.sin(a0) * r];
  const p1: Vec = [c[0] + Math.cos(a1) * r, c[1] + Math.sin(a1) * r];
  const tangent: Vec = clockwise ? [-Math.sin(a1), Math.cos(a1)] : [Math.sin(a1), -Math.cos(a1)];
  const w = 2 + strength * 7;
  return (
    <g opacity={0.3 + strength * 0.7}>
      <path d={`M${p0[0]},${p0[1]} A${r} ${r} 0 0 ${clockwise ? 1 : 0} ${p1[0]},${p1[1]}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" />
      <Arrow from={[p1[0] - tangent[0] * 2, p1[1] - tangent[1] * 2]} to={[p1[0] + tangent[0] * 10, p1[1] + tangent[1] * 10]} color={color} width={w} head={10 + w} />
    </g>
  );
}

export function LeverScene({ t, g }: SceneProps) {
  const { l } = useI18n();
  const { pose, forces, rep } = sampleMotion(g);
  const view = MOVEMENT_VIEW;
  const S = (p: Vec) => toScreen(view, p);
  const title = SCENES.find((s) => s.id === 'levers')!;

  const skin = 1 - 0.88 * ramp(t, 0.5, 3);
  const bones = ramp(t, 0.8, 3);
  const showForces = ramp(t, 5, 6.2);
  const showMuscleForce = ramp(t, 16, 17);
  const atBottom = rep.depth > 0.9;

  const cop = S(COP);
  const grfTop = S([COP[0], forces.grf * 0.0006]);
  const lineTop = S([COP[0], 1.05]);
  const knee = S(pose.frontKnee);
  const hip = S(pose.hip);
  const kneeFoot: Vec = [cop[0], knee[1]];
  const hipFoot: Vec = [cop[0], hip[1]];
  const maxKnee = 110;
  const maxHip = 220;
  const bw = BODY_MASS * 9.81;

  return (
    <g>
      <Floor view={view} />
      <Figure pose={pose} view={view} opacity={skin} />
      <SkeletonFigure pose={pose} view={view} opacity={bones} highlightJoints={t > 3} />

      <g opacity={showForces}>
        {/* Line of action of the ground reaction force */}
        <line x1={cop[0]} y1={cop[1]} x2={lineTop[0]} y2={lineTop[1]} stroke={GRF_COLOR} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="6 6" />
        <Arrow from={cop} to={grfTop} color={GRF_COLOR} width={6} head={18} />
        <text x={cop[0] + 14} y={cop[1] - 30} fill={GRF_COLOR} fontSize={18} fontWeight={700}>
          {l({ zh: '地面反作用力', en: 'Ground reaction force' })}
        </text>

        {/* Moment arms */}
        <line x1={knee[0]} y1={knee[1]} x2={kneeFoot[0]} y2={kneeFoot[1]} stroke={KNEE_COLOR} strokeWidth={3} strokeDasharray="4 4" />
        <text x={(knee[0] + kneeFoot[0]) / 2} y={knee[1] + 28} fill={KNEE_COLOR} fontSize={18} fontWeight={800} textAnchor="middle" paintOrder="stroke" stroke="#0c0f16" strokeWidth={5}>
          d = {(forces.kneeArm * 100).toFixed(0)} cm
        </text>
        <line x1={hip[0]} y1={hip[1]} x2={hipFoot[0]} y2={hipFoot[1]} stroke={HIP_COLOR} strokeWidth={3} strokeDasharray="4 4" />
        <text x={(hip[0] + hipFoot[0]) / 2} y={hip[1] - 46} fill={HIP_COLOR} fontSize={18} fontWeight={800} textAnchor="middle" paintOrder="stroke" stroke="#0c0f16" strokeWidth={5}>
          d = {(forces.hipArm * 100).toFixed(0)} cm
        </text>

        <TorqueArc c={knee} r={30} strength={Math.min(forces.kneeMoment / maxKnee, 1)} color={KNEE_COLOR} clockwise />
        <TorqueArc c={hip} r={36} strength={Math.min(forces.hipMoment / maxHip, 1)} color={HIP_COLOR} clockwise={false} />
      </g>

      <SceneTitle title={title.title} sub={{ zh: '骨骼是杠杆，关节是支点', en: 'Bones are levers, joints are pivots' }} opacity={ramp(t, 0, 0.6)} />
      <PhaseBadge rep={rep} x={48} y={120} />

      <Panel x={900} y={110} w={340} h={470} opacity={showForces}>
        <h4>{l({ zh: '关节力矩 = 力 × 力臂', en: 'Joint torque = force × moment arm' })}</h4>
        <div className="formula">
          M = F × d
        </div>
        <div className="kv-row">
          <span style={{ color: GRF_COLOR }}>F</span>
          <b>{forces.grf.toFixed(0)} N</b>
        </div>
        <div className={`kv-row ${atBottom && t > 11 ? 'is-hot' : ''}`}>
          <span style={{ color: KNEE_COLOR }}>{l({ zh: '膝关节力矩', en: 'Knee torque' })}</span>
          <b>{forces.kneeMoment.toFixed(0)} N·m</b>
        </div>
        <div className={`kv-row ${atBottom && t > 11 ? 'is-hot' : ''}`}>
          <span style={{ color: HIP_COLOR }}>{l({ zh: '髋关节力矩', en: 'Hip torque' })}</span>
          <b>{forces.hipMoment.toFixed(0)} N·m</b>
        </div>
        <div className="muscle-force" style={{ opacity: showMuscleForce }}>
          <div className="muscle-force__title">{l({ zh: '股四头肌需要的拉力', en: 'Quadriceps pull needed' })}</div>
          <div className="muscle-force__value">≈ {forces.quadsBW.toFixed(1)} × {l({ zh: '体重', en: 'body weight' })}</div>
          <p>
            {l({
              zh: `髌腱到膝关节的力臂只有约 ${(PATELLAR_ARM * 100).toFixed(1)} cm，远小于外部力臂，所以肌肉必须“以力换速度”。`,
              en: `The patellar tendon acts only ~${(PATELLAR_ARM * 100).toFixed(1)} cm from the knee — far less than the external arm — so muscle trades force for speed.`,
            })}
          </p>
        </div>
        <p className="footnote">
          {l({
            zh: `简化静力学估算：${BODY_MASS} kg + ${DUMBBELLS} kg 哑铃，前腿承担 ${FRONT_SHARE * 100}%（体重 ≈ ${bw.toFixed(0)} N）。`,
            en: `Simplified static estimate: ${BODY_MASS} kg + ${DUMBBELLS} kg dumbbells, ${FRONT_SHARE * 100}% on the front leg (BW ≈ ${bw.toFixed(0)} N).`,
          })}
        </p>
      </Panel>
    </g>
  );
}
