import type { LineVertex } from './types';

export function toVertexBuffer(vertices: readonly LineVertex[]): Float32Array {
    const values: number[] = [];

    for (const vertex of vertices) {
        values.push(
            vertex.position.x,
            vertex.position.y,
            vertex.position.z,
            vertex.color.x,
            vertex.color.y,
            vertex.color.z,
        );
    }

    return new Float32Array(values);
}
