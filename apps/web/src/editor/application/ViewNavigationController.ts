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
    type BoundingSphere,
    type CameraState,
    type StandardCameraView,
    type ViewportSize,
} from '@occt-draw/renderer';

export class ViewNavigationController {
    readonly #state: ViewNavigationState;

    constructor(state: ViewNavigationState) {
        this.#state = state;
    }

    begin(pointer: ViewNavigationPointer): ViewNavigationState {
        return beginViewNavigation(this.#state, pointer);
    }

    end(pointerId: number): ViewNavigationState {
        return endViewNavigation(this.#state, pointerId);
    }

    fit(bounds: BoundingBox3, sphere: BoundingSphere): ViewNavigationState {
        const camera = fitCameraToBounds(this.#state.camera, bounds, this.#state.viewportSize);

        return updateViewNavigationCamera(this.#state, camera, sphere);
    }

    getState(): ViewNavigationState {
        return this.#state;
    }

    setCamera(camera: CameraState, bounds: BoundingSphere): ViewNavigationState {
        return updateViewNavigationCamera(this.#state, camera, bounds);
    }

    setStandardView(
        bounds: BoundingBox3,
        sphere: BoundingSphere,
        view: StandardCameraView,
    ): ViewNavigationState {
        const camera = createStandardCameraState(bounds, view, this.#state.viewportSize);

        return updateViewNavigationCamera(this.#state, camera, sphere);
    }

    update(pointer: ViewNavigationPointer): ViewNavigationState {
        return updateViewNavigation(this.#state, pointer);
    }

    updateViewport(viewportSize: ViewportSize): ViewNavigationState {
        return updateViewNavigationViewport(this.#state, viewportSize);
    }

    zoom(wheel: ViewNavigationWheel): ViewNavigationState {
        return zoomViewNavigation(this.#state, wheel);
    }
}
