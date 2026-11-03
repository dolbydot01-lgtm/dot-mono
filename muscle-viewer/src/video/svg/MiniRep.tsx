import { useI18n } from '../../i18n/context';
import { PHASE_COLORS, PHASE_NAMES, type MotionSample } from '../kinematics';
import { mixColor } from '../math';
import { Figure } from './Figure';
import { MuscleBands } from './MuscleBands';

/**
 * Inset that keeps the squat visible while the camera is zoomed into the
 * muscle, so viewers can see which phase drives what they are looking at.
 */
export function MiniRep({ motion, x, y, w = 250, h = 190 }: { motion: MotionSample; x: number; y: number; w?: number; h?: number }) {
  const { l } = useI18n();
  const color = PHASE_COLORS[motion.rep.phase];
  const view = { ox: x + w * 0.66, oy: y + h - 12, s: h * 0.52 };
  const quads = motion.muscles.filter((m) => m.id === 'quads');
  const lengthening = motion.rep.phase === 'eccentric';
  const shortening = motion.rep.phase === 'concentric';
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={14} fill="#121722" stroke={color} strokeWidth={2} />
      <clipPath id="mini-clip">
        <rect x={x} y={y} width={w} height={h} rx={14} />
      </clipPath>
      <g clipPath="url(#mini-clip)">
        <Figure pose={motion.pose} view={view} color="#56637f" farColor="#3a4358" />
        <MuscleBands muscles={quads} view={view} />
      </g>
      <text x={x + 12} y={y + 24} fill={color} fontSize={15} fontWeight={700}>
        {l(PHASE_NAMES[motion.rep.phase])}
      </text>
      <text x={x + 12} y={y + 44} fill={mixColor('#8b93a7', color, 0.5)} fontSize={13}>
        {lengthening ? l({ zh: '股四头肌：拉长中', en: 'Quads lengthening' }) : shortening ? l({ zh: '股四头肌：缩短中', en: 'Quads shortening' }) : l({ zh: '股四头肌：等长', en: 'Quads isometric' })}
      </text>
    </g>
  );
}
