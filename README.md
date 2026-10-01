# OurCrowd Press Monitor

NestJS modular monolith with SQLite/TypeORM and a minimal Angular title shell. Current scope: company/mention domain persistence and read-only REST APIs. No company seed data or press mentions are included.

Use Node 24.19 (`nvm use` if available). From the repository root:

```bash
npm install
npm run db:init
npm run dev
```

Angular: http://localhost:4200. NestJS: http://localhost:3000/api/health. Angular proxies `/api` to NestJS. PORT defaults to 3000; update the proxy if changing it. Environment variables are read from the process; `.env` files are not automatically loaded.

```bash
npm run typecheck
npm test
npm run build
npm run start
```

Production serves Angular and REST from http://localhost:3000. Build first and package both build directories preserving their relative paths. `npm ci` installs the committed dependency versions.

## Database setup

SQLite uses the better-sqlite3 driver, requiring no external database server. DATABASE_PATH defaults to `data/press-monitor.db`; repository-relative and absolute paths work. For example on macOS/Linux:

```bash
DATABASE_PATH=/absolute/path/press-monitor.db npm run db:init
```

PowerShell:

```powershell
$env:DATABASE_PATH = "C:\data\press-monitor.db"
npm run db:init
```

Initialization creates the parent directory/database and transactionally applies pending versioned migrations. Application startup does the same, so explicit initialization is optional. Repeating it does not reset data. TypeORM schema synchronization is always disabled. Database files are excluded from git; production needs a writable durable location. This migration creates companies, mentions and TypeORM migration history, with no data insertion.

Company fields: id, required non-blank name, nullable domain/sector, createdAt and updatedAt. Mention fields: id, companyId FK, title, nullable description, url, source, publishedAt, sentiment and discoveredAt. Sentiment is exactly POSITIVE/NEUTRAL/NEGATIVE. `UNIQUE(companyId, url)` prevents duplicates for one company while permitting the same article URL for different companies. There is no Article entity because the current scope does not need additional normalization.

For a larger production system, PostgreSQL would likely be preferred, but SQLite keeps this assignment self-contained and easy to run.

## REST contracts

| Method/path | Result |
| --- | --- |
| GET /api/health | Process health. |
| GET /api/companies | All companies, ordered by name then id. |
| GET /api/companies/:id | One company; 404 if absent. |
| GET /api/companies/:id/mentions?from=...&to=...&sentiment=... | Filtered mentions, newest first; 404 if company absent. |
| GET /api/dashboard?quarter=YYYY-QN | Every company, quarter sentiment counts and all-time latest mention. Defaults to current UTC quarter. |

Current empty-database responses:

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

Dates accept real YYYY-MM-DD values or ISO timestamps with an explicit timezone. Date-only bounds use UTC; `to=2026-09-30` includes September 30 using October 1 as an exclusive boundary. Timestamp `to` is inclusive. Quarter ranges are start-inclusive/end-exclusive. Invalid IDs, calendar dates, ranges, sentiment, quarter, repeated values or unknown query parameters return 400 through standard NestJS exceptions. Missing companies return 404. No external write endpoints exist; the future collection pipeline will call MentionsService internally. Duplicate internal company/URL writes produce ConflictException.

Dashboard counts and days are derived at request time, not persisted. lastMentionedAt is the latest publishedAt across all time, independently of the selected quarter. Days mean elapsed full 24-hour periods, clamped to zero for future-dated publications. Never-mentioned companies get null lastMentionedAt/null daysSinceLastMention and zero counts.

## Seed preparation and scope

See [data/README.md](data/README.md) for the future `data/companies.json` schema. Actual OurCrowd data and the importer will be added later. Domain/sector are optional, so a domain must not be required to identify a company.

News API, RSS, scraping, Ollama, sentiment inference, scheduling, alerts and the Angular dashboard remain deferred. Test fixtures live only in isolated in-memory databases, never in the application database.

## Tests and verification

`npm test` uses Node's test runner and ts-node. Focused tests cover quarter parsing/boundaries/invalid inputs; elapsed days; calendar validation; migration idempotence; missing-company 404s; HTTP query validation; per-company URL uniqueness; dashboard quarter versus all-time behavior; empty/no-mention companies; and mention filtering/order.

After initialization/build, `npm run start` can be checked with:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/companies
curl 'http://localhost:3000/api/dashboard?quarter=2026-Q3'
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for schema/ownership/runtime decisions and future diagrams, and [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for the file map.
