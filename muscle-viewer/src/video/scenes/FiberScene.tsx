import { useI18n } from '../../i18n/context';
import { sampleMotion } from '../kinematics';
import { hash, lerp, ramp, scale, add, type Vec } from '../math';
import { Figure } from '../svg/Figure';
import { MiniRep } from '../svg/MiniRep';
import { MuscleBands } from '../svg/MuscleBands';
import { Callout, SceneTitle } from '../svg/primitives';
import { toScreen } from '../svg/view';
import { SCENES } from '../timeline';
import type { SceneProps } from './types';

const C: Vec = [560, 390];
const TISSUE = '#b8423f';
const CONNECTIVE = '#f1e3d3';
const NUCLEUS = '#9775fa';

/**
 * Group transform that zooms the stage toward `focus` (screen px) as `p` goes
 * 0 → 1, bringing the focus to the centre.
 */
function zoomInto(focus: Vec, p: number, factor: number) {
  const s = lerp(1, factor, p * p);
  const fx = lerp(C[0], focus[0], Math.min(p * 1.5, 1));
  const fy = lerp(C[1], focus[1], Math.min(p * 1.5, 1));
  return `translate(${C[0]} ${C[1]}) scale(${s}) translate(${-fx} ${-fy})`;
}

/** Grows from small to full size as `p` goes 0 → 1. */
function emerge(p: number) {
  const s = lerp(0.35, 1, 1 - Math.pow(1 - p, 3));
  return `translate(${C[0]} ${C[1]}) scale(${s}) translate(${-C[0]} ${-C[1]})`;
}

// Fascicle layout inside the muscle cross-section.
const FASCICLES: { c: Vec; r: number }[] = [
  { c: [0, 0], r: 54 },
  ...Array.from({ length: 6 }, (_, k) => ({ c: [Math.cos((k * Math.PI) / 3) * 108, Math.sin((k * Math.PI) / 3) * 108] as Vec, r: 50 + hash(k) * 6 })),
  ...Array.from({ length: 12 }, (_, k) => {
    const a = (k * Math.PI) / 6 + Math.PI / 12;
    return { c: [Math.cos(a) * 205, Math.sin(a) * 205] as Vec, r: 46 + hash(k + 10) * 8 };
  }),
];

// Fibre layout inside one fascicle (hex packing).
const FIBRES: Vec[] = [];
for (let row = -5; row <= 5; row++) {
  for (let col = -5; col <= 5; col++) {
    const x = col * 62 + (row % 2 ? 31 : 0) + (hash(row * 31 + col) - 0.5) * 8;
    const y = row * 54 + (hash(row * 17 + col * 3) - 0.5) * 8;
    if (Math.hypot(x, y) < 205) FIBRES.push([x, y]);
  }
}

// Fibres used as label anchors, picked by position in the list so they always exist.
const pick = (f: number) => FIBRES[Math.floor(FIBRES.length * f)];

const FIBRE_X0 = 110;
const FIBRE_X1 = 1010;
const FIBRE_Y = 420;
const FIBRE_H = 120;
const NMJ_X = 520;

