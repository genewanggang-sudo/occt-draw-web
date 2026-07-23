import { Vec2, type Vector2 } from '../linear/vec2';

export class SegmentSegment2PointIntersection {
    public readonly kind = 'point';
    public readonly leftParameters: readonly [number, number];
    public readonly point: Vec2;
    public readonly rightParameters: readonly [number, number];

    constructor(input: {
        readonly leftParameters: readonly [number, number];
        readonly point: Vector2;
        readonly rightParameters: readonly [number, number];
    }) {
        this.leftParameters = [input.leftParameters[0], input.leftParameters[1]];
        this.point = Vec2.from(input.point);
        this.rightParameters = [input.rightParameters[0], input.rightParameters[1]];
    }
}
