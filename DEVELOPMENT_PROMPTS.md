# Selected Development Prompts

Below is a selected set of prompts used during development. It is not a complete transcript of every AI interaction, but it includes useful prompts for architecture review, debugging, tradeoff analysis, implementation guidance, and final review. Formatting has been cleaned for readability.

---

## 1. Architecture framing

**Goal:** Validate the overall shape of the solution before implementation.

```text
I am building a take-home project that monitors press mentions for a fixed list of portfolio companies.

The required stack is:
- Node.js backend
- locally hosted Ollama for text understanding
- a small dashboard UI
- persistent storage
- a scheduled daily collection flow

Please act as a senior backend reviewer.

Do not design the whole project for me.

Help me evaluate a simple architecture with these goals:
- keep the solution easy to run locally
- avoid unnecessary infrastructure
- keep external integrations behind interfaces
- make the collection flow testable
- keep the design realistic enough for production discussion

Compare a modular monolith against a microservice approach for this scope.

For each option, call out:
- complexity
- operational cost
- testability
- extensibility
- what would be reasonable for a take-home assignment

End with the tradeoffs I should be able to explain in an interview.
```

---

## 2. Choosing NestJS

**Goal:** Validate the framework choice.

```text
I am considering NestJS for the backend.

Please review this choice from the perspective of a senior engineer.

Context:
- one application
- several feature areas: companies, mentions, news discovery, classification, scheduling
- REST API
- PostgreSQL
- one local Ollama integration
- no need for microservices

Do not generate the application.

Explain:
- why NestJS is a reasonable fit
- where it may be heavier than necessary
- what structure I should keep simple
- which abstractions are justified
- which abstractions would be overengineering

I want an answer I could later defend in a technical interview.
```

---

## 3. Database choice

**Goal:** Compare persistence options.

```text
Help me evaluate PostgreSQL versus SQLite for this project.

The data model is simple:
- companies
- press mentions
- company-to-mentions relationship
- quarterly filtering
- sentiment filtering
- unique company + article URL

Please focus on engineering tradeoffs, not framework setup.

I want to understand:
- what PostgreSQL gives me here
- whether it is excessive for a take-home
- whether SQLite would be simpler
- how migrations and constraints affect the decision
- which choice gives a better balance between realism and simplicity

Do not implement the database layer.
```

---

## 4. Database schema review

**Goal:** Review a proposed schema without replacing it.

```text
Review the following schema as if you were doing a senior-level code review.

I want to keep it intentionally small.

Entities:
Company
- id
- name
- domain
- sector
- createdAt
- updatedAt

Mention
- id
- companyId
- title
- description
- url
- source
- publishedAt
- sentiment
- discoveredAt

Constraints:
- foreign key from Mention to Company
- unique(companyId, url)
- sentiment limited to POSITIVE / NEUTRAL / NEGATIVE

Please identify:
- missing constraints
- unnecessary columns
- indexing concerns
- timestamp concerns
- race-condition issues
- anything that would make this difficult to operate later

Do not redesign it unless there is a concrete problem.
```

---

## 5. Company import design

**Goal:** Keep the supplied company file as the source of truth.

```text
I have been given a company list as a text file.

I want the file to remain the source of truth.

My planned flow is:

TXT file
-> deterministic parsing
-> structured JSON
-> database import

Please review the approach.

Important constraints:
- do not enrich company data from the internet
- do not fuzzy-match companies silently
- preserve deterministic behavior
- import should be idempotent
- existing companies should not be deleted automatically

Help me define:
- matching rules
- validation rules
- what should fail loudly
- what should be safe to update
- what should remain source-only metadata

Do not write the importer itself.
```

---

## 6. News provider abstraction

**Goal:** Keep discovery replaceable.

```text
I want to isolate news discovery behind a small interface.

Proposed contract:

NewsProvider.search({
  companyName,
  queryName,
  from,
  to
}) -> NewsArticle[]

Please review this abstraction.

I want:
- one live provider initially
- the ability to replace the provider later
- collection logic that does not know provider-specific details
- clean handling of rate limits and partial failures

Please suggest only the minimum interface fields needed.

Do not introduce a generic provider framework or unnecessary abstraction layers.
```

---

## 7. Evaluating GDELT

**Goal:** Decide whether GDELT is acceptable.

