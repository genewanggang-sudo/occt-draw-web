import {
    beginViewNavigation,
    endViewNavigation,
    updateViewNavigation,
    updateViewNavigationCamera,
    updateViewNavigationViewport,
    zoomViewNavigation,
    type ViewNavigationPointer,
    type ViewNavigationState,
    type ViewNavigationWheel,
} from '../view-navigation/viewNavigation';
import {
    type BoundingBox3,
    createStandardCameraState,
    fitCameraToBounds,
    frameCameraClippingToBounds,
    type BoundingSphere,
    type CameraState,
    type StandardCameraView,
    type ViewportSize,
} from '@occt-draw/webgl-engine';

export class ViewNavigationController {
    private readonly state: ViewNavigationState;

    constructor(state: ViewNavigationState) {
        this.state = state;
    }

    public begin(pointer: ViewNavigationPointer): ViewNavigationState {
        return beginViewNavigation(this.state, pointer);
    }

    public end(pointerId: number): ViewNavigationState {
        return endViewNavigation(this.state, pointerId);
    }

    public fit(bounds: BoundingBox3, sphere: BoundingSphere): ViewNavigationState {
        const camera = frameCameraClippingToBounds(
            fitCameraToBounds(this.state.camera, bounds, this.state.viewportSize),
            bounds,
        );

        return updateViewNavigationCamera(this.state, camera, sphere);
    }

    public getState(): ViewNavigationState {
        return this.state;
    }

    public setCamera(
        camera: CameraState,
        bounds: BoundingSphere,
        displayBounds: BoundingBox3,
    ): ViewNavigationState {
        return updateViewNavigationCamera(
            this.state,
            frameCameraClippingToBounds(camera, displayBounds),
            bounds,
        );
    }

    public setStandardView(
        bounds: BoundingBox3,
        sphere: BoundingSphere,
        view: StandardCameraView,
    ): ViewNavigationState {
        const camera = frameCameraClippingToBounds(
            createStandardCameraState(bounds, view, this.state.viewportSize),
            bounds,
        );

        return updateViewNavigationCamera(this.state, camera, sphere);
    }

    public update(pointer: ViewNavigationPointer, bounds: BoundingBox3): ViewNavigationState {
        return withFramedCamera(updateViewNavigation(this.state, pointer), bounds);
    }

    public updateViewport(viewportSize: ViewportSize): ViewNavigationState {
        return updateViewNavigationViewport(this.state, viewportSize);
    }

    public zoom(wheel: ViewNavigationWheel, bounds: BoundingBox3): ViewNavigationState {
        return withFramedCamera(zoomViewNavigation(this.state, wheel), bounds);
    }
}

function withFramedCamera(
    navigation: ViewNavigationState,
    bounds: BoundingBox3,
): ViewNavigationState {
    return {
        ...navigation,
        camera: frameCameraClippingToBounds(navigation.camera, bounds),
    };
}
