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
            name: 'core-only-math-shared',
            severity: 'error',
            from: {
                path: '^packages/core/src',
            },
            to: {
                path: '^packages/(?!shared|math|core)',
            },
        },
        {
            name: 'cad-model-only-sketch-core-math-shared',
            severity: 'error',
            from: {
                path: '^packages/cad-model/src',
            },
            to: {
                path: '^packages/(?!shared|math|core|sketch|cad-model)',
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
            name: 'editor-only-cad-model-sketch-core-rendering-math-shared',
            severity: 'error',
            from: {
                path: '^packages/editor/src',
            },
            to: {
                path: '^packages/(?!shared|math|core|cad-model|sketch|sketch-snapping|cad-rendering|webgl-engine|editor)',
            },
        },
        {
            name: 'cad-rendering-only-cad-model-sketch-core-webgl-math-shared',
            severity: 'error',
            from: {
                path: '^packages/cad-rendering/src',
            },
            to: {
                path: '^packages/(?!shared|math|core|cad-model|sketch|webgl-engine|cad-rendering)',
            },
        },
    ],
};
