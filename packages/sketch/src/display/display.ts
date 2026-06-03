import { LineSegment3, type Plane3, type Vector3 } from '@occt-draw/math';
import { Line2D } from '../geometry/geometry';
import { sampleSketchCurveSegments } from '../geometry/curveSampling';
import type { Sketch } from '../model/sketch';
import type { SketchEntityRef } from '../types';

export interface SketchDisplayEdge {
    readonly ref: SketchEntityRef;
    readonly role: 'construction' | 'normal';
    readonly segment: LineSegment3;
}

export interface SketchDisplayVertex {
    readonly point: Vector3;
    readonly ref: SketchEntityRef;
}

export interface SketchDisplayProfile {
    readonly ref: SketchEntityRef;
}

export class SketchDisplayModel {
    public readonly edges: readonly SketchDisplayEdge[];
    public readonly profiles: readonly SketchDisplayProfile[];
    public readonly vertices: readonly SketchDisplayVertex[];

    constructor(
        input: {
            readonly edges?: readonly SketchDisplayEdge[];
            readonly profiles?: readonly SketchDisplayProfile[];
            readonly vertices?: readonly SketchDisplayVertex[];
        } = {},
    ) {
        this.edges = [...(input.edges ?? [])];
        this.profiles = [...(input.profiles ?? [])];
        this.vertices = [...(input.vertices ?? [])];
    }
}

export class SketchDisplayBuilder {
    public build(sketch: Sketch, plane: Plane3): SketchDisplayModel {
        const vertices = sketch.entities.topology.vertices.list().flatMap((vertex) => {
            const point = sketch.entities.geometry.points.get(vertex.pointId);

            return point
                ? [
                      {
                          point: plane.localToWorld(point.position),
                          ref: vertex.ref,
                      },
                  ]
                : [];
        });
        const edgeCurveIds = new Set<string>();
        const edges = sketch.entities.topology.edges.list().flatMap((edge) => {
            const curve = sketch.entities.geometry.curves.get(edge.curveId);
            const start = sketch.findPointForVertex(edge.startVertexId);
            const end = sketch.findPointForVertex(edge.endVertexId);

            if (!curve || !start || !end) {
                return [];
            }

            edgeCurveIds.add(edge.curveId);

            if (curve instanceof Line2D) {
                return [
                    {
                        ref: edge.ref,
                        role: edge.role,
                        segment: new LineSegment3(
                            plane.localToWorld(start.position),
                            plane.localToWorld(end.position),
                        ),
                    },
                ];
            }

            return sampleSketchCurveSegments(curve).map((segment) => ({
                ref: edge.ref,
                role: edge.role,
                segment: new LineSegment3(
                    plane.localToWorld(segment.start),
                    plane.localToWorld(segment.end),
                ),
            }));
        });
        const sampledCurveEdges = sketch.entities.geometry.curves
            .list()
            .filter((curve) => !edgeCurveIds.has(curve.id))
            .flatMap((curve) =>
                sampleSketchCurveSegments(curve).map((segment) => ({
                    ref: curve.ref,
                    role: 'normal' as const,
                    segment: new LineSegment3(
                        plane.localToWorld(segment.start),
                        plane.localToWorld(segment.end),
                    ),
                })),
            );

        return new SketchDisplayModel({
            edges: [...edges, ...sampledCurveEdges],
            vertices,
        });
    }
}
