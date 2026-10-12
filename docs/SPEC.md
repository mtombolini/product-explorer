# Product Explorer: specification

This document is the contract for the implementation. It maps every
requirement of the challenge statement to a concrete decision, lists the
assumptions, and fixes the technical design that all later phases follow.

Sources of truth, in order:

1. The challenge statement (PDF, not committed to this repository).
2. The candidate's working agreement and fixed decisions (the "master prompt").
3. This specification.

If two sources disagree, the higher one wins and the conflict is recorded in
section 4.

## 1. Understanding of the challenge

- Build a small fullstack catalogue: paginated list, product detail, search,
  at least one filter.
- Frontend: React + TypeScript, React Router (`/products`, `/product/:id`),
  Redux Toolkit for shared state, data loaded from `useEffect`, clear loading,
  empty and error states.
- Fetched data is stored so that moving between views does not trigger
  unnecessary requests, and the list state stays understandable when the user
  navigates back.
- Backend: a REST API of our own (Python) backed by a database, with input
  validation and consistent status codes and error bodies.
- Product data comes from Fake Store API through a reproducible import. The
  browser must never talk to Fake Store, only to our API.
- After the import the application runs on locally stored data only. The
  behaviour when Fake Store is unavailable must be documented.
- Everything is containerised (frontend, backend, database) and starts with
  one Docker Compose command. Configuration lives outside the source code.
- Clear separation of responsibilities (Repository Pattern suggested),
  automated tests for at least one frontend flow and one backend rule, basic
  accessibility and responsive behaviour.
- An original, IKEA-inspired interface: practical, clear, inclusive,
  product-focused, with intentional blue and yellow. Nothing copied.
- Delivery is a repository with meaningful history, README, architecture
  diagram and `AI_USAGE.md`. It is defended in a live walkthrough, so simple
  and explainable beats broad and clever.

## 2. Requirements checklist

Every requirement below is implemented, except DL-5 (the optional deployed
demo). The column "Verified by" names the check that proves each one; the
results of those checks are recorded phase by phase in `docs/AI_LOG.md`.

### 2.1 Functional requirements (statement section 1)

| ID | Requirement | How it is met | Verified by |
| --- | --- | --- | --- |
| FR-1 | React with TypeScript | Vite + React + TypeScript project in `frontend/` | `npm run typecheck`, `npm run build` |
| FR-2 | React Router with `/products` and `/product/:id` | Data router with both routes, `/` redirects to `/products`, not-found page for the rest | Frontend tests, manual check |
| FR-3 | Redux Toolkit for shared state, store fetched data | One `products` slice: list pages cached by query key, products cached by id, categories cached once | Frontend test "back navigation does not refetch" |
| FR-4 | `useEffect` to load data, loading, empty and error states | Pages dispatch thunks from `useEffect`; skeleton, empty and error components | Frontend tests, manual check |
| FR-5 | Search, at least one filter, pagination; state understandable when navigating back | Search by text, filter by category, numbered pagination; all three live in the URL query string | Frontend test "search and filter flow", manual back-button check |
| FR-6 | Own REST API in TypeScript or Python, database of choice | FastAPI + PostgreSQL | Backend tests, `docker compose up` |
| FR-7 | Validate API inputs, consistent status codes and error responses | Typed and bounded query and path parameters, one error envelope for every error | Backend tests for 422, 404 and 500 |

### 2.2 Product data source (statement section 2)

| ID | Requirement | How it is met | Verified by |
| --- | --- | --- | --- |
| DS-1 | Fake Store API is the initial data source | Import service reads `GET /products` from Fake Store | Seed run, backend tests with a mocked transport |
| DS-2 | Frontend never consumes Fake Store directly | Browser only calls `/api` and `/images` on our origin; images are downloaded at import time and served by the backend | Browser network panel shows a single origin |
| DS-3 | Store product data in a database | `products` table in PostgreSQL | Migration, backend tests |
| DS-4 | Expose stored data through own endpoints | `GET /api/products`, `GET /api/products/{id}`, `GET /api/categories` | Backend tests |
| DS-5 | Reproducible seed that is part of the local setup | `python -m app.commands.seed`, run automatically on startup when the table is empty | Clean `docker compose up`, manual re-run |
| DS-6 | Document behaviour when Fake Store is unavailable | README "Import strategy" section | Documentation review, backend test |
| DS-7 | Application keeps working on local data after the import | No runtime dependency on Fake Store once the table has rows | Restart with the network disabled |
| DS-8 | Document approach, advantages, limitations, idempotency, validation, error handling | README "Import strategy" section | Documentation review |