```text
I am considering GDELT DOC API as the live news source.

Please evaluate it specifically for this use case:
- search by company name
- previous-quarter coverage
- public endpoint
- no API key
- local development
- a few hundred tracked companies

I want a practical risk assessment.

Please cover:
- rate limiting
- result caps
- publication timestamp quality
- false positives
- missing article text
- historical coverage
- reliability for reviewer/demo use

Do not suggest replacing it immediately.

First tell me what safeguards I should build around it.
```

---

## 8. Rate-limit handling review

**Goal:** Review resilience behavior.

```text
My live news provider can return HTTP 429 and temporary 5xx responses.

I want bounded retry behavior.

Please review this policy:

- retry only 429 and 5xx
- honor Retry-After when present
- otherwise wait a configured delay
- cap the number of retries
- never retry malformed responses or permanent 4xx errors
- keep company processing sequential

Tell me:
- whether this is reasonable
- where it could accidentally become too aggressive
- what should be logged
- when the run should continue versus abort

Do not write the retry loop for me.
```

---

## 9. Development cache design

**Goal:** Avoid repeated calls to a public service.

```text
I want a very small development cache for raw news-provider responses.

The purpose is not production caching.

It should only help avoid repeatedly calling a public endpoint while I develop.

Please review this design:

- cache key based on the complete request
- raw response stored on disk
- cache can be bypassed
- cache can be explicitly refreshed
- malformed cached content fails clearly
- cache directory is not committed

I want to know:
- what metadata is worth storing
- what would make the cache misleading
- what behavior should be explicit in logs

Keep the design simple.
```

---

## 10. Article relevance problem

**Goal:** Separate discovery from semantic relevance.

```text
A company-name news search returns false positives.

I do not want to assume every discovered article is actually about the tracked company.

Please help me reason about the processing order.

Candidate flow:

news discovery
-> URL normalization
-> duplicate check
-> optional article context enrichment
-> local LLM relevance check
-> sentiment classification
-> persistence

Please review:
- whether relevance should happen before sentiment
- whether relevance + sentiment should be one model call or two
- what information the model needs
- what should happen when article context is weak

Do not write the classifier.
```

---

## 11. Article enrichment tradeoffs

**Goal:** Improve context without building a crawler.

```text
The news provider often gives me a title and URL but little article text.

I am considering a lightweight enrichment step that fetches the article page and extracts:
- title
- meta description
- OpenGraph description
- paragraph text

I do not want to build a full crawler or browser automation system.

Please review this idea.

Focus on:
- common failure modes
- publisher blocking
- paywalls
- JavaScript-rendered pages
- timeout behavior
- text-size limits
- whether enrichment failure should fail the entire company

Suggest a conservative fallback strategy.
```

---

## 12. Ollama model selection

**Goal:** Choose a local model suitable for the task.

```text
The assignment requires locally hosted Ollama.

The task is narrow:
- decide whether an article is meaningfully about a company
- classify company-specific sentiment as positive, neutral, or negative

I want a model that is easy for a reviewer to run on a normal development machine.

Please compare a very small model such as gemma3:270m with larger local models.

Focus on:
- expected classification quality
- latency
- memory usage
- reproducibility
- reviewer setup cost

Do not optimize for general-purpose generation.

I need a defensible default, not the "best" model in absolute terms.
```

---

## 13. Ollama prompt review

**Goal:** Review the classifier prompt.

```text
Review this local classification prompt.

I need it to produce a strict JSON result with:
- relevant: boolean
- sentiment: POSITIVE | NEUTRAL | NEGATIVE | null

Rules:
- if relevant=false, sentiment must be null
- sentiment is about the tracked company, not the article's overall tone
- incidental name mentions should not count as relevant
- technical failures must not silently become NEUTRAL

Please review:
- ambiguity
- prompt injection risk from article text
- output consistency
- whether the categories are well defined
- whether any instruction is unnecessary

Do not rewrite the entire prompt unless there is a specific issue.
```

---

## 14. Structured-output validation

**Goal:** Treat model output as untrusted input.

```text
I am parsing JSON returned by a local LLM.

Please review the validation rules I should enforce.

Expected shape:

{
  "relevant": true,
  "sentiment": "POSITIVE"
}

or:

{
  "relevant": false,
  "sentiment": null
}

I want strict behavior:
- reject arrays
- reject extra fields
- reject lowercase or unsupported sentiment values
- reject prose/code fences
- reject inconsistent relevant/sentiment combinations

Explain whether strict validation is worth it here and what error behavior is appropriate.

Do not write the parser.
```

---

## 15. Duplicate handling

**Goal:** Avoid expensive duplicate processing.

