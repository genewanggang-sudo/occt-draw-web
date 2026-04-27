export { clampNumber } from './scalar';
export { MATH_EPSILON, areNumbersEqual, isNearlyZero } from './tolerance';
export { Point2, Vec2, createPoint2, createVector2, type Vector2 } from './vector2';
export {
    Point3,
    Vec3,
    addVector3,
    createPoint3,
    createVector3,
    crossVector3,
    distanceVector3,
    dotVector3,
    lengthVector3,
    normalizeVector3,
    rotateVectorAroundAxis,
    scaleVector3,
    subtractVector3,
    type Vector3,
} from './vector3';
export { LineSegment2, LineSegment3, createLineSegment2, createLineSegment3 } from './lineSegment';
export { Matrix4, createIdentityMatrix4, multiplyMatrix4 } from './matrix4';
export {
    Plane,
    createPlane,
    intersectRayWithPlane,
    projectPointToPlane,
    signedDistanceToPlane,
} from './plane';
export { Ray3, createRay3 } from './ray';
export { Transform3, createIdentityTransform3 } from './transform3';
export {
    MATH_MODULE_MANIFEST,
    getMathModuleManifest,
    type MathModuleManifest,
    type MathModuleStatus,
} from './manifest';
