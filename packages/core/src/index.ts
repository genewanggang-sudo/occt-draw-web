export { CadDocument, PartStudio } from './document';
export {
    AppendFeatureOperation,
    DocumentEditor,
    DocumentOperation,
    DocumentTransaction,
    ReplaceActivePartStudioOperation,
    ReplacePartStudioOperation,
    TransactionGroup,
    editCadDocument,
    type DocumentEdit,
    type OperationId,
} from './documentEditor';
export {
    EditDraft,
    createEditDraft,
    type BaseDraftObject,
    type DraftId,
    type DraftKind,
    type DraftLineSegmentObject,
    type DraftObject,
    type DraftObjectId,
    type DraftObjectKind,
    type DraftPointObject,
} from './editDraft';
export { createDefaultCadDocument } from './defaultDocument';
export { findCadObjectById, getActivePartStudio, listVisibleCadObjects } from './documentQueries';
export { Feature, type FeatureStatus, type FeatureTypeId } from './features';
export type { CadObjectId, DocumentId, FeatureId, PartStudioId, SketchId } from './ids';
export {
    CORE_MODULE_MANIFEST,
    getCoreModuleManifest,
    type CoreDirection,
    type CoreModuleManifest,
    type CoreStatus,
} from './manifest';
export type {
    BaseCadObject,
    CadObject,
    CadObjectKind,
    ReferenceOriginObject,
    ReferencePlaneKind,
    ReferencePlaneObject,
} from './objects';
export { referencePlaneToPlane } from './objects';
export {
    SelectionSet,
    createEmptySelectionSet,
    createSelectionSetFromTarget,
    type SelectionTarget,
    type SelectionTargetKind,
} from './selection';