### 2.3 Technical requirements (statement section 3)

| ID | Requirement | How it is met | Verified by |
| --- | --- | --- | --- |
| TR-1 | Containerise frontend, backend and database; start with `docker-compose up` | Three services in `docker-compose.yml`; works with `docker-compose up` and `docker compose up` | Clean clone run |
| TR-2 | Secrets and environment configuration outside the code, safe `.env.example` | Settings read from environment variables; `.env.example` with local-only values | Repository review |
| TR-3 | Clear separation of responsibilities | Backend layers `api` -> `services` -> `repositories`; frontend `api`, `features`, `pages`, `components` | Code review |
| TR-4 | Automated tests, at least one frontend flow and one backend rule | pytest and Vitest suites (section 7.10) | Test commands |
| TR-5 | Basic accessibility | Landmarks, labels, visible focus, keyboard support, checked contrast | Lighthouse accessibility audit, keyboard walkthrough |
| TR-6 | Responsive for desktop and mobile | Mobile-first grid from 1 to 4 columns | Screenshots at 360, 768 and 1280 px |

### 2.4 IKEA-inspired experience (statement section 4)

| ID | Requirement | How it is met | Verified by |
| --- | --- | --- | --- |
| UX-1 | Original interface: practical, clear, inclusive, product-focused | Image-first cards, plain copy, one MUI theme (section 7.9) | Visual review |
| UX-2 | Intentional blue and yellow, hierarchy, spacing, accessible interactions | Blue for actions and structure, yellow only as an accent on dark text | Contrast table in the README |
| UX-3 | No copied pages, protected assets or proprietary code | Original mark and placeholder, open-source Noto Sans, no logos | Repository review |

### 2.5 Delivery (statement section 5)

| ID | Requirement | How it is met | Verified by |
| --- | --- | --- | --- |
| DL-1 | Repository with meaningful commit history | Conventional Commits, one logical change per commit | `git log` |
| DL-2 | README: prerequisites, setup, environment variables, architecture, tests, endpoints, assumptions, limitations | `README.md` | Documentation review |
| DL-3 | Architecture diagram | Mermaid diagram in `docs/architecture.md`, embedded in the README | Rendered on GitHub |
| DL-4 | `AI_USAGE.md` | A short summary in `AI_USAGE.md`; the record of every phase in `docs/AI_LOG.md` | Documentation review |
| DL-5 | Optional deployed demo | Out of scope | Not applicable |

### 2.6 Bonus points in scope (statement section 8)

| ID | Requirement | How it is met |
| --- | --- | --- |
| BN-1 | MUI with a consistent theme | One theme file, no second UI kit |
| BN-2 | Integration and unit tests | API integration tests, service unit test, frontend flow tests |
| BN-3 | OpenAPI | FastAPI `/docs` and `/openapi.json`, error responses documented |
| BN-4 | Observability | JSON logs, request id correlation, `/health` |
| BN-5 | CI | GitHub Actions: lint, tests, builds |
| BN-6 | Path to production | Short section in the README |
| BN-7 | `FUTURE_IMPROVEMENTS.md` | Follows the structure the statement lists |

## 3. Assumptions

- **No authentication.** The catalogue is public and read-only, so there are
  no users, sessions or write endpoints.
- **Catalogue content.** The statement talks about home furnishing products,
  but Fake Store returns clothing, electronics and jewellery. The data is kept
  as it is and the interface copy stays neutral ("products").
- **Currency.** Fake Store prices carry no currency. They are displayed as US
  dollars.
- **Catalogue size.** The source has 20 products. The design does not depend
  on that number, but nothing is tuned for large catalogues (see
  `FUTURE_IMPROVEMENTS.md`).
- **Search scope.** Search is a case-insensitive substring match on title and
  description.
- **One filter, one order.** Category is the single filter. The list can be
  ordered by price in both directions; without a choice it is ordered by
  id.
- **Cache lifetime.** Data cached in the Redux store lives until the page is
  reloaded. The catalogue does not change between imports, so there is no
  expiry.
- **Reviewer environment.** A current Docker Desktop or Docker Engine with
  Compose v2. `docker-compose` is the same binary under its legacy name.

## 4. Conflicts and ambiguities

