# AI usage log

The detailed record behind [AI_USAGE.md](../AI_USAGE.md): for every phase,
the prompt or workflow, what was accepted, what was rejected or changed,
and the commands that were run with their real results. It was written
during the work, one section at a time.

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

## Phase 2: backend data

- **Prompt or workflow.** A builder sub-agent received the phase scope from
  `docs/SPEC.md` (sections 7.3, 7.4, 7.5, 7.7 and the import rows of 7.10):
  "Build the data layer and the Fake Store import. Do not build the public
  product endpoints yet". The code was written and committed in a first
  run. A second run read every file of the phase, ran the verification
  below from a clean state and wrote this section.
- **Accepted.**
  - Settings, database session and a JSON log formatter on the standard
    `logging` module.
  - The `Product` model with its check constraints and one hand-written
    Alembic migration (`0001_create_products`).
  - The Fake Store schema and an `httpx` client with a timeout, an
    explicit retry loop with backoff and an injectable transport.
  - The product repository (upsert on `external_id`), the image storage
    and `CatalogueImportService` with one private method per step.
  - The seed command, `entrypoint.sh`, a Dockerfile with `base`, `test`
    and `runtime` stages, and the `backend-test` Compose service.
  - Ten import tests on PostgreSQL with `httpx.MockTransport`.
- **Rejected or changed.**
  - Accepting any `image/*` content type was replaced with an allow-list
    of four types that also gives the file extension; SVG is refused
    (D-014).
  - One transaction for the whole run was rejected: the upsert and each
    image path are committed separately (D-015).
  - A malformed image URL made `httpx` raise before any request. It is
    now counted as one failed image.
  - Run with `python -m`, the seed command logged under the name
    `__main__`. The logger name is now fixed to `app.commands.seed`.
  - A rollback per test was not used because the repository commits; the
    table is truncated before each test (D-017).
- **Verification.**
  - `docker compose --profile test run --rm --build backend-test`:
    "10 passed". The same command with `docker-compose`: "10 passed".
  - In the test image, `ruff check .`: "All checks passed!";
    `ruff format --check .`: "30 files already formatted".
  - `docker compose down -v` followed by
    `docker compose up --build -d --wait`: exit code 0, three services
    healthy. The log showed the migration and "Catalogue import finished"
    with fetched 20, imported 20, skipped 0, images downloaded 20, images
    failed 0. `select count(*)` on `products`: 20. `ls /data/images` in
    the backend container: 20 files, in a directory owned by `app`.
  - `python -m app.commands.seed` run twice by hand: exit code 0 both
    times, images downloaded 0, still 20 rows with ids 1 to 20 (the same
    checksum of the id and `external_id` pairs), `updated_at` moved to the
    time of each run, still 20 files.
  - `docker compose restart backend`: the log showed "Import skipped: the
    catalogue already has products" with `product_count` 20.
  - Clean state with `FAKESTORE_BASE_URL=http://10.255.255.1`:
    `docker compose up -d --wait` ended with exit code 0. The log showed
    three "Fake Store request failed" lines (`ConnectTimeout`), "Import
    failed: Fake Store is unavailable" and the entrypoint message; Uvicorn
    started about 17 seconds after the first attempt. The table had 0
    rows and `/health` answered 200. Then
    `docker compose exec -e FAKESTORE_BASE_URL=https://fakestoreapi.com
    backend python -m app.commands.seed` imported 20 products and 20
    images with no restart. `docker compose up -d --wait` then recreated
    the backend with the default URL, and it skipped the import.
  - `/api/hello` through the frontend and `/health` still answer 200.
  - Not verified: `/health` does not report `catalogue_seeded` yet (phase
    3), so the empty catalogue was checked in the database, not through
    the API.
  - Environment note: the Docker commands again used the temporary
    `DOCKER_CONFIG` described in phase 1. During this run the clock of
    the Docker virtual machine was up to three minutes behind the host
    for a while, so the wall-clock duration of the unreachable-source
    start was read from the container log timestamps.

