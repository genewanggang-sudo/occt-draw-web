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
        ],
    });

    return new CadDocument({
        id: 'document-default',
        name: '未命名文档',
        activePartStudioId: activePartStudio.id,
        partStudios: [activePartStudio],
    });
}
