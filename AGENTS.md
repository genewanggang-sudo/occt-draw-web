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
