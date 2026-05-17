import { collectVertexSnapCandidates } from './candidates/vertexSnap';
import { chooseBestSnap } from './scoring/chooseBestSnap';
import type { SketchSnapInput, SketchSnapResult } from './types';

export class SketchSnapService {
    public resolve(input: SketchSnapInput): SketchSnapResult | null {
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
