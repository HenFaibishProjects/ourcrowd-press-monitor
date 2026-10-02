# Local data files

Runtime data is stored in PostgreSQL, configured through `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE`. The local Compose database is reached at `127.0.0.1:5433`. This directory contains news fixtures, ignored GDELT cache files, and reviewer exports; it is not the database location. `npm run db` applies the existing migrations without importing data; application startup also applies pending migrations safely.

Company source files belong exclusively in `backend/src/data`. See [the supplied TXT and generated JSON policy](../backend/src/data/README.md). Use `npm run companies:prepare` then `npm run companies`, or `npm run companies:setup`. This directory is not a competing seed input location. The importer does not create press mentions or delete absent companies.
