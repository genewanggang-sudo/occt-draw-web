export class Interval {
    public readonly max: number;
    public readonly min: number;

    constructor(min: number, max: number) {
        this.min = Math.min(min, max);
        this.max = Math.max(min, max);
    }

    public get length(): number {
        return this.max - this.min;
    }

    public clamp(value: number): number {
        return Math.min(Math.max(value, this.min), this.max);
    }

    public contains(value: number): boolean {
        return value >= this.min && value <= this.max;
    }

    public intersects(other: Interval): boolean {
        return this.min <= other.max && other.min <= this.max;
    }

    public union(other: Interval): Interval {
        return new Interval(Math.min(this.min, other.min), Math.max(this.max, other.max));
    }
}
