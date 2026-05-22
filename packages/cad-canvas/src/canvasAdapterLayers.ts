import type { CanvasLayer } from '@occt-draw/canvas';

export const MODEL_LAYER_ID = 'model';
export const EDIT_PREVIEW_LAYER_ID = 'edit-preview';
export const LABEL_HELPER_LAYER_ID = 'label-helper';

export const DEFAULT_CANVAS_LAYERS: readonly CanvasLayer[] = [
    {
        id: MODEL_LAYER_ID,
    },
    {
        id: EDIT_PREVIEW_LAYER_ID,
    },
    {
        id: LABEL_HELPER_LAYER_ID,
        navigationRole: 'excluded',
        pickable: false,
    },
];
