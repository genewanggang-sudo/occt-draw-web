import { Vec2, type Vector2 } from '../linear/vec2';
import { Curve2 } from './curve';
import { ParameterDomain } from './parameter';

export class Bezier2 extends Curve2 {
    public readonly controlPoints: readonly Vec2[];
    public readonly domain = ParameterDomain.unit();

    constructor(controlPoints: readonly Vector2[]) {
        super();
        this.controlPoints = controlPoints.map((point) => Vec2.from(point));
    }

    public pointAt(parameter: number): Vec2 {
        return Bezier2.evaluate(this.controlPoints, this.domain.clamp(parameter));
    }

    public tangentAt(parameter: number): Vec2 {
        if (this.controlPoints.length < 2) {
            return Vec2.zero();
        }

        const degree = this.controlPoints.length - 1;
        const derivativePoints = this.controlPoints.slice(1).map((point, index) => {
            const previous = this.controlPoints[index];

            return previous ? previous.vectorTo(point).scale(degree) : Vec2.zero();
        });

        return Bezier2.evaluate(derivativePoints, this.domain.clamp(parameter)).normalize();
    }

    public isValid(): boolean {
        return (
            this.controlPoints.length >= 2 && this.controlPoints.every((point) => point.isFinite())
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
