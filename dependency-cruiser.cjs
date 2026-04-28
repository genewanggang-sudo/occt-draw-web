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
            name: 'packages-must-not-import-apps',
            severity: 'error',
            from: {
                path: '^packages/',
            },
            to: {
                path: '^apps/',
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
            name: 'math-only-shared',
            severity: 'error',
            from: {
                path: '^packages/math/src',
            },
            to: {
                path: '^packages/(?!shared|math)',
            },
        },
        {
            name: 'protocol-only-shared',
            severity: 'error',
            from: {
                path: '^packages/protocol/src',
            },
            to: {
                path: '^packages/(?!shared|protocol)',
            },
        },
        {
            name: 'core-only-shared-and-math',
            severity: 'error',
            from: {
                path: '^packages/core/src',
            },
            to: {
                path: '^packages/(?!shared|math|core)',
            },
        },
        {
            name: 'sketch-only-core-math-shared',
            severity: 'error',
            from: {
                path: '^packages/sketch/src',
            },
            to: {
                path: '^packages/(?!shared|math|core|sketch)',
            },
        },
        {
            name: 'constraints-only-sketch-core-math-shared',
            severity: 'error',
            from: {
                path: '^packages/constraints/src',
            },
            to: {
                path: '^packages/(?!shared|math|core|sketch|constraints)',
            },
        },
        {
            name: 'parametrics-only-core-shared',
            severity: 'error',
            from: {
                path: '^packages/parametrics/src',
            },
            to: {
                path: '^packages/(?!shared|core|parametrics)',
            },
        },
        {
            name: 'display-only-sketch-core-math-shared',
            severity: 'error',
            from: {
                path: '^packages/display/src',
            },
            to: {
                path: '^packages/(?!shared|math|core|sketch|display)',
            },
        },
        {
            name: 'renderer-only-display-math-shared',
            severity: 'error',
            from: {
                path: '^packages/renderer/src',
            },
            to: {
                path: '^packages/(?!shared|math|display|renderer)',
            },
        },
        {
            name: 'renderer-webgl-only-renderer-display-math-shared',
            severity: 'error',
            from: {
                path: '^packages/renderer-webgl/src',
            },
            to: {
                path: '^packages/(?!shared|math|display|renderer|renderer-webgl)',
            },
        },
        {
            name: 'editor-only-sketch-core-display-renderer-math-shared',
            severity: 'error',
            from: {
                path: '^packages/editor/src',
            },
            to: {
                path: '^packages/(?!shared|math|core|sketch|display|renderer|editor)',
            },
        },
        {
            name: 'wasm-bridge-only-protocol-shared',
            severity: 'error',
            from: {
                path: '^packages/wasm-bridge/src',
            },
            to: {
                path: '^packages/(?!shared|protocol|wasm-bridge)',
            },
        },
        {
            name: 'worker-client-only-protocol-shared',
            severity: 'error',
            from: {
                path: '^packages/worker-client/src',
            },
            to: {
                path: '^packages/(?!shared|protocol|worker-client)',
            },
        },
        {
            name: 'worker-runtime-only-protocol-shared-wasm-bridge',
            severity: 'error',
            from: {
                path: '^packages/worker-runtime/src',
            },
            to: {
                path: '^packages/(?!shared|protocol|wasm-bridge|worker-runtime)',
            },
        },
        {
            name: 'cloud-client-only-protocol-shared',
            severity: 'error',
            from: {
                path: '^packages/cloud-client/src',
            },
            to: {
                path: '^packages/(?!shared|protocol|cloud-client)',
            },
        },
    ],
};
