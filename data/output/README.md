# Successful run output

After a real end-to-end collection succeeds, run `npm run data:export` from the repository root. It writes deterministic, pretty JSON: `mentions.json` (all stored mentions with company, URL, source, observed/publication timestamp and sentiment) and `company-status.json` (all companies, all-time last mention, request-time elapsed days and requested-quarter counts). Default quarter is the previous completed UTC quarter; use `-- --quarter=YYYY-QN` to choose another.

No output dataset is fabricated or generated during implementation. An empty export is explicitly reported as empty, not proof of successful collection. Review and commit the actual output files after manual verification; raw GDELT cache remains ignored. For a fixed database, quarter and evaluation time the JSON is stable. Elapsed days change as time passes. The export CLI never calls GDELT or Ollama. GDELT timestamps may reflect observation/indexing rather than publisher-authoritative publication.
