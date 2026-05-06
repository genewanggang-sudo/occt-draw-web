import { Vec3, type Vector3 } from '../linear/vec3';
import { MATH_EPSILON } from '../value/tolerance';

export class Coord3 {
    public readonly origin: Vec3;
    public readonly xAxis: Vec3;
    public readonly yAxis: Vec3;
    public readonly zAxis: Vec3;

    constructor(input: {
        readonly origin: Vector3;
        readonly xAxis?: Vector3;
        readonly yAxis?: Vector3;
        readonly zAxis?: Vector3;
    }) {
        this.origin = Vec3.from(input.origin);
        this.zAxis = normalizeOrFallback(input.zAxis ?? { x: 0, y: 0, z: 1 }, Vec3.of(0, 0, 1));
        this.xAxis = normalizeAxisInPlane(input.xAxis ?? { x: 1, y: 0, z: 0 }, this.zAxis);
        this.yAxis = input.yAxis
            ? normalizeAxisInPlane(input.yAxis, this.zAxis)
            : this.zAxis.cross(this.xAxis).normalize();
    }

    public localToWorld(point: Vector3): Vec3 {
        return this.origin
            .translated(this.xAxis.scale(point.x))
            .translated(this.yAxis.scale(point.y))
            .translated(this.zAxis.scale(point.z));
    }

    public worldToLocal(point: Vector3): Vec3 {
        const vector = this.origin.vectorTo(point);

        return Vec3.of(vector.dot(this.xAxis), vector.dot(this.yAxis), vector.dot(this.zAxis));
    }

    public static identity(): Coord3 {
        return new Coord3({ origin: Vec3.zero() });
    }
}

function normalizeOrFallback(value: Vector3, fallback: Vec3): Vec3 {
    const vector = Vec3.from(value);

    return vector.isFinite() && vector.length() > MATH_EPSILON ? vector.normalize() : fallback;
}

function normalizeAxisInPlane(axis: Vector3, normal: Vec3): Vec3 {
    const vector = Vec3.from(axis).subtract(normal.scale(Vec3.dot(axis, normal)));

    if (vector.isFinite() && vector.length() > MATH_EPSILON) {
        return vector.normalize();
    }

    const fallback = Math.abs(normal.x) < 0.9 ? Vec3.of(1, 0, 0) : Vec3.of(0, 1, 0);

    return fallback.subtract(normal.scale(fallback.dot(normal))).normalize();
}
