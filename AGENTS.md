# AGENTS

## Engineering Collaboration Rules

- This project is aiming for a professional CAD rendering engine. When an implementation exposes an engine capability gap, do not default to bypassing the feature, silently dropping behavior, or treating a temporary workaround as the final answer.
- For rendering-engine issues, first explain the root cause, then present concrete solution paths with tradeoffs. Include at least:
    - the correct long-term engine fix;
    - a safe short-term mitigation if one is useful;
    - risks, expected scope, and verification steps.
- Let the user decide between the solution paths when the choice affects engine architecture, rendering quality, or long-term maintainability.
- Temporary mitigations must be explicitly labeled as temporary and followed by a proposed durable fix.
- Do not remove visible behavior such as labels, highlights, picking, or overlays just because the current engine path fails. If a capability is missing, propose how to add that capability.

## Answer Structure Preference

- For architecture, implementation strategy, rendering, or product-design answers, start with the big direction and the intended design before listing implementation details.
- When a diagram can clarify the design, include a small Mermaid diagram near the top before drilling into details.
- Keep the hierarchy clear: direction first, then system design, then module-level changes, then verification and risks.
- Make decision points easy to scan. Avoid opening with a long flat list of low-level details unless the user specifically asks for exhaustive detail first.

## Frontend Dev Server Rule

- Before starting a frontend dev server, first check whether the project already has one running.
- Prefer reusing the existing frontend URL for testing instead of starting another server on a new port.
- Keep one stable frontend test address whenever possible so browser testing, screenshots, and user verification stay on the same page.

## Reference Product Verification

- When matching Onshape behavior, do not rely on visual guesses or memory if the behavior can materially affect CAD interaction design.
- When necessary, use the Chrome plugin with the user's authenticated Chrome session to open a real Onshape project and verify the observable behavior directly.
- Treat Onshape internals as unknowable unless directly inspectable. Report confirmed observable behavior separately from implementation inferences.
- Prefer direct comparison evidence such as screenshots, pixel checks, DOM/canvas observations, and repeatable interaction steps before deciding that local behavior matches Onshape.
