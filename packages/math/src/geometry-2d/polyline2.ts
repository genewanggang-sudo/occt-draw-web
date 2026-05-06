import { Vec2, type Vector2 } from '../linear/vec2';
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
}
