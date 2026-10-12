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

## Phase 1: infrastructure skeleton

### D-009 Nginx resolves the backend at request time

- **Context.** Nginx normally resolves the host name in `proxy_pass` once,
  when it starts. A rebuilt backend container can come back with another IP
  address, and the proxy would keep answering 502 until Nginx is restarted.
- **Decision.** `resolver 127.0.0.11 valid=10s` (Docker's embedded DNS) and
  a variable in `proxy_pass`, which makes Nginx look the name up while it
  handles requests.
- **Alternatives.** A plain `proxy_pass http://backend:8000` and restarting
  the frontend after every backend rebuild; an `upstream` block.
- **Trade-off.** Two extra lines that need a comment, and up to 10 seconds
  of 502 answers after the backend changes address.

### D-010 Minimal health check until the database is used

- **Context.** The health contract of SPEC 7.6 reports the database and the
  catalogue, which do not exist in the code yet.
- **Decision.** `/health` returns only `{"status": "ok"}` in this phase, and
  the backend receives `DATABASE_URL` and waits for a healthy `db` without
  connecting to it. The full contract arrives with the API phase.
- **Alternatives.** Add the database driver and a connection check now.
- **Trade-off.** For one phase a healthy backend does not prove the database
  is reachable. The Compose wiring is already final, so later phases change
  code, not infrastructure.

### D-011 Static placeholder instead of an early Vite project

- **Context.** The proxy has to be shown working before the frontend exists.
- **Decision.** The frontend image is the `nginx:1.30-alpine` runtime stage
  with the final Nginx configuration and a static page in
  `frontend/placeholder/` that calls `/api/hello`. The frontend phase adds
  the Node build stage and deletes the placeholder.
- **Alternatives.** Scaffold the Vite project now; test the proxy with
  `curl` only.
- **Trade-off.** A few throwaway lines of HTML and JavaScript, in exchange
  for an Nginx configuration that is verified now and not touched later.

### D-012 Health checks use tools already in the images

- **Context.** `python:3.13-slim` ships without `curl` or `wget`.
- **Decision.** The backend health check is a Python one-liner with
  `urllib`; the frontend uses the BusyBox `wget` of the Alpine image; the
  database uses `pg_isready`. `start_interval` polls every 2 seconds during
  start-up so that `docker compose up --wait` finishes quickly.
- **Alternatives.** Install `curl` in the backend image.
- **Trade-off.** A longer health check line in the Compose file, no extra
  package in the runtime image.

### D-013 `add_header_inherit merge` for the security headers

- **Context.** In Nginx a location that declares its own `add_header` (the
  cache rules here) stops inheriting the headers of the server block, so the
  security headers would silently disappear from those responses.
- **Decision.** Declare the security headers once in the server block and
  set `add_header_inherit merge` (available since Nginx 1.29.3).
- **Alternatives.** Repeat the three headers in every location; move them to
  an included snippet.
- **Trade-off.** Depends on a recent Nginx, which the pinned
  `nginx:1.30-alpine` image guarantees. No Content-Security-Policy is set
  yet: it has to be written against the real frontend build.

## Phase 2: backend data

### D-014 Image checks split between the client and the image storage

- **Context.** SPEC 7.5 step 4 lists three checks for an image: same host
  as the source, `image/*` content type and a size limit of 5 MB.
- **Decision.** The client refuses a URL on another host before any
  request, and does not follow redirects. The image storage checks what
  concerns the file: an allow-list of content types (JPEG, PNG, WebP, GIF)
  that also gives the extension, a non-empty body and the size limit. The
  file is written to a temporary name and renamed.
- **Alternatives.** All three checks in the service; accepting any
  `image/*` type and guessing the extension from the URL; streaming the
  body to stop at 5 MB.
- **Trade-off.** SVG is refused (it can carry scripts), and the size is
  checked after the body was read into memory, which is acceptable for a
  source that is trusted and small. The content is not inspected, only the
  declared type.

### D-015 The upsert and each image path are committed separately

- **Context.** The import writes the products and then downloads the
  images, which is slow and can fail half way.
- **Decision.** The repository commits the upsert in one transaction, and
  commits each `image_path` right after its file is stored. A record whose
  `external_id` repeats inside one answer is skipped, because PostgreSQL
  rejects an `ON CONFLICT` statement that touches the same row twice.
- **Alternatives.** One transaction for the whole run; committing in the
  service.
- **Trade-off.** A run that is interrupted leaves products without image,
  never an image path without file, and the next run downloads only what
  is missing. The repository owns `commit`, so it is not a pure query
  object. `INSERT ... ON CONFLICT` consumes a sequence value for every
  row, so the generated `id` of a product added later is not contiguous.

### D-016 Start period sized for the worst-case first import

- **Context.** The API starts after the import, and the health check must
  not fail while a slow import is still running.
- **Decision.** `start_period: 180s` on the backend. With the defaults one
  request that never answers takes about 17 seconds (three attempts of
  5 seconds plus 0.5 and 1 second of backoff). The product list is one
  request, and three image failures in a row stop the downloads.
  `start_interval: 2s` reports a normal start as healthy within seconds.
- **Alternatives.** Run the import in the background after the API
  started; no retries for images.
- **Trade-off.** A backend that is really broken is reported unhealthy
  only after about four minutes. Failures that alternate with successes
  are not bounded by the three-in-a-row rule; 180 seconds covers about
  nine of them.

### D-017 Test stage in the backend image, test database on the same server

- **Context.** Tests must run with one Docker command, against PostgreSQL,
  and must never touch the application data.
- **Decision.** The Dockerfile has `base`, `test` and `runtime` stages;
  `runtime` is last and has no development dependency. The `backend-test`
  service (profile `test`) builds the `test` stage and uses the database
  `${POSTGRES_DB}_test` on the `db` service. `conftest.py` stops the run
  when the name does not end in `_test`, creates the database when it is
  missing, applies the migrations once and truncates the table before each
  test.
- **Alternatives.** A second PostgreSQL container for tests; SQLite; one
  transaction per test that is rolled back.
- **Trade-off.** No fourth container and the real upsert syntax is
  tested, at the cost of sharing the server with the application. The
  rollback approach was not used because the repository commits (D-015).

## Phase 3: backend API

### D-018 Unexpected errors are answered by the request middleware

- **Context.** A 500 must use the error envelope, carry `X-Request-ID`, be
  logged once with the request id and reveal nothing internal.
- **Decision.** The request middleware wraps the rest of the application in
  a `try`. An exception that no handler claimed is logged with its
  traceback and answered with the generic envelope in the same function
  that sets the request id and writes the access log line.
- **Alternatives.** A handler registered for `Exception`; a pure ASGI
  middleware.
- **Trade-off.** A handler for `Exception` runs in the outermost framework
  layer, after the middleware has finished, so the response would miss the
  header and the access line. One function doing three related things is
  easier to follow than two layers that depend on each other's order.

### D-019 Upper bounds on `page` and on the product id

- **Context.** The specification only asked for `page >= 1` and a positive
  id. A very large number reached PostgreSQL and failed there, which
  would have been a 500 caused by user input.
- **Decision.** `page` is limited to 1,000,000 and the product id to the
  range of the `INTEGER` column. Values outside are a 422.
- **Alternatives.** Catch the database error and translate it.
- **Trade-off.** Two more constants. In exchange, invalid input is always
  rejected at the edge and never becomes a query.

### D-020 A separate health service

- **Context.** `/health` must answer 503 when the database is down, and the
  API layer must not know about SQLAlchemy.
- **Decision.** `HealthService` counts the products through the repository
  and turns a database error into a status object. The route only maps
  that status to 200 or 503.
- **Alternatives.** Catch the database exception in the route; add the
  check to `ProductService`.
- **Trade-off.** One small extra class, and the layering rule holds
  without exceptions.

### D-021 Response models are built explicitly from ORM rows

- **Context.** The API exposes `image_url`, while the table stores
  `image_path`, and it must hide `external_id` and the timestamps.
- **Decision.** `ProductResponse.from_product` copies the public fields one
  by one and builds the image URL.
- **Alternatives.** Pydantic `from_attributes` with a computed property on
  the ORM model.
- **Trade-off.** A few more lines, but the mapping between the table and
  the contract is visible in one place and cannot expose a new column by
  accident.

### D-022 `httpx2` as a development dependency

- **Context.** The test client of FastAPI 0.143 (Starlette 1.7) warns that
  using it with `httpx` is deprecated and asks for `httpx2`.
- **Decision.** `httpx2` is pinned in `requirements-dev.txt` for the test
  client only. The Fake Store client stays on `httpx` 0.28.1.
- **Alternatives.** Silence the warning; move the Fake Store client to
  `httpx2` as well.
- **Trade-off.** Two HTTP libraries in the test image. The runtime image
  is unchanged, and the import code keeps the library it was built and
  tested with.