| Topic | Finding | Resolution |
| --- | --- | --- |
| "Home furnishing products" | Fake Store has no furniture | Keep the data, neutral copy, documented as an assumption |
| "A single Docker Compose command" | A mandatory `cp .env.example .env` would be a second command | Compose provides local defaults, so `.env` is optional and only overrides them |
| `docker-compose up` | The hyphenated v1 tool is end of life | Compose v2 answers to both names; both were verified |
| "No other services" (master prompt) | Tests need PostgreSQL and a toolchain | The application is exactly three long-running containers. Test runners are one-off jobs behind a Compose profile and are never started by `up` |
| "Protected backend endpoint" for the import | Not needed with a seed command | Not implemented; the seed is a command, not an endpoint |
| Latest TypeScript and ESLint | TypeScript 7 and ESLint 10 are newer than the lint plugins support | Pinned to TypeScript 6.0 and ESLint 9 (see `docs/DECISIONS.md`) |
| Image hosting | Fake Store answers `HEAD` requests for images with a bot challenge (HTTP 403), `GET` works | The importer only uses `GET` |

## 5. Open questions and the default taken

These were not answered by the statement. Each has a default so the work is
not blocked; all of them are cheap to change.

| Question | Default |
| --- | --- |
| Page size | 12 per page (fills 1, 2, 3 and 4 column grids), maximum 48 |
| Price in JSON | A number. Stored as `NUMERIC(10,2)` |
| Out-of-range page | HTTP 200 with an empty list and correct metadata |
| Unknown category | HTTP 200 with an empty list |
| Records without rating, description or image | Imported; the missing parts are `null` or empty |
| Records without id, title, price or category | Skipped and logged |
| Ports | Frontend on 8080, API on 8000 (loopback only), database not published |

## 6. Out of scope

Authentication, write endpoints, cart or checkout, a deployed demo,
end-to-end browser tests in the repository, server-side rendering, and any
service beyond the three containers.

## 7. Design contract

### 7.1 Repository layout

```text
.
├── docker-compose.yml
├── .env.example
├── README.md
├── AI_USAGE.md
├── FUTURE_IMPROVEMENTS.md
├── docs/
│   ├── SPEC.md
│   ├── DECISIONS.md
│   ├── AI_LOG.md
│   └── architecture.md
├── .github/workflows/ci.yml
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── pyproject.toml            # ruff and pytest configuration
│   ├── requirements.txt          # pinned runtime dependencies
│   ├── requirements-dev.txt      # pinned test and lint dependencies
│   ├── alembic.ini
│   ├── migrations/               # Alembic environment and versions
│   ├── app/
│   │   ├── main.py               # application factory
│   │   ├── core/                 # config, database session, logging
│   │   ├── models/               # tables, languages and sort orders
│   │   ├── data/                 # bundled translations and specifications
│   │   ├── schemas/              # Pydantic models (API and Fake Store)
│   │   ├── repositories/         # data access, the only SQL in the app
│   │   ├── services/             # business rules
│   │   ├── clients/              # Fake Store HTTP client
│   │   ├── api/                  # dependencies, errors, middleware
│   │   │   └── routes/           # one router per resource
│   │   └── commands/             # seed command
│   └── tests/
└── frontend/
    ├── Dockerfile
    ├── nginx/default.conf
    ├── package.json
    ├── public/
    └── src/
        ├── main.tsx
        ├── app/                  # store, typed hooks, router, theme
        ├── api/                  # fetch client, endpoint functions, types
        ├── features/products/    # slice, thunks, selectors, hooks, components
        ├── pages/                # route-level components
        ├── components/           # shared layout and state components
        ├── i18n/                 # languages, message files, category names
        └── test/                 # test setup and helpers
```

### 7.2 Runtime topology

| Service | Image | Published port | Notes |
| --- | --- | --- | --- |
| `db` | `postgres:17-alpine` | none | Named volume for data, `pg_isready` health check |
| `backend` | built from `backend/` on `python:3.13-slim` | `127.0.0.1:${BACKEND_PORT:-8000}` | Runs migrations, seeds when empty, serves the API and `/images` |
| `frontend` | built from `frontend/` (Node 24 build stage, `nginx:1.30-alpine` runtime) | `${FRONTEND_PORT:-8080}` | Serves the production build, proxies `/api` and `/images` to `backend` |

- Start order: `db` healthy, then `backend` healthy, then `frontend`.
- The database port is not published. Access it with
  `docker compose exec db psql`.
