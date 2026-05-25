import type { StandardCameraView } from '@occt-draw/editor';
import { ToolbarIcon, ToolbarIconId } from '@occt-draw/ui';

interface StandardViewAction {
    readonly icon: ToolbarIconId;
    readonly label: string;
    readonly view: StandardCameraView;
}

interface ViewToolbarProps {
    readonly onFitView: () => void;
    readonly onStandardView: (view: StandardCameraView) => void;
}

const standardViewActions: readonly StandardViewAction[] = [
    { icon: ToolbarIconId.Cube, label: '轴测', view: 'trimetric' },
    { icon: ToolbarIconId.Front, label: '前视图', view: 'front' },
    { icon: ToolbarIconId.Back, label: '后视图', view: 'back' },
    { icon: ToolbarIconId.Top, label: '上视图', view: 'top' },
    { icon: ToolbarIconId.Bottom, label: '下视图', view: 'bottom' },
    { icon: ToolbarIconId.Left, label: '左视图', view: 'left' },
    { icon: ToolbarIconId.Right, label: '右视图', view: 'right' },
];

export function ViewToolbar({ onFitView, onStandardView }: ViewToolbarProps) {
    return (
        <nav className="cad-workbench__view-actions" aria-label="视图控制">
            <button
                className="cad-workbench__action cad-workbench__action--view"
                type="button"
                aria-label="适配视图"
                title="适配视图"
                onClick={onFitView}
            >
                <ToolbarIcon className="cad-workbench__view-tool-icon" icon={ToolbarIconId.Fit} />
            </button>
            {standardViewActions.map((action) => (
                <button
                    key={action.view}
                    className="cad-workbench__action cad-workbench__action--view"
                    type="button"
                    aria-label={action.label}
                    title={action.label}
                    onClick={() => {
                        onStandardView(action.view);
                    }}
                >
                    <ToolbarIcon className="cad-workbench__view-tool-icon" icon={action.icon} />
                </button>
            ))}
        </nav>
    );
}
