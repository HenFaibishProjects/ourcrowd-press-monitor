# Local news fixtures

`demo-news.json` contains five real, verified BioCatch news records from 2026-Q3, with descriptions to avoid publisher-page requests. The dataset was used in a successful local end-to-end run: five mentions persisted, all classified POSITIVE. This verifies the pipeline, not model quality; it does not claim the records came from GDELT.

Use a JSON array of objects with these fields:

| Field | Expected value |
| --- | --- |
| company | Non-blank tracked company name, such as BioCatch. Matching ignores surrounding whitespace and case; there is no fuzzy matching. |
| title | The actual article title, a non-blank string. |
| url | The actual absolute HTTP(S) article URL, without credentials. |
| source | The actual source/publisher, a non-blank string. |
| publishedAt | The actual date: YYYY-MM-DD or an ISO timestamp with timezone. Prefer a UTC timestamp. |
| description | The actual excerpt/context; optional string or null. Provide a useful non-empty excerpt to avoid publisher HTTP requests. |

Copy these values from articles you can verify, or from your own successful discovery/export records. Do not treat testing examples as real articles or claim GDELT provenance without the original records. Keep the excerpt at most 4000 characters, as required by the unchanged classifier contract.

The provider validates every record, then selects the company and inclusive/exclusive range (`from <= publishedAt < to`). File order is preserved. It makes no HTTP calls, ignores GDELT cache flags, and never writes to the database. Collection still performs normalization, duplicate checks, local Ollama relevance/sentiment, PostgreSQL persistence and alerts.

Set `NEWS_PROVIDER=file` (the default). The default path is repository-relative, so root and backend workspace commands read the same file. Override it with `NEWS_FIXTURE_PATH` when needed.

After configuring PostgreSQL, importing the real company list and starting local Ollama, run:

```bash
npm run collect -- --companies=BioCatch --quarter=2026-Q3
```

Use an explicit `--quarter=YYYY-QN` or `--from`/`--to` matching the supplied article dates for a repeatable review after the quarter changes. An empty file or no matching records produces zero articles and zero new mentions. Inference quality and timing still depend on the configured local model; the file makes article selection deterministic.

When packaging production builds with NEWS_PROVIDER=file, include the fixture JSON at the same root-relative path, or configure NEWS_FIXTURE_PATH to an existing file.
