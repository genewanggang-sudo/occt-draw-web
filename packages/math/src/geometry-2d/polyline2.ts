import { Vec2, type Vector2 } from '../linear/vec2';
import { ImmutableResultPayloadSnapshotter } from '../value/immutableResultPayloadSnapshotter';
import { GeometryResult } from '../value/result';
import { BBox2 } from './bbox2';
import { Curve2 } from './curve';
import { ParameterDomain } from './parameterDomain';

export class Polyline2 extends Curve2 {
    private readonly pointSnapshot: readonly Vec2[];

    public readonly domain: ParameterDomain;
    protected readonly closed: boolean;

    constructor(points: readonly Vector2[], closed = false) {
        super();
        this.pointSnapshot = points.map((point) => Vec2.from(point));
        this.closed = closed;
        this.domain = new ParameterDomain(0, this.segmentCount);
    }

    public get points(): readonly Vec2[] {
        return this.pointSnapshot.map((point) => Vec2.from(point));
    }

    public pointAt(parameter: number): Vec2 {
        const firstPoint = this.pointSnapshot[0];

        if (!firstPoint) {
            return Vec2.zero();
        }

        if (this.segmentCount <= 0) {
            return firstPoint;
        }

        const clamped = this.domain.clamp(parameter);
        const segmentIndex = Math.min(Math.floor(clamped), this.segmentCount - 1);
        const start = this.pointSnapshot[segmentIndex] ?? firstPoint;
        const end = this.pointSnapshot[this.resolvePointIndex(segmentIndex + 1)] ?? start;

        return start.translated(start.vectorTo(end).scale(clamped - segmentIndex));
    }

    public tangentAt(parameter: number): Vec2 {
        if (this.segmentCount <= 0) {
            return Vec2.zero();
        }

        const clamped = this.domain.clamp(parameter);
        const segmentIndex = Math.min(Math.floor(clamped), this.segmentCount - 1);
        const start = this.pointSnapshot[segmentIndex];
        const end = this.pointSnapshot[this.resolvePointIndex(segmentIndex + 1)];

        return start && end ? start.vectorTo(end).normalize() : Vec2.zero();
    }

    public isValid(): boolean {
        return (
            this.pointSnapshot.length >= 2 && this.pointSnapshot.every((point) => point.isFinite())
        );
    }

    public override bounds(): GeometryResult<BBox2> {
        const bounds = this.isValid() ? BBox2.fromPoints(this.pointSnapshot) : undefined;

        return bounds
            ? GeometryResult.success(bounds, new ImmutableResultPayloadSnapshotter<BBox2>())
            : GeometryResult.empty();
    }

    protected get segmentCount(): number {
        if (this.closed) {
            return this.pointSnapshot.length;
        }

        return Math.max(this.pointSnapshot.length - 1, 0);
    }

    private resolvePointIndex(index: number): number {
        return this.closed && this.pointSnapshot.length > 0
            ? index % this.pointSnapshot.length
            : index;
    }
}
