import type { WorkerRequest } from '@occt-draw/protocol';

export interface WorkerRequestHandler {
    handle(request: WorkerRequest): Promise<void> | void;
}
