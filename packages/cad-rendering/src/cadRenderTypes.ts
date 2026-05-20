import type { LineSegment3, Vector3 } from '@occt-draw/math';

export type CadRenderObjectKind = 'reference-origin' | 'reference-plane';
export type CadRenderPlaneKind = 'xy' | 'yz' | 'zx';
export type CadRenderPickDomain = 'reference-plane' | 'origin' | 'sketch' | 'body';
export type CadRenderPickEntityKind = 'edge' | 'face' | 'vertex';

export interface CadRenderPickRef {
    readonly domain: CadRenderPickDomain;
    readonly entityId?: string;
    readonly entityKind?: CadRenderPickEntityKind;
    readonly featureId?: string;
    readonly objectId: string;
}

export interface CadRenderDocument {
    readonly partStudio: CadRenderPartStudio;
}

export interface CadRenderPartStudio {
    readonly activeSketchPlane?: CadRenderActiveSketchPlane | null;
    readonly draft?: CadRenderDraft | null;
    readonly objects: readonly CadRenderObject[];
    readonly sketches: readonly CadRenderSketch[];
}

export type CadRenderObject = CadRenderReferenceOrigin | CadRenderReferencePlane;

export interface CadRenderReferenceOrigin {
    readonly id: string;
    readonly kind: 'reference-origin';
    readonly name: string;
    readonly position: Vector3;
    readonly visible: boolean;
}

export interface CadRenderReferencePlane {
    readonly id: string;
    readonly kind: 'reference-plane';
    readonly name: string;
    readonly normal: Vector3;
    readonly origin: Vector3;
    readonly planeKind: CadRenderPlaneKind;
    readonly size: number;
    readonly visible: boolean;
    readonly xAxis: Vector3;
}

export interface CadRenderSketch {
    readonly edges: readonly CadRenderSketchEdge[];
    readonly featureId: string;
    readonly id: string;
    readonly name: string;
    readonly vertices: readonly CadRenderSketchVertex[];
    readonly visible: boolean;
}

export interface CadRenderSketchEdge {
    readonly id: string;
    readonly pickRef: CadRenderPickRef;
    readonly role: 'construction' | 'normal';
    readonly segment: LineSegment3;
}

export interface CadRenderSketchVertex {
    readonly id: string;
    readonly pickRef: CadRenderPickRef;
    readonly point: Vector3;
}

export interface CadRenderActiveSketchPlane {
    readonly featureId: string;
    readonly name: string;
    readonly normal: Vector3;
    readonly origin: Vector3;
    readonly planeKind: CadRenderPlaneKind;
    readonly size: number;
    readonly visible: boolean;
    readonly xAxis: Vector3;
}

export interface CadRenderDraft {
    readonly id: string;
    readonly temporaryLineSegments: readonly CadRenderDraftLineSegment[];
    readonly temporaryPoints: readonly CadRenderDraftPoint[];
}

export interface CadRenderDraftLineSegment {
    readonly color?: Vector3;
    readonly id: string;
    readonly segment: LineSegment3;
    readonly visible: boolean;
}

export interface CadRenderDraftPoint {
    readonly color?: Vector3;
    readonly id: string;
    readonly point: Vector3;
    readonly visible: boolean;
}
