import { BBox3, Vec3, type Vector3 } from '@occt-draw/math';
import type {
    EdgeGeometry,
    FaceGeometry,
    MarkerGeometry,
    PointGeometry,
    TextGeometry,
} from '../geometry';
import { RenderableObject, type RenderObjectBuilder } from '../renderableObject';
import type { EdgeStyle, FaceStyle, MarkerStyle, PointStyle, TextStyle } from '../style';
import type { GeometryBounds, RenderObjectOptions } from '../core';
import { RenderObject } from '../core';

export class FaceSet extends RenderableObject<FaceGeometry, FaceStyle> {
    constructor(geometry: FaceGeometry, style: FaceStyle, options: RenderObjectOptions = {}) {
        super('face-set', geometry, style, options);
    }

    protected computeBounds(): GeometryBounds {
        return boundsFromPoints(
            this.geometry.triangles.flatMap((triangle) => [triangle.a, triangle.b, triangle.c]),
        );
    }

    protected build(builder: RenderObjectBuilder): void {
        builder.faces(this.geometry.triangles, this.style);
    }
}

export class EdgeSet extends RenderableObject<EdgeGeometry, EdgeStyle> {
    constructor(geometry: EdgeGeometry, style: EdgeStyle, options: RenderObjectOptions = {}) {
        super('edge-set', geometry, style, options);
    }

    protected computeBounds(): GeometryBounds {
        return boundsFromPoints(
            this.geometry.segments.flatMap((segment) => [segment.start, segment.end]),
        );
    }

    protected build(builder: RenderObjectBuilder): void {
        builder.edges(this.geometry.segments, this.style);
    }
}

export class PointSet extends RenderableObject<PointGeometry, PointStyle> {
    constructor(geometry: PointGeometry, style: PointStyle, options: RenderObjectOptions = {}) {
        super('point-set', geometry, style, options);
    }

    protected computeBounds(): GeometryBounds {
        return boundsFromPoints(this.geometry.points);
    }

    protected build(builder: RenderObjectBuilder): void {
        builder.points(this.geometry.points, this.style);
    }
}

export class MarkerSet extends RenderObject {
    private currentGeometry: MarkerGeometry;
    private currentStyle: MarkerStyle;

    constructor(geometry: MarkerGeometry, style: MarkerStyle, options: RenderObjectOptions = {}) {
        super('marker-set', options);
        this.currentGeometry = geometry;
        this.currentStyle = style;
    }

    public get bounds(): GeometryBounds {
        return boundsFromPoints(this.geometry.markers.map((marker) => marker.position));
    }

    public get geometry(): MarkerGeometry {
        return this.currentGeometry;
    }

    public get style(): MarkerStyle {
        return this.currentStyle;
    }

    public setGeometry(geometry: MarkerGeometry): void {
        if (this.currentGeometry === geometry) {
            return;
        }

        this.currentGeometry = geometry;
        this.markDirty({ bounds: true, geometry: true });
    }

    public setStyle(style: MarkerStyle): void {
        if (this.currentStyle === style) {
            return;
        }

        this.currentStyle = style;
        this.markDirty({ style: true });
    }
}

export class TextLabelSet extends RenderObject {
    private currentGeometry: TextGeometry;
    private currentStyle: TextStyle;

    constructor(geometry: TextGeometry, style: TextStyle, options: RenderObjectOptions = {}) {
        super('text-label-set', { pickable: false, ...options });
        this.currentGeometry = geometry;
        this.currentStyle = style;
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

    public get geometry(): TextGeometry {
        return this.currentGeometry;
    }

    public get style(): TextStyle {
        return this.currentStyle;
    }

    public setGeometry(geometry: TextGeometry): void {
        if (this.currentGeometry === geometry) {
            return;
        }

        this.currentGeometry = geometry;
        this.markDirty({ bounds: true, geometry: true });
    }

    public setStyle(style: TextStyle): void {
        if (this.currentStyle === style) {
            return;
        }

        this.currentStyle = style;
        this.markDirty({ style: true });
    }
}

function boundsFromPoints(points: readonly Vector3[]): GeometryBounds {
    let bounds: BBox3 | null = null;

    for (const point of points) {
        bounds = bounds ? bounds.expandByPoint(point) : new BBox3(point, point);
    }

    return bounds;
}
