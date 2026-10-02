# Project structure

Generated build output and dependencies are excluded below. All files are explained individually.

```text
ourcrowd-press-monitor/
  .env.example
  .gitignore
  .nvmrc
  README.md
  backend/nest-cli.json
  backend/package.json
  backend/src/alerts/alert-service.ts
  backend/src/alerts/alerts.module.ts
  backend/src/alerts/console-alert.service.ts
  backend/src/app.module.ts
  backend/src/collection/collection-cli.module.ts
  backend/src/collection/collection-options.ts
  backend/src/collection/collection-result.ts
  backend/src/collection/collection.cli.ts
  backend/src/collection/collection.module.ts
  backend/src/collection/collection.service.ts
  backend/src/common/README.md
  backend/src/common/company-id.dto.ts
  backend/src/common/dates.ts
  backend/src/common/validation.ts
  backend/src/companies/companies-import.module.ts
  backend/src/companies/companies-prepare.cli.ts
  backend/src/companies/companies.cli.ts
  backend/src/companies/companies.controller.ts
  backend/src/companies/companies.module.ts
  backend/src/companies/companies.repository.ts
  backend/src/companies/companies.service.ts
  backend/src/companies/company-preparation.ts
  backend/src/companies/company-search.service.ts
  backend/src/companies/company-seed.service.ts
  backend/src/companies/company-seed.ts
  backend/src/companies/company.entity.ts
  backend/src/config/environment.ts
  backend/src/config/runtime.config.ts
  backend/src/dashboard/dashboard-query.dto.ts
  backend/src/dashboard/dashboard-response.dto.ts
  backend/src/dashboard/dashboard.controller.ts
  backend/src/dashboard/dashboard.module.ts
  backend/src/dashboard/dashboard.repository.ts
  backend/src/dashboard/dashboard.service.ts
  backend/src/dashboard/quarter.ts
  backend/src/data/README.md
  backend/src/data/companies.json
  backend/src/data/ourcrowd_companies.txt
  backend/src/database/database.config.ts
  backend/src/database/initialize.ts
  backend/src/database/migrations/1790856000000-initial-schema.ts
  backend/src/export/data-export.cli.ts
  backend/src/export/data-export.service.ts
  backend/src/health/health.controller.ts
  backend/src/health/health.module.ts
  backend/src/main.ts
  backend/src/mentions/mention.entity.ts
  backend/src/mentions/mention.types.ts
  backend/src/mentions/mentions-query.dto.ts
  backend/src/mentions/mentions.controller.ts
  backend/src/mentions/mentions.module.ts
  backend/src/mentions/mentions.repository.ts
  backend/src/mentions/mentions.service.ts
  backend/src/mentions/sentiment.enum.ts
  backend/src/news/gdelt-cache.ts
  backend/src/news/gdelt-news.provider.ts
  backend/src/news/gdelt.config.ts
  backend/src/news/news-cli.module.ts
  backend/src/news/news-provider.ts
  backend/src/news/news.cli.ts
  backend/src/news/news.module.ts
  backend/src/news/url-normalization.ts
  backend/src/scheduler/daily-collection.service.ts
  backend/src/scheduler/daily-run.module.ts
  backend/src/scheduler/daily.cli.ts
  backend/src/scheduler/daily.config.ts
  backend/src/scheduler/scheduler.module.ts
  backend/src/sentiment/ollama-sentiment.classifier.ts
  backend/src/sentiment/ollama.config.ts
  backend/src/sentiment/sentiment-classifier.ts
  backend/src/sentiment/sentiment.cli.ts
  backend/src/sentiment/sentiment.module.ts
  backend/test/collection.test.ts
  backend/test/company-import.test.ts
  backend/test/company-preparation.test.ts
  backend/test/dates.test.ts
  backend/test/news.test.ts
  backend/test/persistence-api.test.ts
  backend/test/scheduler-export.test.ts
  backend/test/sentiment.test.ts
  backend/tsconfig.build.json
  backend/tsconfig.json
  data/README.md
  data/output/README.md
  docs/ARCHITECTURE.md
  docs/PROJECT_STRUCTURE.md
  frontend/angular.json
  frontend/package.json
  frontend/proxy.conf.json
  frontend/src/app/app.component.ts
  frontend/src/app/app.config.ts
  frontend/src/app/app.routes.ts
  frontend/src/app/core/README.md
  frontend/src/app/features/dashboard/components/README.md
  frontend/src/app/features/dashboard/dashboard.component.ts
  frontend/src/app/models/README.md
  frontend/src/app/services/README.md
  frontend/src/index.html
  frontend/src/main.ts
  frontend/src/styles.css
  frontend/tsconfig.app.json
  frontend/tsconfig.json
  package-lock.json
  package.json
```

