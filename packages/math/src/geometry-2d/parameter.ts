import { Interval } from '../value/interval';

export class CurveParameter {
    public readonly value: number;

    constructor(value: number) {
        this.value = value;
    }
}

export class ParameterDomain extends Interval {
    public static unit(): ParameterDomain {
        return new ParameterDomain(0, 1);
    }
}
