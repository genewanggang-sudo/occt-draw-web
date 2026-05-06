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
        this.angle = input.angle ?? 1e-10;
        this.distance = input.distance ?? 1e-8;
        this.parameter = input.parameter ?? 1e-10;
    }

    public isNearZero(value: number, tolerance = this.distance): boolean {
        return Math.abs(value) <= tolerance;
    }

    public equals(left: number, right: number, tolerance = this.distance): boolean {
        return Math.abs(left - right) <= tolerance;
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
