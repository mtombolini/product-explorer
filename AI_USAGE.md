# AI usage

Generative AI was used throughout this project, as the challenge requires.
This file records, phase by phase, which tool was used, the prompt or
workflow, what was accepted, rejected or changed, and how the output was
verified. It is updated during the work, not written at the end.

## Tools

- **Claude Code** (Anthropic, model Claude Opus), run as a coding agent with
  access to the repository, a shell and Docker.
- The agent orchestrated sub-agents: one builder per phase, followed by
  independent reviewers that read the result with different concerns
  (requirements, correctness, style, security, accessibility) and a fixer
  that applied only the findings that were confirmed.

## Working method

1. The candidate wrote a master prompt with the working agreement, the fixed
   technical decisions (stack, layers, import behaviour, table design, API
   shape, state management, testing scope) and the interface direction.
2. The agent read the challenge statement and the master prompt and produced
   `docs/SPEC.md`: a requirements checklist, assumptions, conflicts and a
   design contract.
3. Each phase was built against that contract and closed only after lint,
   tests and a Docker Compose run.
4. Decisions were recorded in `docs/DECISIONS.md` as they were taken.

Representative excerpts from the master prompt:

> Optimise for code that is simple, conventional and easy to explain. Prefer
> boring and explicit over clever.

> Verify, do not assume. Check the current stable version and docs of each
> library before pinning it. Before declaring a phase done, run lint, tests
> and a clean `docker compose up`, and report what you actually ran and the
> result.

> Idempotent: upsert keyed on the Fake Store product id. Running it twice
> must not duplicate or corrupt data.

## Phase 0: specification

- **Prompt or workflow.** "Read the statement completely, list your
  understanding, the conflicts and the open questions, then write the
  specification before any code."
- **Accepted.** The requirements checklist and the design contract in
  `docs/SPEC.md`.
- **Rejected or changed.**
  - The latest TypeScript (7.0.2) and ESLint (10.12.0) were rejected after
    checking peer dependency ranges on the registry: the lint plugins do not
    support them yet. Pinned to 6.0.3 and 9.39.5.
  - Publishing the PostgreSQL port was rejected after finding port 5432
    already in use on the development machine.
  - Checking images with `HEAD` requests was rejected: the image host
    answered `HEAD` with HTTP 403 (bot challenge) while `GET` returned the
    file.
  - SQLite for backend tests was rejected in favour of PostgreSQL, because
    the upsert relies on `ON CONFLICT`.
- **Verification.**
  - Library versions and peer dependency ranges read from the npm and PyPI
    registries, not from the model's memory.
  - Fake Store API called directly: 20 products, four categories, the
    payload shape used in the specification, and all 20 images downloadable.
  - `docker compose version` and `docker-compose --version` both answered
    with Compose v2.
