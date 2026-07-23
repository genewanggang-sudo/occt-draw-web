export class AngularSweep {
    private static readonly fullTurnRadians = Math.PI * 2;

    public readonly endRadians: number;
    public readonly startRadians: number;

    constructor(startRadians: number, endRadians: number) {
        this.startRadians = startRadians;
        this.endRadians = endRadians;
    }

    public get spanRadians(): number {
        return this.endRadians - this.startRadians;
    }

    public get isFullTurn(): boolean {
        return (
            Number.isFinite(this.spanRadians) &&
            Math.abs(this.spanRadians) >= AngularSweep.fullTurnRadians
        );
    }

    public angleAt(progress: number): number {
        return this.startRadians + this.spanRadians * progress;
    }

    public containsAngleStrictly(angleRadians: number): boolean {
        if (
            !Number.isFinite(angleRadians) ||
            !Number.isFinite(this.startRadians) ||
            !Number.isFinite(this.endRadians) ||
            !this.isNonZero()
        ) {
            return false;
        }

        const candidate = this.unwrapAngleAfterStart(angleRadians);
        const progress = (candidate - this.startRadians) / this.spanRadians;

        return progress > 0 && progress < 1;
    }

    public isNonZero(tolerance = 0): boolean {
        return Number.isFinite(this.spanRadians) && Math.abs(this.spanRadians) > tolerance;
    }

    public static negative(startRadians: number, endRadians: number): AngularSweep {
        if (!AngularSweep.areFinite(startRadians, endRadians)) {
            return new AngularSweep(startRadians, endRadians);
        }

        return new AngularSweep(
            startRadians,
            AngularSweep.endStrictlyBelow(startRadians, endRadians),
        );
    }

    public static positive(startRadians: number, endRadians: number): AngularSweep {
        if (!AngularSweep.areFinite(startRadians, endRadians)) {
            return new AngularSweep(startRadians, endRadians);
        }

        return new AngularSweep(
            startRadians,
            AngularSweep.endStrictlyAbove(startRadians, endRadians),
        );
    }

    public static shortest(startRadians: number, endRadians: number): AngularSweep {
        if (!AngularSweep.areFinite(startRadians, endRadians)) {
            return new AngularSweep(startRadians, endRadians);
        }

        const spanRadians = endRadians - startRadians;

        if (!Number.isFinite(spanRadians)) {
            return new AngularSweep(startRadians, endRadians);
        }

        return AngularSweep.fromSpan(startRadians, AngularSweep.shortestSpan(spanRadians));
    }

    private static areFinite(startRadians: number, endRadians: number): boolean {
        return Number.isFinite(startRadians) && Number.isFinite(endRadians);
    }

    private static endStrictlyAbove(startRadians: number, endRadians: number): number {
        if (endRadians > startRadians) {
            return endRadians;
        }

        const turns = Math.floor((startRadians - endRadians) / AngularSweep.fullTurnRadians);

        return endRadians + (turns + 1) * AngularSweep.fullTurnRadians;
    }

    private static endStrictlyBelow(startRadians: number, endRadians: number): number {
        if (endRadians < startRadians) {
            return endRadians;
        }

        const turns = Math.floor((endRadians - startRadians) / AngularSweep.fullTurnRadians);

        return endRadians - (turns + 1) * AngularSweep.fullTurnRadians;
    }

    private static fromSpan(startRadians: number, spanRadians: number): AngularSweep {
        return new AngularSweep(startRadians, startRadians + spanRadians);
    }

    private static shortestSpan(spanRadians: number): number {
        if (spanRadians > -Math.PI && spanRadians <= Math.PI) {
            return spanRadians;
        }

        if (spanRadians <= -Math.PI) {
            const turns = Math.floor((-Math.PI - spanRadians) / AngularSweep.fullTurnRadians);

            return spanRadians + (turns + 1) * AngularSweep.fullTurnRadians;
        }

        const turns = Math.ceil((spanRadians - Math.PI) / AngularSweep.fullTurnRadians);

        return spanRadians - turns * AngularSweep.fullTurnRadians;
    }

    private unwrapAngleAfterStart(angleRadians: number): number {
        let candidate =
            this.spanRadians > 0
                ? angleRadians +
                  Math.ceil((this.startRadians - angleRadians) / AngularSweep.fullTurnRadians) *
                      AngularSweep.fullTurnRadians
                : angleRadians +
                  Math.floor((this.startRadians - angleRadians) / AngularSweep.fullTurnRadians) *
                      AngularSweep.fullTurnRadians;

        if (this.spanRadians > 0 && candidate <= this.startRadians) {
            candidate += AngularSweep.fullTurnRadians;
        }

        if (this.spanRadians < 0 && candidate >= this.startRadians) {
            candidate -= AngularSweep.fullTurnRadians;
        }

        return candidate;
    }
}
