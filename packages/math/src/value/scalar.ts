export class Scalar {
    private static readonly defaultScalar = new Scalar();

    public static clamp(value: number, min: number, max: number): number {
        return Scalar.defaultScalar.clamp(value, min, max);
    }

    public static isFinite(value: number): boolean {
        return Scalar.defaultScalar.isFinite(value);
    }

    public static lerp(start: number, end: number, progress: number): number {
        return Scalar.defaultScalar.lerp(start, end, progress);
    }

    public clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    public isFinite(value: number): boolean {
        return Number.isFinite(value);
    }

    public lerp(start: number, end: number, progress: number): number {
        return start + (end - start) * progress;
    }
}
