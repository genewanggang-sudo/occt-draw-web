import { createVector3 } from '@occt-draw/math';
import { CadDocument, PartStudio } from './document';

export function createDefaultCadDocument(): CadDocument {
    const activePartStudio = new PartStudio({
        id: 'part-studio-default',
        name: '零件工作区 1',
        features: [],
        objects: [
            {
                id: 'plane-xy',
                kind: 'reference-plane',
                name: '基准面 XY',
                visible: true,
                origin: createVector3(0, 0, 0),
                normal: createVector3(0, 0, 1),
                xAxis: createVector3(1, 0, 0),
                planeKind: 'xy',
                size: 6,
            },
            {
                id: 'plane-yz',
                kind: 'reference-plane',
                name: '基准面 YZ',
                visible: true,
                origin: createVector3(0, 0, 0),
                normal: createVector3(1, 0, 0),
                xAxis: createVector3(0, 1, 0),
                planeKind: 'yz',
                size: 6,
            },
            {
                id: 'plane-zx',
                kind: 'reference-plane',
                name: '基准面 ZX',
                visible: true,
                origin: createVector3(0, 0, 0),
                normal: createVector3(0, 1, 0),
                xAxis: createVector3(0, 0, 1),
                planeKind: 'zx',
                size: 6,
            },
            {
                id: 'grid-main',
                kind: 'reference-grid',
                name: '基准网格',
                visible: true,
                divisions: 20,
                size: 10,
            },
            {
                id: 'axis-main',
                kind: 'reference-axis',
                name: '坐标轴',
                visible: true,
                length: 4,
            },
            {
                id: 'cube-main',
                kind: 'debug-cube',
                name: '调试立方体',
                visible: true,
                center: { x: 0, y: 0.8, z: 0 },
                size: 1.6,
            },
        ],
    });

    return new CadDocument({
        id: 'document-default',
        name: '未命名文档',
        activePartStudioId: activePartStudio.id,
        partStudios: [activePartStudio],
    });
}
