import { APP_NAME } from '@occt-draw/shared';

import { EditorShell } from '../editor/EditorShell';

export function App() {
    const appTitle = import.meta.env.VITE_APP_TITLE || APP_NAME;
    const wasmEntry = import.meta.env.VITE_OCCT_WASM_ENTRY;

    return <EditorShell appTitle={appTitle} wasmEntry={wasmEntry} />;
}
