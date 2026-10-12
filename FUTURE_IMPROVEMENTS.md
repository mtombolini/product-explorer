# Future improvements

A critical review of the submitted solution and a realistic plan to evolve
it. None of this is implemented: the goal of this version was a small
solution that is complete and easy to explain.

## 1. Main limitations of the submitted solution

| Area | Limitation |
| --- | --- |
| Import | Runs inside the container start and by hand. No schedule, no removal of products that disappear from the source, no record of past runs |
| Start-up | Migrations and the import run in the entrypoint of the API container. With more than one replica they would run concurrently |
| Search | `ILIKE '%term%'` on title and description. Simple and correct, but it scans the table and has no ranking or typo tolerance |
| Data | Prices are exposed as JSON numbers and have no currency. The list returns full products, which would be heavy for a large catalogue |
| Images | Stored on a local volume in their original size and format (PNG files of 100 to 460 kB) and served by the API process |
| Frontend | One JavaScript bundle of about 800 kB (255 kB compressed). The cache lives until reload and has no expiry. Sorting is by price only. The Spanish catalogue text is a bundled snapshot written with AI, category names are translated in the frontend, and the browser language is not detected |
| Testing | No end-to-end browser tests in the repository. Accessibility was audited with Lighthouse and scripts, not with a screen reader. Chrome only |
| Security | Local default credentials in the Compose file, no TLS, no rate limiting, no Content-Security-Policy |
| Observability | Structured logs and request ids, but no metrics, traces or alerts |
| Delivery | CI validates the code but nothing is published or deployed |

## 2. Prioritised improvements

Priority reflects what would matter first if this went to production.
Complexity is a rough estimate: S (hours), M (days), L (a week or more).

| # | Improvement | Reason and expected benefit | Complexity | Dependencies and risks |
| --- | --- | --- | --- | --- |
| 1 | Secrets from the environment only, TLS at the edge, security headers (CSP, HSTS) | Removes the default credentials and protects traffic. A precondition for any public deployment | S to M | Needs the target platform to be chosen. A strict CSP must be tested against MUI's injected styles |
| 2 | Run migrations and the import as one-off jobs, not in the API entrypoint | Safe with several replicas and faster, predictable API starts | S | Changes the deployment sequence: the job must finish before the new version receives traffic |
| 3 | End-to-end tests of the two main flows (Playwright) in CI | Catches integration breaks between frontend, Nginx and API that unit tests cannot see | M | Slower pipeline. Needs seeded test data, so it depends on item 2 or on a fixture import |
| 4 | Metrics, traces and alerts (OpenTelemetry, error rate, latency, `/health`) | Problems are noticed before users report them, and a slow request can be explained | M | Needs a monitoring backend. Separate liveness and readiness endpoints come with it |
| 5 | Sorting by rating and a second filter (price range) | The most likely product request. Sorting by price already shows the path through every layer | S | The cache key and the URL must include the new parameters, or stale pages would be shown |
| 6 | Scheduled import with a run log and soft deletion | The catalogue stays current and every run can be audited | M | Deciding what "removed at the source" means for products that are referenced elsewhere |
| 7 | Search with PostgreSQL full-text or trigram indexes | Fast and ranked search on a large catalogue | M | A migration and a change in the repository only. Result order changes, so tests and expectations move |
| 8 | Images in object storage behind a CDN, resized and converted to WebP or AVIF | Much smaller pages and no image traffic through the API | M | The image URL is already produced by the API, so the frontend does not change. Adds a processing step to the import |
| 9 | Smaller bundle (code splitting by route, the motion library's lazy feature set) and a cache lifetime in the store | Faster first load, and data that refreshes without a reload | S | Loading states between routes. An expiry rule must not bring back the refetching the cache avoids |
| 10 | Rate limiting and response caching (ETag or short `Cache-Control`) on the API | Protects the database from abuse and repeated identical requests | S to M | Cache invalidation after an import |
| 11 | Money as integer minor units with a currency code | Correct arithmetic once there is a basket or tax | M | A data migration and a contract change for every client |
| 12 | A translation workflow, language detection and right-to-left layout | Translations are loaded from a file in the repository. A real catalogue needs them managed as data: reviewed by people, added when a product appears, and covering category names too | L | Needs an editing interface or a translation service, and a rule for products whose source text changes after they were translated |

## 3. Suggested order

**Short term (before a first production release)**

1. Security baseline (item 1).
2. Migrations and import as jobs (item 2).
3. End-to-end tests in CI (item 3).
4. Monitoring (item 4).

These four make the current feature set safe to operate. They do not change
what the user sees.

**Medium term (first product iterations)**

5. Sorting by rating and a second filter (item 5).
6. Scheduled import (item 6).
7. Code splitting and cache lifetime (item 9).
8. Rate limiting and response caching (item 10).

**Longer term (when scale or scope requires it)**

9. Indexed search (item 7), once the catalogue is large enough to measure
   the difference.
10. Images in object storage (item 8).
11. Money model (item 11), together with the first feature that needs it.
12. Translation workflow (item 12).

## 4. Trade-offs worth stating

- **Simplicity against scale.** Several choices are right for 20 products
  and wrong for 200,000: full products in lists, `ILIKE` search, images on
  a volume. They were kept because they are easy to reason about and each
  has a contained replacement (one layer, one module).
- **Start-up import against operations.** Importing on start makes the
  repository run with one command, which is what a reviewer needs. In
  production the same command becomes a job.
- **Cache without expiry.** It is what guarantees "no unnecessary
  requests" today. Any expiry policy trades some of that for freshness and
  should be driven by how often the catalogue really changes.
- **Not adopting RTK Query.** The statement asks for data loading in
  `useEffect`. If that constraint were lifted, RTK Query would replace the
  hand-written cache rules with less code.
