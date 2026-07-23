import { Vec2, type Vector2 } from '../linear/vec2';
import { Curve2 } from './curve';
import { ParameterDomain } from './parameterDomain';

export class Bezier2 extends Curve2 {
    private readonly controlPointSnapshot: readonly Vec2[];

    public readonly domain = ParameterDomain.unit();

    constructor(controlPoints: readonly Vector2[]) {
        super();
        this.controlPointSnapshot = controlPoints.map((point) => Vec2.from(point));
    }

    public get controlPoints(): readonly Vec2[] {
        return this.controlPointSnapshot.map((point) => Vec2.from(point));
    }

    public pointAt(parameter: number): Vec2 {
        return Bezier2.evaluate(this.controlPointSnapshot, this.domain.clamp(parameter));
    }

    public tangentAt(parameter: number): Vec2 {
        if (this.controlPointSnapshot.length < 2) {
            return Vec2.zero();
        }

        const degree = this.controlPointSnapshot.length - 1;
        const derivativePoints = this.controlPointSnapshot.slice(1).map((point, index) => {
            const previous = this.controlPointSnapshot[index];

            return previous ? previous.vectorTo(point).scale(degree) : Vec2.zero();
        });

        return Bezier2.evaluate(derivativePoints, this.domain.clamp(parameter)).normalize();
    }

    public isValid(): boolean {
        return (
            this.controlPointSnapshot.length >= 2 &&
            this.controlPointSnapshot.every((point) => point.isFinite())
        );
    }

    private static evaluate(points: readonly Vec2[], parameter: number): Vec2 {
        let current = [...points];

        if (current.length === 0) {
            return Vec2.zero();
        }

        while (current.length > 1) {
            current = current.slice(1).map((point, index) => {
                const previous = current[index];

                return previous ? Vec2.lerp(previous, point, parameter) : point;
            });
        }

        return current[0] ?? Vec2.zero();
    }
}
