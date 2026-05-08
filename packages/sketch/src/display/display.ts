import { LineSegment3, type Plane3, type Vector3 } from '@occt-draw/math';
import { Line2D } from '../geometry/geometry';
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
        const edges = sketch.entities.topology.edges.list().flatMap((edge) => {
            const curve = sketch.entities.geometry.curves.get(edge.curveId);
            const start = sketch.findPointForVertex(edge.startVertexId);
            const end = sketch.findPointForVertex(edge.endVertexId);

            if (!(curve instanceof Line2D) || !start || !end) {
                return [];
            }

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
        });

        return new SketchDisplayModel({
            edges,
            vertices,
        });
    }
}
