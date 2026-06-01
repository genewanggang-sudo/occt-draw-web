import type { InspectorViewModel, SketchDisplayOptions } from '@occt-draw/editor';

type ActiveSketchView = NonNullable<InspectorViewModel['activeSketch']>;

interface SketchEditPanelProps {
    readonly sketch: ActiveSketchView;
    readonly onAccept: () => void;
    readonly onCancel: () => void;
    readonly onDisplayOptionsChange: (displayOptions: Partial<SketchDisplayOptions>) => void;
}

export function SketchEditPanel({
    sketch,
    onAccept,
    onCancel,
    onDisplayOptionsChange,
}: SketchEditPanelProps) {
    return (
        <section className="cad-sketch-edit-panel" aria-label="草图编辑">
            <header className="cad-sketch-edit-panel__header">
                <h2 className="cad-sketch-edit-panel__title">{sketch.name}</h2>
                <div className="cad-sketch-edit-panel__actions">
                    <button
                        className="cad-sketch-edit-panel__action cad-sketch-edit-panel__action--accept"
                        type="button"
                        aria-label="确认草图"
                        title="确认草图"
                        onClick={onAccept}
                    >
                        ✓
                    </button>
                    <button
                        className="cad-sketch-edit-panel__action cad-sketch-edit-panel__action--cancel"
                        type="button"
                        aria-label="取消草图"
                        title="取消草图"
                        onClick={onCancel}
                    >
                        ×
                    </button>
                </div>
            </header>

            <div className="cad-sketch-edit-panel__body">
                <label className="cad-sketch-edit-panel__field">
                    <span className="cad-sketch-edit-panel__field-label">草图平面</span>
                    <input
                        className="cad-sketch-edit-panel__plane"
                        type="text"
                        readOnly
                        value={formatSketchPlaneLabel(sketch.planeKind)}
                    />
                </label>

                <label className="cad-sketch-edit-panel__checkbox">
                    <input
                        type="checkbox"
                        checked={sketch.displayOptions.showConstraints}
                        onChange={(event) => {
                            onDisplayOptionsChange({
                                showConstraints: event.currentTarget.checked,
                            });
                        }}
                    />
                    <span>显示约束</span>
                </label>
                <label className="cad-sketch-edit-panel__checkbox">
                    <input
                        type="checkbox"
                        checked={sketch.displayOptions.showExpressions}
                        onChange={(event) => {
                            onDisplayOptionsChange({
                                showExpressions: event.currentTarget.checked,
                            });
                        }}
                    />
                    <span>显示表达式</span>
                </label>
                <label className="cad-sketch-edit-panel__checkbox">
                    <input
                        type="checkbox"
                        checked={sketch.displayOptions.showErrors}
                        onChange={(event) => {
                            onDisplayOptionsChange({
                                showErrors: event.currentTarget.checked,
                            });
                        }}
                    />
                    <span>显示错误</span>
                </label>
            </div>
        </section>
    );
}

function formatSketchPlaneLabel(planeKind: string): string {
    if (planeKind === 'XY') {
        return 'Top plane';
    }

    if (planeKind === 'ZX') {
        return 'Front plane';
    }

    if (planeKind === 'YZ') {
        return 'Right plane';
    }

    return `${planeKind} plane`;
}