## Folders

| Folder | Purpose |
| --- | --- |
| backend | Independent NestJS workspace. |
| backend/src | Application composition and feature modules. |
| backend/src/{companies,mentions,news,sentiment,collection,scheduler,alerts,dashboard} | One folder per feature; companies/mentions/dashboard/sentiment have implementations, collection/news/scheduler/alerts now implement the backend workflow. |
| backend/src/config | Minimal runtime configuration. |
| backend/src/common | Reserved shared infrastructure. |
| backend/src/data | Committed authoritative TXT and generated structured company JSON. |
| backend/src/health | Process health endpoint. |
| frontend | Independent Angular workspace. |
| frontend/src | Browser bootstrap, document, and styles. |
| frontend/src/app | Root Angular composition. |
| frontend/src/app/core | Reserved application-wide infrastructure. |
| frontend/src/app/models | Reserved typed frontend models. |
| frontend/src/app/services | Reserved REST clients. |
| frontend/src/app/features | Feature-oriented UI areas. |
| frontend/src/app/features/dashboard | Minimal routed dashboard shell. |
| frontend/src/app/features/dashboard/components | Reserved feature-local UI components. |
| docs | Architecture and project navigation documentation. |

## Files

| File | Purpose |
| --- | --- |
| `.gitignore` | Excludes dependencies, builds, caches, local .env, SQLite state and logs; .env.example is committed. |
| `.nvmrc` | Pins the recommended Node runtime. |
| `README.md` | Setup, migration/database commands, REST contracts, validation/date semantics, seed preparation and tests. |
| `backend/nest-cli.json` | Nest CLI source and clean-build settings. |
| `backend/package.json` | Nest, TypeORM, SQLite and validation dependencies; development/build/production/test/db:init/company preparation/import scripts. |
| `backend/src/alerts/alerts.module.ts` | Registers the console adapter and ALERT_SERVICE token; no controller. |
| `backend/src/app.module.ts` | Composes features, TypeORM initialization/migrations, health and production Angular static serving. |
| `backend/src/collection/collection.module.ts` | Composes feature services and provider tokens for the shared sequential collection pipeline. |
| `backend/src/common/README.md` | Explains the concrete shared validation/date/ID utilities. |
| `backend/src/companies/companies.module.ts` | Registers company repository, service, importer, search metadata/selection and read-only REST controller. |
| `backend/src/config/runtime.config.ts` | Lazily validates PORT and reads NODE_ENV after environment loading. |
| `backend/src/dashboard/dashboard.module.ts` | Registers aggregate read repository, derivation service and dashboard REST controller. |
| `backend/src/health/health.controller.ts` | GET /api/health returns actual process liveness; no business data. |
| `backend/src/health/health.module.ts` | Registers the infrastructure health controller. |
| `backend/src/main.ts` | Nest bootstrap, /api prefix, global DTO validation, shutdown hooks and listening port. |
| `backend/src/mentions/mentions.module.ts` | Registers mention persistence, services and the nested REST controller; imports CompaniesModule. |
| `backend/src/news/news.module.ts` | Registers GDELT adapter and NEWS_PROVIDER token; no controller. |
| `backend/src/scheduler/scheduler.module.ts` | Registers normal NestJS scheduling once and a configurable daily timer only when enabled. |
| `backend/src/sentiment/sentiment.module.ts` | Registers the local adapter and SentimentClassifier token; no HTTP controller or automatic processing. |
| `backend/tsconfig.build.json` | Build-specific TypeScript exclusions. |
| `backend/tsconfig.json` | Strict TypeScript, decorator metadata, CommonJS output, and source maps. |
| `docs/ARCHITECTURE.md` | Current persistence/API architecture, SQLite schema/trade-offs, derived data, future diagrams, runtime modes and deferred integrations. |
| `docs/PROJECT_STRUCTURE.md` | This complete file and folder map. |
| `frontend/angular.json` | Angular CLI browser build, production budgets, independent dev server, and proxy configuration. |
| `frontend/package.json` | Angular dependencies and dev/build/template-typecheck scripts; TypeScript 6.0. |
| `frontend/proxy.conf.json` | Forwards /api and descendants to localhost:3000 during development. |
| `frontend/src/app/app.component.ts` | Root shell containing the router outlet. |
| `frontend/src/app/app.config.ts` | Registers router and HttpClient providers; makes no API calls. |
| `frontend/src/app/app.routes.ts` | Lazily loads the dashboard shell at the root route. |
| `frontend/src/app/core/README.md` | Reserved application-wide providers and HTTP infrastructure. |
| `frontend/src/app/features/dashboard/components/README.md` | Reserved dashboard presentation components; no fake UI datasets. |
| `frontend/src/app/features/dashboard/dashboard.component.ts` | Displays only Press Mentions Monitoring. |
| `frontend/src/app/models/README.md` | Reserved future typed models; no domain data yet. |
| `frontend/src/app/services/README.md` | Reserved future REST clients and relative /api URL convention. |
| `frontend/src/index.html` | Browser document, title, viewport, base URL, and Angular host element. |
| `frontend/src/main.ts` | Bootstraps the standalone Angular application. |
| `frontend/src/styles.css` | Minimal page spacing and typography. |
| `frontend/tsconfig.app.json` | Application-specific compiler inputs and output settings. |
| `frontend/tsconfig.json` | Strict frontend TypeScript and Angular template checks. |
| `package-lock.json` | Locks the resolved dependency tree for reproducible npm ci installs. |
| `package.json` | Defines workspaces and root build/dev/database/company/sentiment/news/collection/daily/export scripts with workspace argument forwarding. |

