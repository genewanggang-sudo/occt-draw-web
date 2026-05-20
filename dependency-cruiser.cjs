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
            name: 'web-app-only-editor-ui',
            severity: 'error',
            from: {
                path: '^apps/web/src',
            },
            to: {
                path: '^packages/(?!editor|ui)',
            },
        },
        {
            name: 'math-no-workspace-deps',
            severity: 'error',
            from: {
                path: '^packages/math/src',
            },
            to: {
                path: '^packages/(?!math)',
            },
        },
        {
            name: 'core-only-math',
            severity: 'error',
            from: {
                path: '^packages/core/src',
            },
            to: {
                path: '^packages/(?!math|core)',
            },
        },
        {
            name: 'cad-model-only-sketch-core-math',
            severity: 'error',
            from: {
                path: '^packages/cad-model/src',
            },
            to: {
                path: '^packages/(?!math|core|sketch|cad-model)',
            },
        },
        {
            name: 'sketch-only-core-math',
            severity: 'error',
            from: {
                path: '^packages/sketch/src',
            },
            to: {
                path: '^packages/(?!math|core|sketch)',
            },
        },
        {
            name: 'constraints-only-sketch-core-math',
            severity: 'error',
            from: {
                path: '^packages/constraints/src',
            },
            to: {
                path: '^packages/(?!math|core|sketch|constraints)',
            },
        },
        {
            name: 'sketch-snapping-only-math',
            severity: 'error',
            from: {
                path: '^packages/sketch-snapping/src',
            },
            to: {
                path: '^packages/(?!math|sketch-snapping)',
            },
        },
        {
            name: 'parametrics-only-core',
            severity: 'error',
            from: {
                path: '^packages/parametrics/src',
            },
            to: {
                path: '^packages/(?!core|parametrics)',
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
            name: 'editor-only-cad-model-sketch-core-rendering-math',
            severity: 'error',
            from: {
                path: '^packages/editor/src',
            },
            to: {
                path: '^packages/(?!math|core|cad-model|sketch|sketch-snapping|cad-render-adapter|cad-rendering|webgl-engine|editor)',
            },
        },
        {
            name: 'cad-rendering-only-webgl-math',
            severity: 'error',
            from: {
                path: '^packages/cad-rendering/src',
            },
            to: {
                path: '^packages/(?!math|webgl-engine|cad-rendering)',
            },
        },
        {
            name: 'cad-render-adapter-only-model-sketch-core-rendering-math',
            severity: 'error',
            from: {
                path: '^packages/cad-render-adapter/src',
            },
            to: {
                path: '^packages/(?!math|core|cad-model|sketch|cad-rendering|cad-render-adapter)',
            },
        },
    ],
};
