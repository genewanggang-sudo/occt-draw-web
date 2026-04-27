import { CadDocument, PartStudio } from './document';

export function createDefaultCadDocument(): CadDocument {
    const activePartStudio = new PartStudio({
        id: 'part-studio-default',
        name: '零件工作室 1',
        features: [],
        objects: [
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
