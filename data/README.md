# OurCrowd company seed input

Add the real OurCrowd list as `data/companies.json`. The file is deliberately absent until the provided data is available; no fake companies are included. Schema only:

```typescript
Array<{
  name: string; // required and non-blank
  domain?: string | null; // plain hostname, no protocol/path/port
  sector?: string | null;
}>
```

Run `npm run companies` from the root. A missing file explains how to create it and exits nonzero. Invalid JSON, non-array input, unknown fields, invalid field types, blank names or duplicate names/domains fail before writes. Strings are trimmed and domains lowercased. Optional blank strings become null. The report contains inserted/updated/unchanged counts; an empty array is a valid no-op.

Prefer exact normalized domains; otherwise use exact trimmed, case-insensitive names. Matching is conservative: ambiguous or conflicting identities roll back the entire import, including earlier inserts/updates. No fuzzy matching. A unique domain can rename a company; name fallback can add a missing domain but cannot reassign a different existing domain. Omitted optional fields preserve current values; explicit null/blank clears them. Absent companies are never deleted. Run one importer at a time.

The local database defaults to `data/press-monitor.db` and is ignored by git. DATABASE_PATH can select a repository-relative or absolute path. Nothing in the importer creates press mentions.
