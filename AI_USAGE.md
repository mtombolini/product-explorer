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

## Phase 1: infrastructure skeleton

- **Prompt or workflow.** A builder sub-agent received the phase scope from
  `docs/SPEC.md` (sections 7.2, 7.3 and 8): "Build only the skeleton that
  proves the three containers are wired together", with the instruction to
  verify from a clean state and report the real output.
- **Accepted.**
  - The backend skeleton: application factory, a temporary `/api/hello`, a
    minimal `/health`, the image on `python:3.13-slim` running as a
    non-root user, and the `ruff` and `pytest` configuration.
  - The Nginx configuration (single-page application fallback, proxy for
    `/api/` and `/images/`, request-time DNS resolution, `X-Request-ID`,
    security headers, gzip, cache rules) and a static placeholder page.
  - `docker-compose.yml` with three services, health checks and start
    order through health conditions, and `.env.example`.
- **Rejected or changed.**
  - A plain `proxy_pass http://backend:8000` was rejected: Nginx would keep
    the IP address it resolved at start-up (D-009).
  - Installing `curl` in the backend image only for the health check was
    rejected in favour of a Python one-liner (D-012).
  - Repeating the security headers in every location was replaced with
    `add_header_inherit merge` (D-013).
  - A Content-Security-Policy header was left out until the real frontend
    build exists.
  - The first version of the rebuild check was not conclusive: the
    recreated backend received the same IP address as before. The check
    was repeated with a temporary container holding the old address, so
    that the backend came back on a different one.
- **Verification.**
  - `uvx ruff@0.17.0 check backend/`: "All checks passed!".
    `uvx ruff@0.17.0 format --check backend/`: "5 files already formatted".
  - `docker compose config` with no `.env` file: exit code 0, with the
    default `DATABASE_URL`, the API on `127.0.0.1:8000`, the frontend on
    8080 and no published database port.
  - `docker compose down -v` followed by
    `docker compose up --build -d --wait`: exit code 0, `db`, `backend`
    and `frontend` reported healthy.
  - `docker-compose up -d` (hyphenated name): exit code 0, three services
    running and healthy.
  - `curl http://localhost:8080/`: 200, the placeholder page, with
    `Cache-Control: no-cache` and the three security headers.
  - `curl http://localhost:8080/api/hello`: 200,
    `{"message":"Hello from the Product Explorer API"}`.
  - `curl http://127.0.0.1:8000/health`: 200, `{"status":"ok"}`.
  - `curl http://localhost:8080/products/3`: 200 `text/html` (fallback);
    `curl http://localhost:8080/assets/missing.js`: 404.
  - Backend removed: `/api/hello` through the frontend answered 502.
    Backend rebuilt and started again on a different address (172.29.0.3
    before, 172.29.0.5 after): the first request through the frontend
    answered 200, and the start time of the frontend container had not
    changed.
  - Inside the containers: the backend runs as user `app` with fastapi
    0.143.0 and uvicorn 0.54.0; Nginx reports version 1.30.5.
  - Not verified with a live request: the `X-Request-ID` value received by
    the backend (it does not read the header yet; only the loaded Nginx
    configuration was checked with `nginx -T`) and gzip (the responses of
    this phase are smaller than the 1024 byte threshold).
  - Environment note: on the development machine the Docker credential
    helper (`docker-credential-desktop`) did not answer, which blocked
    image pulls. The Docker commands above were run with `DOCKER_CONFIG`
    pointing to a temporary client configuration without a credential
    store. Nothing in the repository depends on it.
