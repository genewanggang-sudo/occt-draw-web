import { Vec2, type Vector2 } from '../linear/vec2';
import { Vec2ResultPayloadSnapshotter } from '../linear/vec2ResultPayloadSnapshotter';
import { ImmutableResultPayloadSnapshotter } from '../value/immutableResultPayloadSnapshotter';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { BBox2 } from './bbox2';

export type PolygonOrientation = 'clockwise' | 'counter-clockwise' | 'degenerate';
export type PolygonPointClassification = 'inside' | 'on-boundary' | 'outside';

export class Polygon2 {
    private readonly pointSnapshot: readonly Vec2[];

    constructor(points: readonly Vector2[]) {
        this.pointSnapshot = points.map((point) => Vec2.from(point));
    }

    public get points(): readonly Vec2[] {
        return this.pointSnapshot.map((point) => Vec2.from(point));
    }

    public isValid(): boolean {
        return (
            this.pointSnapshot.length >= 3 && this.pointSnapshot.every((point) => point.isFinite())
        );
    }

    public signedArea(): number {
        let area = 0;

        for (
            let index = 0, previous = this.pointSnapshot.length - 1;
            index < this.pointSnapshot.length;
            previous = index++
        ) {
            const currentPoint = this.pointSnapshot[index];
            const previousPoint = this.pointSnapshot[previous];

            if (!currentPoint || !previousPoint) {
                continue;
            }

            area += previousPoint.x * currentPoint.y - currentPoint.x * previousPoint.y;
        }

        return area / 2;
    }

    public area(): number {
        return Math.abs(this.signedArea());
    }

    public orientation(): PolygonOrientation {
        const signedArea = this.signedArea();

        if (DEFAULT_TOLERANCE.isNearZeroSquared(signedArea * signedArea)) {
            return 'degenerate';
        }

        return signedArea > 0 ? 'counter-clockwise' : 'clockwise';
    }

    public centroid(): GeometryResult<Vec2> {
        const signedArea = this.signedArea();

        if (!this.isValid() || DEFAULT_TOLERANCE.isNearZeroSquared(signedArea * signedArea)) {
            return GeometryResult.degenerate();
        }

        let x = 0;
        let y = 0;

        for (
            let index = 0, previous = this.pointSnapshot.length - 1;
            index < this.pointSnapshot.length;
            previous = index++
        ) {
            const currentPoint = this.pointSnapshot[index];
            const previousPoint = this.pointSnapshot[previous];

            if (!currentPoint || !previousPoint) {
                continue;
            }

            const cross = previousPoint.x * currentPoint.y - currentPoint.x * previousPoint.y;
            x += (previousPoint.x + currentPoint.x) * cross;
            y += (previousPoint.y + currentPoint.y) * cross;
        }

        return GeometryResult.success(
            Vec2.of(x / (6 * signedArea), y / (6 * signedArea)),
            new Vec2ResultPayloadSnapshotter(),
        );
    }

    public bounds(): GeometryResult<BBox2> {
        const bounds = this.isValid() ? BBox2.fromPoints(this.pointSnapshot) : undefined;

        return bounds
            ? GeometryResult.success(bounds, new ImmutableResultPayloadSnapshotter<BBox2>())
            : GeometryResult.empty();
    }

    public classifyPoint(point: Vector2): PolygonPointClassification {
        if (!this.isValid()) {
            return 'outside';
        }

        let inside = false;

        for (
            let index = 0, previous = this.pointSnapshot.length - 1;
            index < this.pointSnapshot.length;
            previous = index++
        ) {
            const currentPoint = this.pointSnapshot[index];
            const previousPoint = this.pointSnapshot[previous];

            if (!currentPoint || !previousPoint) {
                continue;
            }

            if (Polygon2.isPointOnSegment(point, previousPoint, currentPoint)) {
                return 'on-boundary';
            }

            const crosses =
                currentPoint.y > point.y !== previousPoint.y > point.y &&
                point.x <
                    ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
                        (previousPoint.y - currentPoint.y) +
                        currentPoint.x;

            if (crosses) {
                inside = !inside;
            }
        }

        return inside ? 'inside' : 'outside';
    }

    public containsPoint(point: Vector2): boolean {
        return this.classifyPoint(point) !== 'outside';
    }

    public isPointOnBoundary(point: Vector2): boolean {
        return this.classifyPoint(point) === 'on-boundary';
    }

    private static isPointOnSegment(point: Vector2, start: Vec2, end: Vec2): boolean {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = dx * dx + dy * dy;

        if (DEFAULT_TOLERANCE.isNearZeroSquared(lengthSquared)) {
            const pointDx = point.x - start.x;
            const pointDy = point.y - start.y;

            return DEFAULT_TOLERANCE.isNearZeroSquared(pointDx * pointDx + pointDy * pointDy);
        }

        const cross = (point.x - start.x) * dy - (point.y - start.y) * dx;

        if (cross * cross > DEFAULT_TOLERANCE.distanceSquared * lengthSquared) {
            return false;
        }

        const parameter = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;

        return (
            parameter >= -DEFAULT_TOLERANCE.parameter &&
            parameter <= 1 + DEFAULT_TOLERANCE.parameter
        );
    }
}
