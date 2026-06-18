import { Vec2, type Vector2 } from '../linear/vec2';
import { GeometryResult } from '../value/result';
import { MATH_EPSILON } from '../value/tolerance';

export type RegularPolygonMode = 'inscribed' | 'circumscribed';

export interface RegularPolygonInput {
    readonly center: Vector2;
    readonly mode: RegularPolygonMode;
    readonly referencePoint: Vector2;
    readonly sideCount: number;
}

export function createRegularPolygonPoints(
    input: RegularPolygonInput,
): GeometryResult<readonly Vec2[]> {
    const center = Vec2.from(input.center);
    const referencePoint = Vec2.from(input.referencePoint);

    if (
        !center.isFinite() ||
        !referencePoint.isFinite() ||
        !Number.isInteger(input.sideCount) ||
        input.sideCount < 3
    ) {
        return GeometryResult.empty();
    }

    const referenceRadius = center.distanceTo(referencePoint);

    if (!Number.isFinite(referenceRadius) || referenceRadius <= MATH_EPSILON) {
        return GeometryResult.degenerate();
    }

    const angleStep = (Math.PI * 2) / input.sideCount;
    const referenceAngle = Math.atan2(referencePoint.y - center.y, referencePoint.x - center.x);
    let radius = referenceRadius;
    let startAngle = referenceAngle;

    if (input.mode === 'circumscribed') {
        const angleOffset = Math.PI / input.sideCount;
        const apothemScale = Math.cos(angleOffset);

        if (!Number.isFinite(apothemScale) || Math.abs(apothemScale) <= MATH_EPSILON) {
            return GeometryResult.degenerate();
        }

        radius = referenceRadius / apothemScale;
        startAngle = referenceAngle - angleOffset;
    }

    const points = Array.from({ length: input.sideCount }, (_, index) => {
        const angle = startAngle + angleStep * index;

        return center.translated(Vec2.of(Math.cos(angle) * radius, Math.sin(angle) * radius));
    });

    return points.every((point) => point.isFinite())
        ? GeometryResult.success(points)
        : GeometryResult.empty();
}
