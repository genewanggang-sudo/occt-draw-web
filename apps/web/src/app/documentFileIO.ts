import { cadDocumentFileCodec, type EditorState } from '@occt-draw/editor';

interface FilePickerAcceptType {
    readonly accept: Readonly<Record<string, readonly string[]>>;
    readonly description: string;
}

interface FileSystemFileHandle {
    getFile(): Promise<File>;
}

interface FileSystemWritableFileStream {
    close(): Promise<void>;
    write(data: Blob | string): Promise<void>;
}

interface FileSystemSaveFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
}

type FilePickerWindow = Window & {
    showOpenFilePicker?: (options: {
        readonly excludeAcceptAllOption?: boolean;
        readonly multiple?: boolean;
        readonly types?: readonly FilePickerAcceptType[];
    }) => Promise<readonly FileSystemFileHandle[]>;
    showSaveFilePicker?: (options: {
        readonly excludeAcceptAllOption?: boolean;
        readonly suggestedName?: string;
        readonly types?: readonly FilePickerAcceptType[];
    }) => Promise<FileSystemSaveFileHandle>;
};

export type DocumentFileOpenResult =
    | {
          readonly document: EditorState['document'];
          readonly ok: true;
      }
    | {
          readonly ok: false;
          readonly reason: 'cancelled' | 'error';
          readonly message?: string;
      };

export type DocumentFileSaveResult =
    | {
          readonly ok: true;
      }
    | {
          readonly ok: false;
          readonly reason: 'cancelled' | 'error';
          readonly message?: string;
      };

const DOCUMENT_FILE_TYPES: readonly FilePickerAcceptType[] = [
    {
        accept: {
            'application/json': ['.ocd.json', '.json'],
        },
        description: 'OCCT Draw document',
    },
];

export async function openDocumentFromFile(): Promise<DocumentFileOpenResult> {
    try {
        const text = await readDocumentFileText();

        if (text === null) {
            return { ok: false, reason: 'cancelled' };
        }

        const decoded = cadDocumentFileCodec.decode(text);

        if (!decoded.ok) {
            return {
                message: decoded.error.message,
                ok: false,
                reason: 'error',
            };
        }

        return {
            document: decoded.document,
            ok: true,
        };
    } catch (error) {
        if (isAbortError(error)) {
            return { ok: false, reason: 'cancelled' };
        }

        return {
            message: error instanceof Error ? error.message : 'Failed to open document.',
            ok: false,
            reason: 'error',
        };
    }
}

export async function saveDocumentToFile(
    document: EditorState['document'],
): Promise<DocumentFileSaveResult> {
    try {
        const text = cadDocumentFileCodec.encode(document);

        await writeDocumentFileText(text, `${sanitizeFileName(document.name)}.ocd.json`);

        return { ok: true };
    } catch (error) {
        if (isAbortError(error)) {
            return { ok: false, reason: 'cancelled' };
        }

        return {
            message: error instanceof Error ? error.message : 'Failed to save document.',
            ok: false,
            reason: 'error',
        };
    }
}

async function readDocumentFileText(): Promise<string | null> {
    const pickerWindow = window as FilePickerWindow;

    if (pickerWindow.showOpenFilePicker) {
        const handles = await pickerWindow.showOpenFilePicker({
            excludeAcceptAllOption: false,
            multiple: false,
            types: DOCUMENT_FILE_TYPES,
        });
        const file = await handles[0]?.getFile();

        return file ? file.text() : null;
    }

    return readDocumentFileTextWithInput();
}

async function readDocumentFileTextWithInput(): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');

        input.accept = '.ocd.json,.json,application/json';
        input.type = 'file';
        input.style.display = 'none';
        input.addEventListener(
            'change',
            () => {
                const file = input.files?.[0] ?? null;

                input.remove();

                if (!file) {
                    resolve(null);
                    return;
                }

                file.text().then(resolve, reject);
            },
            { once: true },
        );
        input.addEventListener(
            'cancel',
            () => {
                input.remove();
                resolve(null);
            },
            { once: true },
        );

        document.body.append(input);
        input.click();
    });
}

async function writeDocumentFileText(text: string, suggestedName: string): Promise<void> {
    const pickerWindow = window as FilePickerWindow;

    if (pickerWindow.showSaveFilePicker) {
        const handle = await pickerWindow.showSaveFilePicker({
            excludeAcceptAllOption: false,
            suggestedName,
            types: DOCUMENT_FILE_TYPES,
        });
        const writable = await handle.createWritable();

        await writable.write(new Blob([text], { type: 'application/json' }));
        await writable.close();
        return;
    }

    downloadDocumentFile(text, suggestedName);
}

function downloadDocumentFile(text: string, fileName: string): void {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');

    link.download = fileName;
    link.href = url;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function sanitizeFileName(name: string): string {
    const trimmed = name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');

    return trimmed.length > 0 ? trimmed : 'untitled';
}

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
}
