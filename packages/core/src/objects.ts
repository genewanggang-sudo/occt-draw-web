import type { CadObjectId } from './ids';

export type CadObjectKind = 'debug-cube' | 'reference-axis' | 'reference-grid';

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

export interface DebugCubeObject extends BaseCadObject {
    readonly center: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
    };
    readonly kind: 'debug-cube';
    readonly size: number;
}

export type CadObject = DebugCubeObject | ReferenceAxisObject | ReferenceGridObject;
