import {
    ChangeRecorder,
    ChangeRecordingScope,
    createModelChangeId,
    type ModelElementChangeTarget,
    type ModelPropertyPath,
    type ModelPropertyChangeTarget,
    type Transaction,
} from '@occt-draw/core';
import { Vec2 } from '@occt-draw/math';
import type { Sketch } from '../model/sketch';
import type { SketchEntityRef, SketchEntitySnapshot, SketchPropertyValue } from '../types';

const sketchRecordingScope = new ChangeRecordingScope<SketchChangeRecorder>();

export class SketchChangeRecorder {
    private readonly recorder = new ChangeRecorder<Sketch>();
    private readonly label: string;

    constructor(label: string) {
        this.label = label;
    }

    public recordAdd(entityRef: SketchEntityRef, snapshot: SketchEntitySnapshot): void {
        if (isSketchChangeRecordingSuppressed()) {
            return;
        }

        this.recorder.recordAdd({
            id: createSketchEntityChangeId('add-entity', entityRef),
            label: `Add sketch ${entityRef.kind}`,
            ref: entityRef,
            target: sketchEntityTarget,
            value: snapshot,
        });
    }

    public recordRemove(entityRef: SketchEntityRef, snapshot: SketchEntitySnapshot): void {
        if (isSketchChangeRecordingSuppressed()) {
            return;
        }

        this.recorder.recordDelete({
            id: createSketchEntityChangeId('remove-entity', entityRef),
            label: `Remove sketch ${entityRef.kind}`,
            ref: entityRef,
            target: sketchEntityTarget,
            value: snapshot,
        });
    }

    public recordSet(input: {
        readonly after: SketchPropertyValue;
        readonly before: SketchPropertyValue;
        readonly entityRef: SketchEntityRef;
        readonly propertyPath: ModelPropertyPath;
    }): void {
        if (
            isSketchChangeRecordingSuppressed() ||
            areSketchPropertyValuesEqual(input.before, input.after)
        ) {
            return;
        }

        this.recorder.recordUpdate({
            id: createModelChangeId(
                `sketch-set-property:${input.propertyPath.join('.')}`,
                `${input.entityRef.kind}:${input.entityRef.id}`,
            ),
            label: `Set sketch ${input.entityRef.kind} property`,
            ref: input.entityRef,
            target: sketchPropertyTarget,
            after: copySketchPropertyValue(input.after),
            before: copySketchPropertyValue(input.before),
            propertyPath: input.propertyPath,
        });
    }

    public toTransaction(input: { readonly id: string }): Transaction<Sketch> {
        return this.recorder.toTransaction({
            id: input.id,
            label: this.label,
        });
    }
}

function createSketchEntityChangeId(action: string, entityRef: SketchEntityRef): string {
    return createModelChangeId(`sketch-${action}`, `${entityRef.kind}:${entityRef.id}`);
}

export function getActiveSketchChangeRecorder(): SketchChangeRecorder | null {
    return sketchRecordingScope.active;
}

export function recordSketchEntityAdded(
    entityRef: SketchEntityRef,
    snapshot: SketchEntitySnapshot,
): void {
    getActiveSketchChangeRecorder()?.recordAdd(entityRef, snapshot);
}

export function recordSketchEntityRemoved(
    entityRef: SketchEntityRef,
    snapshot: SketchEntitySnapshot,
): void {
    getActiveSketchChangeRecorder()?.recordRemove(entityRef, snapshot);
}

export function recordSketchPropertySet(input: {
    readonly after: SketchPropertyValue;
    readonly before: SketchPropertyValue;
    readonly entityRef: SketchEntityRef;
    readonly propertyPath: ModelPropertyPath;
}): void {
    getActiveSketchChangeRecorder()?.recordSet(input);
}

export function withActiveSketchChangeRecorder<T>(
    recorder: SketchChangeRecorder,
    action: () => T,
): T {
    return sketchRecordingScope.withActive(recorder, action);
}

export function withSketchChangeRecordingSuppressed<T>(action: () => T): T {
    return sketchRecordingScope.suppress(action);
}

function isSketchChangeRecordingSuppressed(): boolean {
    return sketchRecordingScope.isSuppressed;
}

function removeSketchEntity(sketch: Sketch, entityRef: SketchEntityRef): Sketch {
    return withSketchChangeRecordingSuppressed(() => {
        sketch.removeEntity(entityRef);

        return sketch;
    });
}

const sketchEntityTarget: ModelElementChangeTarget<Sketch, SketchEntityRef, SketchEntitySnapshot> =
    {
        add: (sketch, _entityRef, snapshot) => restoreSketchEntity(sketch, snapshot),
        remove: removeSketchEntity,
    };

const sketchPropertyTarget: ModelPropertyChangeTarget<
    Sketch,
    SketchEntityRef,
    SketchPropertyValue
> = {
    set: applySketchPropertyChange,
};

function restoreSketchEntity(sketch: Sketch, snapshot: SketchEntitySnapshot): Sketch {
    return withSketchChangeRecordingSuppressed(() => {
        sketch.restoreEntity(snapshot);

        return sketch;
    });
}

function applySketchPropertyChange(
    sketch: Sketch,
    entityRef: SketchEntityRef,
    propertyPath: ModelPropertyPath,
    value: SketchPropertyValue,
): Sketch {
    return withSketchChangeRecordingSuppressed(() => {
        sketch.setTrackedProperty(entityRef, propertyPath, value);

        return sketch;
    });
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
