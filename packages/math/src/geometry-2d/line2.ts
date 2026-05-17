import { Vec2, type Vector2 } from '../linear/vec2';
import { GeometryResult } from '../value/result';
import { ParameterDomain } from './parameter';
import { Curve2 } from './curve';
import type { BBox2 } from './bbox2';
import { MATH_EPSILON } from '../value/tolerance';

export class Line2 extends Curve2 {
    public readonly domain = new ParameterDomain(
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
    );
    public readonly direction: Vec2;
    public readonly origin: Vec2;

    constructor(origin: Vector2, direction: Vector2) {
        super();
        this.origin = Vec2.from(origin);
        this.direction = Vec2.normalize(direction);
    }

    public pointAt(parameter: number): Vec2 {
        return this.origin.translated(this.direction.scale(parameter));
    }

    public tangentAt(): Vec2 {
        return this.direction;
    }

    public override bounds(): GeometryResult<BBox2> {
        return GeometryResult.empty();
    }

    public isValid(): boolean {
        return (
            this.origin.isFinite() &&
            this.direction.isFinite() &&
            this.direction.length() > MATH_EPSILON
        );
    }
}
