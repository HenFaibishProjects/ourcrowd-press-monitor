# OurCrowd Press Monitor - Reviewer Guide

This file is meant to give a practical view of the project: how to run it, the main decisions I made, what I tested, the limits I found along the way, and what I would change for a production system.

## What the project does

The application tracks press mentions for companies from the supplied OurCrowd company list.

The main flow is:

```text
OurCrowd company list
        |
        v
PostgreSQL
        |
        v
File fixtures (default) or GDELT live discovery
        |
        v
URL normalization + duplicate check
        |
        v
Article enrichment only when context is missing
        |
        v
Local Ollama analysis
(relevance + sentiment)
        |
        v
PostgreSQL mentions
        |
        +--> REST API / dashboard data
        |
        +--> console alert for new mentions
```

There is also a daily scheduled flow that uses the same collection service. It is disabled by default so simply starting the application does not trigger external news requests or local LLM work.

The backend is a NestJS modular monolith. The frontend is Angular. PostgreSQL is used for persistence, and Ollama is used locally for the text-understanding part of the assignment.

---

## Quick start

You will need Node.js 24.19, npm 10 or newer, Docker / Docker Compose, and Ollama.

Create a root `.env` using the configuration below. Make sure the local Ollama server is running: the desktop application may already provide it; otherwise run `ollama serve` in a separate terminal.

From the repository root, the recommended deterministic review path is:

```bash
npm install
docker compose up -d
npm run db
npm run companies:setup
ollama pull gemma3:270m
npm run collect -- --companies=BioCatch --quarter=2026-Q3
npm run data:export -- --quarter=2026-Q3
npm run dev
```

Company setup imports the supplied list, currently 258 companies. The fixed quarter matches the committed demo records, so the review does not change when the current quarter changes. Exported JSON is written under `data/output/`.