- Backend start sequence (`entrypoint.sh`): `alembic upgrade head`, then
  `python -m app.commands.seed --if-empty` (a failure is logged and ignored),
  then `uvicorn`.
- Nginx resolves the backend through Docker's DNS at request time, so the
  backend can be rebuilt without restarting the frontend.
- Nginx forwards its own request id in `X-Request-ID`.
- Test runners `backend-test` and `frontend-test` exist only under the
  Compose profile `test`.
- The Compose project name is fixed to `product-explorer`.

### 7.3 Configuration

Every value has a local default in `docker-compose.yml`; `.env` overrides it.

| Variable | Default | Used by | Purpose |
| --- | --- | --- | --- |
| `POSTGRES_USER` | `product_explorer` | db, backend | Database user |
| `POSTGRES_PASSWORD` | `product_explorer` | db, backend | Database password (local only) |
| `POSTGRES_DB` | `product_explorer` | db, backend | Database name |
| `DATABASE_URL` | built from the three values above | backend | SQLAlchemy URL, `postgresql+psycopg://` |
| `FAKESTORE_BASE_URL` | `https://fakestoreapi.com` | backend | Import source |
| `FAKESTORE_TIMEOUT_SECONDS` | `5` | backend | Timeout per request |
| `FAKESTORE_MAX_RETRIES` | `2` | backend | Retries after the first attempt |
| `IMAGES_DIR` | `/data/images` | backend | Where product images are stored |
| `LOG_LEVEL` | `INFO` | backend | Log level |
| `FRONTEND_PORT` | `8080` | compose | Host port of the web application |
| `BACKEND_PORT` | `8000` | compose | Host port of the API (loopback) |

### 7.4 Data model

Table `products`:

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | `INTEGER` | Primary key, generated. The id exposed by the API |
| `external_id` | `INTEGER` | Not null, unique. The Fake Store id, used as the upsert key |
| `title` | `VARCHAR(255)` | Not null |
| `description` | `TEXT` | Not null, default empty string |
| `price` | `NUMERIC(10,2)` | Not null, `>= 0` |
| `category` | `VARCHAR(100)` | Not null, indexed |
| `image_path` | `VARCHAR(255)` | Nullable. File name inside `IMAGES_DIR`; `NULL` means placeholder |
| `image_source_url` | `TEXT` | Nullable. The image URL as Fake Store sent it. Internal, not exposed by the API |
| `rating_rate` | `NUMERIC(2,1)` | Nullable, between 0 and 5 |
| `rating_count` | `INTEGER` | Nullable, `>= 0` |
| `created_at` | `TIMESTAMPTZ` | Not null, default `now()` |
| `updated_at` | `TIMESTAMPTZ` | Not null, default `now()`, refreshed on every upsert |

Table `product_translations` (titles and descriptions in other languages):

| Column | Type | Constraints |
| --- | --- | --- |
| `product_id` | `INTEGER` | Not null. Foreign key to `products.id`, `ON DELETE CASCADE` |
| `language` | `VARCHAR(8)` | Not null, for example `es` |
| `title` | `VARCHAR(255)` | Not null |
| `description` | `TEXT` | Not null, default empty string |

The primary key is (`product_id`, `language`): at most one translation per
product and language. The text imported from Fake Store is English and
stays in `products`; this table only holds the other languages.

Table `product_specifications` (key facts of a product, per language):

| Column | Type | Constraints |
| --- | --- | --- |
| `product_id` | `INTEGER` | Not null. Foreign key to `products.id`, `ON DELETE CASCADE` |
| `language` | `VARCHAR(8)` | Not null. Every language has rows, English included |
| `position` | `INTEGER` | Not null. Display order, from 1 |
| `label` | `VARCHAR(100)` | Not null, for example `Capacity` |
| `value` | `VARCHAR(255)` | Not null, for example `2 TB` |

The primary key is (`product_id`, `language`, `position`).

Every change of the schema is its own explicit Alembic migration.

### 7.5 Import strategy

Approach: a dedicated command, `python -m app.commands.seed`, that also runs
on container start with `--if-empty`.

Steps of one import run (`CatalogueImportService`):

1. **Fetch.** `GET {FAKESTORE_BASE_URL}/products` with a timeout and limited
   retries with backoff. Transport errors, HTTP 5xx and a body that is not a
   JSON list raise `FakeStoreUnavailableError`.