export function FiberScene({ t, g }: SceneProps) {
  const { l } = useI18n();
  const motion = sampleMotion(g);
  const title = SCENES.find((s) => s.id === 'fibres')!;
  const quads = motion.muscles.filter((m) => m.id === 'quads');
  const activation = quads[0].activation;

  // ── Level 0: the leg, with a magnifier on vastus lateralis ──
  // Frame the thigh: keep the vastus belly centred as the athlete moves.
  const quadWorld = scale(add(quads[0].points[0], quads[0].points[1]), 0.5);
  const legScale = 620;
  const legView = { ox: C[0] - quadWorld[0] * legScale, oy: C[1] + quadWorld[1] * legScale, s: legScale };
  const quadMid = toScreen(legView, quadWorld);
  const l0 = 1 - ramp(t, 3.6, 4.4);
  const lens = ramp(t, 1.2, 2.6);

  // ── Firing: spikes come faster as activation rises ──
  const interval = lerp(1.1, 0.3, activation);
  const spikes: number[] = [];
  for (let k = 0; k < 6; k++) {
    const age = (g % interval) + k * interval;
    if (age < 1.4) spikes.push(age);
  }

  return (
    <g>
      <defs>
        <pattern id="striations" width="16" height="10" patternUnits="userSpaceOnUse">
          <rect width="16" height="10" fill="#c24d47" />
          <rect width="8" height="10" fill="#8f2f2c" />
          <rect x="7" width="2" height="10" fill="#e9a29a" />
        </pattern>
        <linearGradient id="fibre-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.45" />
        </linearGradient>
        <clipPath id="fibre-clip">
          <rect x={FIBRE_X0} y={FIBRE_Y - FIBRE_H / 2} width={FIBRE_X1 - FIBRE_X0} height={FIBRE_H} rx={FIBRE_H / 2} />
        </clipPath>
      </defs>

      {/* Level 0 — leg */}
      {l0 > 0 && (
        <g opacity={l0} transform={zoomInto(quadMid, ramp(t, 2.8, 4.4), 7)}>
          <Figure pose={motion.pose} view={legView} opacity={0.3} />
          <MuscleBands muscles={quads} view={legView} />
          <circle cx={quadMid[0]} cy={quadMid[1]} r={70 * lens} fill="none" stroke="#ffd43b" strokeWidth={4} />
          <Callout target={[quadMid[0] + 50, quadMid[1] - 50]} at={[quadMid[0] + 150, quadMid[1] - 150]} text={l({ zh: '股外侧肌', en: 'Vastus lateralis' })} color="#ffd43b" opacity={lens} />
        </g>
      )}

      {/* Level 1 — muscle cross-section */}
      {t > 3.8 && t < 10 && (
        <g opacity={ramp(t, 3.8, 4.6) * (1 - ramp(t, 9, 9.8))} transform={t < 8 ? emerge(ramp(t, 3.8, 5)) : zoomInto(add(C, FASCICLES[1].c), ramp(t, 8, 9.8), 4.5)}>
          <circle cx={C[0]} cy={C[1]} r={262} fill="#7d2b2a" stroke={CONNECTIVE} strokeWidth={9} />
          {FASCICLES.map((f, i) => (
            <g key={i}>
              <circle cx={C[0] + f.c[0]} cy={C[1] + f.c[1]} r={f.r} fill={TISSUE} stroke={CONNECTIVE} strokeWidth={3.5} />
              {Array.from({ length: 14 }, (_, k) => {
                const a = hash(i * 50 + k) * Math.PI * 2;
                const rr = Math.sqrt(hash(i * 70 + k)) * (f.r - 8);
                return <circle key={k} cx={C[0] + f.c[0] + Math.cos(a) * rr} cy={C[1] + f.c[1] + Math.sin(a) * rr} r={4} fill="#d9645d" />;
              })}
            </g>
          ))}
          <g opacity={ramp(t, 5, 6)}>
            <Callout target={[C[0] + 185, C[1] - 185]} at={[C[0] + 300, C[1] - 250]} text={l({ zh: '肌外膜', en: 'Epimysium' })} color={CONNECTIVE} />
            <Callout target={[C[0] + FASCICLES[1].c[0], C[1] + FASCICLES[1].c[1]]} at={[C[0] + 340, C[1] + 10]} text={l({ zh: '肌束', en: 'Fascicle' })} color="#ffa8a8" />
            <Callout target={[C[0] + FASCICLES[10].c[0] - 40, C[1] + FASCICLES[10].c[1] + 25]} at={[C[0] + 300, C[1] + 240]} text={l({ zh: '肌束膜（包裹肌束）', en: 'Perimysium (wraps each fascicle)' })} color={CONNECTIVE} />
          </g>
        </g>
      )}

      {/* Level 2 — inside one fascicle */}
      {t > 9 && t < 15 && (
        <g opacity={ramp(t, 9, 9.8) * (1 - ramp(t, 14, 14.8))} transform={t < 13 ? emerge(ramp(t, 9, 10.3)) : zoomInto(add(C, FIBRES[Math.floor(FIBRES.length / 2)]), ramp(t, 13, 14.8), 5)}>
          <circle cx={C[0]} cy={C[1]} r={250} fill="#8a3230" stroke={CONNECTIVE} strokeWidth={8} />
          {FIBRES.map((f, i) => (
            <g key={i}>
              <circle cx={C[0] + f[0]} cy={C[1] + f[1]} r={28} fill="#c9504a" stroke="#f3d9cf" strokeWidth={2} />
              {/* Myofibrils as fine dots */}
              {Array.from({ length: 9 }, (_, k) => {
                const a = hash(i * 13 + k) * Math.PI * 2;
                const rr = Math.sqrt(hash(i * 29 + k)) * 18;
                return <circle key={k} cx={C[0] + f[0] + Math.cos(a) * rr} cy={C[1] + f[1] + Math.sin(a) * rr} r={2.2} fill="#e8857d" />;
              })}
              {/* Peripheral nuclei */}
              {[0, 1].map((k) => {
                const a = hash(i * 7 + k * 3) * Math.PI * 2;
                return <ellipse key={k} cx={C[0] + f[0] + Math.cos(a) * 23} cy={C[1] + f[1] + Math.sin(a) * 23} rx={5} ry={3.2} fill={NUCLEUS} transform={`rotate(${(a * 180) / Math.PI + 90} ${C[0] + f[0] + Math.cos(a) * 23} ${C[1] + f[1] + Math.sin(a) * 23})`} />;
              })}
            </g>
          ))}
          <g opacity={ramp(t, 10, 11)}>
            <Callout target={[C[0] + pick(0.45)[0], C[1] + pick(0.45)[1]]} at={[C[0] + 330, C[1] - 170]} text={l({ zh: '肌纤维 = 一个肌细胞', en: 'Muscle fibre = one muscle cell' })} color="#ffa8a8" size={20} />
            <Callout target={[C[0] + pick(0.6)[0] + 28, C[1] + pick(0.6)[1]]} at={[C[0] + 330, C[1] - 40]} text={l({ zh: '肌内膜', en: 'Endomysium' })} color={CONNECTIVE} />
            <Callout target={[C[0] + pick(0.8)[0] + 20, C[1] + pick(0.8)[1] + 12]} at={[C[0] + 330, C[1] + 90]} text={l({ zh: '细胞核：多个，贴在细胞边缘', en: 'Many nuclei, at the cell edge' })} color={NUCLEUS} />
            <text x={C[0] + 336} y={C[1] + 200} fill="#c3c8d6" fontSize={17}>
              {l({ zh: '直径约 10–100 µm（约一根头发粗）', en: '10–100 µm across (about a hair’s width)' })}
            </text>
          </g>
        </g>
      )}

      {/* Level 3 — one fibre, side view, with its nerve */}
      {t > 14 && (
        <g opacity={ramp(t, 14, 14.8)} transform={emerge(ramp(t, 14, 15.3))}>
          <rect x={FIBRE_X0} y={FIBRE_Y - FIBRE_H / 2} width={FIBRE_X1 - FIBRE_X0} height={FIBRE_H} rx={FIBRE_H / 2} fill="url(#striations)" />
          <rect x={FIBRE_X0} y={FIBRE_Y - FIBRE_H / 2} width={FIBRE_X1 - FIBRE_X0} height={FIBRE_H} rx={FIBRE_H / 2} fill="url(#fibre-shade)" />
          {Array.from({ length: 9 }, (_, k) => {
            const x = FIBRE_X0 + 80 + k * 100 + hash(k) * 30;
            const top = k % 2 === 0;
            return <ellipse key={k} cx={x} cy={FIBRE_Y + (top ? -FIBRE_H / 2 + 9 : FIBRE_H / 2 - 9)} rx={16} ry={6} fill={NUCLEUS} opacity={0.9} />;
          })}
          {/* Action potentials spreading from the junction */}
          <g clipPath="url(#fibre-clip)">
            {spikes.map((age, i) => {
              const spread = age * 650;
              const o = 1 - age / 1.4;
              return (
                <g key={i} opacity={o}>
                  <rect x={NMJ_X + spread - 16} y={FIBRE_Y - FIBRE_H / 2} width={32} height={FIBRE_H} fill="#ffe066" filter="url(#soft-glow)" />
                  <rect x={NMJ_X - spread - 16} y={FIBRE_Y - FIBRE_H / 2} width={32} height={FIBRE_H} fill="#ffe066" filter="url(#soft-glow)" />
                </g>
              );
            })}
          </g>
          {/* Motor neuron and neuromuscular junction */}
          <path d={`M${NMJ_X + 160},140 C${NMJ_X + 120},230 ${NMJ_X - 20},250 ${NMJ_X},${FIBRE_Y - FIBRE_H / 2 - 18}`} fill="none" stroke="#ffd8a8" strokeWidth={9} strokeLinecap="round" />
          <ellipse cx={NMJ_X} cy={FIBRE_Y - FIBRE_H / 2 - 8} rx={34} ry={13} fill="#ffc078" />
          {spikes
            .filter((age) => age < 0.35)
            .map((age, i) =>
              [-14, 0, 14].map((dx) => <circle key={`${i}-${dx}`} cx={NMJ_X + dx} cy={FIBRE_Y - FIBRE_H / 2 + age * 20} r={3} fill="#63e6be" opacity={1 - age / 0.35} />),
            )}
          <g opacity={ramp(t, 15, 16)}>
            <Callout target={[NMJ_X + 130, 175]} at={[NMJ_X + 250, 150]} text={l({ zh: '运动神经元', en: 'Motor neuron' })} color="#ffd8a8" />
            <Callout target={[NMJ_X - 30, FIBRE_Y - FIBRE_H / 2 - 8]} at={[NMJ_X - 230, 250]} text={l({ zh: '神经肌肉接头（释放乙酰胆碱）', en: 'Neuromuscular junction (ACh)' })} color="#63e6be" anchor="end" />
            <Callout target={[NMJ_X + 260, FIBRE_Y]} at={[NMJ_X + 330, FIBRE_Y + 130]} text={l({ zh: '动作电位沿细胞膜传播', en: 'Action potential spreads along the membrane' })} color="#ffe066" />
            <Callout target={[FIBRE_X0 + 120, FIBRE_Y + 30]} at={[FIBRE_X0 + 40, FIBRE_Y + 150]} text={l({ zh: '横纹：明暗相间的带', en: 'Striations: light and dark bands' })} color="#e9a29a" />
          </g>
          <text x={FIBRE_X0} y={150} fill="#c3c8d6" fontSize={18} opacity={ramp(t, 16, 17)}>
            {l({
              zh: `放电频率随用力增加：当前约 ${(1 / interval).toFixed(1)} 次/秒（示意）`,
              en: `Firing rate rises with effort: now ~${(1 / interval).toFixed(1)} per second (illustrative)`,
            })}
          </text>
        </g>
      )}

      <SceneTitle title={title.title} sub={{ zh: '肌肉 → 肌束 → 肌纤维', en: 'Muscle → fascicle → fibre' }} opacity={ramp(t, 0, 0.6)} />
      <MiniRep motion={motion} x={1010} y={26} w={240} h={180} />
    </g>
  );
}
