import { create } from 'zustand';
import { MUSCLE_MAP } from '../data/muscles';
import type { Concept, Selection, SelectionKind } from '../data/types';

export type LayerKey = 'skeleton' | 'superficial' | 'deep' | 'joints';
export type ViewPreset = 'front' | 'back' | 'left' | 'right' | 'reset';
export type Vec3 = [number, number, number];

/** Below this opacity superficial muscles stop catching clicks so deep ones can be picked. */
export const PICK_THROUGH_OPACITY = 0.4;

export interface HoverState {
  kind: SelectionKind;
  id: string;
  point: Vec3;
}

interface ViewerState {
  selection: Selection | null;
  hover: HoverState | null;
  layers: Record<LayerKey, boolean>;
  superficialOpacity: number;
  /** Draw fibre lines on muscle surfaces. */
  showFibers: boolean;
  /** Index of the DOF row hovered in the joint panel. */
  activeDof: number | null;
  highlight: { conceptId: string | null; muscles: string[]; joints: string[] };
  viewRequest: { preset: ViewPreset; nonce: number };

  select: (selection: Selection | null) => void;
  setHover: (hover: HoverState | null) => void;
  setLayer: (layer: LayerKey, visible: boolean) => void;
  setSuperficialOpacity: (opacity: number) => void;
  setShowFibers: (show: boolean) => void;
  setActiveDof: (index: number | null) => void;
  applyConcept: (concept: Concept) => void;
  clearHighlight: () => void;
  requestView: (preset: ViewPreset) => void;
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  selection: null,
  hover: null,
  layers: { skeleton: true, superficial: true, deep: true, joints: false },
  superficialOpacity: 1,
  showFibers: true,
  activeDof: null,
  highlight: { conceptId: null, muscles: [], joints: [] },
  viewRequest: { preset: 'reset', nonce: 0 },

  select: (selection) => {
    if (!selection) {
      set({ selection: null, activeDof: null });
      return;
    }
    const { layers, superficialOpacity } = get();
    const nextLayers = { ...layers };
    let opacity = superficialOpacity;

    // Make sure whatever gets selected is actually visible.
    if (selection.kind === 'muscle') {
      const muscle = MUSCLE_MAP[selection.id];
      if (muscle?.layer === 'deep') {
        nextLayers.deep = true;
        if (nextLayers.superficial && opacity > 0.5) opacity = 0.25;
      } else if (muscle) {
        nextLayers.superficial = true;
        if (opacity < PICK_THROUGH_OPACITY) opacity = 1;
      }
    } else if (selection.kind === 'joint') {
      nextLayers.joints = true;
    } else {
      nextLayers.skeleton = true;
    }

    set({ selection, layers: nextLayers, superficialOpacity: opacity, activeDof: null });
  },

  setHover: (hover) => set({ hover }),

  setLayer: (layer, visible) => set((s) => ({ layers: { ...s.layers, [layer]: visible } })),

  setSuperficialOpacity: (superficialOpacity) => set({ superficialOpacity }),

  setShowFibers: (showFibers) => set({ showFibers }),

  setActiveDof: (activeDof) => set({ activeDof }),

  applyConcept: (concept) => {
    const { layers, superficialOpacity } = get();
    const nextLayers = { ...layers, ...concept.related.layers };
    let opacity = superficialOpacity;
    if (concept.related.layers?.superficial === false) opacity = 1;
    if (concept.related.joints?.length) nextLayers.joints = true;
    set({
      // Drop the current selection so its own highlights don't mix with the concept's.
      selection: null,
      activeDof: null,
      layers: nextLayers,
      superficialOpacity: opacity,
      highlight: {
        conceptId: concept.id,
        muscles: concept.related.muscles ?? [],
        joints: concept.related.joints ?? [],
      },
    });
  },

  clearHighlight: () => set({ highlight: { conceptId: null, muscles: [], joints: [] } }),

  requestView: (preset) => set((s) => ({ viewRequest: { preset, nonce: s.viewRequest.nonce + 1 } })),
}));
