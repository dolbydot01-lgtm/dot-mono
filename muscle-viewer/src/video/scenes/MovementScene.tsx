import { useI18n } from '../../i18n/context';
import { PHASE_COLORS, PHASE_NAMES, poseAt, REP_PERIOD, REP_START, sampleMotion, type RepPhase } from '../kinematics';
import { fadeWindow, ramp, sub, type Vec } from '../math';
import { Figure, Floor } from '../svg/Figure';
import { AngleArc, Callout, Panel, PhaseBadge, SceneTitle } from '../svg/primitives';
import { pt, toScreen } from '../svg/view';
import { SCENES } from '../timeline';
import { MOVEMENT_VIEW, type SceneProps } from './types';

// Hip path over a full rep, drawn as a dashed trail.
const HIP_TRAIL = Array.from({ length: 21 }, (_, i) => poseAt(i / 20).hip);

const TEMPO: { phase: RepPhase; dur: number }[] = [
  { phase: 'top', dur: 0.6 },
  { phase: 'eccentric', dur: 2.0 },
  { phase: 'bottom', dur: 0.5 },
  { phase: 'concentric', dur: 1.3 },
  { phase: 'top', dur: 0.6 },
];

function Gauge({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="gauge">
      <div className="gauge__row">
        <span>{label}</span>
        <b style={{ color }}>{Math.round(value)}°</b>
      </div>
      <div className="gauge__track">
        <div className="gauge__fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export function MovementScene({ t, g }: SceneProps) {
  const { l } = useI18n();
  const motion = sampleMotion(g);
  const { pose, angles, rep } = motion;
  const view = MOVEMENT_VIEW;
  const S = (p: Vec) => toScreen(view, p);
  const repT = g < REP_START ? 0 : (g - REP_START) % REP_PERIOD;
  const title = SCENES.find((s) => s.id === 'movement')!;

  return (
    <g>
      <Floor view={view} />
      <polyline points={HIP_TRAIL.map((p) => pt(S(p))).join(' ')} fill="none" stroke="#ffb547" strokeOpacity={0.35} strokeWidth={2} strokeDasharray="5 6" />
      <Figure pose={pose} view={view} />

      {/* Joint angle arcs */}
      <g opacity={ramp(t, 4.5, 5.5)}>
        <AngleArc c={S(pose.frontKnee)} a={sub(S(pose.hip), S(pose.frontKnee))} b={sub(S(pose.frontAnkle), S(pose.frontKnee))} r={34} color="#ffb547" />
        <AngleArc c={S(pose.hip)} a={sub(S(pose.shoulder), S(pose.hip))} b={sub(S(pose.frontKnee), S(pose.hip))} r={40} color="#69db7c" />
        <circle cx={S(pose.hip)[0]} cy={S(pose.hip)[1]} r={5} fill="#69db7c" />
        <circle cx={S(pose.frontKnee)[0]} cy={S(pose.frontKnee)[1]} r={5} fill="#ffb547" />
        <circle cx={S(pose.frontAnkle)[0]} cy={S(pose.frontAnkle)[1]} r={5} fill="#4dabf7" />
      </g>

      <Callout
        target={S([-0.78, 0.5])}
        at={[150, 380]}
        text={l({ zh: '后脚背搭在凳上（约膝高）', en: 'Rear foot laces-down on a knee-high bench' })}
        opacity={fadeWindow(t, 0.8, 9.5)}
        anchor="start"
      />
      <Callout
        target={S([0.06, 0.02])}
        at={[700, 590]}
        text={l({ zh: '前腿承担约 85% 的负荷', en: 'Front leg carries ~85% of the load' })}
        color="#ffd43b"
        opacity={fadeWindow(t, 1.8, 9.5)}
      />
      <Callout
        target={S(HIP_TRAIL[12])}
        at={[250, 470]}
        text={l({ zh: '髋部轨迹：几乎垂直下降', en: 'Hip path: almost straight down' })}
        color="#ffb547"
        opacity={fadeWindow(t, 10, 15)}
      />

      <SceneTitle title={title.title} sub={{ zh: '先看清楚动作本身', en: 'First, the movement itself' }} opacity={ramp(t, 0, 0.6)} />
      <PhaseBadge rep={rep} x={48} y={120} />

      <Panel x={930} y={110} w={300} h={420} opacity={ramp(t, 0.5, 1.5)}>
        <h4>{l({ zh: '前腿关节角度', en: 'Front-leg joint angles' })}</h4>
        <Gauge label={l({ zh: '膝关节屈曲', en: 'Knee flexion' })} value={angles.kneeFlexion} max={140} color="#ffb547" />
        <Gauge label={l({ zh: '髋关节屈曲', en: 'Hip flexion' })} value={angles.hipFlexion} max={140} color="#69db7c" />
        <Gauge label={l({ zh: '踝关节背屈', en: 'Ankle dorsiflexion' })} value={angles.ankleDorsiflexion} max={40} color="#4dabf7" />
        <h4 style={{ marginTop: 18 }}>{l({ zh: '一次动作的节奏（5 秒）', en: 'Tempo of one rep (5 s)' })}</h4>
        <div className="tempo">
          {TEMPO.map((s, i) => (
            <div key={i} className="tempo__seg" style={{ flex: s.dur, background: PHASE_COLORS[s.phase] }} title={l(PHASE_NAMES[s.phase])} />
          ))}
          <div className="tempo__head" style={{ left: `${(repT / REP_PERIOD) * 100}%` }} />
        </div>
        <div className="tempo__legend">
          <span style={{ color: PHASE_COLORS.eccentric }}>■ {l({ zh: '离心 2 秒', en: 'Eccentric 2 s' })}</span>
          <span style={{ color: PHASE_COLORS.concentric }}>■ {l({ zh: '向心 1.3 秒', en: 'Concentric 1.3 s' })}</span>
        </div>
      </Panel>
    </g>
  );
}
