export type RenderPrimitiveKind = 'edge' | 'face' | 'vertex';

export function createRenderPrimitiveId(
    objectId: string,
    kind: RenderPrimitiveKind,
    index: number,
): string {
    return `${objectId}:${kind}:${index.toString()}`;
}
