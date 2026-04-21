/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    forbidden: [
        {
            name: 'no-circular',
            severity: 'error',
            from: {},
            to: {
                circular: true,
            },
        },
        {
            name: 'shared-no-workspace-deps',
            severity: 'error',
            from: {
                path: '^packages/shared/src',
            },
            to: {
                path: '^packages/(?!shared)',
            },
        },
        {
            name: 'protocol-only-shared',
            severity: 'error',
            from: {
                path: '^packages/protocol/src',
            },
            to: {
                path: '^packages/(config|core|renderer|wasm-bridge|worker-client|worker-runtime)',
            },
        },
        {
            name: 'core-only-shared',
            severity: 'error',
            from: {
                path: '^packages/core/src',
            },
            to: {
                path: '^packages/(config|protocol|renderer|wasm-bridge|worker-client|worker-runtime)',
            },
        },
        {
            name: 'renderer-only-core-and-shared',
            severity: 'error',
            from: {
                path: '^packages/renderer/src',
            },
            to: {
                path: '^packages/(config|protocol|wasm-bridge|worker-client|worker-runtime)',
            },
        },
        {
            name: 'wasm-bridge-only-protocol-and-shared',
            severity: 'error',
            from: {
                path: '^packages/wasm-bridge/src',
            },
            to: {
                path: '^packages/(config|core|renderer|worker-client|worker-runtime)',
            },
        },
        {
            name: 'worker-client-only-protocol-and-shared',
            severity: 'error',
            from: {
                path: '^packages/worker-client/src',
            },
            to: {
                path: '^packages/(config|core|renderer|wasm-bridge|worker-runtime)',
            },
        },
        {
            name: 'worker-runtime-only-protocol-shared-wasm-bridge',
            severity: 'error',
            from: {
                path: '^packages/worker-runtime/src',
            },
            to: {
                path: '^packages/(config|core|renderer|worker-client)',
            },
        },
        {
            name: 'packages-must-not-import-apps',
            severity: 'error',
            from: {
                path: '^packages/',
            },
            to: {
                path: '^apps/',
            },
        },
    ],
};