## Phase 3: backend API

- **Prompt or workflow.** The phase scope came from `docs/SPEC.md`
  (sections 7.6, 7.7 and the API rows of 7.10). Unlike phases 1 and 2,
  this phase was written by the main agent directly, one file at a time,
  after reading all the existing backend code. The sub-agent runs were
  being interrupted because the development machine kept going to sleep,
  and work done in small steps survives that.
- **Accepted.**
  - Response schemas, the read queries of the repository, `ProductService`
    and `HealthService`.
  - The error envelope with handlers for validation errors, the domain
    not-found error and the framework's own HTTP errors.
  - The request middleware (request id, access log line, last-resort 500)
    and the request id in every log line through a context variable.
  - The routers under `app/api/routes` and the dependency wiring.
  - 50 new tests: the list, detail, category and health endpoints, every
    validation case, the error envelope, the request id and the service
    with an in-memory repository.
- **Rejected or changed.**
  - A handler registered for `Exception` was rejected for the 500 case;
    the middleware answers it (D-018).
  - `page` and the product id had no upper bound. A huge value would have
    reached PostgreSQL and failed there, so both are now bounded (D-019).
  - Mounting the images with `check_dir=False` was rejected after a smoke
    test: a missing directory answered 500. The directory is created at
    start and a missing file is a normal 404.
  - The first logging change made uvicorn's access logger propagate, which
    printed a second access line next to ours. It is now left alone.
  - Alembic logged in plain text through `alembic.ini`. The migrations now
    use the JSON logging of the application.
  - The test client warned that `httpx` is deprecated for it; `httpx2` was
    added as a development dependency (D-022).
  - A legacy `session.query` call in the test factory was replaced with a
    `select` statement, like the rest of the code.
- **Verification.**
  - `ruff check .` and `ruff format --check .` in `backend/`: "All checks
    passed!" and "47 files already formatted".
  - `pycodestyle --max-line-length=79` over `backend/app`, `backend/tests`
    and `backend/migrations`: no output, exit code 0.
  - `docker compose --profile test run --rm --build backend-test`:
    "60 passed".
  - `docker compose up --build -d --wait`: three services healthy.
  - Through the frontend port: `/api/products` returned 12 items, total 20
    and 2 pages; `?page=2` returned ids 13 to 20; `?search=COTTON` returned
    4 products; `?category=men%27s%20clothing` returned 4 products, all of
    that category; `?search=%25` returned 5 products, not 20;
    `?page_size=500` answered 422 with the envelope and the field name;
    `/api/products/9999` answered 404 `product_not_found`;
    `/api/categories` returned the four categories sorted;
    `/images/1.png` answered 200 `image/png`.
  - On the backend port: `/health` answered 200 with `catalogue_seeded`
    true and 20 products; `/docs` answered 200; `/openapi.json` lists the
    four paths and references `ErrorResponse` for 404 and 422.
  - The `X-Request-ID` header of a response through Nginx appeared as
    `request_id` in the backend access line for that request. Every one of
    the last 30 backend log lines parsed as JSON, including the migration
    and uvicorn lines, with one access line per request.
  - A grep of the imports confirmed the layering: no FastAPI import in
    services, repositories, clients or models, and no session call
    outside `app/repositories`.
  - Not verified against a real outage: the 503 of `/health` and the 500
    path are covered by tests that replace a dependency, not by stopping
    the database.

## Phases 4 to 7: frontend

- **Prompt or workflow.** The scope came from `docs/SPEC.md` (sections 7.8
  to 7.10) and from the interface direction of the master prompt. Like
  phase 3, the frontend was written by the main agent directly, file by
  file, because sub-agent runs were being interrupted while the
  development machine slept. The official Vite template was generated in
  a scratch folder first and its configuration was used as the base.