```text
Review the order of duplicate checks in this collection pipeline.

Current idea:

1. normalize the provider URL
2. remove duplicates within the current provider response
3. check whether company + URL already exists in PostgreSQL
4. only then fetch article content
5. only then run local Ollama
6. persist
7. rely on database UNIQUE(companyId, url) as the final race-condition guard

Please tell me:
- whether this ordering is correct
- what race conditions remain
- what URL normalization is safe
- what URL normalization could accidentally merge different articles

Do not add a separate canonical-URL service unless necessary.
```

---

## 16. Collection failure policy

**Goal:** Decide when to continue and when to abort.

```text
Help me define failure behavior for a sequential collection run.

Examples:
- one company news-provider request fails
- one article is malformed
- one article cannot be enriched
- one LLM output is malformed
- Ollama is unavailable
- Ollama times out repeatedly
- persistence lookup fails
- one insert hits a duplicate race
- alert delivery fails after persistence

For each case, tell me whether the run should:
- skip the article
- skip the company
- continue
- abort

I want predictable behavior that is easy to explain and debug.
```

---

## 17. Daily scheduler review

**Goal:** Add the required scheduled job without overbuilding.

```text
The assignment asks for a daily process that checks for new mentions and sends an alert.

I plan to use the NestJS scheduler in the same application.

The scheduler will:
- be disabled by default
- run on a configurable cron
- use a rolling lookback
- call the same CollectionService used by manual runs
- avoid overlapping runs within the same process

Please review whether this is enough for the project.

Also explain what I would need in production if multiple replicas were running.

Do not add distributed locking or a queue to the take-home unless clearly justified.
```

---

## 18. Alert boundary

**Goal:** Keep alert delivery replaceable.

```text
The assignment only requires a visible alert when new mentions are found.

I am thinking of a simple AlertService interface with a console implementation.

Please review this decision.

I want the design to make it obvious how email, Slack, Teams, or webhooks could be added later, but I do not want to implement them now.

Explain:
- what the interface should own
- whether alert failure should roll back persisted mentions
- what should be logged

Keep it minimal.
```

---

## 19. API contract review

**Goal:** Review read-only REST endpoints.

```text
Review these read-only API endpoints:

GET /api/companies
GET /api/companies/:id
GET /api/companies/:id/mentions
GET /api/dashboard?quarter=YYYY-QN

The dashboard should return:
- all companies
- counts for the selected quarter
- latest mention across all time
- days since latest mention

Please review:
- URL design
- date-range semantics
- validation behavior
- whether dashboard totals should be stored or derived
- what should return 400 versus 404

Do not add write endpoints unless the assignment requires them.
```

---

## 20. Dashboard aggregation review

**Goal:** Keep dashboard data derived.

```text
I do not want to persist dashboard aggregates.

For each company I plan to derive:
- total mentions for selected quarter
- positive count
- neutral count
- negative count
- all-time latest mention timestamp
- days since latest mention

Please review:
- whether these should be calculated at request time
- likely query/indexing concerns
- how never-mentioned companies should be represented
- how future-dated records should affect daysSinceLastMention

Keep the solution appropriate for a few hundred companies.
```

---

## 21. Frontend UX review

**Goal:** Build a reviewer-friendly UI without unnecessary frontend architecture.

```text
I need one Angular dashboard page for a technical take-home.

The backend already exposes the data.

Please help me review a simple UX:

- quarter selector
- summary cards
- company search
- company table
- sentiment counts
- last-mentioned date
- status based on recency
- company detail drawer with article list

Do not build the UI for me.

Please tell me:
- which information should be immediately visible
- what belongs in the detail drawer
- what should happen for zero mentions
- what loading/error states matter
- what would make the UI look overbuilt

The target is a clean internal SaaS/admin dashboard.
```

---

## 22. Frontend API boundary

**Goal:** Keep components independent from raw HTTP calls.

```text
Review the Angular data-access boundary.

I plan to keep HTTP calls in small services:

DashboardService
- getDashboard(quarter)

CompaniesService
- getMentions(companyId, dateRange)

Components should receive typed models and manage only presentation state.

Please tell me:
- whether this is enough
- whether signals or RxJS are more appropriate here
- what state management would be unnecessary

Do not introduce NgRx or a generic data layer.
```

---

## 23. Quarter/date handling

**Goal:** Avoid timezone bugs.

