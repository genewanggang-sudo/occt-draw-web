export interface DocumentFileEnvelope<TSnapshot> {
    readonly document: TSnapshot;
    readonly formatId: string;
    readonly formatVersion: number;
}

export type DocumentFileErrorCode =
    | 'invalid-json'
    | 'invalid-envelope'
    | 'format-mismatch'
    | 'unsupported-version'
    | 'invalid-document';

export class DocumentFileError extends Error {
    public readonly code: DocumentFileErrorCode;

    constructor(code: DocumentFileErrorCode, message: string) {
        super(message);
        this.code = code;
        this.name = 'DocumentFileError';
    }
}

export type DocumentFileDecodeResult<TDocument> =
    | {
          readonly document: TDocument;
          readonly ok: true;
      }
    | {
          readonly error: DocumentFileError;
          readonly ok: false;
      };

export interface DocumentFileCodec<TDocument, TSnapshot> {
    readonly formatId: string;
    readonly formatVersion: number;
    decode(text: string): DocumentFileDecodeResult<TDocument>;
    deserialize(snapshot: TSnapshot): TDocument;
    encode(document: TDocument): string;
    serialize(document: TDocument): TSnapshot;
}

export function createJsonDocumentFileCodec<TDocument, TSnapshot>(input: {
    readonly deserialize: (snapshot: TSnapshot) => TDocument;
    readonly formatId: string;
    readonly formatVersion: number;
    readonly serialize: (document: TDocument) => TSnapshot;
}): DocumentFileCodec<TDocument, TSnapshot> {
    return {
        formatId: input.formatId,
        formatVersion: input.formatVersion,
        decode: (text) =>
            decodeJsonDocumentFile(text, {
                deserialize: (snapshot) => input.deserialize(snapshot as TSnapshot),
                formatId: input.formatId,
                formatVersion: input.formatVersion,
            }),
        deserialize: input.deserialize,
        encode: (document) =>
            `${JSON.stringify(
                {
                    document: input.serialize(document),
                    formatId: input.formatId,
                    formatVersion: input.formatVersion,
                } satisfies DocumentFileEnvelope<TSnapshot>,
                null,
                2,
            )}\n`,
        serialize: input.serialize,
    };
}

function decodeJsonDocumentFile<TDocument>(
    text: string,
    codec: {
        readonly deserialize: (snapshot: unknown) => TDocument;
        readonly formatId: string;
        readonly formatVersion: number;
    },
): DocumentFileDecodeResult<TDocument> {
    let parsed: unknown;

    try {
        parsed = JSON.parse(text);
    } catch {
        return {
            error: new DocumentFileError('invalid-json', 'Document file is not valid JSON.'),
            ok: false,
        };
    }

    if (!isDocumentFileEnvelope(parsed)) {
        return {
            error: new DocumentFileError(
                'invalid-envelope',
                'Document file is missing the expected envelope.',
            ),
            ok: false,
        };
    }

    if (parsed.formatId !== codec.formatId) {
        return {
            error: new DocumentFileError(
                'format-mismatch',
                `Unsupported document format "${parsed.formatId}".`,
            ),
            ok: false,
        };
    }

    if (parsed.formatVersion !== codec.formatVersion) {
        return {
            error: new DocumentFileError(
                'unsupported-version',
                `Unsupported document format version ${String(parsed.formatVersion)}.`,
            ),
            ok: false,
        };
    }

    try {
        return {
            document: codec.deserialize(parsed.document),
            ok: true,
        };
    } catch (error) {
        return {
            error:
                error instanceof DocumentFileError
                    ? error
                    : new DocumentFileError(
                          'invalid-document',
                          error instanceof Error
                              ? error.message
                              : 'Document snapshot could not be decoded.',
                      ),
            ok: false,
        };
    }
}

function isDocumentFileEnvelope(value: unknown): value is DocumentFileEnvelope<unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        'document' in value &&
        'formatId' in value &&
        'formatVersion' in value &&
        typeof value.formatId === 'string' &&
        typeof value.formatVersion === 'number'
    );
}
