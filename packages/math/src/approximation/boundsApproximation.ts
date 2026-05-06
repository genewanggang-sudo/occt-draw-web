import { Arc2 } from '../geometry-2d/arc2';
import { BBox2 } from '../geometry-2d/bbox2';
import { Circle2 } from '../geometry-2d/circle2';
import type { Curve2 } from '../geometry-2d/curve';
import { Ellipse2, EllipticalArc2 } from '../geometry-2d/ellipse2';
import { Vec2 } from '../linear/vec2';
import { GeometryResult } from '../value/result';
import { CurveSampler } from './curveSampler';

export const BoundsApproximation = {
    curve2Bounds(curve: Curve2, samples: number): GeometryResult<BBox2> {
        const bounds = BBox2.fromPoints(resolveBoundsPoints(curve, samples));

        return bounds ? GeometryResult.success(bounds) : GeometryResult.empty();
    },
} as const;

function resolveBoundsPoints(curve: Curve2, samples: number): readonly Vec2[] {
    if (!curve.isValid()) {
        return [];
    }

    if (curve instanceof Circle2) {
        return [
            curve.center.translated(Vec2.of(-curve.radius, 0)),
            curve.center.translated(Vec2.of(curve.radius, 0)),
            curve.center.translated(Vec2.of(0, -curve.radius)),
            curve.center.translated(Vec2.of(0, curve.radius)),
        ];
    }

    if (curve instanceof Ellipse2) {
        return [
            curve.center.translated(Vec2.of(-curve.radiusX, 0)),
            curve.center.translated(Vec2.of(curve.radiusX, 0)),
            curve.center.translated(Vec2.of(0, -curve.radiusY)),
            curve.center.translated(Vec2.of(0, curve.radiusY)),
        ];
    }

    if (curve instanceof Arc2) {
        return resolveArcBoundsPoints(curve.startAngle.radians, curve.endAngle.radians, (angle) =>
            curve.circle.pointAt(angle),
        );
    }

    if (curve instanceof EllipticalArc2) {
        return resolveArcBoundsPoints(curve.startAngleRadians, curve.endAngleRadians, (angle) =>
            curve.ellipse.pointAt(angle),
        );
    }

    return CurveSampler.sampleCurve2(curve, samples);
}

function resolveArcBoundsPoints(
    startAngle: number,
    endAngle: number,
    pointAt: (angle: number) => Vec2,
): readonly Vec2[] {
    const angles = [startAngle, endAngle];

    for (const angle of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
        if (isAngleInSweep(angle, startAngle, endAngle)) {
            angles.push(angle);
        }
    }

    return angles.map((angle) => pointAt(angle));
}

function isAngleInSweep(angle: number, startAngle: number, endAngle: number): boolean {
    const span = endAngle - startAngle;
    const twoPi = Math.PI * 2;

    if (span === 0) {
        return false;
    }

    let candidate =
        span > 0
            ? angle + Math.ceil((startAngle - angle) / twoPi) * twoPi
            : angle + Math.floor((startAngle - angle) / twoPi) * twoPi;

    if (span > 0 && candidate <= startAngle) {
        candidate += twoPi;
    }

    if (span < 0 && candidate >= startAngle) {
        candidate -= twoPi;
    }

    const progress = (candidate - startAngle) / span;

    return progress > 0 && progress < 1;
}
