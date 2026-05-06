import { BBox3, Vec3, type Vector3 } from '@occt-draw/math';
import type {
    EdgeGeometry,
    FaceGeometry,
    MarkerGeometry,
    PointGeometry,
    TextGeometry,
} from '../geometry';
import type { EdgeStyle, FaceStyle, MarkerStyle, PointStyle, TextStyle } from '../style';
import type { GeometryBounds, RenderObjectOptions } from '../core';
import { RenderObject } from '../core';

export class FaceSet extends RenderObject {
    constructor(
        public geometry: FaceGeometry,
        public style: FaceStyle,
        options: RenderObjectOptions = {},
    ) {
        super('face-set', options);
    }

    public get bounds(): GeometryBounds {
        return boundsFromPoints(
            this.geometry.triangles.flatMap((triangle) => [triangle.a, triangle.b, triangle.c]),
        );
    }
}

export class EdgeSet extends RenderObject {
    constructor(
        public geometry: EdgeGeometry,
        public style: EdgeStyle,
        options: RenderObjectOptions = {},
    ) {
        super('edge-set', options);
    }

    public get bounds(): GeometryBounds {
        return boundsFromPoints(
            this.geometry.segments.flatMap((segment) => [segment.start, segment.end]),
        );
    }
}

export class PointSet extends RenderObject {
    constructor(
        public geometry: PointGeometry,
        public style: PointStyle,
        options: RenderObjectOptions = {},
    ) {
        super('point-set', options);
    }

    public get bounds(): GeometryBounds {
        return boundsFromPoints(this.geometry.points);
    }
}

export class MarkerSet extends RenderObject {
    constructor(
        public geometry: MarkerGeometry,
        public style: MarkerStyle,
        options: RenderObjectOptions = {},
    ) {
        super('marker-set', options);
    }

    public get bounds(): GeometryBounds {
        return boundsFromPoints(this.geometry.markers.map((marker) => marker.position));
    }
}

export class TextLabelSet extends RenderObject {
    constructor(
        public geometry: TextGeometry,
        public style: TextStyle,
        options: RenderObjectOptions = {},
    ) {
        super('text-label-set', { pickable: false, ...options });
    }

    public get bounds(): GeometryBounds {
        return boundsFromPoints(
            this.geometry.labels.map((label) =>
                Vec3.add(
                    Vec3.add(label.frame.origin, Vec3.scale(label.frame.xAxis, label.insert.x)),
                    Vec3.scale(label.frame.yAxis, label.insert.y),
                ),
            ),
        );
    }
}

function boundsFromPoints(points: readonly Vector3[]): GeometryBounds {
    let bounds: BBox3 | null = null;

    for (const point of points) {
        bounds = bounds ? bounds.expandByPoint(point) : new BBox3(point, point);
    }

    return bounds;
}
