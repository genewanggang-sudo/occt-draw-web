import { createVector3 } from '@occt-draw/math';
import { createSceneDocument } from './sceneDocument';
import type { SceneDocument } from './types';

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
