import type { PartStudio, ReferencePlaneObject } from '@occt-draw/cad-model';

export class ReferencePlaneResolver {
    public findReferencePlaneById(
        partStudio: PartStudio,
        objectId: string,
    ): ReferencePlaneObject | null {
        const object = partStudio.findObjectById(objectId);

        return object?.kind === 'reference-plane' ? object : null;
    }
}
