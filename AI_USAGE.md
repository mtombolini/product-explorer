# AI usage

Generative AI wrote most of this project, as the challenge requires. This
page is the summary. The complete record, phase by phase, with every
command that was run and its real result, is in
[docs/AI_LOG.md](docs/AI_LOG.md).

## Tools

- **Claude Code** (Anthropic, model Claude Opus) as a coding agent with
  access to the repository, a shell, Docker and a headless Chrome.
- **Sub-agents** started by that agent: builders (the infrastructure, the
  data layer and, later, the backend of the translated catalogue and of
  the specifications), read-only reviewers, a triage step and a fixer.

## How it was used

1. The candidate wrote a master prompt: the working agreement, the fixed
   technical decisions (stack, layers, import behaviour, table, API shape,
   state management, tests) and the direction of the interface.
2. The agent read the statement and that prompt and wrote
   [docs/SPEC.md](docs/SPEC.md) before any code: a requirements checklist,
   assumptions, conflicts and a design contract.
3. The project was built in phases against that contract. A phase was
   closed only after lint, tests and a Docker Compose run, and each
   decision was recorded in [docs/DECISIONS.md](docs/DECISIONS.md).
4. The candidate then used the running application and asked for changes:
   a second language, a toolbar for the list controls, no native form
   controls, a header that does not move the page, sorting by price,
   product text that follows the language, a logo, and specifications
   next to the description.
5. Independent AI reviewers examined the work four times: the first
   complete version (seven reviewers); the interface refinements and the
   sorting, in a review that was stopped after three of its four
   reviewers had answered and whose eight findings were handled; the
   backend of the translated catalogue and of the specifications (two
   reviewers each); and a final review of everything changed since the
   first one (four reviewers: frontend state and language, the interface
   in a browser, the catalogue text, the documents). Confirmed findings
   were fixed.

The master prompt asked the agent to stop for approval after each phase.
In this run the phases were executed in sequence, so the candidate's
review came afterwards, from the running application, the commit history
and the log.

## Representative prompts

From the master prompt:

> Optimise for code that is simple, conventional and easy to explain. Prefer
> boring and explicit over clever.

> Verify, do not assume. Check the current stable version and docs of each
> library before pinning it. Before declaring a phase done, run lint, tests
> and a clean `docker compose up`, and report what you actually ran and the
> result.

> Idempotent: upsert keyed on the Fake Store product id. Running it twice
> must not duplicate or corrupt data.

From the candidate after using the application (translated from Spanish):

> This selector should not be native. The filter buttons are too big, too
> tall and too rounded, and the total appears below them. Let us build one
> complete bar with the controls. When I scroll, the top bar moves.

> When I change the language, the product name does not change. Why? Nor
> the description.

> Descriptions are a paragraph. They could also be shown as
> specifications; reading a paragraph does not always help. And are we
> bringing all the data from the API? That matters.

To each reviewer:

> Report only what you can back with evidence: a file and line, or a
> command and its real output. Try to reproduce before you report. An
> empty list is a valid and good answer.

## What was accepted

- The design of the specification: three containers, the layers `api`,
  `services` and `repositories`, the import as a command with an upsert,
  the API contract, the Redux slice with a cache by query and by id, and
  the catalogue state in the URL.
- The code of each phase, once its checks passed.
- Eight findings of the first independent review, after duplicates among
  the 43 that were raised had been merged, two from the review of the
  translation backend, and eight from the final review.
- Spanish titles and descriptions for the 20 products, and a short list
  of specifications for each in both languages, written by the model from
  what Fake Store says and stored as catalogue data.

## What was rejected or changed

A selection; the log has all of them.

- **Latest TypeScript and ESLint.** The lint plugins do not support them
  yet, so both are one major version behind.
- **`HEAD` requests for images.** The image host answers them with a bot
  challenge; the import uses `GET` only.
- **A catch-all exception handler for the 500 case.** Its response missed
  the request id; the middleware answers it instead.
- **Unbounded `page` and product id.** A huge number reached the database
  and failed there. Both are bounded and answer 422.
- **A sticky header that changes height.** Measured in Chrome, its height
  changed direction four times in 300 ms during a slow scroll. It was
  replaced by a fixed header with a spacer.
- **A bundle size written down from an old measurement** (604 kB). It
  was measured again and the documents corrected (about 800 kB now).
- **Product translations as a dictionary in the frontend.** Catalogue
  text is data: it went to a table in the database, behind the API.
- **Splitting a description into bullets in the browser.** Punctuation
  is not structure; the key facts became rows of label and value instead.
- **Two commits from a sub-agent that did not compile.** A reviewer found
  a misplaced line in two intermediate, unpushed commits. They were
  rebuilt with the line in place; the final content did not change.
- **Sort tests that proved nothing.** A reviewer showed they passed with
  the tie-breaker removed; they were rewritten until they failed without
  it.
- **An example response in the README written from memory.** It did not
  match the example query and was replaced by the real answer of the API.
- **Sorting the visible page in the browser.** It would order twelve
  products, not the catalogue; the database orders.
- **The other review findings.** Matters of taste, known limitations and
  deliberate decisions were set aside, each with a reason.

## How the output was verified

- **Static checks.** `ruff` and `pycodestyle` at 79 characters for Python;
  ESLint with accessibility rules, strict TypeScript and Prettier for the
  frontend.
- **Tests.** 122 backend tests against PostgreSQL and 74 frontend tests,
  both run in containers. None calls the real Fake Store API.
- **A clean clone.** With no `.env` file, `docker-compose up` gave three
  healthy containers, 20 products and 20 images. The import was run again
  to check it changes nothing, and the backend was restarted with Fake
  Store unreachable to check it keeps serving.
- **A real browser.** Scripted sessions in headless Chrome recorded every
  request: opening a product and going back makes none, a search makes
  one, and nothing goes to another origin. The same sessions checked
  three widths, both languages, the keyboard and scroll restoration.
- **Accessibility.** Lighthouse scored 100 on the catalogue and the
  product page, and the contrast of every colour pair was computed.
- **Independent review.** Reviewers with different concerns, a triage
  step that tried to refute each finding, and a fixer.

## What was not verified

- The CI workflow has not run on GitHub; it was only linted.
- No screen reader session, and no browser other than Chrome.
- The Spanish copy, the translated product text and the specifications
  were not read by a second person.
- The fixes of the final review, and the changes made after it (search
  that ignores accents, the Spanish text in a neutral register, and the
  repair of a regression that one of those fixes had caused in scroll
  restoration on narrow screens), were checked with tests and in the
  browser, not by another reviewer.
- One frontend test run failed once while the development machine was
  going to sleep, and the failing test was not identified. Every later
  run passed.

## Changes after the candidate's second review

The candidate reviewed the running application and asked for a taxonomy
of specifications by product family, a clearer price and rating, category
icons, browser language detection, 44 px controls, the test runners out
of the main Compose file and a README header. The agent made these
changes without sub-agents. They were checked with the tests and in
headless Chrome, not by an independent reviewer, and Lighthouse was not
run again. Details are in `docs/AI_LOG.md`.

## Human review

This section is for the candidate's own notes: what was read, questioned,
tested by hand or changed after the agent's run. It was empty when the
agent made its last commit.