2. **Validate.** Every record is validated with a Pydantic model. Required:
   `id`, `title`, `price`, `category`. Optional: `description`, `image`,
   `rating`. An invalid record is skipped and logged; it never aborts the run.
3. **Upsert.** Valid records are written in one transaction with
   `INSERT ... ON CONFLICT (external_id) DO UPDATE`. Running the import twice
   leaves the same rows. `image_path` is not touched by the upsert.
4. **Images.** For each product whose image is not stored yet, the image is
   downloaded with `GET`, checked (same host as the source; JPEG, PNG, WebP
   or GIF content type; size limit of 5 MB) and written atomically as
   `{external_id}{extension}`. A failed download is logged and the product
   keeps its placeholder. After 3 consecutive failures the remaining images
   are skipped for this run.
5. **Report.** A summary is logged: fetched, imported, skipped, images
   downloaded, images failed.

A separate step, **translations**, runs after the import and also when the
import is skipped because the table has rows. It needs no network: the
Spanish titles and descriptions of the 20 products are bundled in
`backend/app/data/translations/es.json`, keyed by the Fake Store id. Each
entry is validated, matched to its product by `external_id` and written
with `INSERT ... ON CONFLICT (product_id, language) DO UPDATE`. An invalid
entry, a second entry for the same product, or one whose product does not
exist is logged and skipped. The step does not run after a failed product
import, because there would be no products to translate. A problem in
this step never stops the API from starting.

The **specifications** are loaded right after, in the same way and in the
same situations. Fake Store has only a paragraph of description, so a short
list of label and value was written for each product from that paragraph,
in English and in Spanish, and is bundled in
`backend/app/data/specifications/`. For each product and language the
stored list is replaced by the one in the file, so the step can be
repeated and a shorter list leaves nothing behind.

Behaviour of the command:

- `python -m app.commands.seed` always runs the import. Exit code 0 on
  success, 1 when the source is unavailable.
- `--if-empty` does nothing when the table already has rows. This is what the
  container runs on start, so a seeded database never contacts Fake Store.
- When Fake Store is unavailable and the table is empty, the API still
  starts, the failure is logged, `/health` reports `catalogue_seeded: false`
  and the frontend shows an explicit empty state. Running the command again
  later fixes it without a restart.

### 7.6 API contract

Base path `/api`. JSON only. Field names are `snake_case`.

**Product**

```json
{
  "id": 1,
  "title": "Fjallraven - Foldsack No. 1 Backpack, Fits 15 Laptops",
  "description": "Your perfect pack for everyday use...",
  "language": "en",
  "price": 109.95,
  "category": "men's clothing",
  "image_url": "/images/1.png",
  "rating_rate": 3.9,
  "rating_count": 120,
  "specifications": [
    {"label": "Type", "value": "Backpack"},
    {"label": "Laptop compartment", "value": "Padded sleeve, up to 15 inches"}
  ],
  "specifications_language": "en"
}
```

`image_url`, `rating_rate` and `rating_count` can be `null`. `language`
is the language of `title` and `description` as returned: the one asked
for with `lang` when a translation exists, otherwise `en`.
`specifications` are the product's key facts in display order: the rows in
the requested language when the product has any, otherwise the English
ones, otherwise an empty list. `specifications_language` says which.

**`GET /api/products`**

| Parameter | Type | Default | Rules |
| --- | --- | --- | --- |
| `page` | integer | 1 | 1 to 1,000,000 |
| `page_size` | integer | 12 | 1 to 48 |
| `search` | string | none | At most 100 characters. Trimmed; blank means no search. Case-insensitive substring match on title or description; `%` and `_` are matched literally |
| `category` | string | none | At most 100 characters. Trimmed; blank means no filter. Exact match |
| `sort` | string | none | `price_asc` or `price_desc`. Any other value, including an empty one, is a 422 |
| `lang` | string | `en` | `en` or `es`. Any other value is a 422. Titles and descriptions come back in this language when the catalogue has them, and `search` reads the text of this language |

Without `sort`, results are ordered by `id` ascending. With it, by price
and then by `id`, so products with the same price keep a fixed order and
pages never overlap. Response 200:

```json
{
  "items": [],
  "total": 20,
  "page": 1,
  "page_size": 12,
  "total_pages": 2
}
```

`total_pages` is `ceil(total / page_size)` and 0 when `total` is 0. A page
beyond the last one returns 200 with an empty `items` list.

