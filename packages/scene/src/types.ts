import type { Vector3 } from '@occt-draw/math';

export type SceneObjectId = string;
export type SceneObjectKind = 'axis' | 'cube-wireframe' | 'grid';

export interface BaseSceneObject {
    readonly id: SceneObjectId;
    readonly kind: SceneObjectKind;
    readonly name: string;
    readonly visible: boolean;
}

export interface AxisSceneObject extends BaseSceneObject {
    readonly kind: 'axis';
    readonly length: number;
}

export interface GridSceneObject extends BaseSceneObject {
    readonly divisions: number;
    readonly kind: 'grid';
    readonly size: number;
}

export interface CubeWireframeSceneObject extends BaseSceneObject {
    readonly center: Vector3;
    readonly kind: 'cube-wireframe';
    readonly size: number;
}

export type SceneObject = AxisSceneObject | CubeWireframeSceneObject | GridSceneObject;

export interface SceneDocument {
    readonly id: string;
    readonly name: string;
    readonly objects: readonly SceneObject[];
}
