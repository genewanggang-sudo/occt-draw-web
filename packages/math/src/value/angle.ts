import { Scalar } from './scalar';

export class Angle {
    public readonly radians: number;

    constructor(radians: number) {
        this.radians = radians;
    }

    public get degrees(): number {
        return (this.radians * 180) / Math.PI;
    }

    public normalizedPositive(): Angle {
        const fullTurn = Math.PI * 2;
        const radians = ((this.radians % fullTurn) + fullTurn) % fullTurn;

        return new Angle(radians);
    }

    public normalizedSigned(): Angle {
        const normalized = this.normalizedPositive().radians;

        return new Angle(normalized > Math.PI ? normalized - Math.PI * 2 : normalized);
    }

    public sin(): number {
        return Math.sin(this.radians);
    }

    public cos(): number {
        return Math.cos(this.radians);
    }

    public tan(): number {
        return Math.tan(this.radians);
    }

    public static fromDegrees(degrees: number): Angle {
        return new Angle((degrees * Math.PI) / 180);
    }

    public static fromRadians(radians: number): Angle {
        return new Angle(radians);
    }

    public static lerp(start: Angle, end: Angle, progress: number): Angle {
        return new Angle(Scalar.lerp(start.radians, end.radians, progress));
    }
}

export const RIGHT_ANGLE = new Angle(Math.PI / 2);
export const HALF_TURN = new Angle(Math.PI);
export const FULL_TURN = new Angle(Math.PI * 2);
