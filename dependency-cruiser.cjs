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
            name: 'sketch-snapping-only-sketch-math-webgl-shared',
            severity: 'error',
            from: {
                path: '^packages/sketch-snapping/src',
            },
            to: {
                path: '^packages/(?!shared|math|sketch|webgl-engine|sketch-snapping)',
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
            name: 'webgl-engine-no-deep-imports',
            severity: 'error',
            from: {
                path: '^(apps|packages)/(?!.*node_modules/)(?!webgl-engine/)',
            },
            to: {
                path: '^packages/webgl-engine/src/(?!index\\.ts$)',
            },
        },
        {
            name: 'editor-only-sketch-core-display-renderer-math-shared',
            severity: 'error',
            from: {
                path: '^packages/editor/src',
            },
            to: {
                path: '^packages/(?!shared|math|core|sketch|sketch-snapping|display|renderer|editor)',
            },
        },
        {
            name: 'cloud-client-only-shared',
            severity: 'error',
            from: {
                path: '^packages/cloud-client/src',
            },
            to: {
                path: '^packages/(?!shared|cloud-client)',
            },
        },
    ],
};
