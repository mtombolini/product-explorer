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


## Phases 4 to 7: frontend

### D-023 Official Vite template, with ESLint instead of Oxlint

- **Context.** The current Vite React template lints with Oxlint by default
  and offers ESLint as an option.
- **Decision.** Generate the template with `--eslint` and add
  `eslint-plugin-jsx-a11y` and Prettier.
- **Alternatives.** Keep Oxlint; write the configuration by hand.
- **Trade-off.** ESLint is slower, but it is the linter that has the
  accessibility rules this project wants checked on every run.

### D-024 Cache by query key and by id, guarded in the thunks

- **Context.** "Store fetched data to prevent unnecessary refetching."
- **Decision.** The slice keeps `pages[queryKey]` (ids and totals) and
  `byId[id]` (products). Each thunk has a `condition` that cancels the
  request when the data is already loaded or on its way. Components always
  dispatch from `useEffect` and never check the cache themselves.
- **Alternatives.** RTK Query; checking the cache in each component.
- **Trade-off.** A little more code than RTK Query, which the statement
  rules out by asking for `useEffect`. The rule "do I need to fetch?" lives
  in one place and is unit tested.

### D-025 The URL is the state of the catalogue

- **Context.** "The current state should remain understandable when
  navigating back."
- **Decision.** Search, category and page live only in the query string.
  Typing a search replaces the current history entry; choosing a category
  or a page adds one.
- **Alternatives.** Keeping the filters in Redux and syncing the URL.
- **Trade-off.** One source of truth, so back, forward, reload and shared
  links work without extra code. The search box needs a small piece of
  local state for the text being typed.
- **Update (phase 11).** The sort order is a fourth value in the query
  string (`sort`), and choosing one adds a history entry (D-043).

### D-026 The search box follows the URL during render, not in an effect

- **Context.** The box must update when the applied search changes for
  another reason (back button, "Clear filters"). The React lint rules
  reject setting state inside an effect for this.
- **Decision.** Use React's documented "adjust state when a value changes"
  pattern: compare with the previous value during render.
- **Alternatives.** An effect with a lint exception; remounting the input
  with a `key`, which would lose focus while typing.
- **Trade-off.** The pattern is less familiar than an effect, so it is
  commented in the component.

### D-027 "Back to products" goes back in history when possible

- **Context.** Returning to the list must restore search, category, page
  and scroll position without a request.
- **Decision.** A card passes `state: { from }` with its link. When that
  state is present the control calls `navigate(-1)`; on a direct visit it
  is a link to `/products`.
- **Alternatives.** Always link to the stored list address.
- **Trade-off.** A link would add a history entry and start at the top of
  the list. Going back behaves exactly like the browser button.

### D-028 Card images have an empty text alternative

- **Context.** A card is one link that contains the image and the title.
- **Decision.** In cards the image uses `alt=""`; on the product page it
  uses the product title.
- **Alternatives.** Repeat the title as `alt` in every card.
- **Trade-off.** Repeating it would make screen readers read each product
  name twice. This follows the WCAG technique for an image and text that
  share one link.

### D-029 Yellow is only ever a background

- **Context.** Yellow on white and white on yellow fail contrast.
- **Decision.** Yellow appears in three places: the brand mark, the "Top
  rated" badge (near-black text on it) and the focus ring inside the blue
  header. Stars and text never use it.
- **Alternatives.** Yellow stars; yellow for the selected filter.
- **Trade-off.** Less yellow on screen, and every use passes WCAG AA.
- **Update (phase 12).** The brand mark became a drawing in yellow on the
  blue header (D-047), so "only a background" is no longer exact. The
  rule that holds is: yellow is never text and never sits behind white
  text. It is a background for near-black text (the badge) or a graphic
  on the blue header (the mark, the focus ring), where it has 5.26:1.

### D-030 Motion library for entrances, CSS for hover

- **Context.** One motion library, subtle effects, reduced motion
  respected.
- **Decision.** Motion animates the card reveal and the page transition.
  The hover and focus lift and the compact header use CSS transitions. A
  media query in the theme and `MotionConfig reducedMotion="user"` remove
  the movement for people who ask for less motion; a short fade remains.
- **Alternatives.** Motion for every effect; no library at all.
- **Trade-off.** Two mechanisms, each used for what it does most simply.

### D-031 Category filter as pressed buttons

- **Context.** Exactly one category is active at a time.
- **Decision.** A labelled group of buttons with `aria-pressed`, one of
  them "All".
- **Alternatives.** A radio group; a select.
- **Trade-off.** A radio group would need arrow-key handling written by
  hand. Buttons are operable with Tab, Enter and Space out of the box.
