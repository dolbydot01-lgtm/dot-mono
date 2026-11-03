import { BENCH, type Pose } from '../kinematics';
import { add, type Vec } from '../math';
import { capsulePath, pt, toScreen, type View } from './view';

interface FigureProps {
  pose: Pose;
  view: View;
  opacity?: number;
  /** Colour of the near side; the far leg is drawn darker. */
  color?: string;
  farColor?: string;
  showBench?: boolean;
}

/** Side-view silhouette of the athlete holding dumbbells. */
export function Figure({ pose, view, opacity = 1, color = '#8ea2c8', farColor = '#56637f', showBench = true }: FigureProps) {
  const S = (p: Vec) => toScreen(view, p);
  const r = (m: number) => m * view.s;

  const frontFoot = [pose.frontHeel, add(pose.frontAnkle, [-0.035, 0.03]), add(pose.frontAnkle, [0.06, 0.0]), pose.frontToe, [pose.frontToe[0] - 0.02, 0.0] as Vec, [pose.frontHeel[0], 0.0] as Vec].map(S);
  const rearFoot = [pose.rearHeel, add(pose.rearAnkle, [0.02, -0.02]), pose.rearToe, add(pose.rearToe, [0.02, 0.035]), add(pose.rearAnkle, [-0.02, 0.05])].map(S);
  const buttock = add(pose.hip, [-0.05, 0]);
  const dumbbell = S(pose.hand);

  return (
    <g opacity={opacity}>
      {showBench && (
        <g>
          <rect
            x={S([BENCH.x0, BENCH.top])[0]}
            y={S([BENCH.x0, BENCH.top])[1]}
            width={r(BENCH.x1 - BENCH.x0)}
            height={r(0.05)}
            rx={r(0.012)}
            fill="#3b4256"
          />
          {[BENCH.x0 + 0.06, BENCH.x1 - 0.06].map((x) => (
            <rect key={x} x={S([x - 0.02, 0])[0]} y={S([x, BENCH.top - 0.05])[1]} width={r(0.04)} height={r(BENCH.top - 0.05)} fill="#2e3446" />
          ))}
        </g>
      )}

      {/* Far (rear) leg */}
      <g fill={farColor}>
        <path d={capsulePath(S(pose.hip), S(pose.rearKnee), r(0.08), r(0.055))} />
        <path d={capsulePath(S(pose.rearKnee), S(pose.rearAnkle), r(0.052), r(0.033))} />
        <polygon points={rearFoot.map(pt).join(' ')} strokeLinejoin="round" stroke={farColor} strokeWidth={r(0.03)} />
      </g>

      {/* Trunk, head, front leg, near arm */}
      <g fill={color}>
        <path d={capsulePath(S(pose.hip), S(pose.shoulder), r(0.12), r(0.115))} />
        <circle cx={S(buttock)[0]} cy={S(buttock)[1]} r={r(0.1)} />
        <path d={capsulePath(S(pose.shoulder), S(pose.neck), r(0.05), r(0.045))} />
        <circle cx={S(pose.head)[0]} cy={S(pose.head)[1]} r={r(0.1)} />
        <path d={capsulePath(S(pose.hip), S(pose.frontKnee), r(0.088), r(0.058))} />
        <path d={capsulePath(S(pose.frontKnee), S(pose.frontAnkle), r(0.056), r(0.034))} />
        <polygon points={frontFoot.map(pt).join(' ')} strokeLinejoin="round" stroke={color} strokeWidth={r(0.03)} />
      </g>
      <g fill={color} stroke="#12151d" strokeOpacity={0.35} strokeWidth={1.5}>
        <path d={capsulePath(S(pose.shoulder), S(pose.elbow), r(0.048), r(0.04))} />
        <path d={capsulePath(S(pose.elbow), S(pose.hand), r(0.04), r(0.032))} />
      </g>
      {/* Dumbbell */}
      <g fill="#2b3040" stroke="#5a6278" strokeWidth={1}>
        <rect x={dumbbell[0] - r(0.12)} y={dumbbell[1] - r(0.012)} width={r(0.24)} height={r(0.024)} rx={r(0.01)} />
        <rect x={dumbbell[0] - r(0.12)} y={dumbbell[1] - r(0.055)} width={r(0.05)} height={r(0.11)} rx={r(0.012)} />
        <rect x={dumbbell[0] + r(0.07)} y={dumbbell[1] - r(0.055)} width={r(0.05)} height={r(0.11)} rx={r(0.012)} />
      </g>
    </g>
  );
}

/** Floor line. */
export function Floor({ view, width = 1280 }: { view: View; width?: number }) {
  const y = toScreen(view, [0, 0])[1];
  return <line x1={0} x2={width} y1={y} y2={y} stroke="#2c3344" strokeWidth={2} />;
}
