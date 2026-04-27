import { createVector3 } from '@occt-draw/math';
import { createDisplayModel } from './displayModel';
import type { DisplayModel } from './types';

export function createDefaultDisplayModel(): DisplayModel {
    return createDisplayModel('display-default', '默认三维显示模型', [
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
