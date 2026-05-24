import type { DocumentId, ObjectId, PayloadId } from '@occt-draw/core';
import type { SketchId } from '@occt-draw/sketch';

export type CadObjectId = ObjectId;
export type CadDocumentId = DocumentId;
export type CadFeatureId = string;
export type FeatureId = CadFeatureId;
export type FeaturePayloadId = PayloadId;
export type PartStudioId = string;
export type { DocumentId, SketchId };
