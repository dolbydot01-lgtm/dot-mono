import type { ReactNode } from 'react';
import type { Localized } from '../../data/types';
import { useI18n } from '../../i18n/context';
import { poseAt } from '../kinematics';
import { ramp } from '../math';
import { Figure } from '../svg/Figure';
import { SceneTitle } from '../svg/primitives';
import { SCENES } from '../timeline';
import type { SceneProps } from './types';

const CARD_W = 210;
const CARD_H = 250;

interface Card {
  title: Localized;
  line: Localized;
  icon: ReactNode;
}

const CARDS: Card[] = [
  {
    title: { zh: '动作', en: 'Movement' },
    line: { zh: '髋、膝屈伸，踝背屈', en: 'Hip & knee flex/extend, ankle dorsiflexes' },
    icon: (
      <g transform="translate(-60 -10)">
        <Figure pose={poseAt(0.8)} view={{ ox: 95, oy: 70, s: 70 }} showBench />
      </g>
    ),
  },
  {
    title: { zh: '骨骼杠杆', en: 'Levers' },
    line: { zh: '力矩 = 力 × 力臂', en: 'Torque = force × arm' },
    icon: (
      <g>
        <line x1={-60} y1={30} x2={60} y2={-10} stroke="#e9dfc8" strokeWidth={10} strokeLinecap="round" />
        <polygon points="-10,40 10,40 0,18" fill="#ffb547" />
        <line x1={55} y1={-60} x2={55} y2={-14} stroke="#4dabf7" strokeWidth={5} />
        <polygon points="47,-20 63,-20 55,-6" fill="#4dabf7" />
      </g>
    ),
  },
  {
    title: { zh: '肌肉', en: 'Muscles' },
    line: { zh: '离心刹车，向心发力', en: 'Eccentric brakes, concentric drives' },
    icon: (
      <g>
        <path d="M-70,0 Q0,-48 70,0 Q0,48 -70,0 Z" fill="#ff6b6b" />
        <path d="M-60,0 Q0,-24 60,0 M-60,0 Q0,24 60,0 M-65,0 L65,0" stroke="#fff" strokeOpacity={0.3} fill="none" />
      </g>
    ),
  },
  {
    title: { zh: '肌纤维', en: 'Fibres' },
    line: { zh: '神经放电驱动每个肌细胞', en: 'Nerve impulses drive each cell' },
    icon: (
      <g>
        <rect x={-75} y={-22} width={150} height={44} rx={22} fill="url(#striations)" />
        <ellipse cx={-20} cy={-16} rx={10} ry={4} fill="#9775fa" />
        <ellipse cx={35} cy={16} rx={10} ry={4} fill="#9775fa" />
        <path d="M10,-60 C0,-40 -10,-36 -6,-26" stroke="#ffd8a8" strokeWidth={5} fill="none" />
      </g>
    ),
  },
  {
    title: { zh: '肌节 · 横桥', en: 'Sarcomere' },
    line: { zh: 'ATP 驱动肌丝滑行', en: 'ATP powers filament sliding' },
    icon: (
      <g>
        <line x1={-70} y1={-18} x2={70} y2={-18} stroke="#4dabf7" strokeWidth={8} />
        <rect x={-55} y={12} width={110} height={12} rx={6} fill="#ff922b" />
        {[-35, -10, 15, 40].map((x) => (
          <line key={x} x1={x} y1={12} x2={x + 10} y2={-12} stroke="#ff922b" strokeWidth={5} strokeLinecap="round" />
        ))}
      </g>
    ),
  },
];

export function RecapScene({ t }: SceneProps) {
  const { l } = useI18n();
  const title = SCENES.find((s) => s.id === 'recap')!;
  const x0 = (1280 - (CARDS.length * CARD_W + (CARDS.length - 1) * 26)) / 2;
  return (
    <g>
      <defs>
        <pattern id="striations" width="16" height="10" patternUnits="userSpaceOnUse">
          <rect width="16" height="10" fill="#c24d47" />
          <rect width="8" height="10" fill="#8f2f2c" />
        </pattern>
      </defs>
      <SceneTitle title={title.title} sub={{ zh: '从动作到分子', en: 'From movement to molecules' }} opacity={ramp(t, 0, 0.6)} />
      {CARDS.map((c, i) => {
        const x = x0 + i * (CARD_W + 26);
        const show = ramp(t, 0.3 + i * 0.45, 0.9 + i * 0.45);
        return (
          <g key={i} opacity={show} transform={`translate(0 ${(1 - show) * 24})`}>
            <rect x={x} y={170} width={CARD_W} height={CARD_H} rx={18} fill="#161b27" stroke="#2d3445" strokeWidth={2} />
            <g transform={`translate(${x + CARD_W / 2} 260)`}>{c.icon}</g>
            <text x={x + CARD_W / 2} y={355} fill="#eef0f6" fontSize={22} fontWeight={800} textAnchor="middle">
              {l(c.title)}
            </text>
            <foreignObject x={x + 12} y={370} width={CARD_W - 24} height={44}>
              <div className="stage-card-line">{l(c.line)}</div>
            </foreignObject>
            {i < CARDS.length - 1 && (
              <text x={x + CARD_W + 13} y={300} fill="#ffb547" fontSize={26} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
                ›
              </text>
            )}
          </g>
        );
      })}
      <g opacity={ramp(t, 5, 6)}>
        <rect x={x0} y={460} width={1280 - 2 * x0} height={92} rx={16} fill="#2b2210" stroke="#ffb547" strokeWidth={2} />
        <foreignObject x={x0 + 20} y={470} width={1280 - 2 * x0 - 40} height={76}>
          <div className="stage-tip">
            <b>{l({ zh: '训练提示', en: 'Coaching tip' })}</b>
            {l({
              zh: '下降控制 2–3 秒，前膝与脚尖方向一致；躯干稍前倾偏重臀部，更直立则偏重股四头肌并加大后腿拉伸。',
              en: 'Lower over 2–3 s and keep the front knee in line with the toes; lean slightly to bias the glutes, stay upright to bias the quads and deepen the rear-leg stretch.',
            })}
          </div>
        </foreignObject>
      </g>
    </g>
  );
}
