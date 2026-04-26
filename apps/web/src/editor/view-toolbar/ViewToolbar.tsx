import type { StandardCameraView } from '@occt-draw/renderer';

interface ViewToolbarProps {
    readonly onFitView: () => void;
    readonly onStandardView: (view: StandardCameraView) => void;
}

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
            <button
                className="cad-workbench__action cad-workbench__action--view"
                type="button"
                onClick={() => {
                    onStandardView('isometric');
                }}
            >
                轴测
            </button>
            <button
                className="cad-workbench__action cad-workbench__action--view"
                type="button"
                onClick={() => {
                    onStandardView('front');
                }}
            >
                前视
            </button>
            <button
                className="cad-workbench__action cad-workbench__action--view"
                type="button"
                onClick={() => {
                    onStandardView('top');
                }}
            >
                上视
            </button>
            <button
                className="cad-workbench__action cad-workbench__action--view"
                type="button"
                onClick={() => {
                    onStandardView('right');
                }}
            >
                右视
            </button>
        </nav>
    );
}