- Angular: [http://localhost:4200](http://localhost:4200)
- Swagger: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- Dashboard API: [http://localhost:3000/api/dashboard?quarter=2026-Q3](http://localhost:3000/api/dashboard?quarter=2026-Q3)
- Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Local `.env` used during development

`.env` itself is intentionally not committed. This is the local configuration used for the working setup. The credentials below are for the local development database.

```dotenv
DB_HOST=127.0.0.1
DB_PORT=5433
DB_USERNAME=ourcrowd
DB_PASSWORD=ourcrowd
DB_DATABASE=ourcrowd_press_monitor

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:270m
OLLAMA_TIMEOUT_MS=60000

GDELT_BASE_URL=https://api.gdeltproject.org/api/v2/doc/doc
GDELT_TIMEOUT_MS=30000
GDELT_REQUEST_DELAY_MS=9000
GDELT_MAX_RETRIES=2
GDELT_CACHE_PATH=data/cache/gdelt

DAILY_COLLECTION_ENABLED=false
DAILY_COLLECTION_CRON=0 8 * * *
DAILY_COLLECTION_TIMEZONE=Asia/Jerusalem
DAILY_COLLECTION_LOOKBACK_HOURS=48

TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=5433
TEST_DB_USERNAME=ourcrowd
TEST_DB_PASSWORD=ourcrowd
TEST_DB_DATABASE=ourcrowd_press_monitor_test

NEWS_PROVIDER=file
NEWS_FIXTURE_PATH=data/fixtures/demo-news.json
```

The `TEST_DB_*` entries are legacy local values. Current code does not consume them, and they are not required for normal application startup or `npm test`. The old destructive database integration tests and their bootstrap helpers were removed from the normal test setup. The current command runs database-free unit tests; reviewers do not need to create a test database.

## Why the demo news file exists

GDELT is the original live provider. It was tested against the real public endpoint during development. Those runs repeatedly returned HTTP 429 rate-limit responses and occasionally failed because the service was temporarily unavailable.

The goal of the take-home is to demonstrate the application and its data-processing flow, without making the reviewer depend on a third-party public service being available at that exact moment. A deterministic file-based provider was added for local review and demos. This is a scope and reliability decision, with the live-provider limitation documented openly.

`data/fixtures/demo-news.json` contains a small BioCatch dataset of real, verified news records, rather than invented articles. The data is not inserted directly into PostgreSQL. It enters through the existing `NewsProvider` abstraction and follows the same real application flow:

`FileNewsProvider` → `CollectionService` → normalization/deduplication → local Ollama relevance + sentiment → PostgreSQL → dashboard/API → alerts.

Only the discovery source is deterministic. The rest of the pipeline remains real. Descriptions are included in the demo records so review does not depend on publisher websites allowing page fetching or scraping.

With `NEWS_PROVIDER=file`, the collection command above calls neither GDELT nor publisher websites for the supplied demo records. It still calls local Ollama and writes new mentions to the configured PostgreSQL database.

`NEWS_PROVIDER=file` is intentionally the default for a predictable reviewer experience. GDELT remains available: set `NEWS_PROVIDER=gdelt` in `.env` or the process environment, then run the same collection command to use live discovery. Provider selection is separate from the GDELT cache flags `--live` and `--refresh`.

### Verified local end-to-end run

The committed BioCatch dataset was successfully used in a local run for `2026-Q3`:

- 5 BioCatch articles selected
- 5 mentions persisted
- 5 classified as `POSITIVE`
- dashboard returned BioCatch with `total=5` and `positive=5`

This verifies the end-to-end path, not model quality. Quality evaluation still needs real collected mentions and manual spot checking. Repeating the command skips already-stored company/URL pairs rather than inserting the same five mentions again. Dashboard totals can differ if your database already contains other BioCatch mentions for that quarter.

---

## Useful manual commands

I kept the external integrations easy to test separately. This made it possible to verify one boundary at a time instead of debugging the whole pipeline at once.

### Check news discovery only

This uses the selected news provider, without Ollama or Mention writes. Set `NEWS_PROVIDER=gdelt` explicitly if you want to call GDELT:

```bash
npm run news -- --companies=BioCatch --quarter=2026-Q3 --live
```

There are also development helpers for a small real-company scope:

```bash
npm run news:dev
npm run news:dev:refresh
```

The development scope uses:

```text
SpaceX
BioCatch
ZutaCore
```

These are real companies from the supplied list. I did not create a second fake company table for development.

### Check Ollama only

```bash
npm run sentiment:test -- --company "BioCatch" --title "BioCatch announces new fraud prevention technology"
```

### Run the real collection flow for one company

```bash
npm run collect -- --companies=BioCatch --quarter=2026-Q3 --live
```

### Run the small development collection

```bash
npm run collect:dev
```

### Run the full company set

```bash
npm run collect:all
```

I would only use the full command when needed. More on that in the rate-limit section below.

### Export reviewer data

After a successful collection:

```bash
npm run data:export -- --quarter=2026-Q3
```

The export writes reviewer-friendly JSON under:

```text
data/output/
```

---

# Main technical decisions

## Why NestJS

I chose NestJS because the task is small enough for one service, but large enough that a plain Express application would quickly become a collection of unrelated handlers and utility files.

Nest gave me a few things that fit this assignment well:

- clear feature modules
- dependency injection
- simple boundaries around the news provider, sentiment classifier and alert service
- standard validation and HTTP error handling
- built-in scheduling support
- a structure that is easy to read without introducing microservices

The application is intentionally a modular monolith.

I did not split collection, news, sentiment and scheduling into separate services because that would add deployment and operational work without adding much value for a take-home project. The boundaries are still there, so those parts could be separated later if the system grew.

The main point was to keep the code easy to follow from top to bottom.

---

## Why PostgreSQL

The assignment allows either files or a lightweight database. I chose PostgreSQL because the data naturally has relationships and constraints that are useful here.

For example:

```text
Company
  |
  +-- many Mentions
```

A mention is unique per company and URL:

```text
UNIQUE(companyId, url)
```

That gives the database the final say on duplicate protection, including race conditions.

PostgreSQL also made sense for:

- quarterly aggregation
- filtering by dates and sentiment
- keeping the company list separate from mention data
- migrations
- a setup that is still simple to run locally with Docker
- staying reasonably close to how I would store this data in a real service

The database runs in Docker and is exposed on host port `5433` so it does not conflict with a common local PostgreSQL installation on `5432`.

---

## Why GDELT

I wanted a news source that could be called without requiring a paid account or placing a secret API key in the submission.

GDELT provides:

- public access
- JSON responses
- date ranges
- exact phrase searches
- enough historical coverage to exercise the quarterly flow

The tradeoff is that it is a public service, so it needs to be treated politely.

During live testing, GDELT returned HTTP 429 and explicitly requested that calls be spaced at least five seconds apart. The working local configuration spaces requests nine seconds apart and uses bounded retries for rate limits and temporary server failures.

The raw GDELT response can also be cached locally during development, so repeating the same test does not need to hit the public service again.

I do not treat GDELT as a perfect source of truth. Its coverage can be incomplete, it caps results, and its `seendate` is an observation/indexing timestamp rather than a guaranteed publisher publication time.

Those limitations are kept visible instead of being hidden.

---

## Why article enrichment was added

A useful issue showed up during real testing.

A BioCatch query returned 76 candidate articles, and some of the first results were clearly not articles about BioCatch.

That made it clear that news discovery and relevance are two different problems.

GDELT is the live discovery layer. If a candidate has no supplied description, the application tries to fetch its page before Ollama and extracts a small amount of useful text:

- page title
- meta / OpenGraph description
- paragraph text
- normalized whitespace

The amount of text is capped before it is sent to the local model.

If an article cannot be fetched, that single article does not fail the whole company. The classifier can fall back to the information that came from GDELT.

This keeps the collection flow resilient while still giving the model more context than a headline alone when possible.

---

## Why Ollama

The assignment specifically asks for a locally hosted Ollama model for sentiment and text understanding, so I kept the whole inference boundary local.

No cloud LLM API is used by the running application.

The classifier makes one local call that answers two questions together:

```json
{
  "relevant": true,
  "sentiment": "POSITIVE"
}
```

or:

```json
{
  "relevant": false,
  "sentiment": null
}
```

Combining relevance and sentiment into one call was deliberate.

Doing two separate model calls for every article would roughly double the local inference work and make the pipeline slower for no real benefit.

The output is validated strictly. Technical errors are not silently converted to `NEUTRAL`, and malformed model output is treated as a real failure.

---

## Why `gemma3:270m`

I chose `gemma3:270m` as the default because this project does not need a large general-purpose model.

The job is narrow:

- decide whether an article is meaningfully about a company
- classify the company-specific sentiment as positive, neutral or negative

A very small model also makes the project easier for a reviewer to run on a normal development machine.

This is a practical default, not a claim that it is the best possible model.

The model name is configurable through:

```dotenv
OLLAMA_MODEL=gemma3:270m
```

For a real production system I would evaluate several local models against a manually labeled sample and choose based on measured precision, recall, latency and hardware cost.

---

## Why inference is sequential

Ollama classification currently runs sequentially.

That keeps local resource usage predictable and avoids accidentally starting many inference requests on a reviewer's machine.

It also makes failures and logs easier to understand.

For this assignment, predictable behavior was more useful than maximum throughput.

With production traffic I would use bounded concurrency or queue-backed workers rather than an unlimited parallel loop.

---

# Company list handling

The supplied company file stays the source of truth.

The flow is:

```text
backend/src/data/ourcrowd_companies.txt
        |
        v
backend/src/data/companies.json
        |
        v
PostgreSQL companies table
```

Preparation is deterministic and does not use an external lookup service.

The original text file is not modified.

The preparation step handles the small amount of structure that exists in the supplied names, such as:

- an explicit domain in parentheses
- a former company name
- an expanded acronym

The database stores the runtime fields needed by the application. Source-only parsing metadata does not need to become part of the database schema.

I avoided fuzzy company matching during import because silently merging two company identities would be much worse than failing clearly.

---

# Duplicate handling

Duplicate protection happens before local inference whenever possible.

The flow is:

```text
normalize URL
    |
    v
duplicate in current provider result?
    |
    v
already stored for this company?
    |
    v
only then fetch/enrich/classify
```

This matters because article fetching and local inference are the expensive parts of the pipeline.

The database also keeps the final uniqueness constraint on:

```text
(companyId, url)
```

so an application-level race still cannot create duplicate mentions for the same company.

The same article is allowed to be associated with different companies.

---

# Logging and reviewer experience

I put some effort into making the command-line flow easy to understand.

The application logs useful operational events such as:

- application startup
- database initialization
- company processing
- GDELT cache hit / miss / bypass
- external fetches
- rate-limit retries and wait time
- enrichment failures
- classification failures
- skipped irrelevant articles
- inserted mentions
- alert failures
- final collection summary

I tried to avoid logging every internal method call. The goal is to show what the application is doing without turning the output into noise.

Errors are also meant to be actionable. For example, missing company setup, unavailable Ollama, a bad date range or a GDELT rate limit should produce a clear reason rather than just a generic failure.

Swagger is included so the read APIs can be inspected without needing to know the frontend code.

---

# Development scope and rate limits

I intentionally did not repeatedly run live collection across all 258 companies while developing the project.

That would be unfriendly to a public API and would make local iteration unnecessarily slow.

Instead, most development checks used a small real-company scope:

```text
SpaceX
BioCatch
ZutaCore
```

I also used single-company live tests when debugging GDELT behavior.

This was enough to verify that live news discovery works. For example, a live BioCatch quarterly search returned real candidate articles.

The public GDELT endpoint asked for at least five seconds between requests during testing, so the working local configuration uses nine seconds between requests.

With 258 companies, even the news-discovery part of a full live run has a meaningful minimum runtime before article enrichment and local LLM inference are added.

For that reason I prefer:

```bash
npm run collect:dev
```

during development and reserve:

```bash
npm run collect:all
```

for an intentional full run.

This is also why the news cache exists.

---

# Daily collection

The daily job uses the same collection pipeline rather than creating a second implementation.

By default it is disabled:

```dotenv
DAILY_COLLECTION_ENABLED=false
```

That means starting the application is safe and does not suddenly make hundreds of external calls.

It can be enabled explicitly with:

```dotenv
DAILY_COLLECTION_ENABLED=true
```

The default schedule is:

```text
08:00 Asia/Jerusalem
```

The daily run uses a rolling lookback and relies on URL uniqueness to make overlapping windows safe.

---

# Alerts

For this assignment, a new mention produces a visible console alert.

I kept the alert behind an `AlertService` boundary.

That gives a simple implementation now, while leaving an obvious place to add:

- email
- Slack / Teams
- webhook delivery
- notification service integration

without changing the collection flow.

A failed alert does not roll back a mention that was already stored successfully.

---

# Current limitations

There are several limitations I would keep in mind when reviewing the result.

### GDELT is a discovery source, not a guaranteed complete news archive

A query can miss coverage, return false-positive candidates, hit a public rate limit or reach its result cap.

### Publication time is not perfect

The timestamp supplied by GDELT can represent when GDELT saw an article rather than the publisher's canonical publication time.

### Article extraction is intentionally lightweight

The enrichment step is not a full browser-based crawler.

Some publishers block automated requests, require JavaScript, use unusual HTML, or place content behind a paywall.

When extraction fails, the run continues with less context.

### The local model is deliberately small

`gemma3:270m` is easy to run, but it can still make classification mistakes.

A production model choice should be based on labeled evaluation data, not just model size.

### The public news API limits throughput

The current request spacing is conservative because GDELT returned 429 during live testing.

### The scheduler is single-process

There is an in-process overlap guard, but no distributed lock between several application instances.

That is fine for the scope of this project, but not how I would run several production replicas.

---

# What I would do differently in production

I intentionally kept the submitted solution inside the boundaries of a relatively simple service.

For a larger production system I would probably change the execution model.

A more scalable version could look like:

```text
Scheduler / trigger
      |
      v
Company collection jobs
      |
      v
Queue / PubSub
      |
      +--> news discovery worker
      |
      +--> article enrichment worker
      |
      +--> local inference worker
      |
      +--> persistence
      |
      +--> notification subscriber
```

Depending on the hosting environment, that could use something like:

- Google Pub/Sub
- AWS SQS/SNS
- RabbitMQ
- Kafka, if the wider platform already justified it

I would not add one of those only because it sounds more advanced.

For this take-home task, a broker would add setup, failure modes and documentation without proving much more about the core problem.

In production, a queue would become useful because it would give:

- independent retry policies
- backpressure
- bounded worker concurrency
- dead-letter handling
- easier horizontal scaling
- isolation between slow article fetches and slow model inference

I would also consider:

- a managed news provider with an SLA if completeness matters
- scheduled orchestration outside the application process
- a distributed lock or idempotent job table
- metrics and dashboards for fetch/classification success rates
- structured tracing
- a stronger article extraction library or browser worker
- model-quality evaluation with a labeled dataset
- separate notification subscribers
- secrets managed outside local `.env`
- managed PostgreSQL with backups and monitoring

The main reason those are not in this repository is scope, not because the current design assumes one process is the final architecture.

---

# Things I deliberately did not add

I tried to avoid adding infrastructure just to make the project look bigger.

There is no:

- Kafka
- Redis
- Kubernetes setup
- microservice split
- authentication layer
- cloud LLM dependency
- separate fake development company database

None of those are required to demonstrate the requested flow.

The focus stayed on:

- understandable code
- clear boundaries
- real persistence
- real news discovery
- local text understanding
- safe duplicate handling
- useful logs
- explicit failure behavior
- a path that can grow later without rewriting everything

---

# A note on tradeoffs

There are places where a smaller implementation would have been possible.

For example:

- Express would have required less framework setup than NestJS.
- title-only classification would have avoided article enrichment.
- a larger Ollama model might improve some classifications.

I chose the current balance because I wanted the project to remain easy to run while still looking like a service I would be comfortable maintaining.

Where I found a real issue during runtime testing, I preferred to make the behavior explicit rather than hide it. The GDELT rate limit and the false-positive BioCatch results are good examples of that.

---

# Suggested review path

Follow the fixed-quarter commands in [Quick start](#quick-start), then inspect Swagger and the `2026-Q3` dashboard response. That path uses the committed BioCatch records and exercises local inference, persistence, dashboard aggregation and alerts without starting a full-company live collection.
