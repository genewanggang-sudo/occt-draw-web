import { Matrix4 } from './matrix4';
import type { Point3, Vec3, Vector3 } from './vector3';

export class Transform3 {
    matrix: Matrix4;

    constructor(matrix = Matrix4.identity()) {
        this.matrix = matrix;
    }

    clone(): Transform3 {
        return new Transform3(this.matrix.clone());
    }

    transformPoint(point: Vector3): Point3 {
        return this.matrix.transformPoint(point);
    }

    transformVector(vector: Vector3): Vec3 {
        return this.matrix.transformVector(vector);
    }

    static identity(): Transform3 {
        return new Transform3();
    }
}

export function createIdentityTransform3(): Transform3 {
    return Transform3.identity();
}

export function transformPoint3(transform: Transform3, point: Vector3): Point3 {
    return transform.transformPoint(point);
}

export function transformVector3(transform: Transform3, vector: Vector3): Vec3 {
    return transform.transformVector(vector);
}
