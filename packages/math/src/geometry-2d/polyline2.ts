import { Vec2, type Vector2 } from '../linear/vec2';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { BBox2 } from './bbox2';
import type { BoundedCurve2 } from './curve';
import { ParameterDomain } from './parameter';

export class Polyline2 implements BoundedCurve2 {
    public readonly points: readonly Vec2[];
    public readonly domain: ParameterDomain;
    protected readonly closed: boolean;

    constructor(points: readonly Vector2[], closed = false) {
        this.points = points.map((point) => Vec2.from(point));
        this.closed = closed;
        this.domain = new ParameterDomain(0, this.segmentCount);
    }

    public pointAt(parameter: number): Vec2 {
        const firstPoint = this.points[0];

        if (!firstPoint) {
            return Vec2.zero();
        }

        if (this.segmentCount <= 0) {
            return firstPoint;
        }

        const clamped = this.domain.clamp(parameter);
        const segmentIndex = Math.min(Math.floor(clamped), this.segmentCount - 1);
        const start = this.points[segmentIndex] ?? firstPoint;
        const end = this.points[this.resolvePointIndex(segmentIndex + 1)] ?? start;

        return start.translated(start.vectorTo(end).scale(clamped - segmentIndex));
    }

    public tangentAt(parameter: number): Vec2 {
        if (this.segmentCount <= 0) {
            return Vec2.zero();
        }

        const clamped = this.domain.clamp(parameter);
        const segmentIndex = Math.min(Math.floor(clamped), this.segmentCount - 1);
        const start = this.points[segmentIndex];
        const end = this.points[this.resolvePointIndex(segmentIndex + 1)];

        return start && end ? start.vectorTo(end).normalize() : Vec2.zero();
    }

    public isValid(): boolean {
        return this.points.length >= 2 && this.points.every((point) => point.isFinite());
    }

    protected get segmentCount(): number {
        if (this.closed) {
            return this.points.length;
        }

        return Math.max(this.points.length - 1, 0);
    }

    private resolvePointIndex(index: number): number {
        return this.closed && this.points.length > 0 ? index % this.points.length : index;
    }
}

export class Polygon2 extends Polyline2 {
    constructor(points: readonly Vector2[]) {
        super(points, true);
    }

    public signedArea(): number {
        return signedArea2(this.points);
    }

    public area(): number {
        return Math.abs(this.signedArea());
    }

    public centroid(): GeometryResult<Vec2> {
        const signedArea = this.signedArea();

        if (!this.isValid() || DEFAULT_TOLERANCE.isNearZeroSquared(signedArea * signedArea)) {
            return GeometryResult.degenerate();
        }

        let x = 0;
        let y = 0;

        for (
            let index = 0, previous = this.points.length - 1;
            index < this.points.length;
            previous = index++
        ) {
            const currentPoint = this.points[index];
            const previousPoint = this.points[previous];

            if (!currentPoint || !previousPoint) {
                continue;
            }

            const cross = previousPoint.x * currentPoint.y - currentPoint.x * previousPoint.y;
            x += (previousPoint.x + currentPoint.x) * cross;
            y += (previousPoint.y + currentPoint.y) * cross;
        }

        return GeometryResult.success(Vec2.of(x / (6 * signedArea), y / (6 * signedArea)));
    }

    public bounds(): GeometryResult<BBox2> {
        const bounds = this.isValid() ? BBox2.fromPoints(this.points) : undefined;

        return bounds ? GeometryResult.success(bounds) : GeometryResult.empty();
    }

    public containsPoint(point: Vector2): boolean {
        return classifyPointInPolygon2(point, this.points) !== 'outside';
    }

    public override isValid(): boolean {
        return this.points.length >= 3 && this.points.every((point) => point.isFinite());
    }
}

type PolygonPointClassification = 'inside' | 'on-boundary' | 'outside';

function signedArea2(points: readonly Vector2[]): number {
    let area = 0;

    for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
        const currentPoint = points[index];
        const previousPoint = points[previous];

        if (!currentPoint || !previousPoint) {
            continue;
        }

        area += previousPoint.x * currentPoint.y - currentPoint.x * previousPoint.y;
    }

    return area / 2;
}

function classifyPointInPolygon2(
    point: Vector2,
    polygon: readonly Vector2[],
): PolygonPointClassification {
    if (polygon.length < 3) {
        return 'outside';
    }

    let inside = false;

    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
        const currentPoint = polygon[index];
        const previousPoint = polygon[previous];

        if (!currentPoint || !previousPoint) {
            continue;
        }

        if (isPointOnSegment(point, previousPoint, currentPoint)) {
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

function isPointOnSegment(point: Vector2, start: Vector2, end: Vector2): boolean {
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
        parameter >= -DEFAULT_TOLERANCE.parameter && parameter <= 1 + DEFAULT_TOLERANCE.parameter
    );
}
