import { DocumentEditor, createModelRef } from '@occt-draw/core';
import { Vec2 } from '@occt-draw/math';
import { Sketch, createSketchOnReferencePlane } from '@occt-draw/sketch';
import {
    AddCornerRectangleRequest,
    CreateFeaturePayloadRequest,
    Feature,
    MoveVertexRequest,
    type CadDocument,
    createCadDocumentMutationRuntime,
    createDefaultCadDocument,
    createFeaturePayloadRef,
} from '../src';

run('DocumentRequest preview does not mutate the live sketch payload', () => {
    const document = createDefaultCadDocument();
    const editor = new DocumentEditor({
        document,
        mutationRuntime: createCadDocumentMutationRuntime(),
    });
    const partStudio = document.getActivePartStudio();
    const sketch = createSketchOnReferencePlane({
        id: 'sketch:test',
        name: 'Sketch Test',
        planeKind: 'xy',
        planeObjectRef: createModelRef({
            id: 'plane-xy',
            kind: 'cad.object.reference-plane',
        }),
    });
    const feature = new Feature({
        id: 'feature:sketch:test',
        name: 'Sketch Test',
        payloadRef: createFeaturePayloadRef(sketch.id),
        type: 'sketch',
    });

    editor.execute(
        new CreateFeaturePayloadRequest({
            feature,
            history: { label: 'Create Sketch Test' },
            label: 'Create Sketch Test',
            partStudioId: partStudio.id,
            payload: sketch,
            payloadId: sketch.id,
            transactionId: 'create-sketch:test',
        }),
    );
    editor.beginScope({
        id: 'sketch-edit:feature:sketch:test',
        label: 'Edit feature:sketch:test',
    });
    editor.execute(
        new AddCornerRectangleRequest({
            firstCorner: Vec2.of(0, 0),
            oppositeCorner: Vec2.of(1, 1),
            partStudioId: partStudio.id,
            sketchFeatureId: feature.id,
        }),
    );

    const liveSketch = requireSketchPayload(editor.document, sketch.id);
    const vertex = liveSketch.entities.topology.vertices.list()[0];

    if (!vertex) {
        throw new Error('Expected rectangle vertex.');
    }

    const beforePreview = liveSketch.findPointForVertex(vertex.id)?.position;

    if (!beforePreview) {
        throw new Error('Expected rectangle vertex point.');
    }

    const request = new MoveVertexRequest({
        partStudioId: partStudio.id,
        sketchFeatureId: feature.id,
        target: Vec2.of(2, 2),
        vertexId: vertex.id,
    });
    const preview = editor.preview(request);
    const previewPoint = requireSketchPayload(
        preview.workingDocument,
        sketch.id,
    ).findPointForVertex(vertex.id)?.position;
    const livePointAfterPreview = requireSketchPayload(
        editor.document,
        sketch.id,
    ).findPointForVertex(vertex.id)?.position;

    expectPoint(previewPoint, 2, 2, 'expected preview working document to move vertex');
    expectPoint(
        livePointAfterPreview,
        beforePreview.x,
        beforePreview.y,
        'expected preview to leave live document unchanged',
    );

    editor.execute(request);

    const livePointAfterExecute = requireSketchPayload(
        editor.document,
        sketch.id,
    ).findPointForVertex(vertex.id)?.position;
    const confirmation = editor.confirmScope({
        id: 'sketch-edit:feature:sketch:test',
        label: 'Edit feature:sketch:test',
    });

    expectPoint(livePointAfterExecute, 2, 2, 'expected execute to move live vertex');
    expectEqual(confirmation.recorded, true, 'expected scope confirmation to record history');
});

function requireSketchPayload(document: CadDocument, sketchId: string): Sketch {
    const payload = document.getActivePartStudio().findFeaturePayload(sketchId);

    if (!(payload instanceof Sketch)) {
        throw new Error(`Expected sketch payload ${sketchId}.`);
    }

    return payload;
}

function run(name: string, test: () => void): void {
    test();
    console.log(`ok - ${name}`);
}

function expectPoint(
    actual: { readonly x: number; readonly y: number } | null | undefined,
    x: number,
    y: number,
    message: string,
): void {
    if (!actual || actual.x !== x || actual.y !== y) {
        throw new Error(
            `${message}: expected (${String(x)}, ${String(y)}), received ${actual ? `(${String(actual.x)}, ${String(actual.y)})` : 'null'}`,
        );
    }
}

function expectEqual<TValue>(actual: TValue, expected: TValue, message: string): void {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
    }
}
