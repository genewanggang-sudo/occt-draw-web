import {
    calculateBoundingSphere,
    createStandardCameraState,
    type RenderGraph,
} from '@occt-draw/canvas';
import type { CadDocument } from '@occt-draw/cad-model';
import { createViewNavigationState } from '@occt-draw/platform';
import { createEditorRenderGraph } from '../application/editorRendering';
import { createInitialEditorState } from './createInitialEditorState';
import type { EditorState } from './editorState';

export interface CreateEditorStateForDocumentOptions {
    readonly viewportSize?: {
        readonly height: number;
        readonly width: number;
    };
}

const INITIAL_VIEWPORT_SIZE = { width: 1, height: 1 } as const;

export function createEditorStateForDocument(
    document: CadDocument,
    options: CreateEditorStateForDocumentOptions = {},
): EditorState {
    const graph = createEditorRenderGraphForDocument(document);
    const displayBounds = graph.navigationBounds;
    const displaySphere = calculateBoundingSphere(displayBounds);
    const viewportSize = options.viewportSize ?? INITIAL_VIEWPORT_SIZE;
    const camera = createStandardCameraState(displayBounds, 'trimetric', viewportSize);
    const navigation = createViewNavigationState(camera, displaySphere, viewportSize);

    return createInitialEditorState({
        document,
        navigation,
    });
}

function createEditorRenderGraphForDocument(document: CadDocument): RenderGraph {
    return createEditorRenderGraph(
        createInitialEditorState({
            document,
            navigation: createViewNavigationState(
                createStandardCameraState(
                    { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
                    'trimetric',
                    INITIAL_VIEWPORT_SIZE,
                ),
                { center: { x: 0, y: 0, z: 0 }, radius: 1 },
                INITIAL_VIEWPORT_SIZE,
            ),
        }),
    );
}
