# Successful run output

The committed 2026-Q3 export was generated from the cleaned development PostgreSQL database using `npm run data:export -- --quarter=2026-Q3`. `mentions.json` contains five BioCatch mentions, all POSITIVE. `company-status.json` contains 258 companies; BioCatch has total=5, positive=5, neutral=0, negative=0, and lastMentionedAt=2026-08-04T00:00:00.000Z. No stale test company rows or test URLs remain.

To regenerate the output, run `npm run data:export -- --quarter=2026-Q3` from the repository root. It writes deterministic, pretty JSON: `mentions.json` (all stored mentions with company, URL, source, observed/publication timestamp and sentiment) and `company-status.json` (all companies, all-time last mention, request-time elapsed days and requested-quarter counts). Default quarter is the previous completed UTC quarter; use `-- --quarter=YYYY-QN` to choose another.

The output is generated through the application export flow, not edited manually. An empty export is reported as empty. Review replacement files before committing them; raw GDELT cache remains ignored. For a fixed database, quarter and evaluation time the JSON is stable. Elapsed days change as time passes. The export CLI never calls GDELT or Ollama. GDELT timestamps may reflect observation/indexing rather than publisher-authoritative publication.
