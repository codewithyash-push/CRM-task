# App Compiler Platform

Compiler-style system for converting open-ended software requests into strict, validated, executable app configuration.

## What It Builds

The pipeline converts:

```text
Natural language -> intent IR -> system design -> UI/API/DB/Auth schemas -> repair -> runtime simulation
```

It produces one JSON contract with:

- UI pages, routes, components, and API bindings
- API endpoints with methods, request/response refs, and auth requirements
- Database tables, fields, types, primary keys, and relations
- Auth roles and permissions
- Business rules for auth, RBAC, premium gating, and analytics
- Assumptions, warnings, validation result, repair log, and execution plan

## Run Locally

```bash
npm install
npm start
```

Open `http://localhost:4100`.

If dependencies are already installed at the workspace root, this app can also use the local Express install.

## Evaluation

```bash
npm run eval
```

The evaluation dataset includes 10 realistic product prompts and 10 edge cases covering vague, conflicting, and incomplete inputs. Metrics include success rate, retries, failure types, latency, clarification rate, and cost/quality tradeoff notes.

## Architecture

- `src/pipeline/stages.js`: deterministic intent extraction, architecture design, schema generation
- `src/pipeline/validator.js`: strict contract and cross-layer consistency checks
- `src/pipeline/repair.js`: targeted repair for missing top-level blocks, missing keys, invalid references, hallucinated UI fields, and invalid permissions
- `src/pipeline/compiler.js`: orchestration, metrics, clarification policy, and cost estimate
- `src/runtime/simulator.js`: execution awareness checks and generated migration/route/page plan
- `src/evaluation`: prompt dataset and metrics runner
- `public`: reviewer-facing interface

## Reliability Choices

The system is deliberately modular. Each stage emits structured objects, then validation checks cross-layer contracts:

- API tables must exist in DB schema
- UI endpoints must exist in API schema
- UI fields must exist on the endpoint's backing DB table
- Auth permissions must reference real resources
- Tables must have primary keys and supported field types

Repair is selective. It removes or fixes only the broken parts rather than blindly retrying the entire generation.

## Production Upgrade Path

This demo uses deterministic local generation so reviewers get consistent output without API keys. In production, each stage can be replaced with constrained LLM generation using JSON schema output, low temperature, and stage-specific repair prompts. The validator and runtime simulator stay as the hard control layer.
