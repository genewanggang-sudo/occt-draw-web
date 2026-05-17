import { Vec2 } from '../linear/vec2';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { BBox2 } from './bbox2';
import type { ParameterDomain } from './parameter';

export interface CurveSamplingOptions {
    readonly includeEnd?: boolean;
    readonly samples?: number;
}

export abstract class Curve2 {
    public abstract readonly domain: ParameterDomain;

    public abstract isValid(): boolean;

    public abstract pointAt(parameter: number): Vec2;

    public abstract tangentAt(parameter: number): Vec2;

    public normalAt(parameter: number): Vec2 {
        return this.tangentAt(parameter).perpendicularLeft();
    }

    public bounds(options: CurveSamplingOptions = {}): GeometryResult<BBox2> {
        const bounds = BBox2.fromPoints(this.sample(options));

        return bounds ? GeometryResult.success(bounds) : GeometryResult.empty();
    }

    public sample(options: CurveSamplingOptions = {}): readonly Vec2[] {
        if (
            !this.isValid() ||
            !Number.isFinite(this.domain.min) ||
            !Number.isFinite(this.domain.max)
        ) {
            return [];
        }

        const count = Math.floor(options.samples ?? 32);

        if (count <= 0) {
            return [];
        }

        const includeEnd = options.includeEnd ?? true;

        return Array.from({ length: count }, (_, index) => {
            const progress = includeEnd ? index / Math.max(count - 1, 1) : index / count;
            const parameter = this.domain.min + this.domain.length * progress;

            return this.pointAt(parameter);
        });
    }

    protected finiteDifferenceTangent(parameter: number): Vec2 {
        const span = Math.max(this.domain.length, 1);
        const delta = Math.max(
            span * Math.sqrt(DEFAULT_TOLERANCE.parameter),
            DEFAULT_TOLERANCE.parameter,
        );
        const before = this.domain.clamp(parameter - delta);
        const after = this.domain.clamp(parameter + delta);

        if (after === before) {
            return Vec2.zero();
        }

        return this.pointAt(before).vectorTo(this.pointAt(after)).normalize();
    }
}

export type BoundedCurve2 = Curve2;
