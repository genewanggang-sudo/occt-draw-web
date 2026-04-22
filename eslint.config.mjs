import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

const typedFiles = [
    'apps/**/src/**/*.ts',
    'apps/**/src/**/*.tsx',
    'packages/**/src/**/*.ts',
    'packages/**/src/**/*.tsx',
];

const withFiles = (configs) =>
    configs.map((config) => ({
        ...config,
        files: typedFiles,
    }));

export default tseslint.config(
    {
        ignores: [
            '**/dist/**',
            '**/coverage/**',
            '**/node_modules/**',
            '**/*.d.ts',
            '**/*.tsbuildinfo',
        ],
        linterOptions: {
            reportUnusedDisableDirectives: 'error',
        },
    },
    {
        ...js.configs.recommended,
        files: ['eslint.config.mjs'],
        languageOptions: {
            ...js.configs.recommended.languageOptions,
            sourceType: 'module',
        },
    },
    ...withFiles(tseslint.configs.recommendedTypeChecked),
    ...withFiles(tseslint.configs.strictTypeChecked),
    ...withFiles(tseslint.configs.stylisticTypeChecked),
    eslintConfigPrettier,
    {
        files: typedFiles,
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'inline-type-imports',
                },
            ],
            '@typescript-eslint/consistent-type-exports': 'error',
            '@typescript-eslint/no-import-type-side-effects': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            'no-restricted-exports': [
                'error',
                {
                    restrictedNamedExports: ['default'],
                },
            ],
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@occt-draw/*/*'],
                            message:
                                'Workspace packages must be imported through their public package entrypoint only.',
                        },
                        {
                            group: [
                                '../../packages/*',
                                '../../../packages/*',
                                '../../../../packages/*',
                            ],
                            message:
                                'Do not import another workspace package through relative filesystem paths. Use its package name instead.',
                        },
                        {
                            group: [
                                '../*/src/*',
                                '../../*/src/*',
                                '../../../*/src/*',
                                '../../../../*/src/*',
                            ],
                            message:
                                'Do not import source files from another package directly. Only import through that package public entrypoint.',
                        },
                    ],
                },
            ],
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'ExportAllDeclaration',
                    message:
                        'Do not use `export *`. Package public APIs must explicitly export each symbol.',
                },
            ],
            curly: ['error', 'all'],
            eqeqeq: ['error', 'always'],
            'no-console': [
                'error',
                {
                    allow: ['warn', 'error'],
                },
            ],
        },
    },
    {
        files: ['packages/shared/src/**/*.ts', 'packages/shared/src/**/*.tsx'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@occt-draw/*'],
                            message:
                                '`@occt-draw/shared` is the bottom layer and must not depend on other workspace packages.',
                        },
                        {
                            group: [
                                '../../packages/*',
                                '../../../packages/*',
                                '../../../../packages/*',
                            ],
                            message:
                                '`@occt-draw/shared` must not import other workspace packages via relative paths.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['packages/config/src/**/*.ts', 'packages/config/src/**/*.tsx'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@occt-draw/*'],
                            message:
                                '`@occt-draw/config` should remain tooling-focused and must not depend on runtime workspace packages.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['packages/protocol/src/**/*.ts', 'packages/protocol/src/**/*.tsx'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@occt-draw/config',
                                '@occt-draw/core',
                                '@occt-draw/renderer',
                                '@occt-draw/wasm-bridge',
                                '@occt-draw/worker-client',
                                '@occt-draw/worker-runtime',
                                '@occt-draw/web',
                            ],
                            message:
                                '`@occt-draw/protocol` may only depend on `@occt-draw/shared` within the workspace.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['packages/core/src/**/*.ts', 'packages/core/src/**/*.tsx'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@occt-draw/config',
                                '@occt-draw/protocol',
                                '@occt-draw/renderer',
                                '@occt-draw/wasm-bridge',
                                '@occt-draw/worker-client',
                                '@occt-draw/worker-runtime',
                                '@occt-draw/web',
                            ],
                            message:
                                '`@occt-draw/core` may only depend on `@occt-draw/shared` within the workspace.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['packages/renderer/src/**/*.ts', 'packages/renderer/src/**/*.tsx'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@occt-draw/config',
                                '@occt-draw/protocol',
                                '@occt-draw/wasm-bridge',
                                '@occt-draw/worker-client',
                                '@occt-draw/worker-runtime',
                                '@occt-draw/web',
                            ],
                            message:
                                '`@occt-draw/renderer` may only depend on `@occt-draw/shared` and `@occt-draw/core` within the workspace.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['packages/wasm-bridge/src/**/*.ts', 'packages/wasm-bridge/src/**/*.tsx'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@occt-draw/config',
                                '@occt-draw/core',
                                '@occt-draw/renderer',
                                '@occt-draw/worker-client',
                                '@occt-draw/worker-runtime',
                                '@occt-draw/web',
                            ],
                            message:
                                '`@occt-draw/wasm-bridge` may only depend on `@occt-draw/shared` and `@occt-draw/protocol` within the workspace.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['packages/worker-client/src/**/*.ts', 'packages/worker-client/src/**/*.tsx'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@occt-draw/config',
                                '@occt-draw/core',
                                '@occt-draw/renderer',
                                '@occt-draw/wasm-bridge',
                                '@occt-draw/worker-runtime',
                                '@occt-draw/web',
                            ],
                            message:
                                '`@occt-draw/worker-client` may only depend on `@occt-draw/shared` and `@occt-draw/protocol` within the workspace.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['packages/worker-runtime/src/**/*.ts', 'packages/worker-runtime/src/**/*.tsx'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@occt-draw/config',
                                '@occt-draw/core',
                                '@occt-draw/renderer',
                                '@occt-draw/worker-client',
                                '@occt-draw/web',
                            ],
                            message:
                                '`@occt-draw/worker-runtime` may only depend on `@occt-draw/shared`, `@occt-draw/protocol`, and `@occt-draw/wasm-bridge` within the workspace.',
                        },
                    ],
                },
            ],
        },
    },
);
