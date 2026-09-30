# ADR-007: No LLM in the Recommendation Path

Status: Accepted
Date: 2026-09-30
Deciders: Project team

## Context

Generating a personalised travel recommendation from weather data could be done by sending
the data to a large language model (LLM) API. This would produce fluent, creative text.

## Decision

The recommendation engine is entirely deterministic and rule-based. No LLM API call is made.
Thresholds, rules, and output text are defined in source code as named constants.

## Rationale

- Determinism: the same inputs must always produce the same recommendation. LLMs are
  non-deterministic. Unit tests would be impossible without mocking the LLM (which
  violates the no-mocks policy).
- No external secret or credit card is required for an LLM API subscription.
- The recommendation engine can be fully unit-tested with plain literal inputs.
- Creativity is achieved through combinatorial rules and persona-aware tailoring (trip type,
  budget, special needs), not LLM fluency.
- Latency and cost of an LLM API call add risk to the 15-second webhook response window.

## Consequences

- Output text is authored in code, not generated dynamically. Changes require a code deploy.
- All recommendation logic is auditable and traceable to specific rules in the source.
