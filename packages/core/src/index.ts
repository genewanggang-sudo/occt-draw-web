export { DocumentSession, type DocumentSessionSnapshot } from './document/session';

export {
    ModelChangeSet,
    ModelChangeSetBuilder,
    createModelChangeId,
    createModelChangeKey,
    createModelPropertyChangeKey,
    type ModelAddedChange,
    type ModelChangeId,
    type ModelChangeKey,
    type ModelDeletedChange,
    type ModelElementChangeTarget,
    type ModelPropertyChangeKey,
    type ModelPropertyChangeTarget,
    type ModelPropertyValueChange,
    type ModelUpdatedChange,
} from './editing/changeSet';
export { ChangeRecorder, ChangeRecordingScope } from './editing/changeRecorder';
export {
    createRequestExecution,
    type Request,
    type RequestContext,
    type RequestExecution,
} from './editing/request';
export type {
    DocumentEditLabels,
    DocumentEditResult,
    DocumentRequestResult,
    DocumentScopeCommitResult,
} from './editing/result';
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
