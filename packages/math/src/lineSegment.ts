import type { Vector2 } from './vector2';
import { Point2 } from './vector2';
import type { Vector3 } from './vector3';
import { Point3 } from './vector3';

export class LineSegment2 {
    public start: Point2;
    public end: Point2;

    constructor(start: Vector2, end: Vector2) {
        this.start = Point2.from(start);
        this.end = Point2.from(end);
    }

    public clone(): LineSegment2 {
        return new LineSegment2(this.start, this.end);
    }

    public length(): number {
        return this.start.distanceTo(this.end);
    }
}

export class LineSegment3 {
    public start: Point3;
    public end: Point3;

    constructor(start: Vector3, end: Vector3) {
        this.start = Point3.from(start);
        this.end = Point3.from(end);
    }

    public clone(): LineSegment3 {
        return new LineSegment3(this.start, this.end);
    }

    public length(): number {
        return this.start.distanceTo(this.end);
    }
}

export function createLineSegment2(start: Vector2, end: Vector2): LineSegment2 {
    return new LineSegment2(start, end);
}

export function createLineSegment3(start: Vector3, end: Vector3): LineSegment3 {
    return new LineSegment3(start, end);
}
