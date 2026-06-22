import {
    evaluatePointFontRaster,
    ONSHAPE_SKETCH_USER_POINT_FONT,
    ONSHAPE_SKETCH_USER_POINT_SIZE_PX,
} from '../src/pointFontRaster.ts';

run('Onshape sketch user point font creates an 8px hollow radial point', () => {
    const actual = rasterizeOnshapeSketchUserPoint();

    expectEqual(
        actual.join('\n'),
        [
            '..####..',
            '.######.',
            '###..###',
            '##....##',
            '##....##',
            '###..###',
            '.######.',
            '..####..',
        ].join('\n'),
        'expected Onshape point(2,0,50) raster footprint',
    );
});

function rasterizeOnshapeSketchUserPoint(): readonly string[] {
    const rows: string[] = [];
    const pointSize = ONSHAPE_SKETCH_USER_POINT_SIZE_PX;
    const pointRadius = pointSize * 0.5;

    for (let y = 0; y < pointSize; y += 1) {
        let row = '';

        for (let x = 0; x < pointSize; x += 1) {
            const offsetX = ((x + 0.5) / pointSize) * pointSize - pointRadius;
            const offsetY = ((y + 0.5) / pointSize) * pointSize - pointRadius;
            const distanceFromCenter = Math.hypot(offsetX, offsetY);
            const raster = evaluatePointFontRaster({
                ...ONSHAPE_SKETCH_USER_POINT_FONT,
                distanceFromCenter,
                filterWidth: 1,
                pointRadius,
            });

            row += raster.opacityScale >= 0.5 && raster.colorScale >= 0.5 ? '#' : '.';
        }

        rows.push(row);
    }

    return rows;
}

function run(name: string, test: () => void): void {
    test();
    console.log(`ok - ${name}`);
}

function expectEqual(actual: string, expected: string, message: string): void {
    if (actual !== expected) {
        throw new Error(`${message}\nexpected:\n${expected}\nreceived:\n${actual}`);
    }
}
