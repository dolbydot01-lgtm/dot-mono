import type { ReactNode } from 'react';

/**
 * Renders its children on the left side and, unless `midline`, a mirrored
 * copy on the right side. three.js flips face winding automatically for
 * negatively scaled objects, so lighting stays correct.
 */
export function Bilateral({ midline, children }: { midline?: boolean; children: ReactNode }) {
  if (midline) return <>{children}</>;
  return (
    <>
      <group>{children}</group>
      <group scale={[-1, 1, 1]}>{children}</group>
    </>
  );
}
