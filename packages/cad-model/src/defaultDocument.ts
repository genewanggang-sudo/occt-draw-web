import { Vec3 } from '@occt-draw/math';
import { CadDocument, PartStudio } from './document';
import { ReferenceOriginObject, ReferencePlaneObject } from './objects';

export function createDefaultCadDocument(): CadDocument {
    const activePartStudio = new PartStudio({
        id: 'part-studio-default',
        name: '零件工作区 1',
        features: [],
        objects: [
            new ReferenceOriginObject({
                id: 'origin-main',
                name: '原点',
                visible: true,
                position: Vec3.of(0, 0, 0),
            }),
            new ReferencePlaneObject({
                id: 'plane-xy',
                name: '基准面 XY',
                visible: true,
                origin: Vec3.of(0, 0, 0),
                normal: Vec3.of(0, 0, 1),
                xAxis: Vec3.of(1, 0, 0),
                planeKind: 'xy',
                size: 6,
            }),
            new ReferencePlaneObject({
                id: 'plane-yz',
                name: '基准面 YZ',
                visible: true,
                origin: Vec3.of(0, 0, 0),
                normal: Vec3.of(1, 0, 0),
                xAxis: Vec3.of(0, 1, 0),
                planeKind: 'yz',
                size: 6,
            }),
            new ReferencePlaneObject({
                id: 'plane-zx',
                name: '基准面 ZX',
                visible: true,
                origin: Vec3.of(0, 0, 0),
                normal: Vec3.of(0, -1, 0),
                xAxis: Vec3.of(1, 0, 0),
                planeKind: 'zx',
                size: 6,
            }),
        ],
    });

    return new CadDocument({
        id: 'document-default',
        name: '未命名文档',
        activePartStudioId: activePartStudio.id,
        partStudios: [activePartStudio],
    });
}
