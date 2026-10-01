# Company seed preparation

The default SQLite database is `data/press-monitor.db`, created by initialization or application startup and excluded from git. `DATABASE_PATH` may specify a repository-relative path or an absolute path.

Later add the OurCrowd source-of-truth list at `data/companies.json`. No company data or seed importer is present yet. Expected format (schema only, not actual company entries):

```typescript
Array<{
  name: string; // required, non-blank
  domain?: string | null;
  sector?: string | null;
}>
```

A future importer will validate the list and use the Company TypeORM repository to insert/update it. Its matching/update policy must be agreed once the real dataset is available; domain cannot be used as the mandatory identity because it is optional. It must not fabricate press mentions.
