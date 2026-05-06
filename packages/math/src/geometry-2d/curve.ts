import type { Vec2 } from '../linear/vec2';
import type { ParameterDomain } from './parameter';

export interface Curve2 {
    readonly domain: ParameterDomain;
    isValid(): boolean;
    pointAt(parameter: number): Vec2;
    tangentAt(parameter: number): Vec2;
}

export type BoundedCurve2 = Curve2;
