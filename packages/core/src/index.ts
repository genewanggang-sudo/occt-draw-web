export { DocumentEditor } from './document/editor';
export {
    DocumentFileError,
    createJsonDocumentFileCodec,
    type DocumentFileCodec,
    type DocumentFileDecodeResult,
    type DocumentFileEnvelope,
    type DocumentFileErrorCode,
} from './document/documentFile';
export { DocumentSession, type DocumentSessionSnapshot } from './document/session';

export {
    ModelChangeApplierRegistry,
    type ModelElementChangeApplier,
    type ModelPropertyChangeApplier,
} from './editing/changeApplierRegistry';
export {
    ModelChangeSet,
    ModelChangeSetBuilder,
    createModelChangeId,
    createModelChangeKey,
    createModelPropertyChangeKey,
    type ModelAddedChange,
    type ModelChangeId,
    type ModelChangeKey,
    type ModelChangeTargetKind,
    type ModelDeletedChange,
    type ModelElementChangeTarget,
    type ModelPropertyChangeKey,
    type ModelPropertyChangeTarget,
    type ModelPropertyValueChange,
    type ModelUpdatedChange,
    type SerializableModelAddedChange,
    type SerializableModelChange,
    type SerializableModelChangeSet,
    type SerializableModelPropertyValueChange,
    type SerializableModelRemovedChange,
    type SerializableModelUpdatedChange,
} from './editing/changeSet';
export { ChangeRecorder, ChangeRecordingScope } from './editing/changeRecorder';
export {
    createRequestExecution,
    type DocumentMutationInput,
    type DocumentMutationRuntime,
    type DocumentRequest,
    type DocumentWriteContext,
    type MutationScope,
    type Request,
    type RequestContext,
    type RequestExecution,
} from './editing/request';
export type {
    DocumentEditLabels,
    DocumentEditResult,
    DocumentPreviewResult,
    DocumentRequestResult,
    DocumentScopeCommitResult,
} from './editing/result';
export {
    Transaction,
    createTransactionId,
    type SerializableTransaction,
    type TransactionId,
    type TransactionMergeKey,
} from './editing/transaction';

export {
    EditDraft,
    createEditDraft,
    type BaseDraftObject,
    type DraftId,
    type DraftKind,
    type DraftLineSegmentObject,
    type DraftLineStyle,
    type DraftObject,
    type DraftObjectId,
    type DraftObjectKind,
    type DraftPointObject,
} from './draft/editDraft';

export type { DocumentId, ObjectId, PayloadId } from './ids';

export {
    BaseModelElement,
    DocumentModel,
    getNextModelRevision,
    setNextModelRevision,
    type IdentifiedModelElement,
    type ModelElement,
    type ModelElementId,
    type ModelElementInput,
    type ModelElementType,
    type NamedModelElement,
} from './model/base';
export {
    ModelPropertyBag,
    defineModelProperty,
    type ModelProperty,
    type ModelPropertyDefinition,
    type ModelPropertyKey,
    type ModelPropertyPath,
    type ModelPropertyValue,
} from './model/properties';
export { ModelRefIndex, type ModelRefResolver } from './model/refIndex';
export { createModelRef, type ModelRef, type ObjectRef } from './model/refs';
export { ModelElementStore } from './model/store';

export { PayloadStore, type Payload } from './payload/payloadStore';

export {
    SelectionSet,
    createEmptySelectionSet,
    createSelectionSetFromTarget,
    type SelectionObjectId,
    type SelectionTarget,
    type SelectionTargetKind,
} from './selection/selectionSet';