- **Update (D-039).** The buttons are now MUI's `ToggleButtonGroup`, which
  keeps `aria-pressed` and adds arrow-key movement inside the group.

### D-032 One JavaScript bundle

- **Context.** The production build is a single file of about 800 kB
  (255 kB compressed) and Vite warns about its size. An unminified build
  shows where it goes: React DOM, MUI, the router and the motion library
  are the four largest parts.
- **Decision.** Leave it as one bundle for this version.
- **Alternatives.** Split by route with lazy loading.
- **Trade-off.** A slower first load than necessary, in exchange for no
  loading states between two small pages. It is listed in
  `FUTURE_IMPROVEMENTS.md`.

## Phase 9: interface languages

### D-033 i18next for the interface copy

- **Context.** The candidate asked for the interface in English and
  Spanish, open to more languages. The specification had left
  internationalisation out of scope.
- **Decision.** `i18next` with `react-i18next`. One TypeScript file per
  language; English defines the shape and the other languages are typed
  against it, so a missing key does not compile.
- **Alternatives.** A hand-written dictionary and context; JSON files
  loaded on demand.
- **Trade-off.** Two dependencies. In exchange, plural rules,
  interpolation and re-rendering on language change are solved by the
  library most React developers already know. The messages are bundled,
  which is right for two languages and would become lazy loading with
  many.

### D-034 English by default, no language detection

- **Context.** Detecting the browser language is the usual behaviour, but
  the documentation, the screenshots and the evaluation are in English.
- **Decision.** The first visit is always in English. The user's choice
  is stored in `localStorage` and used from then on.
- **Alternatives.** Detect from `navigator.language`; put the language in
  the URL.
- **Trade-off.** A Spanish-speaking visitor has to choose once. Every
  reviewer sees the same thing on first load, and the required routes
  `/products` and `/product/:id` stay as the statement writes them.

### D-035 The API returns codes, the interface chooses the words

- **Context.** The frontend showed the English `message` of the error
  envelope to the user.
- **Decision.** The store keeps the error `code`. The interface maps it to
  a translated sentence (`i18n/errorDescription.ts`). The `message` of the
  API stays in English, for developers and logs.
- **Alternatives.** Translate on the server from `Accept-Language`.
- **Trade-off.** The server stays language-neutral and cacheable, and no
  text reaches the user without going through the translations. Detailed
  server messages are no longer shown, only two user-facing sentences.

### D-036 Catalogue content is not translated

- **Context.** Fake Store has titles, descriptions and categories in
  English only.
- **Decision.** Titles and descriptions are shown as they are and marked
  with `lang="en"`, so a screen reader pronounces them correctly inside a
  Spanish page. The four known category names are translated in the
  frontend; an unknown category is shown as it comes.
- **Alternatives.** Machine-translate at import time; leave categories
  untranslated too.
- **Trade-off.** A Spanish page with English product text. Translating
  content properly needs per-language data in the database and a language
  parameter in the API, which is listed in `FUTURE_IMPROVEMENTS.md`.
- **Update (D-044).** Superseded: the catalogue text is now translated
  in the database and served by language.

## Phase 10: interface refinements

### D-037 A fixed header with a spacer instead of a sticky one

- **Context.** The sticky header changed height after scrolling. A
  measurement in Chrome showed the cause of a visible jitter: the height
  change moved the page, the browser corrected the scroll position, and
  that crossed the threshold back. During a slow scroll the header height
  changed direction four times in 300 ms.
- **Decision.** The header is `position: fixed` and a spacer of constant
  height holds its place. The header can change height without moving
  anything else.
- **Alternatives.** Keep it sticky and switch off scroll anchoring; keep
  one height and drop the compact state.
- **Trade-off.** The heights are written as tokens (in rem) instead of
  coming from the content. In exchange the page never shifts: the same
  measurement now shows the height going from 72 to 56 px in one
  direction.

### D-038 Control sizes depend on the kind of pointer

- **Context.** Controls of 44 px looked heavy on a desktop screen, but
  44 px is the comfortable minimum for a finger.
- **Decision.** Controls are 36 to 40 px tall by default and grow to 44 px
  under the `pointer: coarse` media query. Both sizes live in the theme.
- **Alternatives.** 44 px everywhere; 36 px everywhere.
- **Trade-off.** One media query in each control style. The 36 px size is
  above the 24 px that WCAG 2.2 AA requires, and touch screens keep the
  larger target.

### D-039 Joined, rectangular filter buttons in a toolbar

- **Context.** The category chips were tall, fully rounded and stacked
  above a result count that sat on its own line.
- **Decision.** One toolbar: a "Category" label, MUI's `ToggleButtonGroup`
  with one filled button, and the result count at the right end. Corners
  are 6 px everywhere and pill shapes are gone. On desktop the toolbar
  stays under the header.
