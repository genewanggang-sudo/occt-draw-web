export const MATH_EPSILON = 1e-8;

export function isNearlyZero(value: number, tolerance = MATH_EPSILON): boolean {
    return Math.abs(value) <= tolerance;
}

export function areNumbersEqual(left: number, right: number, tolerance = MATH_EPSILON): boolean {
    return Math.abs(left - right) <= tolerance;
}