## Added persistence/API files

| File | Purpose |
| --- | --- |
| `backend/src/common/company-id.dto.ts` | Validates canonical positive integer route IDs and rejects unsafe numbers. |
| `backend/src/common/dates.ts` | Strict calendar/timestamp validation, UTC date bounds, SQLite datetime conversion and elapsed-day calculation. |
| `backend/src/common/validation.ts` | Reusable global ValidationPipe configuration, also used by HTTP tests. |
| `backend/src/companies/company.entity.ts` | Company fields, optional domain/sector, required-name constraint and timestamps. |
| `backend/src/companies/companies.repository.ts` | TypeORM company reads and conservative transactional seed import. |
| `backend/src/companies/companies.service.ts` | Company access and standard missing-company handling. |
| `backend/src/companies/companies.controller.ts` | Read-only company list/detail REST endpoints. |
| `backend/src/mentions/sentiment.enum.ts` | Exactly POSITIVE, NEUTRAL and NEGATIVE stored classifications. |
| `backend/src/mentions/mention.entity.ts` | Company relationship, mention fields, composite uniqueness and company/date index. |
| `backend/src/mentions/mention.types.ts` | Typed internal persistence input and repository filter contracts. |
| `backend/src/mentions/mentions-query.dto.ts` | Validates optional date/sentiment HTTP filters. |
| `backend/src/mentions/mentions.repository.ts` | Filtered ordered reads, existence checks and TypeORM writes and ordered all-mention export reads. |
| `backend/src/mentions/mentions.service.ts` | Company existence, range semantics and internal duplicate conflict handling; collection uses its internal create/exists boundary; export uses ordered reads. |
| `backend/src/mentions/mentions.controller.ts` | Read-only GET company mentions endpoint. |
| `backend/src/dashboard/quarter.ts` | Quarter validation, current UTC default and inclusive/exclusive boundaries. |
| `backend/src/dashboard/dashboard-query.dto.ts` | Validates optional quarter query. |
| `backend/src/dashboard/dashboard-response.dto.ts` | Typed dashboard response contract. |
| `backend/src/dashboard/dashboard.repository.ts` | One aggregate read query for quarter counts and all-time latest publication. |
| `backend/src/dashboard/dashboard.service.ts` | Derives timestamps and elapsed days; accepts controlled evaluation time for deterministic export/tests. |
| `backend/src/dashboard/dashboard.controller.ts` | Read-only GET dashboard endpoint. |
| `backend/src/database/database.config.ts` | SQLite path resolution, directory creation, registered entities/migrations and disabled synchronization. |
| `backend/src/database/initialize.ts` | Standalone initialization command after standard environment loading, using the same migrations as startup. |
| `backend/src/database/migrations/1790856000000-initial-schema.ts` | Initial companies/mentions schema, FK/check/unique constraints, index and reverse migration. |
| `backend/test/dates.test.ts` | Quarter/calendar/day-calculation unit tests. |
| `backend/test/persistence-api.test.ts` | In-memory migrated SQLite and HTTP tests for empty state, validation, 404s, uniqueness and aggregation. |
| `data/README.md` | Documents ignored local SQLite state and links to the single backend source-data flow. |

