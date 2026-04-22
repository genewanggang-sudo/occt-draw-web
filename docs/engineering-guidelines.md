# Engineering Guidelines

## Objectives

This repository is expected to grow into a multi-package frontend editor
workspace. The engineering baseline should optimize for:

- strict package boundaries
- predictable imports
- strong TypeScript safety
- low-friction collaboration across packages
- easy future adoption of CI and runtime tooling

## Tooling Baseline

- package manager: `pnpm`
- Node.js runtime baseline: `24.15.0 LTS`
- language baseline: TypeScript with `strict` enabled
- formatting: Prettier
- linting: ESLint flat config
- commit quality gates: `husky`, `lint-staged`, `commitlint`
- dependency governance: Dependabot
- cycle detection: dependency-cruiser
- line endings and indentation: `.editorconfig`
- indentation standard: 4 spaces, no tabs

## Coding Rules

### TypeScript

- Prefer explicit domain types over loose object literals.
- Use `type` imports for type-only dependencies.
- Do not use `any`.
- TypeScript type coverage is a hard requirement and must remain at `100%`.
- Type coverage is measured against all source files under `apps/**/src` and
  `packages/**/src`.
- Prefer strict compiler flags over defensive runtime guesswork where practical.
- Keep framework-free packages free of React and browser UI concerns.
- Avoid default exports in workspace packages unless there is a very strong reason.
- Do not use `export *`; package entrypoints must explicitly export each public
  symbol.

### Imports

- Import from workspace package entrypoints, not deep internal files from other packages.
- Cross-package imports should follow the dependency direction documented in
  `docs/architecture.md`.
- Prefer real workspace package resolution over cross-package TypeScript source
  aliases so package boundaries stay honest during type checking.
- Shared utilities belong in `packages/shared`, not copied into feature packages.
- A workspace package must never import another package through relative file
  paths such as `../../packages/foo/src/...`; this is treated as a lint error.
- Deep imports like `@occt-draw/core/some/internal/file` are forbidden; only the
  package entrypoint such as `@occt-draw/core` is allowed.
- Public package APIs must be declared explicitly in `src/index.ts`; wildcard
  re-export patterns are forbidden.

### Naming

- Package names use the `@occt-draw/*` scope.
- Public TypeScript types and interfaces use PascalCase.
- Functions use camelCase.
- Constants use UPPER_SNAKE_CASE only when they are true constants; otherwise use
  camelCase exported values.

### Comments

- Comments should explain intent, invariants, or non-obvious constraints.
- Avoid narrating obvious code line by line.
- TODO comments should be specific and actionable.

## Package Boundaries

- `shared` must remain dependency-free within the workspace.
- `config` must remain tooling-only and must not depend on runtime workspace packages.
- `core` is editor-domain logic only.
- `renderer` owns drawing and viewport behavior, not document mutation policy.
- `protocol` owns message contracts and event payload shapes.
- `worker-client` and `worker-runtime` must be the only layers aware of worker
  transport mechanics.
- `wasm-bridge` is the only layer allowed to know the external Wasm integration
  details.

## Dependency Direction

The current dependency direction is enforced in ESLint:

- `shared` -> no workspace package dependencies
- `config` -> no runtime workspace package dependencies
- `protocol` -> `shared`
- `core` -> `shared`
- `renderer` -> `shared`, `core`
- `wasm-bridge` -> `shared`, `protocol`
- `worker-client` -> `shared`, `protocol`
- `worker-runtime` -> `shared`, `protocol`, `wasm-bridge`
- `apps/web` -> may compose runtime-facing workspace packages

## Script Conventions

Root scripts are the source of truth:

- `pnpm lint`
- `pnpm lint:fix`
- `pnpm typecheck`
- `pnpm type-coverage`
- `pnpm depcruise`
- `pnpm build`
- `pnpm clean`
- `pnpm format`
- `pnpm format:check`
- `pnpm check`

Each workspace package should provide the same core script names where practical
so recursive commands stay predictable.

## Future CI Gate

When CI is introduced, the minimum required checks should be:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm type-coverage`
5. `pnpm depcruise`
6. `pnpm build`

Tests can be added once the first real runtime modules are in place.
