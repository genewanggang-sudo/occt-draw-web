import { Interval } from '../value/interval';

export class ParameterDomain extends Interval {
    public static unit(): ParameterDomain {
        return new ParameterDomain(0, 1);
    }
}
