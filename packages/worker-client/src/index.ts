import type { WorkerRequest } from '@occt-draw/protocol';

export interface WorkerClient {
    send(request: WorkerRequest): void;
}
