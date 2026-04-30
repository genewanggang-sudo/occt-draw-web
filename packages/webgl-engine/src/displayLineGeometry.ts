import type { LineBatchRenderNode } from './types';
import type { LineVertex } from './types';

export function appendDisplayLineSegments(
    vertices: LineVertex[],
    object: LineBatchRenderNode,
): void {
    for (const segment of object.segments) {
        vertices.push(
            { position: segment.start, color: object.color, alpha: 1 },
            { position: segment.end, color: object.color, alpha: 1 },
        );
    }
}
