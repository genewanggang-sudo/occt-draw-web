import type { StandardCameraView } from '@occt-draw/renderer';

interface StandardViewAction {
    readonly label: string;
    readonly view: StandardCameraView;
}

interface ViewToolbarProps {
    readonly onFitView: () => void;
    readonly onStandardView: (view: StandardCameraView) => void;
}

const standardViewActions: readonly StandardViewAction[] = [
    { label: '轴测', view: 'isometric' },
    { label: '前', view: 'front' },
    { label: '后', view: 'back' },
    { label: '上', view: 'top' },
    { label: '下', view: 'bottom' },
    { label: '左', view: 'left' },
    { label: '右', view: 'right' },
];

export function ViewToolbar({ onFitView, onStandardView }: ViewToolbarProps) {
    return (
        <nav className="cad-workbench__view-actions" aria-label="视图控制">
            <button
                className="cad-workbench__action cad-workbench__action--view"
                type="button"
                onClick={onFitView}
            >
                适配
            </button>
            {standardViewActions.map((action) => (
                <button
                    key={action.view}
                    className="cad-workbench__action cad-workbench__action--view"
                    type="button"
                    onClick={() => {
                        onStandardView(action.view);
                    }}
                >
                    {action.label}
                </button>
            ))}
        </nav>
    );
}