- **Alternatives.** A select for the category; a sidebar with filters.
- **Trade-off.** On a phone the buttons scroll sideways. A sidebar would
  be the natural next step with more than one filter; with a single
  filter it would be mostly empty.
- **Update (phases 11 and 12).** The toolbar is now the one described in
  D-048: there is no visible "Category" label (it is the accessible name
  of the group), the result count follows the buttons, and the order
  select sits at the right end.

### D-040 A menu for the language, no native controls

- **Context.** The language control was a native `select`, which opens
  the operating system's own list and looks different on every platform.
- **Decision.** A button in the header that opens an MUI menu. Items have
  the role `menuitemradio` and the current one is checked.
- **Alternatives.** MUI's `Select`; two buttons side by side.
- **Trade-off.** More code than a native select, which was accessible for
  free. The menu keeps keyboard support (Enter, arrows, Escape, focus
  back on the button) and is covered by a test.

## Phase 11: sort by price

### D-041 Sorting is a validated value that travels through every layer

- **Context.** The candidate asked for ordering by price in the toolbar.
- **Decision.** The API accepts `sort=price_asc` or `sort=price_desc`,
  declared as an enum, so any other value is a 422. The route passes it to
  the service, the service to the repository, and only the repository
  turns it into `ORDER BY`. The enum lives in `app/models` because all
  three layers use it and none of them should import from the one above.
- **Alternatives.** Free `sort_by` and `order` strings; sorting the page
  in the browser.
- **Trade-off.** One more value type. Sorting in the browser would only
  order the 12 products of the current page, which is wrong as soon as
  there are two pages.

### D-042 The id is always the last sort key

- **Context.** Several products can have the same price, and the list is
  paginated with `LIMIT` and `OFFSET`.
- **Decision.** `ORDER BY price, id` (or `price DESC, id`).
- **Alternatives.** Order by price alone.
- **Trade-off.** None worth noting. Without the second key the database
  may return equal prices in a different order on each request, so a
  product could appear on two pages or on none.

### D-043 The order is part of the URL and of the cache key

- **Context.** List pages are cached by query key, and the catalogue state
  lives in the URL.
- **Decision.** `sort` is a field of the catalogue query. It is written to
  the URL, sent to the API and included in the cache key. Choosing an
  order goes back to page 1. An unknown value in the URL means the
  default order.
- **Alternatives.** Keep the order in component state.
- **Trade-off.** Each order is fetched and cached on its own. Leaving it
  out of the key would show a page that was cached in another order,
  which is the mistake this decision exists to prevent.

## Phase 12: translated catalogue, logo and toolbar

### D-044 Translations in their own table, served by a `lang` parameter

- **Context.** With the interface in Spanish, product titles and
  descriptions stayed in English. The candidate asked for them to change
  with the language. Fake Store has no other language.
- **Decision.** A table `product_translations` with one row per product
  and language. The Spanish text was written for this project and is
  bundled in `backend/app/data/translations/es.json`; the seed command
  loads it on every start with an idempotent upsert and no network call.
  The API takes `lang`, joins the row for that language and falls back to
  the original text, and each product says in `language` which one it got.
- **Alternatives.** Columns `title_es` and `description_es`; a dictionary
  in the frontend; machine translation at import time.
- **Trade-off.** One more table, a join and a parameter. In exchange a
  third language needs a file and an enum value, the frontend stays free
  of catalogue content, and search can read the language on screen. The
  translations are a snapshot: a product that appears later is shown in
  English until its text is added.

### D-045 `lang` is a query parameter, not a header

- **Context.** The language could travel in `Accept-Language`.
- **Decision.** `?lang=es`, validated against an enum like `sort`.
- **Alternatives.** Content negotiation with the header.
- **Trade-off.** Less standard, but visible in the address, in the logs
  and in the network panel, trivial to try with curl, and safe for any
  cache between the browser and the API.

### D-046 A change of language empties the cached catalogue text

- **Context.** The store caches list pages and products. After a change of
  language that text is in the wrong language.
- **Decision.** The slice keeps the language its cache is in. The action
  `languageChanged` drops the cached pages and products, and the visible
  page requests them again. Every request carries its language, and an
  answer for a language that is no longer current is ignored. Categories
  are keys and keep their cache.
- **Alternatives.** Cache keys that include the language, keeping both
  languages in memory.
- **Trade-off.** Going back to the previous language fetches again. The
  state keeps one simple shape, and a slow answer in the old language can
  never overwrite the new one.
- **Update (final review).** Comparing languages was not enough: after
  English, Spanish and English again, a slow answer to the first English
  request has the current language, and a failed one replaced the page
  that had already loaded. Each cached entry now keeps the id of the
  request that wrote it (`requestId`, which Redux Toolkit gives every
  thunk call), and an answer is stored only when its id matches.

