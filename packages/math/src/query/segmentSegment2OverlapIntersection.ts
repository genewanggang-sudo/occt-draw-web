import { LineSegment2 } from '../geometry-2d/lineSegment2';

export class SegmentSegment2OverlapIntersection {
    public readonly kind = 'overlap';
    public readonly leftParameters: readonly [number, number];
    public readonly overlap: LineSegment2;
    public readonly rightParameters: readonly [number, number];

    constructor(input: {
        readonly leftParameters: readonly [number, number];
        readonly overlap: LineSegment2;
        readonly rightParameters: readonly [number, number];
    }) {
        this.leftParameters = [input.leftParameters[0], input.leftParameters[1]];
        this.overlap = new LineSegment2(input.overlap.start, input.overlap.end);
        this.rightParameters = [input.rightParameters[0], input.rightParameters[1]];
    }
}
