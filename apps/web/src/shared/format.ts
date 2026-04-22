import type { Point2D } from '@occt-draw/core';

export function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
}

export function formatPoint(point: Point2D): string {
    return `${point.x.toFixed(2)}, ${point.y.toFixed(2)}`;
}
