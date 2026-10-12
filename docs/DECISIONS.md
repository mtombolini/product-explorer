# Decision log

Short records of the decisions that shape the solution. Each entry has the
context, the decision, the alternatives that were considered and the
trade-off that was accepted. New entries are appended as the work advances.

## Phase 0: specification

### D-001 Sequential phases with a written specification first

- **Context.** The solution is defended in a live walkthrough, so every part
  must be explainable and the history must tell a clear story.
- **Decision.** Write `docs/SPEC.md` first and build in the phase order it
  lists, with lint, tests and a Compose run at the end of each phase.
- **Alternatives.** Build backend and frontend in parallel; start coding and
  document afterwards.
- **Trade-off.** Slower wall-clock time in exchange for a linear history and
  a contract that both sides are built against.

### D-002 Pin the newest versions that the toolchain supports

- **Context.** On the day the work started the registries listed
  TypeScript 7.0.2 and ESLint 10.12.0 as latest.
- **Decision.** Pin TypeScript 6.0.3 and ESLint 9.39.5. Every other library
  is pinned to its latest stable release.
- **Alternatives.** Use the latest of everything; drop accessibility linting.
- **Trade-off.** `typescript-eslint` 8.71.1 declares TypeScript `<6.1.0` and
  `eslint-plugin-jsx-a11y` 6.10.2 declares ESLint up to 9. Staying one major
  behind keeps type-aware and accessibility linting, which matter more here
  than the newest compiler.

### D-003 `.env` is optional

- **Context.** The statement asks for a single Docker Compose command and
  for configuration outside the source code.
- **Decision.** `docker-compose.yml` reads every value from the environment
  with a local-only default. `.env.example` documents the variables; copying
  it to `.env` is only needed to change them.
- **Alternatives.** Make `.env` mandatory; hard-code values in the images.
- **Trade-off.** Local default credentials are visible in the Compose file.
  They are development values, not secrets, and production must inject real
  ones.

### D-004 The database port is not published

- **Context.** Port 5432 was already taken on the development machine, which
  is common for reviewers too. A port clash would break `docker compose up`.
- **Decision.** Only the frontend (8080) and the API (8000, loopback) are
  published, and both ports are configurable.
- **Alternatives.** Publish 5432; publish on an unusual port.
- **Trade-off.** Inspecting the database needs `docker compose exec db psql`
  instead of a local client.

### D-005 Test runners behind a Compose profile

- **Context.** Backend tests need PostgreSQL, and reviewers should not need
  a local Python or Node toolchain to run tests.
- **Decision.** `backend-test` and `frontend-test` are one-off jobs under the
  Compose profile `test`. `docker compose up` never starts them.
- **Alternatives.** SQLite for tests; development dependencies inside the
  runtime image; publishing the database port and testing from the host.
- **Trade-off.** Two extra entries in the Compose file. In exchange, tests
  run against the same database engine as production and the runtime image
  stays free of development tools.

### D-006 Full products in the list response

- **Context.** "Navigate between views without unnecessary data requests."
- **Decision.** `GET /api/products` returns the same product shape as the
  detail endpoint, so the detail page can render from the store.
- **Alternatives.** A lighter summary shape for lists plus one request per
  detail.
- **Trade-off.** Slightly larger list payloads. With 20 short products this
  is negligible; a large catalogue would switch to summaries.

### D-007 Synchronous SQLAlchemy

- **Context.** The API does simple reads on a small table.
- **Decision.** Synchronous SQLAlchemy sessions with `psycopg` 3. FastAPI
  runs these endpoints in its thread pool.
- **Alternatives.** Async engine and sessions.
- **Trade-off.** Lower theoretical concurrency, much simpler code and tests.

### D-008 Product images are stored by our backend

- **Context.** The browser must only talk to our API, and images are part of
  what the browser loads.
- **Decision.** The import downloads each image into a volume and the
  backend serves it under `/images`. Only `GET` is used because the image
  host answers `HEAD` with a bot challenge.
- **Alternatives.** Hot-link Fake Store images; proxy images on demand.
- **Trade-off.** A longer first import and a volume to manage. In exchange
  the running application has no dependency on Fake Store at all.
