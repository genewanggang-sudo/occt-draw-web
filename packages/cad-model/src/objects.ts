import { BaseModelElement, type ModelPropertyValue } from '@occt-draw/core';
import { Plane3, type Vector3 } from '@occt-draw/math';
import type { CadObjectId } from './ids';

export type CadObjectKind = 'reference-origin' | 'reference-plane';
export type ReferencePlaneKind = 'xy' | 'yz' | 'zx';

export abstract class BaseCadObject extends BaseModelElement {
    public readonly kind: CadObjectKind;
    public readonly visible: boolean;

    protected constructor(input: {
        readonly id: CadObjectId;
        readonly kind: CadObjectKind;
        readonly name: string;
        readonly properties?: ReadonlyMap<string, ModelPropertyValue> | null;
        readonly visible: boolean;
    }) {
        super({
            id: input.id,
            modelType: `cad.object.${input.kind}`,
            name: input.name,
            properties: new Map<string, ModelPropertyValue>([
                ...(input.properties?.entries() ?? []),
                ['kind', input.kind],
                ['visible', input.visible],
            ]),
        });
        this.kind = input.kind;
        this.visible = input.visible;
    }
}

export class ReferenceOriginObject extends BaseCadObject {
    public override readonly kind = 'reference-origin' as const;
    public readonly position: Vector3;

    constructor(input: {
        readonly id: CadObjectId;
        readonly name: string;
        readonly position: Vector3;
        readonly visible: boolean;
    }) {
        super({
            id: input.id,
            kind: 'reference-origin',
            name: input.name,
            properties: new Map<string, ModelPropertyValue>([['position', input.position]]),
            visible: input.visible,
        });
        this.position = input.position;
    }
}

export class ReferencePlaneObject extends BaseCadObject {
    public override readonly kind = 'reference-plane' as const;
    public readonly normal: Vector3;
    public readonly origin: Vector3;
    public readonly planeKind: ReferencePlaneKind;
    public readonly size: number;
    public readonly xAxis: Vector3;

    constructor(input: {
        readonly id: CadObjectId;
        readonly name: string;
        readonly normal: Vector3;
        readonly origin: Vector3;
        readonly planeKind: ReferencePlaneKind;
        readonly size: number;
        readonly visible: boolean;
        readonly xAxis: Vector3;
    }) {
        super({
            id: input.id,
            kind: 'reference-plane',
            name: input.name,
            properties: new Map<string, ModelPropertyValue>([
                ['normal', input.normal],
                ['origin', input.origin],
                ['planeKind', input.planeKind],
                ['size', input.size],
                ['xAxis', input.xAxis],
            ]),
            visible: input.visible,
        });
        this.normal = input.normal;
        this.origin = input.origin;
        this.planeKind = input.planeKind;
        this.size = input.size;
        this.xAxis = input.xAxis;
    }
}

export type CadObject = ReferenceOriginObject | ReferencePlaneObject;

export function referencePlaneToPlane(object: ReferencePlaneObject): Plane3 {
    return new Plane3(object.origin, object.normal, object.xAxis);
}
