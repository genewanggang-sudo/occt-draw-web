import type { LineSegmentsDisplayObject } from '@occt-draw/display';
import type { LineVertex } from './types';

export function appendDisplayLineSegments(
    vertices: LineVertex[],
    object: LineSegmentsDisplayObject,
): void {
    for (const segment of object.segments) {
        vertices.push(
            { position: segment.start, color: object.color },
            { position: segment.end, color: object.color },
        );
    }
}
