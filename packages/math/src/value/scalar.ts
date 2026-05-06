export const Scalar = {
    clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    },

    isFinite(value: number): boolean {
        return Number.isFinite(value);
    },

    lerp(start: number, end: number, progress: number): number {
        return start + (end - start) * progress;
    },
} as const;

export function clampNumber(value: number, min: number, max: number): number {
    return Scalar.clamp(value, min, max);
}
