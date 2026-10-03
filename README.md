# OurCrowd Press Monitor

This README covers how to run it, the main decisions I made, what I tested, the limits I found along the way, and what I would change for a production system.

Quick links: [Quick start](#quick-start), [local environment](#local-env-used-during-development), [demo data](#why-the-demo-news-file-exists), [REST contracts](#rest-contracts), [tests](#tests-and-verification).

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

Development runs Angular and NestJS separately; Angular proxies `/api` to the backend. All backend entry points load the root `.env`, and process environment values override it. For production, `npm run build` builds both applications and `npm run start` serves Angular and REST through NestJS on port 3000. Package both build directories with their relative paths intact. `npm ci` installs the committed dependency versions.

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

`FileNewsProvider` validates every fixture record and selects the requested company and date range. It needs no API key and makes no HTTP requests. `NEWS_FIXTURE_PATH` overrides the repository-relative file path. Missing context still uses the existing enrichment fallback, so include useful descriptions when adding verified records.

With `NEWS_PROVIDER=file`, the collection command above calls neither GDELT nor publisher websites for the supplied demo records. It still calls local Ollama and writes new mentions to the configured PostgreSQL database.

`NEWS_PROVIDER=file` is intentionally the default for a predictable reviewer experience. GDELT remains available: set `NEWS_PROVIDER=gdelt` in `.env` or the process environment, then run the same collection command to use live discovery. Provider selection is separate from the GDELT cache flags `--live` and `--refresh`.

Existing news-only and collection commands use the selected provider. Startup logs `News provider: file` or `News provider: gdelt`. Unsupported values fail clearly; there is no automatic live fallback.

### Verified local end-to-end run

The committed BioCatch dataset was successfully used in a local run for `2026-Q3`:

- 5 BioCatch articles selected
- 5 mentions persisted
- 5 classified as `POSITIVE`
- dashboard returned BioCatch with `total=5` and `positive=5`

This verifies the end-to-end path, not model quality. Quality evaluation still needs real collected mentions and manual spot checking. Repeating the command skips already-stored company/URL pairs rather than inserting the same five mentions again. Dashboard totals can differ if your database already contains other BioCatch mentions for that quarter.

---

## Main technical decisions

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

## Logging and reviewer experience

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

## Development scope and rate limits

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

## Current limitations

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

## What I would do differently in production

I intentionally kept the submitted solution inside the boundaries of a relatively simple service.

For a larger production system I would probably change the execution model.

If throughput or deployment requirements grew, collection workers and a queue could provide bounded concurrency, retries, and backpressure. They would add operational work that is unnecessary for the current local review flow.

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

## Scope

The project has no authentication, hosted LLM dependency, message broker, Redis, Kubernetes, or microservice split. It uses real persistence, local inference, and the same collection pipeline for file and live discovery.

---

## Technical reference

## Database setup

PostgreSQL is required and can be run using the provided Docker Compose configuration. `.env` and `.env.example` include the connection details. Start the database from the repository root:

```bash
docker compose up -d
npm run db
```

Initialization creates the database schema using pending versioned migrations. Application startup also applies migrations automatically, so explicit initialization is optional. Repeating it does not reset data. TypeORM schema synchronization is disabled. This migration creates tables for companies, mentions, and TypeORM migration history.

Company fields: id, required non-blank name, nullable domain/sector, createdAt and updatedAt. Mention fields: id, companyId FK, title, nullable description, url, source, publishedAt, sentiment and discoveredAt. Sentiment is exactly POSITIVE/NEUTRAL/NEGATIVE. `UNIQUE(companyId, url)` prevents duplicates for one company while permitting the same article URL for different companies. There is no Article entity because the current scope does not need additional normalization.

## REST contracts

| Method/path | Result |
| --- | --- |
| GET /api/health | Process health. |
| GET /api/companies | All companies, ordered by name then id. |
| GET /api/companies/:id | One company; 404 if absent. |
| GET /api/companies/:id/mentions?from=...&to=...&sentiment=... | Filtered mentions, newest first; 404 if company absent. |
| GET /api/dashboard?quarter=YYYY-QN | Every company, quarter sentiment counts and all-time latest mention. Defaults to current UTC quarter. |

Before the explicit company import, empty-database responses are:

```json
[]
```

for `/api/companies`, and for `/api/dashboard?quarter=2026-Q3`:

```json
{ "quarter": "2026-Q3", "companies": [] }
```

Response shapes (contracts only, no sample records):

```typescript
type CompanyResponse = {
  id: number; name: string; domain: string | null; sector: string | null;
  createdAt: string; updatedAt: string; // UTC ISO timestamps
};
type MentionResponse = {
  id: number; companyId: number; title: string; description: string | null;
  url: string; source: string; publishedAt: string; discoveredAt: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
};
type DashboardResponse = {
  quarter: string;
  companies: Array<{
    id: number; name: string; lastMentionedAt: string | null;
    daysSinceLastMention: number | null;
    mentions: { total: number; positive: number; neutral: number; negative: number };
  }>;
};
```

Dates accept real YYYY-MM-DD values or ISO timestamps with an explicit timezone. Date-only bounds use UTC; `to=2026-09-30` includes September 30 using October 1 as an exclusive boundary. Timestamp `to` is inclusive. Quarter ranges are start-inclusive/end-exclusive. Invalid IDs, calendar dates, ranges, sentiment, quarter, repeated values or unknown query parameters return 400 through standard NestJS exceptions. Missing companies return 404. No external write endpoints exist; the collection pipeline calls MentionsService internally. Duplicate internal company/URL writes produce ConflictException.

Dashboard counts and days are derived at request time, not persisted. lastMentionedAt is the latest publishedAt across all time, independently of the selected quarter. Days mean elapsed full 24-hour periods, clamped to zero for future-dated publications. Never-mentioned companies get null lastMentionedAt/null daysSinceLastMention and zero counts.

## Company preparation and import

**Generated file: `backend/src/data/companies.json` is derived from the supplied TXT and should not normally be edited manually.** Both files are committed for review.

The single flow is: authoritative `backend/src/data/ourcrowd_companies.txt` → deterministic structured `backend/src/data/companies.json` → PostgreSQL runtime `companies` table. Preparation never modifies the supplied TXT, performs no internet lookup and preserves source order. Run explicitly from the repository root:

```bash
npm run companies:prepare
npm run companies
# Or prepare, initialize PostgreSQL through existing migrations, and import:
npm run companies:setup
```

Normal application startup neither prepares nor imports companies. The importer initializes the database using the current migrations; `npm run db` remains an optional standalone initialization. Missing TXT/JSON files produce actionable errors and nonzero exit codes. An empty list is a valid no-op. See [source format and policy](backend/src/data/README.md).

The supplied list has 258 companies. Import validates the complete file, uses exact domain/name matching, and reports inserted, updated, and unchanged counts. Repeating an unchanged import does not duplicate companies; absent companies are not deleted. Parsing and identity rules are documented in [the source-data policy](backend/src/data/README.md) and [architecture](docs/ARCHITECTURE.md#company-source-preparation-and-import).

## Local sentiment classification with Ollama

The assignment explicitly requires locally hosted Ollama. This implementation sends only company name, article title and an optional description/excerpt to a separate local Ollama process. It does not call cloud inference providers or insert/update any database record.

Install Ollama for your OS from https://ollama.com/download. Start the installed application or run `ollama serve` if the server is not already running. For local-only operation, disable cloud features in Ollama's server settings or set `OLLAMA_NO_CLOUD=1` in the **Ollama server environment** and restart it. This is separate from this application's `.env`; Node cannot configure an already-running Ollama server.

PowerShell, when launching a standalone server:

```powershell
$env:OLLAMA_NO_CLOUD = "1"
ollama serve
```

macOS/Linux, when launching a standalone server:

```bash
OLLAMA_NO_CLOUD=1 ollama serve
```

In another terminal, pull the selected local model:

```bash
ollama pull gemma3:270m
```

If you choose another model, set OLLAMA_MODEL and pull that exact local model instead. The application never pulls models automatically. The default compact `gemma3:270m` is an intentionally modest starting point for a constrained three-class classification problem, rather than general-purpose generation. Classification quality is **not proven**. Compact models can misread company attribution, mixed sentiment, negation, sarcasm or incomplete excerpts. Quality validation comes later using real collected mentions and manual spot checking; the configurable model can be replaced after evaluation.

Use the [local environment configuration](#local-env-used-during-development) above. Ollama receives company name, title, and an optional excerpt. It returns structured relevance/sentiment JSON, validated locally before use. Low temperature and a fixed seed reduce variance without guaranteeing identical output across model or hardware versions. See [architecture](docs/ARCHITECTURE.md#local-sentiment-classification) for request options and validation details.

Exact manual integration command, valid in PowerShell or Bash:

```bash
npm run sentiment:test -- --company 'Example Company' --title 'Example Company raises $50 million' --description 'The company announced a new funding round to expand globally.'
```

`npm run sentiment -- ...` is the equivalent direct command. It prints the chosen model followed by `Sentiment: POSITIVE`, `NEUTRAL` or `NEGATIVE` on success, and exits nonzero on failure. This is a **real HTTP integration command**, not a mock/demo mode. It does not open PostgreSQL, seed companies, create mentions or process stored records. Nest application startup also makes no inference request.

Malformed output, connection errors, and timeouts are reported as failures rather than NEUTRAL sentiment. The CLI exits nonzero on failure and does not modify the database.

Collection calls the classifier only for new URLs. Existing Mention records are not automatically reclassified. Scheduled collection is disabled by default. The Angular dashboard is implemented. Article enrichment fetches publisher pages when context is missing. No hosted AI service, email/Slack delivery, message broker, or browser-based scraping framework is used.

## News discovery with GDELT

GDELT DOC 2.0 is the first NewsProvider: public JSON news discovery with no API key, exact-phrase queries and explicit date ranges. GET `https://api.gdeltproject.org/api/v2/doc/doc` sends:

```text
query="BioCatch"
mode=ArtList
format=json
sort=DateDesc
maxrecords=250
startdatetime=YYYYMMDDHHMMSS
enddatetime=YYYYMMDDHHMMSS
```

Dates are UTC. Returned seendate is mapped into the current Mention publishedAt field; it may represent GDELT observation/indexing, **not a publisher-authoritative publication timestamp**. Source is the article URL hostname. Description is null because no excerpt is guaranteed; the collection pipeline may enrich a candidate from its publisher when context is missing. GDELT tone is ignored: only local Ollama supplies domain sentiment.

The default query is the primary company name in double quotes. A 2–6-letter uppercase acronym with one explicit multiword expanded alias uses that alias (SSI → Safe Superintelligence). Former aliases are never automatically searched (Ludeo remains Ludeo, not Edge). This is a deterministic selection rule, not semantic relevance/fuzzy matching. Generic names can still produce false positives, and titles alone may not reveal why an article matched. Semantic relevance is checked by local Ollama during collection.

Limitations: public API downtime/rate limiting, at most 250 articles per query/range (a warning is emitted at the cap), no automatic result pagination/time slicing, imperfect discovery coverage, uncertain publication timestamps, absent excerpts and stale cache. Live quarterly queries were tested against the public endpoint, but source coverage and range restrictions still apply. GDELT's documentation has changed over time; ArtList has documented restrictions to the latest three months of a requested window. A requested quarter is not a guarantee of exhaustive quarterly coverage. Use narrower explicit ranges when inspecting coverage; nothing silently substitutes a different quarter or fabricated data.

### Development cache and resilience

`data/cache/gdelt/` is runtime-only and ignored by git. A SHA-256 key of the complete encoded request URL distinguishes query, endpoint, parameters and date range. Entries retain company/query, from/to, request URL, fetchedAt and the actual raw response text. They are reparsed on every read.

- Default cached mode: use an existing entry; otherwise fetch, validate, cache and return.
- `--refresh`: fetch and replace the entry.
- `--live`: bypass cache reads/writes.

Corrupt cache fails clearly and asks for refresh; malformed provider envelopes are not cached. Individual invalid articles are skipped/reported. The timeout includes response-body reading. Requests are sequential in the workflows, with configurable minimum start spacing. Only HTTP 429/5xx retry, at most GDELT_MAX_RETRIES (0–3). Retry-After is honored up to 60 seconds; larger requested waits surface an error asking to retry later. Permanent 4xx, malformed responses, connection failures and timeouts do not retry. No general retry/cache framework.

Working local GDELT settings are shown below; these are environment overrides, not a list of code fallback defaults. The full local configuration is in [Local environment configuration](#local-env-used-during-development).

| Variable | Local value |
| --- | --- |
| GDELT_BASE_URL | https://api.gdeltproject.org/api/v2/doc/doc |
| GDELT_TIMEOUT_MS | 30000 |
| GDELT_REQUEST_DELAY_MS | 9000 |
| GDELT_MAX_RETRIES | 2 |
| GDELT_CACHE_PATH | data/cache/gdelt |

## Collection, failure handling and alerts

Select companies → NewsProvider → validate/normalize/deduplicate results → check stored company/URL → classify new articles sequentially → MentionsService.create → one console alert for newly persisted mentions.

Normalization and duplicate checks run before inference. PostgreSQL uniqueness protects insert races. Company/article failures are reported in the collection summary; unavailable Ollama or an unreliable existence check aborts the run. Persisted mentions remain stored if a later operation fails. Alerts cover newly persisted mentions only, and failed alert delivery does not roll back storage. Detailed policies are in [architecture](docs/ARCHITECTURE.md#collection-sequencing-and-failure-boundaries).

## Daily workflow

NestJS scheduling registers no daily timer unless enabled. Defaults:

```dotenv
DAILY_COLLECTION_ENABLED=false
DAILY_COLLECTION_CRON=0 8 * * *
DAILY_COLLECTION_TIMEZONE=Asia/Jerusalem
DAILY_COLLECTION_LOOKBACK_HOURS=48
```

To enable, set DAILY_COLLECTION_ENABLED=true in `.env` and restart the application. Cron/timezone/lookback are validated. The job runs once daily by default, uses all tracked companies and the recent rolling lookback with live news (no stale development cache). Overlapping scheduled/manual invocations within the same service instance are skipped with a log message. Overlapping lookbacks are safe through per-company URL uniqueness. This is a single-process application; no distributed lock exists, so do not run simultaneous manual and scheduled processes or multiple scheduler-enabled replicas.

`npm run daily:run` invokes that same daily service once, even with scheduling disabled; it never starts a cron timer. Run it only when intentionally triggering collection and inference. Startup with the default disabled setting makes no GDELT/Ollama request.

## Reviewer output export

`npm run data:export` reads PostgreSQL only and writes `data/output/mentions.json` and `data/output/company-status.json`. Mentions include company, title, source, URL, timestamp and sentiment; status includes every company with all-time latest mention/elapsed days and requested-quarter counts. It reuses DashboardService rather than duplicating aggregation. Default export quarter is previous; override with `-- --quarter=YYYY-QN` or current/previous.

Output is ordered and pretty JSON, stable for the same DB/quarter/evaluation time. Days are derived and naturally change as time passes. An empty export is explicitly identified as empty, not a successful assignment dataset. The committed `data/output/mentions.json` contains five verified BioCatch mentions, and `data/output/company-status.json` contains the clean 258-company dashboard export for 2026-Q3. Both were generated from PostgreSQL using the existing export command; no stale test data remains. See [data/output/README.md](data/output/README.md).

## Tests and verification

`npm test` runs an explicit list of database-free unit tests through Node's test runner and ts-node: company preparation, dates, mocked GDELT HTTP/cache behavior, mocked Ollama behavior, and file-provider/enrichment selection. They use temporary files and mocked boundaries, do not initialize PostgreSQL, and cannot reset the development database. Adding another test file does not automatically add it to the default command.

The database-backed `collection.test.ts`, `company-import.test.ts`, `persistence-api.test.ts` and mixed `scheduler-export.test.ts` were removed for this phase. The test database bootstrap/verification files (`create-test-db.ts`, `verify-test-db.ts`, `test-database.ts`, `test-database.test.ts`) and the `pretest` / `test:db:create` scripts were also removed. No destructive test setup is retained. Database integration coverage is deferred until it has a simple, safe isolated setup; the current unit suite does not claim to verify PostgreSQL persistence or REST end-to-end behavior.

```bash
npm run typecheck --workspace backend
npm test
npm run build --workspace backend
npm run build --workspace frontend
```

No live collection, inference, scheduled jobs or production imports are needed for these checks. To run the real file-based pipeline yourself, use the committed BioCatch records and follow the quick start above. That path intentionally writes new mentions to your configured PostgreSQL database.

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for implementation detail and [Selected Development Prompts](DEVELOPMENT_PROMPTS.md) for the prompt log. The UI includes Engineering Notes at `/about` and Development Prompts at `/ai-assistance`.

References: [GDELT DOC parameters](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/), [GDELT search-window update](https://blog.gdeltproject.org/doc-2-0-updates-1-5-year-searching-and-updated-mobile-interface/), [NestJS scheduling](https://docs.nestjs.com/application/task-scheduling), [Ollama generate](https://docs.ollama.com/api/generate).
