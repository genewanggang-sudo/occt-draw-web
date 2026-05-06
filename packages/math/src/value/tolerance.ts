const DEFAULT_ANGLE_TOLERANCE = 0.0000000001;
const DEFAULT_DISTANCE_TOLERANCE = 0.00000001;
const DEFAULT_PARAMETER_TOLERANCE = 0.0000000001;

export class Tolerance {
    public readonly angle: number;
    public readonly distance: number;
    public readonly parameter: number;

    constructor(
        input: {
            readonly angle?: number;
            readonly distance?: number;
            readonly parameter?: number;
        } = {},
    ) {
        this.angle = input.angle ?? DEFAULT_ANGLE_TOLERANCE;
        this.distance = input.distance ?? DEFAULT_DISTANCE_TOLERANCE;
        this.parameter = input.parameter ?? DEFAULT_PARAMETER_TOLERANCE;
    }

    public get distanceSquared(): number {
        return this.distance * this.distance;
    }

    public isNearZero(value: number, tolerance = this.distance): boolean {
        return Math.abs(value) <= tolerance;
    }

    public isNearZeroSquared(value: number, toleranceSquared = this.distanceSquared): boolean {
        return value <= toleranceSquared;
    }

    public isNearZeroAngle(value: number): boolean {
        return this.isNearZero(value, this.angle);
    }

    public isNearZeroParameter(value: number): boolean {
        return this.isNearZero(value, this.parameter);
    }

    public equals(left: number, right: number, tolerance = this.distance): boolean {
        return Math.abs(left - right) <= tolerance;
    }

    public equalsAngle(left: number, right: number): boolean {
        return this.equals(left, right, this.angle);
    }

    public equalsParameter(left: number, right: number): boolean {
        return this.equals(left, right, this.parameter);
    }

    public static default(): Tolerance {
        return DEFAULT_TOLERANCE;
    }
}

export const DEFAULT_TOLERANCE = new Tolerance();
export const MATH_EPSILON = DEFAULT_TOLERANCE.distance;

export function isNearlyZero(value: number, tolerance = MATH_EPSILON): boolean {
    return Math.abs(value) <= tolerance;
}

export function areNumbersEqual(left: number, right: number, tolerance = MATH_EPSILON): boolean {
    return Math.abs(left - right) <= tolerance;
}
