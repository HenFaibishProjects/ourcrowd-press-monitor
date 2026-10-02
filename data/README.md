# Local SQLite state

The database defaults to `data/press-monitor.db` and is ignored by git. DATABASE_PATH can select a repository-relative or absolute path. `npm run db` applies the existing migrations without importing data; application startup also applies pending migrations safely.

Company source files belong exclusively in `backend/src/data`. See [the supplied TXT and generated JSON policy](../backend/src/data/README.md). Use `npm run companies:prepare` then `npm run companies`, or `npm run companies:setup`. This directory is not a competing seed input location. The importer does not create press mentions or delete absent companies.
