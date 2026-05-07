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
    private currentGeometry: FaceGeometry;
    private currentStyle: FaceStyle;

    constructor(geometry: FaceGeometry, style: FaceStyle, options: RenderObjectOptions = {}) {
        super('face-set', options);
        this.currentGeometry = geometry;
        this.currentStyle = style;
    }

    public get bounds(): GeometryBounds {
        return boundsFromPoints(
            this.geometry.triangles.flatMap((triangle) => [triangle.a, triangle.b, triangle.c]),
        );
    }

    public get geometry(): FaceGeometry {
        return this.currentGeometry;
    }

    public get style(): FaceStyle {
        return this.currentStyle;
    }

    public setGeometry(geometry: FaceGeometry): void {
        if (this.currentGeometry === geometry) {
            return;
        }

        this.currentGeometry = geometry;
        this.markDirty({ bounds: true, geometry: true });
    }

    public setStyle(style: FaceStyle): void {
        if (this.currentStyle === style) {
            return;
        }

        this.currentStyle = style;
        this.markDirty({ style: true });
    }
}

export class EdgeSet extends RenderObject {
    private currentGeometry: EdgeGeometry;
    private currentStyle: EdgeStyle;

    constructor(geometry: EdgeGeometry, style: EdgeStyle, options: RenderObjectOptions = {}) {
        super('edge-set', options);
        this.currentGeometry = geometry;
        this.currentStyle = style;
    }

    public get bounds(): GeometryBounds {
        return boundsFromPoints(
            this.geometry.segments.flatMap((segment) => [segment.start, segment.end]),
        );
    }

    public get geometry(): EdgeGeometry {
        return this.currentGeometry;
    }

    public get style(): EdgeStyle {
        return this.currentStyle;
    }

    public setGeometry(geometry: EdgeGeometry): void {
        if (this.currentGeometry === geometry) {
            return;
        }

        this.currentGeometry = geometry;
        this.markDirty({ bounds: true, geometry: true });
    }

    public setStyle(style: EdgeStyle): void {
        if (this.currentStyle === style) {
            return;
        }

        this.currentStyle = style;
        this.markDirty({ style: true });
    }
}

export class PointSet extends RenderObject {
    private currentGeometry: PointGeometry;
    private currentStyle: PointStyle;

    constructor(geometry: PointGeometry, style: PointStyle, options: RenderObjectOptions = {}) {
        super('point-set', options);
        this.currentGeometry = geometry;
        this.currentStyle = style;
    }

    public get bounds(): GeometryBounds {
        return boundsFromPoints(this.geometry.points);
    }

    public get geometry(): PointGeometry {
        return this.currentGeometry;
    }

    public get style(): PointStyle {
        return this.currentStyle;
    }

    public setGeometry(geometry: PointGeometry): void {
        if (this.currentGeometry === geometry) {
            return;
        }

        this.currentGeometry = geometry;
        this.markDirty({ bounds: true, geometry: true });
    }

    public setStyle(style: PointStyle): void {
        if (this.currentStyle === style) {
            return;
        }

        this.currentStyle = style;
        this.markDirty({ style: true });
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