```text
Review my quarter-to-date-range logic.

For a selected quarter such as 2026-Q3, the mentions API should receive:

from=2026-07-01
to=2026-09-30

The backend treats date-only `to` as inclusive for the entire day.

Please identify:
- timezone mistakes I could make in Angular
- whether I should use UTC when calculating quarter boundaries
- whether ISO timestamps are necessary here

Keep the implementation simple and predictable.
```

---

## 24. Logging review

**Goal:** Make runtime behavior understandable.

```text
Please review the logging strategy for this project.

I want logs for:
- application startup
- selected news provider
- company processing
- provider calls/cache behavior
- rate-limit retries
- enrichment failures
- classification failures
- irrelevant articles skipped
- new mentions inserted
- alert failures
- final run summary

I do not want every method call logged.

Tell me:
- what is useful
- what would be noise
- where warning versus error makes sense
- what information would help a reviewer diagnose a failed run
```

---

## 25. Testing strategy review

**Goal:** Keep tests useful and safe.

```text
Review the testing strategy for this project.

I want unit tests around:
- date parsing
- company preparation
- news mapping
- sentiment parsing
- file-based news provider

I previously had database-backed tests that could destructively reset the local development database.

I do not want that risk.

Please suggest a safe, minimal test strategy for the take-home.

Important:
- default npm test must never drop or reset the development database
- do not create a complex test-infrastructure project
- it is acceptable to exclude destructive DB integration tests from the default suite

Focus on safety and useful coverage.
```

---

## 26. Deterministic demo path

**Goal:** Keep the reviewer experience independent of third-party availability.

```text
The live provider works, but the public endpoint can rate-limit or become temporarily unavailable.

I want a deterministic reviewer path without bypassing the real application pipeline.

Proposed approach:

FileNewsProvider
-> same CollectionService
-> same Ollama classifier
-> same PostgreSQL persistence
-> same dashboard/API

The file should contain a small set of real, verified articles.

Please review whether this is a reasonable reviewer/demo strategy.

I want to avoid:
- inserting fake rows directly into PostgreSQL
- frontend mocks
- pretending the data was fetched live when it was not

Help me define what should be documented clearly.
```

---

## 27. Demo-data provenance review

**Goal:** Avoid misleading reviewers.

```text
I am committing a small deterministic article fixture for local review.

Please review the wording I should use in documentation.

The facts are:
- articles are real and verified
- the file provider is deterministic
- the live provider is still available separately
- the demo records are passed through the real processing pipeline
- the demo is not evidence of full provider coverage or model quality

Please help me make the wording clear and transparent.

Avoid marketing language.
```

---

## 28. End-to-end verification checklist

**Goal:** Verify behavior without adding features.

```text
Give me a concise end-to-end verification checklist for the current implementation.

I want to verify:

1. company import
2. local Ollama availability
3. file-provider selection
4. one-company collection
5. relevance/sentiment classification
6. PostgreSQL persistence
7. duplicate behavior on a second run
8. dashboard API
9. company mentions API
10. Angular dashboard
11. export files

Do not suggest new features.

I only want checks that prove the current system works.
```

---

## 29. Production tradeoff discussion

**Goal:** Prepare for architecture questions.

```text
Help me prepare a production-design discussion for this project.

The submitted implementation is intentionally a single NestJS application.

If this system grew, I might consider:
- external scheduling
- queue / PubSub
- separate collection workers
- bounded concurrency
- dead-letter handling
- separate notification subscribers
- managed PostgreSQL
- metrics and tracing

Please help me explain:
- when those changes become justified
- why I did not include them in the take-home
- which bottlenecks would appear first
- what I would change before scaling horizontally

Do not turn this into a full distributed-system design.
```

---

## 30. Final submission review

**Goal:** Catch inconsistencies before submission.

```text
Review the repository as a take-home submission.

Do not implement new features.

Look only for:
- stale documentation
- setup instructions that do not match the code
- committed test data
- fake URLs
- missing generated output
- missing environment examples
- commands that no longer work
- contradictions between README and runtime behavior
- dead placeholder frontend content
- accidental secrets
- destructive test configuration

Return findings grouped as:
- must fix before submission
- nice to clean up
- safe to leave as-is

Do not score the project.
```

---

# Reusable prompt pattern

```text
Context:
<what already exists>

Goal:
<one narrow thing I am trying to decide or verify>

Constraints:
<what must not change>

Please help me:
<specific review / analysis / debugging request>

Do not:
<explicit boundaries>

Output:
<what kind of answer would be useful>
```

This pattern makes the context, requested work, and constraints explicit.
