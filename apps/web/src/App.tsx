import { APP_NAME } from '@occt-draw/shared';

const appTitle = import.meta.env.VITE_APP_TITLE || APP_NAME;
const wasmEntry = import.meta.env.VITE_OCCT_WASM_ENTRY;

export function App() {
    return (
        <main
            style={{
                minHeight: '100vh',
                padding: '40px',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                background: 'linear-gradient(180deg, #f4f6fb 0%, #e9eef8 100%)',
                color: '#122033',
            }}
        >
            <section
                style={{
                    maxWidth: '920px',
                    margin: '0 auto',
                    padding: '32px',
                    borderRadius: '24px',
                    background: 'rgba(255, 255, 255, 0.85)',
                    boxShadow: '0 20px 60px rgba(16, 32, 64, 0.12)',
                }}
            >
                <p
                    style={{
                        margin: 0,
                        fontSize: '14px',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                    }}
                >
                    Foundation Shell
                </p>
                <h1
                    style={{
                        marginTop: '12px',
                        marginBottom: '16px',
                        fontSize: '40px',
                        lineHeight: 1.1,
                    }}
                >
                    {appTitle}
                </h1>
                <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.6 }}>
                    The Vite app shell is now wired in and ready for the editor runtime to be
                    layered on top.
                </p>
                <dl
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '160px 1fr',
                        gap: '12px 20px',
                        marginTop: '28px',
                        fontSize: '16px',
                    }}
                >
                    <dt style={{ fontWeight: 700 }}>Workspace App</dt>
                    <dd style={{ margin: 0 }}>apps/web</dd>
                    <dt style={{ fontWeight: 700 }}>Wasm Entry</dt>
                    <dd style={{ margin: 0 }}>{wasmEntry}</dd>
                    <dt style={{ fontWeight: 700 }}>Next Focus</dt>
                    <dd style={{ margin: 0 }}>Protocol and worker runtime implementation</dd>
                </dl>
            </section>
        </main>
    );
}
