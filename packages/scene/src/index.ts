import { createVector3, type Vector3 } from '@occt-draw/math';

export type SceneModuleStatus = 'ready';
export type SceneObjectId = string;
export type SceneObjectKind = 'axis' | 'cube-wireframe' | 'grid';

export interface SceneModuleManifest {
    readonly name: '@occt-draw/scene';
    readonly status: SceneModuleStatus;
    readonly summary: string;
}

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

export const SCENE_MODULE_MANIFEST: SceneModuleManifest = {
    name: '@occt-draw/scene',
    status: 'ready',
    summary: '三维场景图、对象树、选择集、可见性和装配显示状态的领域包。',
};

export function getSceneModuleManifest(): SceneModuleManifest {
    return SCENE_MODULE_MANIFEST;
}

export function createSceneDocument(
    id: string,
    name: string,
    objects: readonly SceneObject[],
): SceneDocument {
    return {
        id,
        name,
        objects,
    };
}

export function createDefaultSceneDocument(): SceneDocument {
    return createSceneDocument('scene-default', '默认三维场景', [
        {
            id: 'grid-main',
            kind: 'grid',
            name: '基准网格',
            visible: true,
            divisions: 20,
            size: 10,
        },
        {
            id: 'axis-main',
            kind: 'axis',
            name: '坐标轴',
            visible: true,
            length: 4,
        },
        {
            id: 'cube-main',
            kind: 'cube-wireframe',
            name: '线框立方体',
            visible: true,
            center: createVector3(0, 0.8, 0),
            size: 1.6,
        },
    ]);
}
