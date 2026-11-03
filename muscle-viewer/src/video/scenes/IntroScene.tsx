import { useI18n } from '../../i18n/context';
import { sampleMotion } from '../kinematics';
import { ramp } from '../math';
import { Figure, Floor } from '../svg/Figure';
import type { SceneProps } from './types';

const CHAIN = [
  { zh: '动作', en: 'Movement' },
  { zh: '骨骼杠杆', en: 'Levers' },
  { zh: '肌肉', en: 'Muscles' },
  { zh: '肌纤维', en: 'Fibres' },
  { zh: '肌节 · 横桥', en: 'Sarcomeres' },
];

export function IntroScene({ t, g }: SceneProps) {
  const { l } = useI18n();
  const motion = sampleMotion(g);
  const view = { ox: 1010, oy: 640, s: 300 };
  return (
    <g>
      <Floor view={view} />
      <Figure pose={motion.pose} view={view} opacity={0.22} />
      <g opacity={ramp(t, 0.2, 1.2)} transform={`translate(0 ${(1 - ramp(t, 0.2, 1.2)) * 20})`}>
        <text x={110} y={290} fill="#ffb547" fontSize={22} fontWeight={700} letterSpacing={4}>
          {l({ zh: '运动科学 · 科普', en: 'EXERCISE SCIENCE EXPLAINED' })}
        </text>
        <text x={106} y={370} fill="#eef0f6" fontSize={72} fontWeight={900}>
          {l({ zh: '保加利亚分腿蹲', en: 'Bulgarian Split Squat' })}
        </text>
        <text x={110} y={420} fill="#c3c8d6" fontSize={26}>
          {l({ zh: '一次下蹲里，身体到底发生了什么？', en: 'What actually happens inside one rep?' })}
        </text>
      </g>
      <g opacity={ramp(t, 1.5, 2.5)}>
        {CHAIN.map((c, i) => {
          const x = 112 + i * 150;
          const show = ramp(t, 1.6 + i * 0.35, 2.2 + i * 0.35);
          return (
            <g key={i} opacity={show}>
              <rect x={x} y={470} width={128} height={40} rx={20} fill="#1c2232" stroke="#3a4358" />
              <text x={x + 64} y={491} fill="#eef0f6" fontSize={17} textAnchor="middle" dominantBaseline="middle">
                {l(c)}
              </text>
              {i < CHAIN.length - 1 && (
                <text x={x + 139} y={491} fill="#ffb547" fontSize={18} textAnchor="middle" dominantBaseline="middle">
                  →
                </text>
              )}
            </g>
          );
        })}
      </g>
    </g>
  );
}
