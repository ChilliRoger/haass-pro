# ADR-009: Node.js 24 LTS Runtime

Status: Accepted
Date: 2026-09-30
Deciders: Project team

## Context

Node.js 20 reached end-of-life on 30 April 2026. A new runtime version must be chosen.

## Decision

Use Node.js 24 LTS (Active LTS status from October 2025 until April 2028). Set in:
- package.json engines: {"node": ">=24.0.0"}
- Dockerfile: pinned to a specific node:24.x.y-alpine patch tag
- GitHub Actions: node-version: "24"

## Rationale

- Node.js 20 is end-of-life; using it would be a security risk in a production-standard project.
- Node.js 22 enters maintenance mode in October 2025; Node 24 is the current Active LTS.
- Node 24 includes native fetch (no node-fetch dependency), native test runner (node:test,
  no Jest/Mocha), and enhanced performance.
- Using built-in fetch and node:test minimises dependencies, reducing the attack surface and
  keeping npm audit clean.

## Consequences

- The Dockerfile must pin the exact patch version of node:24-alpine after verifying it exists
  on Docker Hub. This is done in Phase 9.
- All dependencies must be compatible with Node.js 24 (verified by npm audit and CI).
- The engines field enforces the version constraint; Render and local dev both must use Node 24.
