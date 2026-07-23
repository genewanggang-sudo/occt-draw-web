import { LineSegment2 } from '../geometry-2d/lineSegment2';
import type { Vec2 } from '../linear/vec2';
import { Vec2ResultPayloadSnapshotter } from '../linear/vec2ResultPayloadSnapshotter';
import { ImmutableResultPayloadSnapshotter } from '../value/immutableResultPayloadSnapshotter';
import { GeometryResult } from '../value/result';
import type { Tolerance } from '../value/tolerance';
import { SegmentSegment2OverlapIntersection } from './segmentSegment2OverlapIntersection';
import { SegmentSegment2PointIntersection } from './segmentSegment2PointIntersection';
import type { SegmentSegment2Intersection } from './segmentSegment2Intersection';

export class SegmentSegment2Intersector {
    private readonly tolerance: Tolerance;

    constructor(tolerance: Tolerance) {
        this.tolerance = tolerance;
    }

    public intersect(left: LineSegment2, right: LineSegment2): GeometryResult<Vec2> {
        if (!left.isValid() || !right.isValid()) {
            return GeometryResult.degenerate();
        }

        const p = left.start;
        const r = left.start.vectorTo(left.end);
        const q = right.start;
        const s = right.start.vectorTo(right.end);
        const denominator = r.cross(s);
        const qMinusP = p.vectorTo(q);

        if (this.tolerance.isNearZero(denominator)) {
            if (!this.tolerance.isNearZero(qMinusP.cross(r))) {
                return GeometryResult.parallel();
            }

            return this.collinearSegmentsOverlap(qMinusP, r, s)
                ? GeometryResult.coincident()
                : GeometryResult.empty();
        }

        const t = qMinusP.cross(s) / denominator;
        const u = qMinusP.cross(r) / denominator;

        if (!this.isUnitParameter(t) || !this.isUnitParameter(u)) {
            return GeometryResult.empty();
        }

        return GeometryResult.success(
            left.pointAt(this.clampUnitParameter(t)),
            new Vec2ResultPayloadSnapshotter(),
        );
    }

    public intersectDetailed(
        left: LineSegment2,
        right: LineSegment2,
    ): GeometryResult<SegmentSegment2Intersection> {
        if (!left.isValid() || !right.isValid()) {
            return GeometryResult.degenerate();
        }

        const leftVector = left.start.vectorTo(left.end);
        const rightVector = right.start.vectorTo(right.end);
        const denominator = leftVector.cross(rightVector);
        const startDelta = left.start.vectorTo(right.start);

        if (this.tolerance.isNearZero(denominator)) {
            if (!this.tolerance.isNearZero(startDelta.cross(leftVector))) {
                return GeometryResult.parallel();
            }

            return this.collinearSegmentsIntersection(left, right, leftVector, rightVector);
        }

        const leftParameter = startDelta.cross(rightVector) / denominator;
        const rightParameter = startDelta.cross(leftVector) / denominator;

        if (!this.isUnitParameter(leftParameter) || !this.isUnitParameter(rightParameter)) {
            return GeometryResult.empty();
        }

        const clampedLeftParameter = this.clampUnitParameter(leftParameter);
        const clampedRightParameter = this.clampUnitParameter(rightParameter);

        return GeometryResult.success<SegmentSegment2Intersection>(
            new SegmentSegment2PointIntersection({
                leftParameters: [clampedLeftParameter, clampedLeftParameter],
                point: left.pointAt(clampedLeftParameter),
                rightParameters: [clampedRightParameter, clampedRightParameter],
            }),
            new ImmutableResultPayloadSnapshotter<SegmentSegment2Intersection>(),
        );
    }

    private clampUnitParameter(value: number): number {
        if (value <= this.tolerance.parameter) {
            return 0;
        }

        if (value >= 1 - this.tolerance.parameter) {
            return 1;
        }

        return value;
    }

    private collinearSegmentsIntersection(
        left: LineSegment2,
        right: LineSegment2,
        leftVector: Vec2,
        rightVector: Vec2,
    ): GeometryResult<SegmentSegment2Intersection> {
        const leftLengthSquared = leftVector.lengthSquared();
        const rightLengthSquared = rightVector.lengthSquared();
        const rightStartOnLeft =
            left.start.vectorTo(right.start).dot(leftVector) / leftLengthSquared;
        const rightEndOnLeft = left.start.vectorTo(right.end).dot(leftVector) / leftLengthSquared;
        const overlapStartOnLeft = Math.max(Math.min(rightStartOnLeft, rightEndOnLeft), 0);
        const overlapEndOnLeft = Math.min(Math.max(rightStartOnLeft, rightEndOnLeft), 1);

        if (overlapStartOnLeft > overlapEndOnLeft + this.tolerance.parameter) {
            return GeometryResult.empty();
        }

        const clampedStartOnLeft = this.clampUnitParameter(overlapStartOnLeft);
        const clampedEndOnLeft = this.clampUnitParameter(overlapEndOnLeft);
        const overlapStart = left.pointAt(clampedStartOnLeft);
        const overlapEnd = left.pointAt(clampedEndOnLeft);
        const startOnRight = this.clampUnitParameter(
            right.start.vectorTo(overlapStart).dot(rightVector) / rightLengthSquared,
        );
        const endOnRight = this.clampUnitParameter(
            right.start.vectorTo(overlapEnd).dot(rightVector) / rightLengthSquared,
        );

        if (this.tolerance.arePointsNear2(overlapStart, overlapEnd)) {
            return GeometryResult.success<SegmentSegment2Intersection>(
                new SegmentSegment2PointIntersection({
                    leftParameters: [clampedStartOnLeft, clampedStartOnLeft],
                    point: overlapStart,
                    rightParameters: [startOnRight, startOnRight],
                }),
                new ImmutableResultPayloadSnapshotter<SegmentSegment2Intersection>(),
            );
        }

        return GeometryResult.success<SegmentSegment2Intersection>(
            new SegmentSegment2OverlapIntersection({
                leftParameters: [clampedStartOnLeft, clampedEndOnLeft],
                overlap: new LineSegment2(overlapStart, overlapEnd),
                rightParameters: [startOnRight, endOnRight],
            }),
            new ImmutableResultPayloadSnapshotter<SegmentSegment2Intersection>(),
        );
    }

    private collinearSegmentsOverlap(qMinusP: Vec2, r: Vec2, s: Vec2): boolean {
        const rLengthSquared = r.lengthSquared();
        const t0 = qMinusP.dot(r) / rLengthSquared;
        const t1 = t0 + s.dot(r) / rLengthSquared;
        const overlapMin = Math.max(Math.min(t0, t1), 0);
        const overlapMax = Math.min(Math.max(t0, t1), 1);

        return overlapMin <= overlapMax + this.tolerance.parameter;
    }

    private isUnitParameter(value: number): boolean {
        return value >= -this.tolerance.parameter && value <= 1 + this.tolerance.parameter;
    }
}
