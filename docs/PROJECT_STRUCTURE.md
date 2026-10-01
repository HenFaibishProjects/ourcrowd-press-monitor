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
  backend/src/alerts/alerts.module.ts
  backend/src/app.module.ts
  backend/src/collection/collection.module.ts
  backend/src/common/README.md
  backend/src/common/company-id.dto.ts
  backend/src/common/dates.ts
  backend/src/common/validation.ts
  backend/src/companies/companies-import.module.ts
  backend/src/companies/companies.cli.ts
  backend/src/companies/companies.controller.ts
  backend/src/companies/companies.module.ts
  backend/src/companies/companies.repository.ts
  backend/src/companies/companies.service.ts
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
  backend/src/database/database.config.ts
  backend/src/database/initialize.ts
  backend/src/database/migrations/1790856000000-initial-schema.ts
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
  backend/src/news/news.module.ts
  backend/src/scheduler/scheduler.module.ts
  backend/src/sentiment/ollama-sentiment.classifier.ts
  backend/src/sentiment/ollama.config.ts
  backend/src/sentiment/sentiment-classifier.ts
  backend/src/sentiment/sentiment.cli.ts
  backend/src/sentiment/sentiment.module.ts
  backend/test/company-import.test.ts
  backend/test/dates.test.ts
  backend/test/persistence-api.test.ts
  backend/test/sentiment.test.ts
  backend/tsconfig.build.json
  backend/tsconfig.json
  data/README.md
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
| backend/src/{companies,mentions,news,sentiment,collection,scheduler,alerts,dashboard} | One folder per empty feature boundary. |
| backend/src/config | Minimal runtime configuration. |
| backend/src/common | Reserved shared infrastructure. |
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
| `backend/package.json` | Nest, TypeORM, SQLite and validation dependencies; development/build/production/test/db:init scripts. |
| `backend/src/alerts/alerts.module.ts` | Empty AlertsModule feature boundary, registered in AppModule; no providers or controllers. |
| `backend/src/app.module.ts` | Composes features, TypeORM initialization/migrations, health and production Angular static serving. |
| `backend/src/collection/collection.module.ts` | Empty CollectionModule feature boundary, registered in AppModule; no providers or controllers. |
| `backend/src/common/README.md` | Explains the concrete shared validation/date/ID utilities. |
| `backend/src/companies/companies.module.ts` | Registers the Company repository, service and REST controller; exports CompaniesService. |
| `backend/src/config/runtime.config.ts` | Lazily validates PORT and reads NODE_ENV after environment loading. |
| `backend/src/dashboard/dashboard.module.ts` | Registers aggregate read repository, derivation service and dashboard REST controller. |
| `backend/src/health/health.controller.ts` | GET /api/health returns actual process liveness; no business data. |
| `backend/src/health/health.module.ts` | Registers the infrastructure health controller. |
| `backend/src/main.ts` | Nest bootstrap, /api prefix, global DTO validation, shutdown hooks and listening port. |
| `backend/src/mentions/mentions.module.ts` | Registers mention persistence, services and the nested REST controller; imports CompaniesModule. |
| `backend/src/news/news.module.ts` | Empty NewsModule feature boundary, registered in AppModule; no providers or controllers. |
| `backend/src/scheduler/scheduler.module.ts` | Empty SchedulerModule feature boundary, registered in AppModule; no providers or controllers. |
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
| `package.json` | Defines workspaces and root dev/build/start/typecheck/test/db/companies/sentiment scripts. |

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
| `backend/src/mentions/mentions.repository.ts` | Filtered ordered reads, existence checks and TypeORM writes. |
| `backend/src/mentions/mentions.service.ts` | Company existence, range semantics and internal duplicate conflict handling; no ingestion. |
| `backend/src/mentions/mentions.controller.ts` | Read-only GET company mentions endpoint. |
| `backend/src/dashboard/quarter.ts` | Quarter validation, current UTC default and inclusive/exclusive boundaries. |
| `backend/src/dashboard/dashboard-query.dto.ts` | Validates optional quarter query. |
| `backend/src/dashboard/dashboard-response.dto.ts` | Typed dashboard response contract. |
| `backend/src/dashboard/dashboard.repository.ts` | One aggregate read query for quarter counts and all-time latest publication. |
| `backend/src/dashboard/dashboard.service.ts` | Derives response timestamps and elapsed days at request time. |
| `backend/src/dashboard/dashboard.controller.ts` | Read-only GET dashboard endpoint. |
| `backend/src/database/database.config.ts` | SQLite path resolution, directory creation, registered entities/migrations and disabled synchronization. |
| `backend/src/database/initialize.ts` | Standalone initialization command after standard environment loading, using the same migrations as startup. |
| `backend/src/database/migrations/1790856000000-initial-schema.ts` | Initial companies/mentions schema, FK/check/unique constraints, index and reverse migration. |
| `backend/test/dates.test.ts` | Quarter/calendar/day-calculation unit tests. |
| `backend/test/persistence-api.test.ts` | In-memory migrated SQLite and HTTP tests for empty state, validation, 404s, uniqueness and aggregation. |
| `data/README.md` | Documents required real dataset, importer matching/update behavior and absence of fake data. |

`database/migrations` owns versioned schema changes. `backend/test` uses isolated in-memory databases. `data` holds the documented future input location and ignored local SQLite state. Frontend source files are unchanged.

## Added seed and local classification files

| File | Purpose |
| --- | --- |
| `.env.example` | Non-secret SQLite and local Ollama configuration defaults. |
| `backend/src/config/environment.ts` | Shared standard Nest ConfigModule .env loading for all entry points. |
| `backend/src/companies/company-seed.ts` | Seed input/report contracts, exact identity normalization and full JSON structure validation. |
| `backend/src/companies/company-seed.service.ts` | Reads the seed file, reports missing/invalid input and delegates transactional import. |
| `backend/src/companies/companies-import.module.ts` | CLI-only environment/database/companies context; no HTTP or Ollama. |
| `backend/src/companies/companies.cli.ts` | Root companies command entry point, count reporting and nonzero errors. |
| `backend/src/sentiment/sentiment-classifier.ts` | Domain-only classifier input/interface and injection token. |
| `backend/src/sentiment/ollama.config.ts` | Validates loopback URL, local model name and bounded timeout configuration. |
| `backend/src/sentiment/ollama-sentiment.classifier.ts` | Company-focused prompt, schema-bound local HTTP request, strict output validation and standard errors. |
| `backend/src/sentiment/sentiment.cli.ts` | Real manual classification with model/sentiment output and no database context. |
| `backend/test/company-import.test.ts` | Isolated importer tests for idempotence, updates, validation, ambiguity and rollback. |
| `backend/test/sentiment.test.ts` | Mocked HTTP tests for valid values, malformed output, configuration/input errors, HTTP/connection failures and timeout. |
