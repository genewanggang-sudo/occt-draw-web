import {
    evaluatePointFontRaster,
    ONSHAPE_ORIGIN_POINT_FONT,
    ONSHAPE_ORIGIN_POINT_SIZE_PX,
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

run('Onshape origin point font creates a center dot, background cutout, and outer ring', () => {
    const pointRadius = ONSHAPE_ORIGIN_POINT_SIZE_PX * 0.5;
    const font = ONSHAPE_ORIGIN_POINT_FONT;
    const filterWidth = 2;
    const center = evaluatePointFontRaster({
        ...font,
        distanceFromCenter: 0,
        filterWidth,
        pointRadius,
    });
    const cutoutGap = evaluatePointFontRaster({
        ...font,
        distanceFromCenter: 2.5,
        filterWidth,
        pointRadius,
    });
    const outerRing = evaluatePointFontRaster({
        ...font,
        distanceFromCenter: 4.7,
        filterWidth,
        pointRadius,
    });
    const outside = evaluatePointFontRaster({
        ...font,
        distanceFromCenter: 7.5,
        filterWidth,
        pointRadius,
    });

    expectGreater(center.opacityScale, 0.9, 'origin center dot should be opaque');
    expectGreater(center.colorScale, 0.9, 'origin center dot should use point color');
    expectGreater(cutoutGap.opacityScale, 0.9, 'origin gap should still write background color');
    expectLess(cutoutGap.colorScale, 0.4, 'origin gap should be background-colored cutout');
    expectGreater(outerRing.opacityScale, 0.5, 'origin outer ring should be visible');
    expectGreater(outerRing.colorScale, 0.9, 'origin outer ring should use point color');
    expectLess(outside.opacityScale, 0.1, 'origin outside edge should be transparent');
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

function expectGreater(actual: number, expected: number, message: string): void {
    if (actual <= expected) {
        throw new Error(`${message}: expected ${actual} > ${expected}`);
    }
}

function expectLess(actual: number, expected: number, message: string): void {
    if (actual >= expected) {
        throw new Error(`${message}: expected ${actual} < ${expected}`);
    }
}
