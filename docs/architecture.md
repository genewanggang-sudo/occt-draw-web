# Architecture Draft

## Current Direction

This repository is organized as a lightweight `pnpm workspace` monorepo.
At this stage we are intentionally defining stable package boundaries before
bringing in the actual frontend runtime stack.

The current goal is to keep these concerns separate:

- application assembly
- editor domain logic
- rendering
- worker communication
- wasm integration
- shared types and configuration

## Workspace Layout

```txt
apps/
  web/                # future browser app entry
packages/
  config/             # shared toolchain config exports
  core/               # drawing document and editor domain
  protocol/           # main thread <-> worker message contracts
  renderer/           # canvas rendering and viewport logic
  shared/             # low-level shared types and utilities
  wasm-bridge/        # wrapper around occt-draw-core wasm APIs
  worker-client/      # main-thread API for talking to workers
  worker-runtime/     # worker-side dispatch and handlers
docs/
  architecture.md
```

## Dependency Rules

Dependency direction should remain narrow and predictable:

- `shared` depends on nothing else in the workspace
- `protocol` may depend on `shared`
- `core` may depend on `shared`
- `renderer` may depend on `shared` and `core`
- `wasm-bridge` may depend on `shared` and `protocol`
- `worker-runtime` may depend on `shared`, `protocol`, and `wasm-bridge`
- `worker-client` may depend on `shared` and `protocol`
- `apps/web` may compose all runtime-facing packages

Non-goals:

- no React dependency in `core`
- no direct Wasm access from `apps/web`
- no UI concern inside `worker-runtime`
- no `postMessage` protocol literals spread across multiple packages

## Package Roles

### `packages/shared`

Owns small, stable, framework-free utilities:

- ids
- primitive geometry types
- common constants
- error categories

### `packages/protocol`

Defines worker communication contracts:

- request and response envelopes
- event names
- payload typing
- serialization-safe message boundaries

### `packages/core`

Holds editor domain state and behaviors:

- drawing document model
- entities and metadata
- selection state
- command stack
- undo and redo boundaries

### `packages/renderer`

Owns canvas-facing rendering logic:

- viewport state
- draw pipeline
- hit testing
- screen-to-world transforms

### `packages/worker-client`

Provides a browser-side service API that hides worker messaging details.

### `packages/worker-runtime`

Provides worker entry orchestration and request dispatch.

### `packages/wasm-bridge`

Contains the only code that should know concrete `occt-draw-core` loading and
invocation details.

### `packages/config`

Stores reusable project configuration exports as the workspace grows.

## Recommended Next Implementation Order

1. Flesh out `protocol` request and response types.
2. Decide how worker communication is abstracted.
3. Add a minimal document model in `core`.
4. Add a minimal viewport contract in `renderer`.
5. Create the first `apps/web` shell after the runtime boundary is stable.

## Decisions Already Made

- workspace package manager: `pnpm`
- repository shape: lightweight monorepo
- current phase: architecture-first skeleton, not runtime-first setup

## Decisions Still Open

- worker abstraction style
- state management style inside the future app shell
- whether UI components should live in a dedicated package from day one
