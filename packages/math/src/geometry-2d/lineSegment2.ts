import { Vec2, type Vector2 } from '../linear/vec2';
import { ImmutableResultPayloadSnapshotter } from '../value/immutableResultPayloadSnapshotter';
import { GeometryResult } from '../value/result';
import { MATH_EPSILON } from '../value/tolerance';
import { BBox2 } from './bbox2';
import { ParameterDomain } from './parameterDomain';
import { Curve2 } from './curve';

export class LineSegment2 extends Curve2 {
    public readonly domain = ParameterDomain.unit();
    public readonly end: Vec2;
    public readonly start: Vec2;

    constructor(start: Vector2, end: Vector2) {
        super();
        this.start = Vec2.from(start);
        this.end = Vec2.from(end);
    }

    public length(): number {
        return this.start.distanceTo(this.end);
    }

    public pointAt(parameter: number): Vec2 {
        return this.start.translated(
            this.start.vectorTo(this.end).scale(this.domain.clamp(parameter)),
        );
    }

    public tangentAt(): Vec2 {
        return this.start.vectorTo(this.end).normalize();
    }

    public override bounds(): GeometryResult<BBox2> {
        const bounds = BBox2.fromPoints([this.start, this.end]);

        return bounds
            ? GeometryResult.success(bounds, new ImmutableResultPayloadSnapshotter<BBox2>())
            : GeometryResult.empty();
    }

    public isValid(): boolean {
        return (
            this.start.isFinite() &&
            this.end.isFinite() &&
            this.start.distanceTo(this.end) > MATH_EPSILON
        );
    }
}
