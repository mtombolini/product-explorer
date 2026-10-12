# Architecture

## Containers and data flow

```mermaid
flowchart LR
    browser([Browser])
    fakestore[(Fake Store API)]

    subgraph compose["Docker Compose: product-explorer"]
        subgraph frontend["frontend container"]
            nginx["Nginx<br/>serves the React build<br/>proxies /api and /images"]
        end
        subgraph backend["backend container"]
            seed["Seed command<br/>imports when the table is empty,<br/>then loads the bundled translations<br/>and specifications"]
            api["FastAPI<br/>api → services → repositories"]
            images[("Image files<br/>volume product-images")]
        end
        subgraph db["db container"]
            postgres[("PostgreSQL<br/>products, product_translations,<br/>product_specifications<br/>volume db-data")]
        end
    end

    browser -- "1. HTML, JS, CSS, fonts" --> nginx
    browser -- "2. /api/* and /images/*" --> nginx
    nginx -- "3. proxy + X-Request-ID" --> api
    api -- "4. SQL" --> postgres
    api -- "read" --> images

    seed -. "A. GET /products and images<br/>(import only)" .-> fakestore
    seed -. "B. upsert by external_id" .-> postgres
    seed -. "C. write files" .-> images
```

Solid arrows are the path of every user request. Dotted arrows are the
import, which is the only moment the system talks to Fake Store API. The
browser never does: it only knows one origin, the frontend container.

## The two flows

### Import (once, or on demand)

```mermaid
sequenceDiagram
    participant E as entrypoint.sh
    participant S as seed command
    participant F as Fake Store API
    participant D as PostgreSQL
    participant V as images volume

    E->>D: alembic upgrade head
    E->>S: python -m app.commands.seed --if-empty
    S->>D: count products
    alt table already has rows
        S-->>E: skip (no network call)
    else table is empty
        S->>F: GET /products (timeout, retries)
        S->>S: validate each record, skip invalid ones
        S->>D: INSERT ... ON CONFLICT (external_id) DO UPDATE
        loop each product without a stored image
            S->>F: GET image
            S->>V: write {external_id}.png
            S->>D: set image_path
        end
    end
    S->>D: upsert the bundled translations (no network)
    S->>D: replace the bundled specifications (no network)
    E->>E: start uvicorn (even if the import failed)
```

### A catalogue request

```mermaid
sequenceDiagram
    participant U as User
    participant R as React (ProductsPage)
    participant X as Redux store
    participant N as Nginx
    participant A as FastAPI
    participant D as PostgreSQL

    U->>R: types "cotton" in the search box
    R->>R: after 300 ms, URL becomes /products?search=cotton
    R->>X: useEffect dispatches fetchProductPage(query)
    alt page already cached for this query
        X-->>R: products from the store (no request)
    else not cached
        X->>N: GET /api/products?page=1&page_size=12&search=cotton&lang=en
        N->>A: same request + X-Request-ID
        A->>A: route validates input, service applies the rules
        A->>D: repository runs the filtered, paginated query
        D-->>A: rows + total
        A->>D: one query for the specifications of those rows
        A-->>N: JSON page (or the error envelope)
        N-->>X: response
        X->>X: store products by id, ids by query key
        X-->>R: products
    end
    R-->>U: grid, result count, pagination
```

## Layers

**Backend** (`backend/app`). Each layer only knows the one below it.

| Layer | Folder | Responsibility |
| --- | --- | --- |
| API | `api/` | HTTP: parameters, validation, status codes, error envelope, request id |
| Services | `services/` | Business rules: pagination maths, filters, not found, the import workflow, the translation and specification loaders |
| Repositories | `repositories/` | The only code that touches the database session or the image files |
| Clients | `clients/` | Calls to Fake Store API |
| Models and schemas | `models/`, `schemas/` | Tables, languages and sort orders; shapes of requests, responses, imported records, translations and specifications |
| Core | `core/` | Settings, database session, logging |
| Commands | `commands/` | The seed command |

**Frontend** (`frontend/src`).

| Folder | Responsibility |
| --- | --- |
| `api/` | The only code that calls `fetch`; one error type |
| `app/` | Store, typed hooks, routes, theme, motion values |
| `features/products/` | The slice (state, thunks, cache rules), URL state, product components |
| `pages/` | One component per route; loads data in `useEffect` and picks the state to show |
| `i18n/` | Interface languages: setup, one message file per language, category names |
| `components/` | Layout shell and shared pieces |
| `test/` | Test setup, the in-memory API and the render helper |
