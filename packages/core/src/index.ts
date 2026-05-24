export {
    DocumentSession,
    type DocumentSessionChange,
    type DocumentSessionRequestResult,
    type DocumentSessionScopeCommitResult,
    type DocumentSessionSnapshot,
} from './document/session';

export { ChangeRecorder, ChangeRecordingScope } from './editing/changeRecorder';
export {
    EditingSession,
    type EditingSessionChange,
    type EditingSessionRequestResult,
    type EditingSessionSnapshot,
} from './editing/editingSession';
export { EditScope, type EditScopeId, type EditScopeMoveResult } from './editing/editScope';
export {
    History,
    HistoryRecord,
    type HistoryMoveResult,
    type HistoryRecordLabels,
} from './editing/history';
export {
    FunctionalOperation,
    MapOperation,
    ReplaceStateOperation,
    ReplaceValueOperation,
    createOperationId,
    type Operation,
    type OperationId,
    type OperationResult,
} from './editing/operation';
export {
    createRequestExecution,
    type Request,
    type RequestContext,
    type RequestExecution,
} from './editing/request';
export {
    RequestExecutor,
    type RequestExecutorResult,
    type ScopeCommitResult,
} from './editing/requestExecutor';
export {
    Transaction,
    createTransactionId,
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
    type DraftObject,
    type DraftObjectId,
    type DraftObjectKind,
    type DraftPointObject,
} from './draft/editDraft';

export type { DocumentId, ObjectId, PayloadId } from './ids';

export {
    BaseDocumentModel,
    BaseModelEntity,
    BaseModelObject,
    BaseRevisionedModelEntity,
    type IdentifiedModelEntity,
    type ModelEntityInput,
    type ModelObject,
    type ModelObjectId,
    type ModelObjectInput,
    type ModelObjectType,
    type NamedModelEntity,
    type RevisionedModelEntity,
    type RevisionedModelEntityInput,
} from './model/base';
export {
    ModelEntityChangeOperation,
    ModelPropertyChangeOperation,
    SetModelPropertyOperation,
    createSetModelPropertyOperation,
    type ModelEntityChangeAction,
} from './model/operations';
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
export {
    AddModelEntityOperation,
    MappedModelEntityStoreEditor,
    ModelEntityStore,
    ModelEntityStoreEditor,
    RemoveModelEntityOperation,
    ReplaceModelEntityOperation,
} from './model/store';

export { PayloadStore, type Payload } from './payload/payloadStore';

export {
    SelectionSet,
    createEmptySelectionSet,
    createSelectionSetFromTarget,
    type SelectionObjectId,
    type SelectionTarget,
    type SelectionTargetKind,
} from './selection/selectionSet';
