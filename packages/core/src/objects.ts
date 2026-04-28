import type { Vector3 } from '@occt-draw/math';
import type { CadObjectId } from './ids';

export type CadObjectKind = 'debug-cube' | 'reference-axis' | 'reference-grid' | 'reference-plane';

export type ReferencePlaneKind = 'xy' | 'yz' | 'zx';

export interface BaseCadObject {
    readonly id: CadObjectId;
    readonly kind: CadObjectKind;
    readonly name: string;
    readonly visible: boolean;
}

export interface ReferenceGridObject extends BaseCadObject {
    readonly divisions: number;
    readonly kind: 'reference-grid';
    readonly size: number;
}

export interface ReferenceAxisObject extends BaseCadObject {
    readonly kind: 'reference-axis';
    readonly length: number;
}

export interface ReferencePlaneObject extends BaseCadObject {
    readonly kind: 'reference-plane';
    readonly normal: Vector3;
    readonly origin: Vector3;
    readonly planeKind: ReferencePlaneKind;
    readonly size: number;
    readonly xAxis: Vector3;
}

export interface DebugCubeObject extends BaseCadObject {
    readonly center: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
    };
    readonly kind: 'debug-cube';
    readonly size: number;
}

export type CadObject =
    | DebugCubeObject
    | ReferenceAxisObject
    | ReferenceGridObject
    | ReferencePlaneObject;
