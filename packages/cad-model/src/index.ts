export { CadDocument, FeaturePayloadStore, PartStudio, type FeaturePayload } from './document';
export {
    AppendFeatureOperation,
    ReplaceActivePartStudioOperation,
    ReplacePartStudioOperation,
    SetFeaturePayloadOperation,
} from './documentOperations';
export {
    CreateFeaturePayloadRequest,
    SetFeaturePayloadRequest,
    type CadDocumentRequestResult,
    type CreateFeaturePayloadRequestResult,
    type SetFeaturePayloadRequestResult,
} from './documentRequests';
export { createDefaultCadDocument } from './defaultDocument';
export { findCadObjectById, getActivePartStudio, listVisibleCadObjects } from './documentQueries';
export { Feature, type FeatureStatus, type FeatureTypeId } from './features';
export type {
    CadDocumentId,
    CadFeatureId,
    CadObjectId,
    DocumentId,
    FeatureId,
    FeaturePayloadId,
    PartStudioId,
    SketchId,
} from './ids';
export type {
    BaseCadObject,
    CadObject,
    CadObjectKind,
    ReferenceOriginObject,
    ReferencePlaneKind,
    ReferencePlaneObject,
} from './objects';
export { referencePlaneToPlane } from './objects';
export { findSketchByFeatureId, getSketchForFeature, getSketchPayload } from './sketchPayload';
