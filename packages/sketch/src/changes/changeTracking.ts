import { Vec2 } from '@occt-draw/math';
import type { Sketch } from '../model/sketch';
import type { SketchEntityRef, SketchEntitySnapshot, SketchPropertyValue } from '../types';

let activeRecorder: SketchChangeRecorder | null = null;
let recordingSuppressionDepth = 0;

export abstract class SketchChange {
    public readonly entityRef: SketchEntityRef;

    protected constructor(entityRef: SketchEntityRef) {
        this.entityRef = entityRef;
    }

    public abstract apply(sketch: Sketch): void;
    public abstract revert(sketch: Sketch): void;
}

export class AddEntityChange extends SketchChange {
    public readonly entitySnapshot: SketchEntitySnapshot;

    constructor(entityRef: SketchEntityRef, entitySnapshot: SketchEntitySnapshot) {
        super(entityRef);
        this.entitySnapshot = entitySnapshot;
    }

    public apply(sketch: Sketch): void {
        sketch.restoreEntity(this.entitySnapshot);
    }

    public revert(sketch: Sketch): void {
        sketch.removeEntity(this.entityRef);
    }
}

export class RemoveEntityChange extends SketchChange {
    public readonly entitySnapshot: SketchEntitySnapshot;

    constructor(entityRef: SketchEntityRef, entitySnapshot: SketchEntitySnapshot) {
        super(entityRef);
        this.entitySnapshot = entitySnapshot;
    }

    public apply(sketch: Sketch): void {
        sketch.removeEntity(this.entityRef);
    }

    public revert(sketch: Sketch): void {
        sketch.restoreEntity(this.entitySnapshot);
    }
}

export class SetPropertyChange extends SketchChange {
    public readonly after: SketchPropertyValue;
    public readonly before: SketchPropertyValue;
    public readonly propertyPath: readonly string[];

    constructor(input: {
        readonly after: SketchPropertyValue;
        readonly before: SketchPropertyValue;
        readonly entityRef: SketchEntityRef;
        readonly propertyPath: readonly string[];
    }) {
        super(input.entityRef);
        this.after = copySketchPropertyValue(input.after);
        this.before = copySketchPropertyValue(input.before);
        this.propertyPath = [...input.propertyPath];
    }

    public apply(sketch: Sketch): void {
        sketch.setTrackedProperty(this.entityRef, this.propertyPath, this.after);
    }

    public revert(sketch: Sketch): void {
        sketch.setTrackedProperty(this.entityRef, this.propertyPath, this.before);
    }

    public withAfter(after: SketchPropertyValue): SetPropertyChange {
        return new SetPropertyChange({
            after,
            before: this.before,
            entityRef: this.entityRef,
            propertyPath: this.propertyPath,
        });
    }
}

export class SketchChangeSet {
    public readonly changes: readonly SketchChange[];
    public readonly label: string;

    constructor(input: { readonly changes: readonly SketchChange[]; readonly label: string }) {
        this.changes = [...input.changes];
        this.label = input.label;
    }

    public apply(sketch: Sketch): void {
        withSketchChangeRecordingSuppressed(() => {
            for (const change of this.changes) {
                change.apply(sketch);
            }
        });
    }

    public revert(sketch: Sketch): void {
        withSketchChangeRecordingSuppressed(() => {
            for (const change of [...this.changes].reverse()) {
                change.revert(sketch);
            }
        });
    }
}

export class SketchChangeRecorder {
    private readonly changes: SketchChange[] = [];
    private readonly label: string;

    constructor(label: string) {
        this.label = label;
    }

    public recordAdd(entityRef: SketchEntityRef, snapshot: SketchEntitySnapshot): void {
        if (isSketchChangeRecordingSuppressed()) {
            return;
        }

        this.changes.push(new AddEntityChange(entityRef, snapshot));
    }

    public recordRemove(entityRef: SketchEntityRef, snapshot: SketchEntitySnapshot): void {
        if (isSketchChangeRecordingSuppressed()) {
            return;
        }

        this.changes.push(new RemoveEntityChange(entityRef, snapshot));
    }

    public recordSet(input: {
        readonly after: SketchPropertyValue;
        readonly before: SketchPropertyValue;
        readonly entityRef: SketchEntityRef;
        readonly propertyPath: readonly string[];
    }): void {
        if (
            isSketchChangeRecordingSuppressed() ||
            areSketchPropertyValuesEqual(input.before, input.after)
        ) {
            return;
        }

        const existingIndex = this.changes.findIndex(
            (change) =>
                change instanceof SetPropertyChange &&
                isSameSketchEntityRef(change.entityRef, input.entityRef) &&
                arePropertyPathsEqual(change.propertyPath, input.propertyPath),
        );

        if (existingIndex >= 0) {
            const existing = this.changes[existingIndex];

            if (existing instanceof SetPropertyChange) {
                const merged = existing.withAfter(input.after);

                if (areSketchPropertyValuesEqual(merged.before, merged.after)) {
                    this.changes.splice(existingIndex, 1);
                } else {
                    this.changes.splice(existingIndex, 1, merged);
                }
            }
            return;
        }

        this.changes.push(new SetPropertyChange(input));
    }

    public toChangeSet(): SketchChangeSet {
        return new SketchChangeSet({
            changes: this.changes,
            label: this.label,
        });
    }
}

export function getActiveSketchChangeRecorder(): SketchChangeRecorder | null {
    return activeRecorder;
}

export function recordSketchEntityAdded(
    entityRef: SketchEntityRef,
    snapshot: SketchEntitySnapshot,
): void {
    activeRecorder?.recordAdd(entityRef, snapshot);
}

export function recordSketchEntityRemoved(
    entityRef: SketchEntityRef,
    snapshot: SketchEntitySnapshot,
): void {
    activeRecorder?.recordRemove(entityRef, snapshot);
}

export function recordSketchPropertySet(input: {
    readonly after: SketchPropertyValue;
    readonly before: SketchPropertyValue;
    readonly entityRef: SketchEntityRef;
    readonly propertyPath: readonly string[];
}): void {
    activeRecorder?.recordSet(input);
}

export function withActiveSketchChangeRecorder<T>(
    recorder: SketchChangeRecorder,
    action: () => T,
): T {
    const previousRecorder = activeRecorder;

    activeRecorder = recorder;
    try {
        return action();
    } finally {
        activeRecorder = previousRecorder;
    }
}

export function withSketchChangeRecordingSuppressed<T>(action: () => T): T {
    recordingSuppressionDepth += 1;
    try {
        return action();
    } finally {
        recordingSuppressionDepth -= 1;
    }
}

function isSketchChangeRecordingSuppressed(): boolean {
    return recordingSuppressionDepth > 0;
}

function arePropertyPathsEqual(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isSameSketchEntityRef(left: SketchEntityRef, right: SketchEntityRef): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

function copySketchPropertyValue(value: SketchPropertyValue): SketchPropertyValue {
    return isVector2(value) ? Vec2.of(value.x, value.y) : value;
}

function areSketchPropertyValuesEqual(
    left: SketchPropertyValue,
    right: SketchPropertyValue,
): boolean {
    if (isVector2(left) && isVector2(right)) {
        return left.x === right.x && left.y === right.y;
    }

    return left === right;
}

function isVector2(
    value: SketchPropertyValue,
): value is { readonly x: number; readonly y: number } {
    return typeof value === 'object' && value !== null && 'x' in value && 'y' in value;
}
