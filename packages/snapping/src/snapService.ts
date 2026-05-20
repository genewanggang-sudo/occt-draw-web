import { collectVertexSnapCandidates } from './candidates/vertexSnap';
import { chooseBestSnap } from './scoring/chooseBestSnap';
import type { SnapInput, SnapResult } from './types';

export class SnapService {
    public resolve<TSourceRef>(input: SnapInput<TSourceRef>): SnapResult<TSourceRef> | null {
        const candidate = chooseBestSnap([...collectVertexSnapCandidates(input)]);

        return candidate
            ? {
                  distancePixels: candidate.distancePixels,
                  kind: candidate.kind,
                  point: candidate.point,
                  ...(candidate.sourceRef ? { sourceRef: candidate.sourceRef } : {}),
                  worldPoint: candidate.worldPoint,
              }
            : null;
    }
}
