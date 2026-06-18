run('ring point raster matches extracted Onshape 9x9 footprint', () => {
    const expected = [
        '...###...',
        '.#######.',
        '.#######.',
        '###...###',
        '###...###',
        '###...###',
        '.#######.',
        '.#######.',
        '...###...',
    ];
    const actual = rasterizeRingPoint9();

    expectEqual(actual.join('\n'), expected.join('\n'), 'expected Onshape ring raster footprint');
});

function rasterizeRingPoint9(): readonly string[] {
    const rows: string[] = [];

    for (let y = 0; y < 9; y += 1) {
        let row = '';

        for (let x = 0; x < 9; x += 1) {
            const pointX = (x + 0.5) / 9 - 0.5;
            const pointY = (y + 0.5) / 9 - 0.5;
            const distanceFromCenter = Math.hypot(pointX, pointY);
            const outerEdge = 1 - smoothstep(0.4475, 0.505, distanceFromCenter);
            const innerEdge = smoothstep(0.1475, 0.2275, distanceFromCenter);
            const alpha = outerEdge * innerEdge;

            row += alpha >= 0.5 ? '#' : '.';
        }

        rows.push(row);
    }

    return rows;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
    const normalized = clamp((value - edge0) / (edge1 - edge0), 0, 1);

    return normalized * normalized * (3 - 2 * normalized);
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
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
