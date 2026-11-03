import type { MuscleId, MuscleState } from '../kinematics';
import { mixColor, normalize, perp, sub, type Vec } from '../math';
import { bellyPath, pt, toScreen, type View } from './view';

interface MuscleBandsProps {
  muscles: MuscleState[];
  view: View;
  /** Muscles drawn at full strength; others are dimmed. Empty = all. */
  focus?: MuscleId[];
  opacity?: number;
}

/** A line parallel to the belly's centre line, offset by `offset` px at its widest. */
function fibreLine(center: Vec[], offset: number): string {
  const last = center.length - 1;
  return center
    .map((c, i) => {
      const n = perp(normalize(sub(center[Math.min(i + 1, last)], center[Math.max(i - 1, 0)])));
      const h = offset * Math.pow(Math.sin((Math.PI * i) / last), 0.75);
      return pt([c[0] + n[0] * h, c[1] + n[1] * h]);
    })
    .join(' ');
}

/**
 * Muscles drawn as fusiform bellies between their attachments. Colour
 * brightens with activation, and bellies thin out as they lengthen.
 */
export function MuscleBands({ muscles, view, focus = [], opacity = 1 }: MuscleBandsProps) {
  const S = (p: Vec) => toScreen(view, p);
  return (
    <g opacity={opacity}>
      {muscles.map((m) => {
        const dim = focus.length > 0 && !focus.includes(m.id);
        const pts = m.points.map(S);
        // Belly runs origin → first via point; anything after is tendon.
        const a = pts[0];
        const b = pts[1];
        const mid: Vec = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const away = S(m.bulgeAway);
        let bowDir = perp(normalize(sub(b, a)));
        const toAway = sub(mid, away);
        if (bowDir[0] * toAway[0] + bowDir[1] * toAway[1] < 0) bowDir = [-bowDir[0], -bowDir[1]];
        // Thinner when stretched, thicker when shortened (roughly constant volume).
        const width = (m.width * view.s) / Math.sqrt(m.lengthRatio);
        const { d, center } = bellyPath(a, b, bowDir, width * 0.35, width);
        const fill = m.role === 'stretched' ? m.color : mixColor('#5a2a33', m.color, 0.35 + 0.65 * m.activation);
        const glow = m.activation > 0.6 && !dim;

        return (
          <g key={m.id} opacity={dim ? 0.22 : 1}>
            {glow && <path d={d} fill={m.color} opacity={0.35 * m.activation} filter="url(#muscle-glow)" />}
            <path d={d} fill={fill} stroke={mixColor(m.color, '#ffffff', 0.35)} strokeWidth={1} strokeOpacity={0.6} />
            {/* Fibre lines */}
            {[-0.25, 0, 0.25].map((k) => (
              <polyline key={k} points={fibreLine(center, width * k)} fill="none" stroke="#ffffff" strokeOpacity={0.18} strokeWidth={1} />
            ))}
            {/* Tendons */}
            {pts.length > 2 && <polyline points={pts.slice(1).map(pt).join(' ')} fill="none" stroke="#f1e9da" strokeWidth={3.5} strokeLinecap="round" />}
            <circle cx={a[0]} cy={a[1]} r={3} fill="#f1e9da" />
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3} fill="#f1e9da" />
          </g>
        );
      })}
    </g>
  );
}
