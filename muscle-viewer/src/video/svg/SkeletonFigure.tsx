import type { Pose } from '../kinematics';
import { add, normalize, perp, scale, sub, type Vec } from '../math';
import { capsulePath, pt, toScreen, type View } from './view';

const BONE = '#e9dfc8';
const BONE_DARK = '#a99d86';

/** Stylised side-view skeleton, posed like the athlete. */
export function SkeletonFigure({ pose, view, opacity = 1, highlightJoints = false }: { pose: Pose; view: View; opacity?: number; highlightJoints?: boolean }) {
  const S = (p: Vec) => toScreen(view, p);
  const r = (m: number) => m * view.s;
  const up: Vec = [Math.sin(pose.trunkLean), Math.cos(pose.trunkLean)];
  const fwd: Vec = [Math.cos(pose.trunkLean), -Math.sin(pose.trunkLean)];
  const P = (f: number, u: number) => S(add(add(pose.hip, scale(fwd, f)), scale(up, u)));

  // Spine: an S-curve from sacrum to skull.
  const spine = [P(-0.075, 0.04), P(-0.05, 0.16), P(-0.07, 0.3), P(-0.085, 0.42), P(-0.05, 0.53), P(-0.02, 0.6)];
  const pelvis = [P(0.07, 0.06), P(0.03, 0.13), P(-0.06, 0.14), P(-0.1, 0.06), P(-0.08, -0.02), P(-0.04, -0.07), P(0.02, -0.05)];

  const bone = (a: Vec, b: Vec, w: number, end: number, key: string, color = BONE) => (
    <g key={key} fill={color}>
      <path d={capsulePath(S(a), S(b), r(w), r(w))} />
      <circle cx={S(a)[0]} cy={S(a)[1]} r={r(end)} />
      <circle cx={S(b)[0]} cy={S(b)[1]} r={r(end * 0.9)} />
    </g>
  );

  const joint = (p: Vec, key: string) =>
    highlightJoints ? <circle key={key} cx={S(p)[0]} cy={S(p)[1]} r={r(0.024)} fill="none" stroke="#ffd43b" strokeWidth={2.5} /> : null;

  const patella = add(pose.frontKnee, scale(normalize(add(perp(normalize(sub(pose.frontKnee, pose.hip))), perp(normalize(sub(pose.frontAnkle, pose.frontKnee))))), 0.045));

  return (
    <g opacity={opacity}>
      {/* Rear leg (far side) */}
      {bone(pose.hip, pose.rearKnee, 0.014, 0.025, 'rf', BONE_DARK)}
      {bone(pose.rearKnee, pose.rearAnkle, 0.012, 0.022, 'rt', BONE_DARK)}
      <path d={capsulePath(S(pose.rearAnkle), S(pose.rearToe), r(0.016), r(0.01))} fill={BONE_DARK} />

      {/* Pelvis, spine, rib cage, skull */}
      <polygon points={pelvis.map(pt).join(' ')} fill={BONE} stroke={BONE_DARK} strokeWidth={1.5} strokeLinejoin="round" />
      <polyline points={spine.map(pt).join(' ')} fill="none" stroke={BONE} strokeWidth={r(0.03)} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${r(0.022)} ${r(0.008)}`} />
      <g fill="none" stroke={BONE} strokeWidth={r(0.012)} strokeLinecap="round">
        {Array.from({ length: 7 }, (_, i) => {
          const y = 0.27 + i * 0.03;
          return <path key={i} d={`M${pt(P(-0.08, y + 0.03))} Q${pt(P(0.1, y + 0.02))} ${pt(P(0.11 - i * 0.004, y - 0.06))}`} />;
        })}
      </g>
      <path d={capsulePath(P(0.11, 0.44), P(0.115, 0.29), r(0.012), r(0.01))} fill={BONE} />
      <circle cx={S(pose.head)[0]} cy={S(pose.head)[1]} r={r(0.09)} fill={BONE} />
      <path d={capsulePath(S(add(pose.head, [0.03, -0.07])), S(add(pose.head, [0.075, -0.05])), r(0.025), r(0.02))} fill={BONE} />
      <circle cx={S(add(pose.head, [0.05, 0.005]))[0]} cy={S(add(pose.head, [0.05, 0.005]))[1]} r={r(0.022)} fill="#1b2030" />

      {/* Near arm */}
      {bone(pose.shoulder, pose.elbow, 0.011, 0.022, 'hum')}
      {bone(pose.elbow, pose.hand, 0.009, 0.017, 'fa')}

      {/* Front leg */}
      {bone(pose.hip, pose.frontKnee, 0.016, 0.028, 'fem')}
      {bone(pose.frontKnee, pose.frontAnkle, 0.014, 0.024, 'tib')}
      <circle cx={S(patella)[0]} cy={S(patella)[1]} r={r(0.019)} fill={BONE} stroke={BONE_DARK} strokeWidth={1.2} />
      <path d={capsulePath(S(pose.frontHeel), S(pose.frontToe), r(0.018), r(0.01))} fill={BONE} />
      <path d={capsulePath(S(pose.frontAnkle), S(pose.frontHeel), r(0.02), r(0.02))} fill={BONE} />

      {joint(pose.hip, 'jh')}
      {joint(pose.frontKnee, 'jk')}
      {joint(pose.frontAnkle, 'ja')}
    </g>
  );
}