- **Accepted.**
  - The project configuration (strict TypeScript, ESLint with
    accessibility rules, Prettier, Vitest with jsdom).
  - One MUI theme, the API client, the products slice with three thunks,
    the URL helpers and the catalogue query hook.
  - The layout shell, the catalogue page, the product page and their
    components, including every loading, empty, error and not-found
    state.
  - The motion layer, the compact header and the reduced-motion rule.
  - 38 tests: the flows of SPEC 7.10 plus the API client, the URL parsing
    and the cache rules of the slice.
- **Rejected or changed.**
  - Oxlint, the template default, was replaced by ESLint (D-023).
  - A first version of the search box synchronised with the URL inside an
    effect and needed a lint exception. It was rewritten without the
    exception (D-026). The same review found that trimming would have
    removed a space the user had just typed, so the box is only
    overwritten when its trimmed text differs from the URL.
  - `git rm` of the placeholder page failed once because the formatter
    had touched the file, and a chained command silently skipped writing
    the new Dockerfile. It was noticed in the file listing and redone.
  - Tests failed after the card reveal was added: jsdom has no
    `IntersectionObserver`. A small stub was added to the test setup. The
    failure also showed the router's technical error screen, so a plain
    crash page was added as the route error element.
  - The default placeholder colour and the default chip edge were too
    pale. Both were darkened in the theme.
  - Yellow stars were rejected (D-029) and card images got an empty text
    alternative (D-028).
