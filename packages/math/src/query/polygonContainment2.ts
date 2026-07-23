import { Polygon2 } from '../geometry-2d/polygon2';
import type { Vector2 } from '../linear/vec2';
import { ContainmentResult } from './containmentResult';

export class PolygonContainment2 {
    public classify(point: Vector2, polygon: readonly Vector2[]): ContainmentResult {
        return ContainmentResult.fromPolygonPointClassification(
            new Polygon2(polygon).classifyPoint(point),
        );
    }
}
