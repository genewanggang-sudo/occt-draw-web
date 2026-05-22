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
            name: 'snapping-only-core-math',
            severity: 'error',
            from: {
                path: '^packages/snapping/src',
            },
            to: {
                path: '^packages/(?!math|core|snapping)',
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
            name: 'platform-only-core-math-snapping-canvas',
            severity: 'error',
            from: {
                path: '^packages/platform/src',
            },
            to: {
                path: '^packages/(?!math|core|snapping|canvas|platform)',
            },
        },
        {
            name: 'editor-only-cad-model-sketch-core-canvas-platform-math',
            severity: 'error',
            from: {
                path: '^packages/editor/src',
            },
            to: {
                path: '^packages/(?!math|core|cad-model|sketch|snapping|platform|cad-render-adapter|canvas|editor)',
            },
        },
        {
            name: 'canvas-only-webgl-math',
            severity: 'error',
            from: {
                path: '^packages/canvas/src',
            },
            to: {
                path: '^packages/(?!math|webgl-engine|canvas)',
            },
        },
        {
            name: 'cad-render-adapter-only-model-sketch-core-canvas-math',
            severity: 'error',
            from: {
                path: '^packages/cad-render-adapter/src',
            },
            to: {
                path: '^packages/(?!math|core|cad-model|sketch|canvas|cad-render-adapter)',
            },
        },
    ],
};