**`GET /api/products/{product_id}`** (accepts `lang` like the list): 200
with a product, 404 when it does not exist, 422 when the id is not an
integer between 1 and 2,147,483,647 (the range of the id column).

**`GET /api/categories`**: 200 with `{"items": ["electronics", "jewelery"]}`,
distinct values sorted alphabetically.

**`GET /health`** (not under `/api`): 200 with

```json
{
  "status": "ok",
  "database": "ok",
  "catalogue_seeded": true,
  "product_count": 20
}
```

When the database cannot be reached: 503 with `status` and `database` set to
`"unavailable"`.

**`GET /images/{file}`**: static files from `IMAGES_DIR`.

**Errors.** Every error uses the same envelope:

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request is not valid.",
    "details": [
      {"field": "page_size", "message": "Input should be less than or equal to 48"}
    ]
  }
}
```

| Status | `code` | When |
| --- | --- | --- |
| 422 | `validation_error` | Invalid query or path parameter; `details` lists each field |
| 404 | `product_not_found` | The product id does not exist |
| 404 | `not_found` | Unknown route |
| 405 | `method_not_allowed` | Wrong HTTP method |
| 500 | `internal_error` | Unexpected error; generic message, no internals |

`details` is an empty list when there is nothing field-specific to report.

**Cross-cutting**

- Every response carries `X-Request-ID`. An incoming value is reused when it
  matches `^[A-Za-z0-9-]{1,64}$`, otherwise one is generated.
- One JSON log line per request: timestamp, level, logger, message,
  request id, method, path, status and duration in milliseconds.
- OpenAPI at `/docs` and `/openapi.json`, with the error envelope documented
  for 404 and 422.

### 7.7 Backend layering rules

- `api` handles HTTP only: parameters, status codes, response models. It
  calls services and never builds queries.
- `services` hold the business rules (pagination maths, search
  normalisation, not-found, the import workflow). They raise domain
  exceptions and do not import FastAPI.
- `repositories` are the only place that uses the SQLAlchemy session to
  query or write.
- `clients` wrap external HTTP calls.
- `models` hold the ORM classes and the values that describe products
  (the sort orders, the languages, and `LocalizedProduct`, a product
  together with its optional translation), which every layer may import;
  `schemas` are Pydantic classes. They are never mixed: the API never returns an ORM object
  without a response model.
- `core` holds configuration, the database session and logging.
- Synchronous SQLAlchemy with `psycopg` 3. FastAPI runs synchronous
  endpoints in a thread pool.
- Python style: PEP 8 with a 79 character line limit, enforced by
  `ruff check` and `ruff format`. Type hints on every function. A short
  docstring on every module, class and public function.

### 7.8 Frontend architecture

- `src/api/` is the only code that calls `fetch`. It turns non-2xx responses
  into a typed `ApiError` built from the error envelope.
- `src/features/products/productsSlice.ts` owns the shared state:

  ```ts
  interface ProductsState {
    language: string;                       // language of the cached text
    byId: Record<number, Product>;          // products cached by id
    pages: Record<string, PageEntry>;       // list pages cached by query key
    details: Record<number, DetailEntry>;   // status of single-product requests
    categories: CategoriesState;            // loaded once
  }
  ```

- Thunks use `createAsyncThunk` with the `condition` option: a request is
  skipped when the same data is already loaded or in flight. Components
  dispatch them from `useEffect`. RTK Query is not used.
- The list endpoint returns full products, so opening a product that was
  seen in the list needs no request. A direct link to `/product/:id` fetches
  that product once.
- The URL query string (`search`, `category`, `sort`, `page`) is the source
  of truth for the catalogue view. One hook reads and writes it. Changing
  search, category or order resets the page to 1. Search is debounced and
  replaces the current history entry; category, order and page changes
  push a new entry.
- Routes: `/` redirects to `/products`; `/products`; `/product/:id`; any
  other path renders the not-found page.
- Scroll position is restored on back and forward navigation and reset on
  new navigations.
- Production build is served by Nginx, which proxies `/api` and `/images`.
  In development the Vite dev server proxies the same paths, so the browser
  always sees a single origin and CORS is not needed.

### 7.9 UI and UX rules

- MUI with one custom theme (palette, typography, spacing, shape, component
  overrides in a single file). No second UI kit or CSS framework.
- Colour: primary blue near `#0058A3`, accent yellow near `#FFDB00` used
  sparingly and only behind near-black text. White and light neutral
  surfaces. Every text pair meets WCAG AA (4.5:1), interface elements 3:1.