`database/migrations` owns versioned schema changes. `backend/test` uses isolated in-memory databases. `data` holds ignored local SQLite state; `backend/src/data` holds supplied TXT and committed generated JSON. Frontend source files are unchanged.

## Added seed and local classification files

| File | Purpose |
| --- | --- |
| `.env.example` | Non-secret SQLite and local Ollama configuration defaults. |
| `backend/src/config/environment.ts` | Shared standard Nest ConfigModule .env loading for all entry points. |
| `backend/src/companies/company-seed.ts` | Persistence/structured-source/report contracts, identity normalization, hostname and five-field metadata validation. |
| `backend/src/companies/company-seed.service.ts` | Reads generated backend JSON, validates metadata, projects name/domain/sector and delegates transactional import. |
| `backend/src/companies/companies-import.module.ts` | CLI-only environment/database/companies context; no HTTP or Ollama. |
| `backend/src/companies/companies.cli.ts` | Root companies command entry point, count reporting and nonzero errors. |
| `backend/src/sentiment/sentiment-classifier.ts` | Domain-only classifier input/interface and injection token. |
| `backend/src/sentiment/ollama.config.ts` | Validates loopback URL, local model name and bounded timeout configuration. |
| `backend/src/sentiment/ollama-sentiment.classifier.ts` | Company-focused prompt, schema-bound local HTTP request, strict output validation and standard errors. |
| `backend/src/sentiment/sentiment.cli.ts` | Real manual classification with model/sentiment output and no database context. |
| `backend/test/company-import.test.ts` | Isolated importer tests for idempotence, updates, validation, ambiguity and rollback. |
| `backend/test/sentiment.test.ts` | Mocked HTTP tests for valid values, malformed output, configuration/input errors, HTTP/connection failures and timeout. |

## Company source preparation files

| File | Purpose |
| --- | --- |
| `backend/src/data/ourcrowd_companies.txt` | Existing authoritative OurCrowd list, preserved byte-for-byte. |
| `backend/src/data/companies.json` | Deterministic committed structured representation; source-only rawName and aliases, null sectors. |
| `backend/src/data/README.md` | Generated-file policy, schema, parser rules and explicit developer commands. |
| `backend/src/companies/company-preparation.ts` | Conservative line parser, category report, validation, deterministic serializer and file preparation; shared default source paths. |
| `backend/src/companies/companies-prepare.cli.ts` | Preparation-only CLI; prints category counts/fallbacks, exits nonzero on errors; no database context. |
| `backend/test/company-preparation.test.ts` | Isolated parsing, whitespace, duplicate, fallback, metadata, deterministic bytes and path tests. |

