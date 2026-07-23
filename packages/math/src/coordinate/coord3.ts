import { Vec3, type Vector3 } from '../linear/vec3';
import { MATH_EPSILON } from '../value/tolerance';

export class Coord3 {
    private readonly originSnapshot: Vec3;
    private readonly xAxisSnapshot: Vec3;
    private readonly yAxisSnapshot: Vec3;
    private readonly zAxisSnapshot: Vec3;

    constructor(input: {
        readonly origin: Vector3;
        readonly xAxis?: Vector3;
        readonly yAxis?: Vector3;
        readonly zAxis?: Vector3;
    }) {
        this.originSnapshot = Coord3.normalizeOrigin(input.origin);
        this.zAxisSnapshot = Coord3.normalizeAxis(
            input.zAxis ?? { x: 0, y: 0, z: 1 },
            Vec3.of(0, 0, 1),
        );
        this.xAxisSnapshot = Coord3.normalizeAxisInPlane(
            input.xAxis ?? { x: 1, y: 0, z: 0 },
            this.zAxisSnapshot,
        );
        this.yAxisSnapshot = Coord3.normalizeYAxis(
            this.xAxisSnapshot,
            this.zAxisSnapshot,
            input.yAxis,
        );
    }

    public get origin(): Vec3 {
        return Vec3.from(this.originSnapshot);
    }

    public get xAxis(): Vec3 {
        return Vec3.from(this.xAxisSnapshot);
    }

    public get yAxis(): Vec3 {
        return Vec3.from(this.yAxisSnapshot);
    }

    public get zAxis(): Vec3 {
        return Vec3.from(this.zAxisSnapshot);
    }

    public localToWorld(point: Vector3): Vec3 {
        return this.originSnapshot
            .translated(this.xAxisSnapshot.scale(point.x))
            .translated(this.yAxisSnapshot.scale(point.y))
            .translated(this.zAxisSnapshot.scale(point.z));
    }

    public worldToLocal(point: Vector3): Vec3 {
        const vector = this.originSnapshot.vectorTo(point);

        return Vec3.of(
            vector.dot(this.xAxisSnapshot),
            vector.dot(this.yAxisSnapshot),
            vector.dot(this.zAxisSnapshot),
        );
    }

    public static identity(): Coord3 {
        return new Coord3({ origin: Vec3.zero() });
    }

    private static normalizeOrigin(origin: Vector3): Vec3 {
        const value = Vec3.from(origin);

        return value.isFinite() ? value : Vec3.zero();
    }

    private static normalizeAxis(value: Vector3, fallback: Vec3): Vec3 {
        const vector = Vec3.from(value);

        return vector.isFinite() && vector.length() > MATH_EPSILON ? vector.normalize() : fallback;
    }

    private static normalizeAxisInPlane(axis: Vector3, normal: Vec3): Vec3 {
        const fallback = Math.abs(normal.x) < 0.9 ? Vec3.of(1, 0, 0) : Vec3.of(0, 1, 0);
        const vector = Vec3.subtract(axis, Vec3.scale(normal, Vec3.dot(axis, normal)));

        if (vector.isFinite() && vector.length() > MATH_EPSILON) {
            return vector.normalize();
        }

        return fallback.subtract(normal.scale(fallback.dot(normal))).normalize();
    }

    private static normalizeYAxis(xAxis: Vec3, zAxis: Vec3, yAxis: Vector3 | undefined): Vec3 {
        if (yAxis) {
            const vector = Vec3.subtract(
                Vec3.subtract(yAxis, Vec3.scale(zAxis, Vec3.dot(yAxis, zAxis))),
                Vec3.scale(xAxis, Vec3.dot(yAxis, xAxis)),
            );

            if (vector.isFinite() && vector.length() > MATH_EPSILON) {
                const normalized = vector.normalize();

                return xAxis.cross(normalized).dot(zAxis) < 0 ? normalized.negate() : normalized;
            }
        }

        return zAxis.cross(xAxis).normalize();
    }
}