- Typography: self-hosted Noto Sans, weights 400 and 700. Sizes in `rem`,
  fluid headings with `clamp()`, body at least 16 px, descriptions limited to
  60 to 75 characters per line. Sentence case.
- Layout: mobile-first, 8 px spacing scale, content width capped near
  1280 to 1440 px. Grid of 1, 2, 3 and 4 columns. Controls are 36 to
  40 px tall with a mouse and at least 44 px on touch screens. Corners are
  slightly rounded (6 px); there are no pill shapes. No native form
  controls: menus and selects are MUI components.
- Cards: image-first, fixed aspect-ratio box with `object-fit: contain` on a
  light neutral background, lazy loading, fade in on load, placeholder on
  error, meaningful `alt`. Title clamped to two lines, category, price,
  rating with a text equivalent. The whole card is one link.
- Motion: one library (Motion). Durations of 150 to 300 ms, ease-out, subtle
  reveal on scroll, lift on hover and focus, short route transition, skeleton
  shimmer. Under `prefers-reduced-motion` movement is removed; a short
  fade remains.
- Scroll: fixed header that becomes shorter after scrolling without moving
  the page; on desktop a toolbar with the category filter and the result
  count stays under it; page change starts at the top of the page;
  numbered pagination that mirrors the URL. No infinite scroll.
- Detail page: two columns on desktop, stacked on mobile, with a way back
  that preserves search, filter and page. The specifications come first,
  as a list of label and value that can be scanned; the description
  follows under its own heading.
- States: skeletons that match the layout, empty state with "clear filters",
  error state with "retry", not-found for unknown routes and products.
- Accessibility: landmarks, one `h1` per page, skip link, labelled controls,
  visible focus ring, full keyboard support, result count in an
  `aria-live="polite"` region, `aria-current` on pagination, focus moved to
  the page heading on route change. Target: Lighthouse accessibility of 95
  or more.
- Copy: plain language, short sentences, no marketing tone, in every
  interface language (section 7.12).

### 7.10 Testing plan

All tests are deterministic and never call the real Fake Store API.

| Suite | Test | What it proves |
| --- | --- | --- |
| Backend | Import twice gives the same rows | Idempotency |
| Backend | Second import with changed data updates in place | Upsert semantics |
| Backend | Invalid record is skipped, valid ones are imported | Validation does not abort the run |
| Backend | Failed image keeps `image_path` empty | Placeholder behaviour |
| Backend | Source unavailable raises and leaves the table untouched | Resilience |
| Backend | Pagination metadata and out-of-range page | Pagination rule |
| Backend | Category filter and search, including `%` | Filtering rule |
| Backend | Order by price in both directions, ties, sorted pages, unknown value | Sorting rule and its validation |
| Backend | `lang=es` returns the translation, falls back per product, search reads that language | Translated catalogue |
| Backend | Translation loader: idempotent, skips invalid, unknown and repeated entries | The bundled translations load safely |
| Backend | Specifications by language with fallback, in order, one query for a page; their loader | Key facts are served and loaded safely |
| Backend | The import keeps the image source URL | Nothing the source sends is lost |
| Backend | Invalid `page`, `page_size`, `search` length, product id | 422 and the error envelope |
| Backend | Unknown product and unknown route | 404 and the error envelope |
| Backend | Unexpected error | 500 without internals |
| Backend | Health with and without products | `catalogue_seeded` |
| Backend | Service with a fake repository | Business rules without a database |
| Frontend | Search and category filter flow | Requests carry the parameters, URL is updated, results announced |
| Frontend | Sort by price | Order shown, URL updated, each order cached, page reset, unknown value ignored |
| Frontend | Change of language | Interface copy, catalogue text requested again once, late answers in the old language ignored |
| Frontend | Specifications on the product page | Shown as labels and values in order; hidden when there are none |
| Frontend | Open a product and go back | Same list state and no new request |
| Frontend | Error and empty states | Retry and clear filters work |
| Frontend | Slice and URL helpers | Cache keys and parameter parsing |

Backend tests run against PostgreSQL, in a database whose name must end in
`_test`. Fake Store is replaced with `httpx.MockTransport`. Frontend tests
replace `fetch` with a stub.

### 7.11 Tooling and pinned versions

Versions were read from the package registries on the day the work started.

