import type { CadObject, PartStudio } from '@occt-draw/core';
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
    summary: '三维场景投影层，负责把 CAD 文档对象转换成渲染场景表达。',
};

export class SceneObjectMapper {
    fromPartStudio(partStudio: PartStudio): SceneDocument {
        return createSceneDocument(
            partStudio.id,
            partStudio.name,
            partStudio.objects.map((object) => this.toSceneObject(object)),
        );
    }

    toSceneObject(object: CadObject): SceneObject {
        if (object.kind === 'reference-grid') {
            return {
                id: object.id,
                kind: 'grid',
                name: object.name,
                visible: object.visible,
                divisions: object.divisions,
                size: object.size,
            };
        }

        if (object.kind === 'reference-axis') {
            return {
                id: object.id,
                kind: 'axis',
                name: object.name,
                visible: object.visible,
                length: object.length,
            };
        }

        return {
            id: object.id,
            kind: 'cube-wireframe',
            name: object.name,
            visible: object.visible,
            center: createVector3(object.center.x, object.center.y, object.center.z),
            size: object.size,
        };
    }
}

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

export function createSceneDocumentFromPartStudio(partStudio: PartStudio): SceneDocument {
    return new SceneObjectMapper().fromPartStudio(partStudio);
}
