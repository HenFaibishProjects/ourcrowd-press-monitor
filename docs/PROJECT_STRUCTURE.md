# Project structure

Generated build output and dependencies are excluded below. All files are explained individually.

```text
ourcrowd-press-monitor/
  .gitignore
  .nvmrc
  README.md
  backend/nest-cli.json
  backend/package.json
  backend/src/alerts/alerts.module.ts
  backend/src/app.module.ts
  backend/src/collection/collection.module.ts
  backend/src/common/README.md
  backend/src/companies/companies.module.ts
  backend/src/config/runtime.config.ts
  backend/src/dashboard/dashboard.module.ts
  backend/src/health/health.controller.ts
  backend/src/health/health.module.ts
  backend/src/main.ts
  backend/src/mentions/mentions.module.ts
  backend/src/news/news.module.ts
  backend/src/scheduler/scheduler.module.ts
  backend/src/sentiment/sentiment.module.ts
  backend/tsconfig.build.json
  backend/tsconfig.json
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
| `.gitignore` | Excludes installed dependencies, builds, caches, local environment files, and logs. |
| `.nvmrc` | Pins the recommended Node runtime. |
| `README.md` | Setup, commands, URLs, production packaging, and links to documentation. |
| `backend/nest-cli.json` | Nest CLI source and clean-build settings. |
| `backend/package.json` | Nest runtime dependencies and development/build/production scripts; TypeScript 5.9. |
| `backend/src/alerts/alerts.module.ts` | Empty AlertsModule feature boundary, registered in AppModule; no providers or controllers. |
| `backend/src/app.module.ts` | Registers eight empty modules and health; conditionally serves the Angular production build and rejects missing builds. |
| `backend/src/collection/collection.module.ts` | Empty CollectionModule feature boundary, registered in AppModule; no providers or controllers. |
| `backend/src/common/README.md` | Explains the reserved shared helper area without adding abstractions. |
| `backend/src/companies/companies.module.ts` | Empty CompaniesModule feature boundary, registered in AppModule; no providers or controllers. |
| `backend/src/config/runtime.config.ts` | Validates PORT and reads NODE_ENV; no secrets or integration configuration. |
| `backend/src/dashboard/dashboard.module.ts` | Empty DashboardModule feature boundary, registered in AppModule; no providers or controllers. |
| `backend/src/health/health.controller.ts` | GET /api/health returns actual process liveness; no business data. |
| `backend/src/health/health.module.ts` | Registers the infrastructure health controller. |
| `backend/src/main.ts` | Nest bootstrap, /api prefix, shutdown hooks, and listening port. |
| `backend/src/mentions/mentions.module.ts` | Empty MentionsModule feature boundary, registered in AppModule; no providers or controllers. |
| `backend/src/news/news.module.ts` | Empty NewsModule feature boundary, registered in AppModule; no providers or controllers. |
| `backend/src/scheduler/scheduler.module.ts` | Empty SchedulerModule feature boundary, registered in AppModule; no providers or controllers. |
| `backend/src/sentiment/sentiment.module.ts` | Empty SentimentModule feature boundary, registered in AppModule; no providers or controllers. |
| `backend/tsconfig.build.json` | Build-specific TypeScript exclusions. |
| `backend/tsconfig.json` | Strict TypeScript, decorator metadata, CommonJS output, and source maps. |
| `docs/ARCHITECTURE.md` | Design rationale, module responsibilities, runtime modes, two future Mermaid diagrams, exclusions, assumptions, and next steps. |
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
| `package.json` | Defines npm workspaces and root dev/build/start/typecheck scripts. |
