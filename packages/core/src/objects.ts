import type { Vector3 } from '@occt-draw/math';
import type { CadObjectId } from './ids';

export type CadObjectKind = 'reference-origin' | 'reference-plane';
export type ReferencePlaneKind = 'xy' | 'yz' | 'zx';

export interface BaseCadObject {
    readonly id: CadObjectId;
    readonly kind: CadObjectKind;
    readonly name: string;
    readonly visible: boolean;
}

export interface ReferenceOriginObject extends BaseCadObject {
    readonly kind: 'reference-origin';
    readonly position: Vector3;
}

export interface ReferencePlaneObject extends BaseCadObject {
    readonly kind: 'reference-plane';
    readonly normal: Vector3;
    readonly origin: Vector3;
    readonly planeKind: ReferencePlaneKind;
    readonly size: number;
    readonly xAxis: Vector3;
}

export type CadObject = ReferenceOriginObject | ReferencePlaneObject;
