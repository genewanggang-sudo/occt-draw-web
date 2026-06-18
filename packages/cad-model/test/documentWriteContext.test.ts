import { DocumentEditor, createModelRef } from '@occt-draw/core';
import { DEFAULT_CONIC_RHO, Vec2 } from '@occt-draw/math';
import { Sketch, createSketchOnReferencePlane } from '@occt-draw/sketch';
import {
    AddConicRequest,
    AddCornerRectangleRequest,
    AddEllipticalArcRequest,
    AddLineSegmentRequest,
    AddRegularPolygonRequest,
    AddTangentArcRequest,
    CreateFeaturePayloadRequest,
    Feature,
    MoveVertexRequest,
    type CadDocument,
    type CadDocumentWriteContext,
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

run('new sketch arc requests create open edge entities', () => {
    const tangent = createEditableSketchDocument('sketch:tangent');

    tangent.editor.execute(
        new AddLineSegmentRequest({
            endPosition: Vec2.of(1, 0),
            partStudioId: tangent.partStudioId,
            sketchFeatureId: tangent.featureId,
            startPosition: Vec2.of(0, 0),
        }),
    );

    const lineEndVertex = requireVertexAt(tangent.editor.document, tangent.sketchId, 1, 0);

    tangent.editor.execute(
        new AddTangentArcRequest({
            endPoint: Vec2.of(1, 1),
            partStudioId: tangent.partStudioId,
            sketchFeatureId: tangent.featureId,
            startTangent: Vec2.of(1, 0),
            startVertexId: lineEndVertex,
        }),
    );

    const tangentSketch = requireSketchPayload(tangent.editor.document, tangent.sketchId);
    const tangentCurves = tangentSketch.entities.geometry.curves.list();

    expectEqual(tangentCurves.length, 2, 'expected line plus tangent arc curves');
    expectEqual(tangentCurves[1]?.snapshot().kind, 'arc', 'expected tangent arc to store as arc');
    expectEqual(tangentSketch.entities.topology.edges.list().length, 2, 'expected two open edges');
    expectEqual(
        tangentSketch.entities.topology.vertices.list().length,
        3,
        'expected arc to reuse start vertex',
    );

    const elliptical = createEditableSketchDocument('sketch:elliptical-arc');

    elliptical.editor.execute(
        new AddEllipticalArcRequest({
            centerPoint: Vec2.of(0, 0),
            endAngleRadians: Math.PI * 1.5,
            endPoint: Vec2.of(0, 1),
            partStudioId: elliptical.partStudioId,
            primaryAxisPoint: Vec2.of(2, 0),
            secondaryPoint: Vec2.of(0, 1),
            sketchFeatureId: elliptical.featureId,
            startAngleRadians: 0,
            startPoint: Vec2.of(2, 0),
        }),
    );

    const ellipticalSketch = requireSketchPayload(elliptical.editor.document, elliptical.sketchId);
    const ellipticalCurve = ellipticalSketch.entities.geometry.curves.list()[0];
    const ellipticalSnapshot = ellipticalCurve?.snapshot();

    expectEqual(ellipticalSnapshot?.kind, 'elliptical-arc', 'expected elliptical arc curve');
    expectEqual(
        ellipticalSnapshot?.kind === 'elliptical-arc' ? ellipticalSnapshot.endAngleRadians : null,
        Math.PI * 1.5,
        'expected elliptical arc end angle to round-trip',
    );
    expectEqual(
        ellipticalSketch.entities.topology.edges.list().length,
        1,
        'expected elliptical arc edge',
    );
    expectEqual(
        ellipticalSketch.entities.topology.vertices.list().length,
        2,
        'expected elliptical arc endpoints',
    );

    const conic = createEditableSketchDocument('sketch:conic');

    conic.editor.execute(
        new AddConicRequest({
            endPoint: Vec2.of(2, 0),
            partStudioId: conic.partStudioId,
            rho: DEFAULT_CONIC_RHO,
            shoulderPoint: Vec2.of(1, 1),
            sketchFeatureId: conic.featureId,
            startPoint: Vec2.of(0, 0),
        }),
    );

    const conicSketch = requireSketchPayload(conic.editor.document, conic.sketchId);
    const conicCurve = conicSketch.entities.geometry.curves.list()[0];
    const conicSnapshot = conicCurve?.snapshot();

    expectEqual(conicSnapshot?.kind, 'conic', 'expected conic curve');
    expectEqual(
        conicSnapshot?.kind === 'conic' ? conicSnapshot.rho : null,
        DEFAULT_CONIC_RHO,
        'expected conic rho to round-trip',
    );
    expectEqual(conicSketch.entities.topology.edges.list().length, 1, 'expected conic edge');
    expectEqual(
        conicSketch.entities.topology.vertices.list().length,
        2,
        'expected conic endpoints',
    );
});

run('regular polygon request creates closed line loop edges', () => {
    const regular = createEditableSketchDocument('sketch:regular-polygon');

    regular.editor.execute(
        new AddRegularPolygonRequest({
            center: Vec2.of(0, 0),
            mode: 'inscribed',
            partStudioId: regular.partStudioId,
            referencePoint: Vec2.of(1, 0),
            sideCount: 6,
            sketchFeatureId: regular.featureId,
        }),
    );

    const sketch = requireSketchPayload(regular.editor.document, regular.sketchId);
    const curves = sketch.entities.geometry.curves.list();
    const edges = sketch.entities.topology.edges.list();
    const vertices = sketch.entities.topology.vertices.list();

    expectEqual(curves.length, 6, 'expected six line curves');
    expectEqual(edges.length, 6, 'expected six polygon edges');
    expectEqual(vertices.length, 6, 'expected six shared polygon vertices');

    for (const curve of curves) {
        expectEqual(curve.snapshot().kind, 'line', 'expected polygon to store only line curves');
    }

    for (let index = 0; index < edges.length; index += 1) {
        const edge = edges[index];
        const nextEdge = edges[(index + 1) % edges.length];

        if (!edge || !nextEdge) {
            throw new Error('Expected polygon edge sequence.');
        }

        expectEqual(
            edge.endVertexId,
            nextEdge.startVertexId,
            'expected polygon edges to form a closed loop',
        );
    }
});

function requireSketchPayload(document: CadDocument, sketchId: string): Sketch {
    const payload = document.getActivePartStudio().findFeaturePayload(sketchId);

    if (!(payload instanceof Sketch)) {
        throw new Error(`Expected sketch payload ${sketchId}.`);
    }

    return payload;
}

function createEditableSketchDocument(sketchId: string): {
    readonly editor: DocumentEditor<CadDocument, CadDocumentWriteContext>;
    readonly featureId: string;
    readonly partStudioId: string;
    readonly sketchId: string;
} {
    const document = createDefaultCadDocument();
    const editor = new DocumentEditor({
        document,
        mutationRuntime: createCadDocumentMutationRuntime(),
    });
    const partStudioId = document.getActivePartStudio().id;
    const sketch = createSketchOnReferencePlane({
        id: sketchId,
        name: sketchId,
        planeKind: 'xy',
        planeObjectRef: createModelRef({
            id: 'plane-xy',
            kind: 'cad.object.reference-plane',
        }),
    });
    const featureId = `feature:${sketchId}`;
    const feature = new Feature({
        id: featureId,
        name: sketchId,
        payloadRef: createFeaturePayloadRef(sketch.id),
        type: 'sketch',
    });

    editor.execute(
        new CreateFeaturePayloadRequest({
            feature,
            history: { label: `Create ${sketchId}` },
            label: `Create ${sketchId}`,
            partStudioId,
            payload: sketch,
            payloadId: sketch.id,
            transactionId: `create:${sketchId}`,
        }),
    );
    editor.beginScope({
        id: `sketch-edit:${featureId}`,
        label: `Edit ${featureId}`,
    });

    return { editor, featureId, partStudioId, sketchId };
}

function requireVertexAt(document: CadDocument, sketchId: string, x: number, y: number): string {
    const sketch = requireSketchPayload(document, sketchId);

    for (const vertex of sketch.entities.topology.vertices.list()) {
        const point = sketch.findPointForVertex(vertex.id);

        if (point?.position.x === x && point.position.y === y) {
            return vertex.id;
        }
    }

    throw new Error(`Expected vertex at (${String(x)}, ${String(y)}).`);
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