- **Verification.**
  - In `frontend/`: `npm run lint` (no output), `npm run format:check`
    ("All matched files use Prettier code style!"), `npm run typecheck`
    (no output), `npm test` ("38 passed"), `npm run build` (succeeds, with
    Vite's warning about the bundle size, see D-032).
  - `docker compose --profile test run --rm --build frontend-test`:
    "38 passed". `npm run lint` in the same container: exit code 0.
  - `docker compose up --build -d --wait`: three services healthy;
    `/` and `/product/1` both answer 200 `text/html` through Nginx.
  - Headless Chrome against port 8080, with every request recorded:
    - `/products?page=2` made one products request and one categories
      request.
    - Opening a product from the list made no request; focus moved to the
      page heading.
    - The "Back to products" control and the browser back button both
      returned to `/products?page=2` with no new request and the same
      scroll position (484 px before and after).
    - Typing "cotton" quickly made exactly one request; the address became
      `/products?search=cotton` and the summary read `4 products for
      "cotton"`.
    - Choosing a category gave
      `/products?search=cotton&category=women%27s+clothing`; back returned
      to the search alone and the search box still showed "cotton".
    - A direct visit to `/product/3` made exactly one request.
      `/product/9999` and `/product/abc` showed "Product not found",
      `/nowhere` showed "Page not found", `/` redirected to `/products`.
    - The header measured 72 px at the top and 56 px after scrolling. The
      first Tab focused "Skip to main content".
    - No request went to any other origin.
  - Screenshots at 360, 768 and 1280 px of seven views: no horizontal
    overflow in any of them, and 1, 3 and 4 grid columns. The 2-column
    step (480 to 767 px) was not captured.
  - Lighthouse 13.5.0, accessibility category: 100 on `/products`,
    `/product/1` and `/products?search=zzzz`, with no failed audit.
  - Contrast computed with the WCAG formula for the ten colour pairs in
    use: the lowest is the yellow focus ring on the blue header, 5.26:1
    (3:1 required); every text pair is 7.18:1 or more.
  - Not verified: a real screen reader session, the behaviour under
    `prefers-reduced-motion` in a browser (the rule is in the theme and
    the tests run with motion disabled), and browsers other than Chrome.

## Phase 8: documentation, CI and final check

- **Prompt or workflow.** Written by the main agent from the code as it is,
  not from the plan: the README, `docs/architecture.md`,
  `FUTURE_IMPROVEMENTS.md` and the GitHub Actions workflow. Then a final
  check from a clean clone against the statement's "final check before
  submission".
- **Accepted.** The four documents and the workflow with three jobs
  (backend, frontend, Docker Compose).
- **Rejected or changed.**
  - The first example response in the README was written from memory and
    showed a product that does not match the example query. It was
    replaced with the real answer of the running API.
  - The specification still said that any `image/*` type is accepted; it
    now names the four accepted types.
  - The "Tools" section of this file described a review by independent
    sub-agents that was planned but never ran. It was rewritten to say
    what actually happened.
  - A self-review of the frontend removed an unused re-export, a
    duplicated import and a duplicated constant.
  - One frontend test run out of eight reported "1 failed, 37 passed". The
    run overlapped with the development machine going to sleep; the
    affected tests wait up to one second of real time for the interface to
    update. Seven other runs, six of them consecutive, passed 38 of 38.
    The failing test was not identified, so this remains an open
    observation rather than a closed one.
- **Verification.**
  - `actionlint` 1.7.12 on `.github/workflows/ci.yml`: no findings. The
    workflow has **not** run on GitHub: nothing was pushed.
  - Clean clone into an empty directory, no `.env` file, working stack
    stopped and its volumes deleted first:
    - `docker-compose up --build -d --wait`: exit code 0, three services
      healthy.
    - `/` and `/product/1` answered 200 `text/html`; `/health` answered
      `catalogue_seeded` true with 20 products; `/api/products` returned
      12 items, total 20, 2 pages; `/images/1.png` answered 200
      `image/png`.
    - In the database: 20 rows, 20 with an image path. In the volume: 20
      files.
    - `python -m app.commands.seed` again: fetched 20, imported 20, and
      still 20 rows with ids 1 to 20.
    - `backend-test`: "60 passed". `frontend-test`: "38 passed".
      `ruff check`, `ruff format --check`, `npm run lint`,
      `npm run typecheck` and `npm run format:check` in the containers:
      all clean.
    - Backend restarted with `FAKESTORE_BASE_URL` pointing to an
      unreachable address: healthy, `/api/products` still returned 20
      products, and the log showed "Import skipped".
  - Not verified: the 347 seconds that the first `up` took are not a
    meaningful timing, because the machine slept during the build.

## Phase 9: interface languages

- **Prompt or workflow.** After reading the result, the candidate asked for
  the interface in English and Spanish, open to more languages. The main
  agent implemented it directly: current library versions were read from
  the registry, the copy was moved into message files and every component
  was changed to read from them.
- **Accepted.**
  - `i18next` and `react-i18next`, one typed message file per language, a
    language select in the header, the choice stored in the browser.
  - Whole-sentence messages with plural forms, `Intl` formatting of prices
    and ratings, `<html lang>` kept in step, catalogue text marked with
    `lang="en"`.
  - The store keeps the API error code instead of the English message, and
    the interface translates it (D-035).
  - Nine new tests: switching language, plurals, translated states, equal
    keys in both languages, formats, an unsupported stored language.
- **Rejected or changed.**
  - Detecting the browser language was rejected: a first visit is always in
    English (D-034).
  - Building the result summary by joining pieces ("N products" + "for" +
    "in") was replaced by one whole sentence per combination, so a
    language can order the words its own way.
  - Showing the server's English error message to the user was removed
    (D-035).
  - The browser check found a real defect that predates this phase: after
    scrolling one page and then loading another address in the same tab,
    the new page started at the old scroll position. The router keys the
    first history entry of every load as "default". The layout now gives
    that entry a key made of its address.
  - The bundle size written down earlier (604 kB) was measured before the
    motion library was added and was never re-measured. It is corrected
    everywhere: 786 kB, 249 kB compressed, after this phase. An unminified
    build attributes about 73 kB of source to `i18next` and 10 kB to
    `react-i18next`; the motion library is roughly four times that.
  - A first guess that MUI's `Select` caused the growth was wrong: the
    size did not change with `NativeSelect`. The lighter component was
    kept anyway.
- **Verification.**
  - In `frontend/`: `npm run lint`, `npm run typecheck` and
    `npm run format:check` clean; `npm test`: "47 passed";
    `npm run build` succeeds.
  - `docker compose up --build -d --wait`: three services healthy.
  - Headless Chrome at 360, 768 and 1280 px, switching to Spanish with the
    real select: `<html lang>` became `es`, the title became
    "Productos | Product Explorer", the summary read "20 productos", the
    stored value was `es`, and there was no horizontal overflow. After
    loading another address the page was still in Spanish and the product
    heading carried `lang="en"`.
  - Screenshots of the Spanish catalogue (top and scrolled) and product
    page at the three widths were looked at: the header fits on a phone in
    both its regular and compact forms.
  - After the scroll fix and a rebuild, in headless Chrome: loading
    another address in the same tab started at scroll position 0, and
    loading the same address again restored 484 px. Opening a product and
    going back (page control and browser button) still made no request and
    restored the position. The language select has the role `combobox`
    and the name "Language".
  - Lighthouse 13.5.0, accessibility, with the language select in the
    header: 100 on `/products` and `/product/1`, no failed audit. Both
    runs were in English, the default; Lighthouse was not run with the
    interface in Spanish.
  - Not verified: the Spanish wording by a second reader, and languages
    with more plural forms than English and Spanish.

## Independent review

- **Prompt or workflow.** A workflow script ran after phase 9. Seven
  reviewer sub-agents read the repository and exercised the running stack
  without changing anything, each with a different concern. A triage agent
  then tried to refute every finding against the code and the running
  application, merged the duplicates and kept at most eight. A fixer agent
  received the eight confirmed findings and the list of rejected ones, with
  the instruction to make the smallest change for each and to leave the
  code alone when a finding turned out to be wrong. The fixer saw the
  triage result only: eight confirmed findings and 29 entries rejected or
  merged, several of which stand for two or three reports.
  The seven reviewers raised 43 findings between them (4, 5, 8, 8, 5, 8
  and 5).
- **Accepted.** All eight confirmed findings were fixed, one commit each:
  - A NUL character in `search` or `category` answered 500:
    `fix(backend): answer 422 for a NUL character in search or category`.
  - An id or rating count above the `INTEGER` range, or text with a NUL,
    passed the import validation and failed the upsert for every record:
    `fix(backend): skip import records the columns cannot store`.
  - A search typed on another page lost the focus in the middle of the
    word, and a search still inside the pause pulled the user off a
    product opened in the meantime:
    `fix(frontend): keep a header search steady across page changes`.
  - A failed list announced "0 products", and "Try again" never reloaded
    the category chips:
    `fix(frontend): retry the categories and hide the count after a failure`.
  - The search box, the language select, the chips and the pagination had
    no visible focus ring:
    `fix(frontend): show the focus ring on MUI controls`.
  - A product id above 2147483647 showed a server error with a retry that
    could never work:
    `fix(frontend): show not found for ids above the API limit`.
  - The text alternative of the product image was English text without
    `lang="en"`:
    `fix(frontend): mark the product image alt text as English`.
  - The documents named a type that does not exist, left `i18n/` out of
    the layout, said a page change scrolls to the top of the grid, called
    the category an exact match without saying it is trimmed, and said
    motion is switched off when a short fade remains:
    `docs: correct statements the code does not match`.
- **Rejected or changed.**
  - Merged as duplicates of a confirmed finding: the NUL character (two
    more reports), the import bounds (two more), the product id above the
    limit, the pending search, the "0 products" summary, the trimmed
    category and three inaccuracies of the specification.
  - Fades that still run under `prefers-reduced-motion`: the movement is
    dropped and a short fade is acceptable, so only the wording of the
    documents changed.
  - Overriding `IMAGES_DIR` breaks image storage: only when a working
    default is changed, and the Dockerfile explains the ownership rule.
  - A trailing-slash redirect through Nginx points to the wrong port, and
    a trailing slash leaves the search box empty: no client of this
    project requests those addresses.
  - 405 responses carry no `Allow` header: the API is read-only and
    nothing reads the header.
  - `1.0` is accepted as an id or a page: it is the integer 1 for
    Pydantic, and rejecting it needs a custom validator for no benefit.
  - The Nginx access log has no request id: the id is returned in
    `X-Request-ID` and logged by the backend; a log format is extra scope.
  - An explicit `null` in an optional field skips the product: the record
    is skipped and logged, and Fake Store never sends it.
  - No test for a repeated id or for the seed command, and the "Verified
    by" entries of the checklist paraphrase the tests: requests for more
    tests or wording, not defects.
  - `@mui/utils` is imported without being declared; the list address
    passed to each card is never read; the category error code is stored
    but never read; raw design values, repeated literals and unused
    exports: no wrong behaviour, matters of taste or hygiene.
  - The specification says one hook reads and writes the URL while the
    search field does it too: the field uses the same helpers; a nuance.
  - Changing page with the keyboard leaves the focus on the body: by
    design only a change of path moves the focus, and the suggested fix
    is new behaviour.
  - The clone command of the README does not deliver the application yet,
    and this file says the candidate has reviewed nothing: both are true,
    disclosed, and for the candidate to resolve at submission.
  - The sentence saying no AI review took place: stale only after this
    review, so it was rewritten in this step.
  - "Every error has the same body" against the 503 of `/health`: the
    README lists that response with its own body.
  - Changed while fixing: the first version of the focus test typed on
    without waiting for the catalogue to render and lost a letter, because
    the search box follows the address when a navigation lands. The test
    now waits for the heading, as a person would see it. A key pressed in
    the instant between the navigation and its render can still be
    dropped; this was not changed.
- **Verification.**
  - `docker compose --profile test run --rm --build backend-test`:
    "62 passed". In the same container `ruff check .`: "All checks
    passed!", and `ruff format --check .`: "47 files already formatted"
    (the first run asked to reformat one file, which was corrected).
  - In `frontend/`: `npm run lint`, `npm run typecheck` and
    `npm run format:check` clean; `npm test`: "51 passed". With the four
    source fixes reverted, the four new tests failed and the other 47
    passed.
  - `docker compose up --build -d --wait`: three services healthy.
    `curl` of `http://localhost:8080/api/products` and of
    `http://localhost:8080/`: 200. `?search=a%00b` and `?category=%00`
    through port 8080: 422 `validation_error` naming the field.
  - Headless Chrome against the rebuilt stack. Nine presses of Tab on
    `/products`: the skip link, the logo, the search box, the language
    select and the five chips each computed a solid 3 px outline, yellow
    inside the header and blue below it; a screenshot of the focused
    search box was looked at. Typing "ja", waiting 900 ms and typing
    "cket" on `/product/1` ended at `/products?search=jacket` with the
    focus in the box. Typing "ring" on `/products` and opening a card at
    once stayed on `/product/1` with an empty box. `/product/9999999999`
    showed "Product not found". In Spanish the product image sat inside
    an element with `lang="en"`. With `/api` answering 502 there was no
    status region and no "0 products"; after "Try again" the five chips
    and "20 products" were shown.
  - Not verified in a browser: the focus ring of the pagination and of
    the buttons (they share the selector of the chips), and the import
    with a real out-of-range record (covered by the test only).

## Phase 10: interface refinements

- **Prompt or workflow.** The candidate used the running application and
  reported four things: the language control should not be a native
  select, the category buttons were too tall and too rounded and the
  result count sat below them, the header "moved" while scrolling, and the
  top bar should look more professional. The main agent measured the
  scrolling problem first and then changed the code.
- **Accepted.**
  - A fixed header with a constant spacer (D-037), with a shadow once the
    page is scrolled.
  - Control heights that depend on the pointer: 36 to 40 px with a mouse,
    44 px on touch screens (D-038). Corners of 6 px, no pill shapes.
  - One toolbar with a "Category" label, joined buttons and the result
    count at the right end (D-039).
  - A button with an MUI menu for the language (D-040).
- **Rejected or changed.**
  - The sticky header from phase 7 was the cause of the movement and was
    replaced. In Chrome, with a slow wheel scroll of 60 px, its height
    went 72, 68, 65, 68, 70, 66, 63, 67, 63, 61, 65, 61 ... 56 and the
    scroll position jumped back and forth: four changes of direction in
    about 300 ms.
  - A "Clear filters" button in the toolbar was considered and left out:
    the search field has its own clear button and the filter has "All".
  - A first version of the toolbar let the count drop to a second row at
    768 px. From tablet width the bar is now a single row and the buttons
    scroll sideways if they do not fit.
  - The search field kept a pill shape set locally in the component. It
    now uses the corner radius of the theme.
  - The comment and the decision that said the category buttons work with
    Tab were corrected: MUI's group is one Tab stop and the arrow keys
    move inside it.
- **Verification.**
  - In `frontend/`: `npm run lint`, `npm run typecheck` and
    `npm run format:check` clean; `npm test`: "52 passed".
  - After `docker compose up --build -d --wait`, in headless Chrome:
    - The same slow scroll: the header height went from 72 to 56 px with
      no change of direction, and the first product card moved only by
      the scrolled distance.
    - Measured heights at 1280 and 768 px: category buttons 36 px, search
      field 40 px, language button 40 px. With touch emulation at 360 px:
      44 px each. No interactive element under 36 px, no horizontal
      overflow at 360, 768 and 1280 px in English or Spanish.
    - Keyboard: nine Tab presses from the top showed a solid 3 px outline
      on every stop (yellow in the header, blue below). The language menu
      opened with Enter, the arrow key and Enter changed the language and
      focus returned to the button. In the category group the arrow keys,
      Home and End moved between the buttons and Enter applied
      `?category=electronics`.
  - Lighthouse 13.5.0, accessibility: 100 on `/products` and
    `/product/1`, no failed audit.
  - Screenshots of the top of the catalogue, the scrolled state and the
    open language menu at the three widths were looked at.
  - Known and not fixed: at tablet width in Spanish, with a search and a
    category active, the row of buttons scrolls sideways and the pressed
    button can be out of view until the row is scrolled.

## Phase 11: sort by price

- **Prompt or workflow.** The candidate asked for ordering by price inside
  the toolbar. The main agent implemented it through every layer and then
  split this record in two, because the statement asks for a short
  `AI_USAGE.md`.
- **Accepted.**
  - `sort=price_asc|price_desc` as an enum in the API, passed through the
    service to the repository, which is the only place that orders
    (D-041), with the id as the last sort key (D-042).
  - `sort` as a field of the catalogue query in the frontend: in the URL,
    in the request and in the cache key (D-043), and an MUI select in the
    toolbar.
  - Nine new backend tests and eight new frontend tests.
- **Rejected or changed.**
  - Sorting the visible page in the browser was rejected: it would order
    12 products, not the catalogue.
  - Putting the enum in the API schemas or in the service was rejected:
    the repository would have had to import from a layer above it.
  - A new frontend test checked the request one moment before it was
    sent and failed. It now waits for it. The suite was then run three
    times in a row.
  - Adding the field to the query type made the compiler point at every
    place that builds a query, including the search field, which would
    otherwise have dropped the order when searching.
- **Verification.**
  - `docker compose --profile test run --rm --build backend-test`:
    "71 passed". `ruff check` and `ruff format --check`: clean.
  - In `frontend/`: lint, type check and format check clean; `npm test`:
    "60 passed", three times in a row.
  - After `docker compose up --build -d --wait`, with curl:
    `?sort=price_asc&page_size=3` returned prices 7.95, 9.85, 9.99;
    `?sort=price_desc&page_size=3` returned 999.99, 695.0, 599.0;
    `?sort=cheapest` answered 422 naming the field `sort`;
    `/openapi.json` lists the two values as an enum.
  - In headless Chrome at 1280, 768 and 360 px: choosing "Price: low to
    high" changed the address to `/products?sort=price_asc` and the first
    prices shown were $7.95, $9.85, $9.99, $10.99. Page 2 kept the order
    in the address, going back made no new request, and the select worked
    with the keyboard (Enter, arrow, Enter). The select measured 36 px,
    like the category buttons (44 px with touch emulation). No horizontal
    overflow.
  - Screenshots at the three widths were looked at: one row at 1280 px,
    two at 768 px, three on a phone.

## Phase 12: translated catalogue, logo and toolbar

- **Prompt or workflow.** The candidate reported that product names and
  descriptions did not change with the language, asked whether a logo
  could be designed since the IKEA one cannot be used, and said the
  toolbar still did not look right. A review of the previous changes was
  running at that moment; it was stopped after three of its four
  reviewers had answered, and their eight findings were handled in this
  phase. The backend of the translated catalogue was then built by a
  sub-agent against a written contract, reviewed by two read-only
  reviewers and corrected by a fixer, while the main agent wrote the
  frontend, the logo and the toolbar.
- **Accepted.**
  - Backend, from the sub-agent: the `product_translations` table and
    migration `0002`, the `Language` enum, the translation loader run by
    the seed command, `lang` on both product endpoints, the `language`
    field and search in the requested language (D-044, D-045).
  - The Spanish titles and descriptions of the 20 products, written by
    the model.
  - Frontend: the language sent with every product request, the cache
    emptied on a change of language and late answers ignored (D-046).
  - An original mark and favicon (D-047) and the toolbar as one bar
    (D-048).
- **Rejected or changed.**
  - Keeping product translations in a frontend dictionary was rejected:
    it is catalogue data.
  - From the stopped review: two sort tests passed even with the
    tie-breaker removed. They now rewrite an earlier row so the table's
    physical order differs from the id order, and were seen to fail
    without the tie-breaker. Four statements in the AI documents were
    wrong or unsupported (a test count, the bundle size "in every
    document", the number of raw findings, the scope of the independent
    review) and were corrected. Two comments still described the cache
    key without the order and were updated.
  - From the review of the translation backend (three findings, two after
    merging a duplicate, both fixed): two keys for the same product in
    one translation file made the whole load fail; the start-up comments
    did not mention the translation step.
  - The sub-agent chose not to load translations after a failed product
    import, which the contract had not specified. It was kept.
  - The first toolbar of this phase had a divider with nothing after it
    and gaps in the lines between the joined buttons. Both were removed.
  - A select kept a heavy focus ring after a mouse click. The ring now
    follows keyboard focus.
- **Verification.**
  - Backend, by the sub-agents: `ruff check`, `ruff format --check` and
    `pycodestyle --max-line-length=79` clean; `backend-test`: "98 passed";
    the migration was downgraded and upgraded in the test database; with
    curl, `/api/products/1?lang=es` returned the Spanish title and
    `language` "es", `/api/products/1` the English one,
    `?lang=es&search=mochila` one product, `?search=mochila` none and
    `?lang=fr` a 422 naming `lang`; 20 rows in `product_translations`
    before and after running the seed again.
  - Frontend, by the main agent: lint, type check and format check clean;
    `npm test`: "66 passed".
  - After `docker compose up --build -d --wait`, in headless Chrome at
    1280 px: choosing Español made one more list request, with `lang=es`,
    and no second request for the categories; the first titles were in
    Spanish and carried `lang="es"`; searching "mochila" gave
    `1 producto para "mochila"`; opening that product from the list made
    no request; a direct visit to `/product/5` made exactly one request,
    with `lang=es`.
  - The toolbar and the logo were looked at in screenshots at 1440, 1280,
    768 and 360 px, in English and Spanish, with no horizontal overflow.
    After choosing an order with the mouse the select had no outline;
    reached with the keyboard it had one.
  - Lighthouse 13.5.0, accessibility, with the new toolbar and logo: 100
    on `/products` and `/product/1`, no failed audit.
  - Not verified: the Spanish product text by a second reader, and the
    frontend of this phase by independent reviewers.