The flow is supplied TXT → generated JSON → existing SQLite Company schema. `companies:setup` prepares then uses the current importer/database initialization. No startup seeding, frontend changes or schema changes are added; news/collection integrations are described below.

## Collection infrastructure files

| File | Purpose |
| --- | --- |
| `backend/src/companies/company-search.service.ts` | Read-only structured metadata, explicit real-company scope validation and conservative expanded-acronym query choice. |
| `backend/src/news/news-provider.ts` | NEWS_PROVIDER contract/token, normalized article/input/cache-mode/diagnostic types. |
| `backend/src/news/gdelt.config.ts` | Validated endpoint, timeout, delay, retries and repository-relative cache directory. |
| `backend/src/news/gdelt-news.provider.ts` | Exact-phrase request, strict response mapping, bounded transient retries, timeout and raw-cache integration. |
| `backend/src/news/gdelt-cache.ts` | GDELT-specific SHA-256 request cache with raw response/metadata and atomic replacement. |
| `backend/src/news/url-normalization.ts` | Conservative HTTP(S) URL normalization preserving article-identity parameters. |
| `backend/src/news/news-cli.module.ts` | Database/company/news context without sentiment or collection. |
| `backend/src/news/news.cli.ts` | Sequential news-only inspection with query/range/cache/count and three previews. |
| `backend/src/collection/collection-options.ts` | Strict scope/cache/range CLI parsing and existing-quarter utility reuse. |
| `backend/src/collection/collection-result.ts` | Inspectable count/error/abort contracts for manual and scheduled runs. |
| `backend/src/collection/collection.service.ts` | Single sequential provider/dedup/existence/classify/persist/alert flow using feature boundaries. |
| `backend/src/collection/collection-cli.module.ts` | Manual database/collection context, without schedule registration. |
| `backend/src/collection/collection.cli.ts` | Manual real collection with JSON summary and nonzero failures. |
| `backend/src/alerts/alert-service.ts` | AlertService contract/token and newly persisted mention payload. |
| `backend/src/alerts/console-alert.service.ts` | One readable console alert for new mentions, future channel replaceable. |
| `backend/src/scheduler/daily.config.ts` | Strict enabled/cron/timezone/lookback validation; disabled default. |
| `backend/src/scheduler/daily-collection.service.ts` | Shared all-company live rolling-lookback daily run and in-process overlap guard. |
| `backend/src/scheduler/daily-run.module.ts` | Daily service composition shared by scheduler/manual CLI, without timer registration. |
| `backend/src/scheduler/daily.cli.ts` | Executes the daily workflow once without cron; invokes real inference when run manually. |
| `backend/src/export/data-export.service.ts` | Existing mention/dashboard services to deterministic reviewer JSON at a controlled evaluation time. |
| `backend/src/export/data-export.cli.ts` | SQLite-only export command with quarter selection and explicit empty-dataset warning. |
| `backend/test/news.test.ts` | Mocked HTTP/provider/cache/config/date/query/URL tests using isolated temporary cache. |
| `backend/test/collection.test.ts` | In-memory SQLite and fake provider/classifier/alerts for dedup, failures, sequential flow, scope/ranges. |
| `backend/test/scheduler-export.test.ts` | Disabled/enabled registration, shared daily logic/guard, deterministic export and script forwarding tests. |
| `data/output/README.md` | Explains real successful-run output requirements; no fabricated output committed. |

`data/cache/gdelt` is runtime-only, ignored and not listed in the committed tree. `data/output` can hold reviewed real JSON exports after manual verification. Existing .env.example/.gitignore/scripts/lockfile and feature registration/read methods are updated accordingly. Frontend files, supplied TXT/generated company JSON, entities and migrations remain unchanged.