### D-047 An original mark instead of a brand asset

- **Context.** The statement forbids protected assets, and the header had
  only a plain tile next to the name.
- **Decision.** A mark drawn for this project as inline SVG: a catalogue
  grid whose fourth cell is a magnifying glass, in the accent yellow, with
  the name in two weights. The favicon uses the same drawing.
- **Alternatives.** Text only; a generated bitmap.
- **Trade-off.** None worth noting. It is a few lines of SVG, sharp at any
  size, and shares no shape with the IKEA logo.

### D-048 The toolbar is one contained bar

- **Context.** The list controls floated on the page as separate pieces
  with different edges, and the select kept a heavy focus ring after a
  mouse click.
- **Decision.** One bar with a light background: the category buttons,
  the result count next to them, and the order at the right end. Buttons
  and select share one edge colour and height. The focus ring of a field
  now follows keyboard focus (`:has(:focus-visible)`), so a text box
  always shows it and a select only when reached with the keyboard.
- **Alternatives.** Keep the hairline layout; a sidebar.
- **Trade-off.** `:has()` needs a browser from 2023 or later. Older ones
  still show the field's own focused border.

## Phase 13: specifications and the image source URL

### D-049 Specifications as rows of label and value

- **Context.** A description is one paragraph, which is slow to scan. The
  candidate asked for the key facts as specifications. Fake Store has no
  such data.
- **Decision.** A short list of label and value was written for each
  product from its description, in English and Spanish, and is bundled in
  `backend/app/data/specifications/`. It is stored in a table
  `product_specifications` with one row per fact, loaded by the seed
  command like the translations, and returned by the API in the requested
  language with a fallback to English.
- **Alternatives.** Splitting the paragraph into bullets in the browser; a
  JSON column on the product.
- **Trade-off.** Splitting text by punctuation breaks sentences and gives
  uneven results. Rows keep order, language and length under the control
  of the database. The lists are a snapshot written with AI: every row
  must be backed by the description, and a new product has none until one
  is written.

### D-050 Specifications are replaced, not merged, on each load

- **Context.** A list can get shorter or be reordered between two loads.
- **Decision.** For each product and language the loader deletes the
  stored rows and inserts the list of the file.
- **Alternatives.** Upsert by position.
- **Trade-off.** A few more writes on every start. An upsert would leave
  the last rows of a list that became shorter.

### D-051 The page loads its specifications with one extra query

- **Context.** The list endpoint returns full products, so each of the 12
  products of a page needs its specifications.
- **Decision.** After the page query, one query reads the specifications
  of those products, and they are attached in memory.
- **Alternatives.** A join in the page query; one query per product.
- **Trade-off.** Three queries per list request instead of two (the
  count, the page and now the specifications). A join would
  repeat each product once per specification and break `LIMIT`; a query
  per product grows with the page size.

### D-052 The import keeps the source URL of the image

- **Context.** The import downloaded each image and stored only the file
  name, so the URL that Fake Store sent was the one piece of source data
  that was not kept.
- **Decision.** A nullable column `image_source_url`, written by the
  upsert. It is internal and not part of the API.
- **Alternatives.** Leave it out.
- **Trade-off.** One more column. Every field of the source is now in the
  database, and an image can be traced or fetched again without asking
  Fake Store for the product list.

## After the final review

### D-053 Search ignores accents

- **Context.** With the catalogue in Spanish, a reviewer showed that
  "algodon" found nothing while "algodón" found four products. People
  often type without accents.
- **Decision.** The stored text goes through PostgreSQL's `unaccent`
  function and the search loses its accents in Python before the
  comparison. A migration enables the extension.
- **Alternatives.** Document it as a limitation, which was the first
  answer; a normalised copy of each text in its own column.
- **Trade-off.** One extension, which ships with PostgreSQL and needs no
  superuser. The comparison still scans the table, like before; an index
  would need the normalised column.

### D-054 The Spanish catalogue text is neutral and adds nothing

- **Context.** The first Spanish text used words from Spain (for example
  for laptop, bleach and denim) and, in two titles and one description,
  words that Fake Store does not say. The reviewers' triage set this
  aside as a matter of taste.
- **Decision.** The text was rewritten in Latin American Spanish that is
  understood across countries, and every title and description now says
  only what its source says, even where the source is terse.
- **Alternatives.** Leave it; write for one country.
- **Trade-off.** Two titles read as oddly in Spanish as they do in
  English ("Casual de corte ajustado para hombre"). The candidate and the
  likely readers are in Latin America, and a translation that invents a
  product type is a data error, not a style choice.

