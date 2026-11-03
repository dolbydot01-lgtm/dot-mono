import { useContext, type ReactNode } from 'react';
import type { Localized } from '../../data/types';
import { useI18n } from '../../i18n/context';
import { PHASE_COLORS, PHASE_NAMES, type RepState } from '../kinematics';
import { add, normalize, perp, scale, sub, type Vec } from '../math';
import { pt } from './view';

import { CleanFrameContext } from './cleanFrame';

const useClean = () => useContext(CleanFrameContext);

/** Shared SVG defs (glow filter, arrow markers). Render once inside the stage. */
export function StageDefs() {
  return (
    <defs>
      <filter id="muscle-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="8" />
      </filter>
      <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
      <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
        <stop offset="0%" stopColor="#1d2333" />
        <stop offset="100%" stopColor="#0c0f16" />
      </radialGradient>
    </defs>
  );
}

export function Arrow({ from, to, color, width = 4, head = 14, dashed = false }: { from: Vec; to: Vec; color: string; width?: number; head?: number; dashed?: boolean }) {
  const dir = normalize(sub(to, from));
  const n = perp(dir);
  const base = sub(to, scale(dir, head));
  const h1 = add(base, scale(n, head * 0.55));
  const h2 = sub(base, scale(n, head * 0.55));
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={base[0]} y2={base[1]} stroke={color} strokeWidth={width} strokeDasharray={dashed ? '8 6' : undefined} />
      <polygon points={`${pt(to)} ${pt(h1)} ${pt(h2)}`} fill={color} />
    </g>
  );
}

/** An arc between two screen-space directions around `c`, with an optional label. */
export function AngleArc({ c, a, b, r, color, label }: { c: Vec; a: Vec; b: Vec; r: number; color: string; label?: string }) {
  const angA = Math.atan2(a[1], a[0]);
  let angB = Math.atan2(b[1], b[0]);
  let delta = angB - angA;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  angB = angA + delta;
  const p1: Vec = [c[0] + Math.cos(angA) * r, c[1] + Math.sin(angA) * r];
  const p2: Vec = [c[0] + Math.cos(angB) * r, c[1] + Math.sin(angB) * r];
  const mid = angA + delta / 2;
  const lp: Vec = [c[0] + Math.cos(mid) * (r + 22), c[1] + Math.sin(mid) * (r + 22)];
  return (
    <g>
      <path d={`M${pt(c)} L${pt(p1)} A${r} ${r} 0 0 ${delta > 0 ? 1 : 0} ${pt(p2)} Z`} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} />
      {label && (
        <text x={lp[0]} y={lp[1]} fill={color} fontSize={18} fontWeight={700} textAnchor="middle" dominantBaseline="middle">
          {label}
        </text>
      )}
    </g>
  );
}

/** A label with a leader line pointing at `target`. */
export function Callout({ target, at, text, color = '#e9ecf5', opacity = 1, size = 18, anchor = 'start' }: { target: Vec; at: Vec; text: string; color?: string; opacity?: number; size?: number; anchor?: 'start' | 'end' | 'middle' }) {
  if (useClean()) return null;
  return (
    <g opacity={opacity}>
      <line x1={target[0]} y1={target[1]} x2={at[0]} y2={at[1]} stroke={color} strokeOpacity={0.6} strokeWidth={1.5} />
      <circle cx={target[0]} cy={target[1]} r={3.5} fill={color} />
      <text x={at[0] + (anchor === 'start' ? 6 : anchor === 'end' ? -6 : 0)} y={at[1]} fill={color} fontSize={size} fontWeight={600} textAnchor={anchor} dominantBaseline="middle" paintOrder="stroke" stroke="#0c0f16" strokeWidth={4} strokeOpacity={0.7}>
        {text}
      </text>
    </g>
  );
}

/** Current rep phase with a progress bar. */
export function PhaseBadge({ rep, x, y }: { rep: RepState; x: number; y: number }) {
  const { l } = useI18n();
  if (useClean()) return null;
  const color = PHASE_COLORS[rep.phase];
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width={250} height={54} rx={12} fill="#141925" stroke={color} strokeWidth={2} />
      <circle cx={24} cy={22} r={7} fill={color} />
      <text x={40} y={23} fill="#eef0f6" fontSize={19} fontWeight={700} dominantBaseline="middle">
        {l(PHASE_NAMES[rep.phase])}
      </text>
      <rect x={16} y={39} width={218} height={5} rx={2.5} fill="#2b3245" />
      <rect x={16} y={39} width={218 * rep.phaseProgress} height={5} rx={2.5} fill={color} />
    </g>
  );
}

/** Scene title in the top-left corner. */
export function SceneTitle({ title, sub: subtitle, opacity = 1 }: { title: Localized; sub?: Localized; opacity?: number }) {
  const { l } = useI18n();
  if (useClean()) return null;
  return (
    <g opacity={opacity}>
      <text x={48} y={64} fill="#eef0f6" fontSize={34} fontWeight={800}>
        {l(title)}
      </text>
      {subtitle && (
        <text x={50} y={96} fill="#8b93a7" fontSize={18}>
          {l(subtitle)}
        </text>
      )}
    </g>
  );
}

/** HTML panel inside the SVG stage (lets text wrap and use CSS). */
export function Panel({ x, y, w, h, children, opacity = 1 }: { x: number; y: number; w: number; h: number; children: ReactNode; opacity?: number }) {
  if (useClean()) return null;
  return (
    <foreignObject x={x} y={y} width={w} height={h} opacity={opacity}>
      <div className="stage-panel">{children}</div>
    </foreignObject>
  );
}