| Area | Package | Version |
| --- | --- | --- |
| Runtime | Python | 3.13 |
| Backend | fastapi | 0.143.0 |
| Backend | uvicorn | 0.54.0 |
| Backend | sqlalchemy | 2.1.4 |
| Backend | alembic | 1.20.0 |
| Backend | pydantic | 2.14.1 |
| Backend | pydantic-settings | 2.15.0 |
| Backend | psycopg (binary) | 3.3.6 |
| Backend | httpx | 0.28.1 |
| Backend dev | pytest | 9.1.1 |
| Backend dev | ruff | 0.17.0 |
| Backend dev | httpx2 (test client) | 2.13.1 |
| Runtime | Node.js | 24 (LTS) |
| Frontend | react, react-dom | 19.3.0 |
| Frontend | react-router | 8.4.0 |
| Frontend | @reduxjs/toolkit | 2.13.0 |
| Frontend | react-redux | 9.3.0 |
| Frontend | @mui/material, @mui/icons-material | 9.5.0 |
| Frontend | @emotion/react, @emotion/styled | 11.14.0, 11.14.1 |
| Frontend | motion | 14.1.0 |
| Frontend | @fontsource/noto-sans | 5.3.0 |
| Frontend dev | vite | 8.3.4 |
| Frontend dev | typescript | 6.0.3 |
| Frontend dev | vitest | 5.0.3 |
| Frontend dev | @testing-library/react | 16.3.3 |
| Frontend dev | eslint | 9.39.5 |
| Frontend dev | typescript-eslint | 8.71.1 |
| Frontend dev | eslint-plugin-jsx-a11y | 6.10.2 |
| Frontend dev | prettier | 3.9.10 |
| Frontend | i18next | 26.4.4 |
| Frontend | react-i18next | 17.0.16 |
| Images | postgres | 17-alpine |
| Images | nginx | 1.30-alpine |

### 7.12 Interface languages

Added after the first version, at the candidate's request. The statement
does not ask for it.

- The interface is available in English and Spanish. English is the
  default. The user changes it with a menu in the header and the choice
  is stored in the browser for the next visit. The browser language is not
  detected automatically (see `docs/DECISIONS.md`).
- All interface copy lives in one file per language under
  `frontend/src/i18n/locales/`. English defines the shape; a missing key
  in another language is a type error. Adding a language is one file plus
  two lines.
- Plural forms and word order are handled by the message files, not by
  string concatenation. Prices and ratings are formatted with `Intl` for
  the chosen language.
- The API stays language-neutral: it returns stable error codes, and the
  interface chooses the wording.
- `<html lang>` follows the chosen language.
- Catalogue text is translated too. The backend stores translated titles
  and descriptions (section 7.4) and returns them when the request says
  `lang=es`; a product without a translation comes back in English and its
  `language` field says so, and the interface marks that text with the
  matching `lang` attribute. Search reads the text of the requested
  language.
- The Redux store keeps the language the catalogue was requested in. When
  the user changes language the cached pages and products are dropped and
  the visible page is requested again; an answer that arrives for the
  previous language is ignored.
- Category values are keys (`men's clothing`). The four known ones are
  given a translated label in the frontend; any other is shown as it comes.
- The language is not part of the URL.

## 8. Phases and exit criteria

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| 0 | This specification | Committed |
| 1 | Compose with three services, health checks, `.env.example`, hello endpoint, Nginx proxy | Clean `docker compose up` reaches three healthy containers; `/api` answers through Nginx |
| 2 | Model, migration, Fake Store client, seed command, image download, tests | Seed twice gives the same rows; `ruff` and `pytest` pass |
| 3 | Endpoints, validation, error envelope, logging, OpenAPI, tests | Contract of section 7.6 holds; `ruff` and `pytest` pass |
| 4 | Vite project, theme, router, store, API client, layout shell | Lint, type check, tests and build pass; shell served by Nginx |
| 5 | List, search, filter, pagination, URL state, caching, states, tests | Flows work against the real API; tests pass |
| 6 | Detail page, navigation back, scroll restoration, tests | Back keeps state without a new request; tests pass |
| 7 | Motion, responsive review, accessibility audit | Checked at 360, 768 and 1280 px; Lighthouse accessibility reported |
| 8 | README, diagram, `AI_USAGE.md`, `FUTURE_IMPROVEMENTS.md`, CI | Final check from a clean clone against the statement |
| 9 | Interface in English and Spanish (section 7.12) | Both languages verified in a browser; tests pass |
