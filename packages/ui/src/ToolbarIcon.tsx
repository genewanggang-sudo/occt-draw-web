import toolbarIconSprite from './assets/toolbar-icons.svg?raw';

export enum ToolbarIconId {
    AlignedRectangle = 'aligned-rectangle',
    Arc = 'arc',
    Back = 'back',
    Bezier = 'bezier',
    Bottom = 'bottom',
    CenterCircle = 'center-circle',
    CenterArc = 'center-arc',
    CenterRectangle = 'center-rectangle',
    Circle3Point = 'circle-3-point',
    CircleConic = 'circle-conic',
    ControlSpline = 'control-spline',
    CornerRectangle = 'corner-rectangle',
    Cube = 'cube',
    Ellipse = 'ellipse',
    EllipseArc = 'ellipse-arc',
    Expanded = 'expanded',
    Fit = 'fit',
    Front = 'front',
    InscribedPolygon = 'inscribed-polygon',
    CircumscribedPolygon = 'circumscribed-polygon',
    Left = 'left',
    Line = 'line',
    MidpointLine = 'midpoint-line',
    Redo = 'redo',
    Right = 'right',
    Spline = 'spline',
    TangentArc = 'tangent-arc',
    Top = 'top',
    Undo = 'undo',
}

export function ToolbarIcon({
    className = 'cad-workbench__toolbar-icon',
    icon,
}: {
    readonly className?: string;
    readonly icon: ToolbarIconId;
}) {
    return (
        <svg className={className} aria-hidden="true" focusable="false">
            <use href={`#cad-toolbar-icon-${icon}`} />
        </svg>
    );
}

export function ToolbarIconSprite() {
    return (
        <span
            className="cad-workbench__toolbar-icon-sprite"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: toolbarIconSprite }}
        />
    );
}
