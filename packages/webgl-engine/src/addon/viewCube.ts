import { findViewCubeTargetAtPoint, getViewCubeViewportRect } from '../viewCube';
import type {
    CameraState,
    ScreenPoint2,
    ViewCubeRenderInput,
    ViewCubeTargetId,
    ViewportSize,
} from '../types';
import { ViewportWidget } from './viewportWidget';

export class ViewCube extends ViewportWidget {
    public hoveredTargetId: ViewCubeTargetId | null;

    constructor(options: { readonly hoveredTargetId?: ViewCubeTargetId | null } = {}) {
        super('view-cube', {
            id: 'view-cube',
            name: 'ViewCube',
        });
        this.hoveredTargetId = options.hoveredTargetId ?? null;
    }

    public hitTest(input: {
        readonly camera: CameraState;
        readonly point: ScreenPoint2;
        readonly viewportSize: ViewportSize;
    }): ViewCubeTargetId | null {
        return findViewCubeTargetAtPoint(input);
    }

    public getViewportRect(viewportSize: ViewportSize): ReturnType<typeof getViewCubeViewportRect> {
        return getViewCubeViewportRect(viewportSize);
    }

    public toRenderInput(): ViewCubeRenderInput {
        return {
            hoveredTargetId: this.hoveredTargetId,
        };
    }
}
