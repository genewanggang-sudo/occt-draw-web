import { Vec2, type Vector2 } from '../linear/vec2';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE, MATH_EPSILON } from '../value/tolerance';
import { BBox2 } from './bbox2';
import { Curve2 } from './curve';
import { ParameterDomain } from './parameter';

export const DEFAULT_CONIC_RHO = 0.5;

export class Conic2 extends Curve2 {
    public readonly domain = ParameterDomain.unit();
    public readonly endPoint: Vec2;
    public readonly rho: number;
    public readonly shoulderPoint: Vec2;
    public readonly startPoint: Vec2;

    constructor(input: {
        readonly endPoint: Vector2;
        readonly rho?: number;
        readonly shoulderPoint: Vector2;
        readonly startPoint: Vector2;
    }) {
        super();
        this.startPoint = Vec2.from(input.startPoint);
        this.endPoint = Vec2.from(input.endPoint);
        this.shoulderPoint = Vec2.from(input.shoulderPoint);
        this.rho = input.rho ?? DEFAULT_CONIC_RHO;
    }

    public get controlPoint(): Vec2 {
        return Vec2.scale(
            Vec2.subtract(
                Vec2.scale(this.shoulderPoint, 1 + this.rho),
                Vec2.scale(Vec2.add(this.startPoint, this.endPoint), 0.5),
            ),
            1 / this.rho,
        );
    }

    public pointAt(parameter: number): Vec2 {
        const t = this.domain.clamp(parameter);
        const u = 1 - t;
        const control = this.controlPoint;
        const startWeight = u * u;
        const controlWeight = 2 * this.rho * u * t;
        const endWeight = t * t;
        const denominator = startWeight + controlWeight + endWeight;

        if (!Number.isFinite(denominator) || Math.abs(denominator) <= MATH_EPSILON) {
            return Vec2.zero();
        }

        return Vec2.scale(
            Vec2.add(
                Vec2.add(
                    Vec2.scale(this.startPoint, startWeight),
                    Vec2.scale(control, controlWeight),
                ),
                Vec2.scale(this.endPoint, endWeight),
            ),
            1 / denominator,
        );
    }

    public tangentAt(parameter: number): Vec2 {
        return this.finiteDifferenceTangent(parameter);
    }

    public override bounds(): GeometryResult<BBox2> {
        if (!this.isValid()) {
            return GeometryResult.empty();
        }

        const bounds = BBox2.fromPoints(this.sample({ includeEnd: true, samples: 65 }));

        return bounds ? GeometryResult.success(bounds) : GeometryResult.empty();
    }

    public isValid(): boolean {
        return (
            this.startPoint.isFinite() &&
            this.endPoint.isFinite() &&
            this.shoulderPoint.isFinite() &&
            Number.isFinite(this.rho) &&
            this.rho > MATH_EPSILON &&
            Vec2.distance(this.startPoint, this.endPoint) > DEFAULT_TOLERANCE.distance &&
            !isPointOnChord(this.startPoint, this.endPoint, this.shoulderPoint)
        );
    }

    public static fromThreePoints(
        startPoint: Vector2,
        endPoint: Vector2,
        shoulderPoint: Vector2,
        rho = DEFAULT_CONIC_RHO,
    ): Conic2 | null {
        const conic = new Conic2({ endPoint, rho, shoulderPoint, startPoint });

        return conic.isValid() ? conic : null;
    }
}

function isPointOnChord(startPoint: Vec2, endPoint: Vec2, point: Vec2): boolean {
    const chord = startPoint.vectorTo(endPoint);
    const offset = startPoint.vectorTo(point);

    return Math.abs(chord.cross(offset)) <= DEFAULT_TOLERANCE.distance * chord.length();
}
