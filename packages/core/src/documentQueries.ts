import type { CadDocument, PartStudio } from './document';
import type { CadObjectId } from './ids';
import type { CadObject } from './objects';

export function getActivePartStudio(document: CadDocument): PartStudio {
    return document.getActivePartStudio();
}

export function findCadObjectById(partStudio: PartStudio, objectId: CadObjectId): CadObject | null {
    return partStudio.findObjectById(objectId);
}

export function listVisibleCadObjects(partStudio: PartStudio): readonly CadObject[] {
    return partStudio.listVisibleObjects();
}
