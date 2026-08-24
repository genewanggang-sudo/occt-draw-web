// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Public static service API.
export class Scalar {
    public static clamp(value: number, min: number, max: number): number {
        return Scalar.clampValue(value, min, max);
    }

    public static isFinite(value: number): boolean {
        return Scalar.isFiniteValue(value);
    }

    public static lerp(start: number, end: number, progress: number): number {
        return Scalar.lerpValue(start, end, progress);
    }

    private static clampValue(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    private static isFiniteValue(value: number): boolean {
        return Number.isFinite(value);
    }

    private static lerpValue(start: number, end: number, progress: number): number {
        return start + (end - start) * progress;
    }
}
