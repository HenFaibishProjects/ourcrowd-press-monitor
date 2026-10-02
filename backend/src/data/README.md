# Supplied and generated company source

**Generated: `companies.json` comes from `ourcrowd_companies.txt`; do not normally edit JSON manually.** Both are committed. The TXT is authoritative OurCrowd-supplied input and must remain unchanged. JSON is derived structured data; PostgreSQL is its runtime representation.

From the repository root:

```bash
npm run companies:prepare
npm run companies
# Equivalent combined operation (importer initializes PostgreSQL if needed):
npm run companies:setup
```

The input contains one company per non-empty line. Preparation trims surrounding whitespace, ignores blanks, preserves order and writes stable, two-space-indented JSON with a final newline. No external lookups or invented sectors. Schema:

```typescript
Array<{
  name: string;
  rawName: string;
  domain: string | null;
  aliases: string[];
  sector: string | null;
}>
```

One clean trailing parenthetical is parsed as an explicit hostname/domain, an explicit former name (formerly / formerly known as), or an expanded company alias. Unsupported, multiple, nested, unbalanced, empty or URL-like forms preserve the entire trimmed line as name/rawName, domain null, aliases empty. All generated sectors are null. Duplicate case-insensitive names/domains fail; nothing is silently dropped. The supplied 258 lines produce 258 records: 246 plain names, 1 domain, 1 expanded alias, 10 former aliases, no fallbacks.

Validation requires exactly the five fields. All strings are trimmed; names/rawName and aliases must be non-blank, aliases unique within each company and different from the primary name case-insensitively. Domains are lowercased plain hostnames; domain/sector accept null rather than blank strings. Only name/domain/sector are persisted. rawName/aliases stay in JSON; there are no schema additions.

Name is the future primary search name; explicit domain may disambiguate results and supplied aliases may support NewsProvider search/relevance later. No search is implemented. Conservative domain-then-name matching, transaction rollback on ambiguity, idempotent count reports and no automatic deletion remain unchanged. Explicit null fields clear database values. Startup never regenerates or reimports the list. See [root README](../../../README.md) for full import rules.
