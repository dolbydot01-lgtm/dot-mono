import type { ThreeEvent } from '@react-three/fiber';
import type * as THREE from 'three';
import type { SelectionKind } from '../../data/types';
import { useViewerStore } from '../../store/viewerStore';

export interface MaterialLook {
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  roughness?: number;
  metalness?: number;
}

interface PickableMeshProps {
  geometry: THREE.BufferGeometry;
  kind: SelectionKind;
  id: string;
  look: MaterialLook;
  /** When false the mesh is drawn but ignores the pointer. */
  pickable?: boolean;
  renderOrder?: number;
  /**
   * Draw through other geometry and win pointer events even when occluded.
   * Used for joint markers that sit inside muscles.
   */
  xray?: boolean;
  /** Surface texture, used both as colour map and bump map. */
  texture?: THREE.Texture | null;
  bumpScale?: number;
}

// Pointer travel (px) above which a press counts as an orbit drag, not a click.
const CLICK_TOLERANCE = 5;

const noRaycast = () => {};

/** True when an x-ray object is under the pointer and should take the event instead. */
function deferToXray(e: ThreeEvent<PointerEvent | MouseEvent>, self: boolean) {
  return !self && e.intersections.some((i) => i.object.userData.xray);
}

export function PickableMesh({ geometry, kind, id, look, pickable = true, renderOrder, xray = false, texture = null, bumpScale = 1 }: PickableMeshProps) {
  const select = useViewerStore((s) => s.select);
  const setHover = useViewerStore((s) => s.setHover);
  const opacity = look.opacity ?? 1;
  const transparent = opacity < 0.999 || xray;

  const hover = (e: ThreeEvent<PointerEvent>) => {
    if (deferToXray(e, xray)) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    setHover({ kind, id, point: [e.point.x, e.point.y, e.point.z] });
  };
  const onOut = () => {
    document.body.style.cursor = '';
    const current = useViewerStore.getState().hover;
    if (current?.kind === kind && current.id === id) setHover(null);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (deferToXray(e, xray)) return;
    e.stopPropagation();
    if (e.delta > CLICK_TOLERANCE) return;
    select({ kind, id });
  };

  return (
    <mesh
      geometry={geometry}
      renderOrder={renderOrder}
      userData={{ xray }}
      raycast={pickable ? undefined : noRaycast}
      onPointerOver={pickable ? hover : undefined}
      onPointerMove={pickable ? hover : undefined}
      onPointerOut={pickable ? onOut : undefined}
      onClick={pickable ? onClick : undefined}
    >
      {/* Remount when toggling transparency or maps so the shader program is rebuilt. */}
      <meshStandardMaterial
        key={`${transparent ? 'transparent' : 'opaque'}-${texture?.uuid ?? 'plain'}`}
        map={texture}
        bumpMap={texture}
        bumpScale={texture ? bumpScale : 0}
        color={look.color}
        emissive={look.emissive ?? '#000000'}
        emissiveIntensity={look.emissiveIntensity ?? 0}
        roughness={look.roughness ?? 0.6}
        metalness={look.metalness ?? 0}
        transparent={transparent}
        opacity={opacity}
        depthWrite={!transparent}
        depthTest={!xray}
      />
    </mesh>
  );
}
