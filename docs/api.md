# Phase 2 API

Local base: http://127.0.0.1:3001/api. JSON request bodies have a 16 KB limit. These endpoints are for one local workspace; no authentication is implemented.

## Endpoints

| Method and path | Result |
| --- | --- |
| GET /health | 200: status ok, service dsa-tracker-api, phase 2; independent of PostgreSQL |
| GET /patterns | Starter pattern catalog as { patterns: [{ slug, name }] } |
| GET /problems | { problems, limit, offset } including possible patternSlugs and historicallySolved |
| POST /problems | 201 for new problem; 200 for existing identity, without overwriting metadata |
| PUT /problems/:id/patterns | Replace possible catalog patterns, returning { problem } |
| GET /attempts | { attempts, persistence: true, limit, offset } |
| POST /attempts | 201 for new attempt; 200 for identical retry; { created, attempt } |
| GET /imports | { imports, limit, offset }; each entry has problemId, title, url, platform, importedAt |
| POST /imports | { imported, alreadyImported } |

List endpoints except /patterns accept limit (1–100, default 50) and offset (0–1,000,000, default 0). Problems sort by ID descending; attempts by attemptedAt descending then ID; imports by import time then problem ID. Unknown query fields are rejected on paginated lists.

## POST /problems

```json
{
  "url": "https://leetcode.com/problems/two-sum/",
  "title": "Two Sum",
  "difficulty": "easy",
  "patternSlugs": ["arrays-hashing", "two-pointers"]
}
```

Title is required (1–200 characters). Difficulty is easy/medium/hard or null; absent becomes null. patternSlugs defaults to []. The URL is canonicalized by the LeetCode adapter. No metadata scraping is attempted. All pattern slugs must exist in /patterns.

## PUT /problems/:id/patterns

```json
{ "patternSlugs": ["arrays-hashing", "two-pointers"] }
```

An empty list clears catalog patterns. This does not change recorded attempt patterns.

## POST /attempts

```json
{
  "requestId": "c06a1216-1518-4385-afc2-b349c4513b02",
  "problemId": 1,
  "assistance": "independent",
  "patternSlugs": ["arrays-hashing"],
  "notes": "Used a map to find each complement.",
  "attemptedAt": "2026-09-22T09:00:00.000Z"
}
```

Generate a fresh UUID v4 for each new attempt. For retries, reuse the complete original payload and UUID. Reusing a UUID with different normalized content returns 409.

Assistance is exactly independent, hint, or solution. Choose 1–15 existing patterns actually used; no catalog tags are automatically copied. Notes default to an empty string and are limited to 5000 JavaScript characters. Timestamps must use UTC with exactly three fractional digits, as returned by JavaScript new Date().toISOString(). Invalid calendar dates and times over one minute in the future are rejected.

Only successful, manually reported solves are represented for now; failed submissions and automatic capture are later work.

## POST /imports

```json
{ "problemIds": [1, 2, 3] }
```

Supply 1–100 existing problem IDs. Duplicate IDs are collapsed. Repeating an import is safe. An unknown problem rejects the entire batch. Import records have no assistance, practiced patterns, or claimed solve timestamp and create no attempts.

This API imports historical evidence for already-cataloged problems. Parsing copied LeetCode pages or fetching account history is deferred.

## Errors

- 400: invalid input or malformed JSON.
- 404: problem not found or unknown route.
- 409: requestId reused with a different attempt.
- 413: JSON body over 16 KB.
- 415: unsupported request charset/encoding.
- 503: PostgreSQL not configured, unavailable, or schema not initialized.
- 500: unexpected internal error; response does not expose SQL details.

Errors use { "error": "message" }. In Phase 2, /attempts replaces the Phase 1 empty-placeholder/501 behavior. Missing PostgreSQL now produces 503.


## Review queue (Phase 5)

GET /api/reviews?view=due&limit=10&offset=0

view is due (default) or all; limit is 1–100 (default 50); offset is 0–1,000,000. Unknown query fields are rejected. The server supplies asOf; clients cannot change the queue's clock.

The response contains reviews, totalTracked (problems with practice attempts), totalDue, totalMatching (for this view), view, limit, offset, asOf, and policy.days ({solution:1,hint:3,independent:7}). Each review contains problemId, attemptId, title, url, assistance, attemptedAt, intervalDays, dueAt, due, and patternSlugs from the selected actual attempt. No notes or invented attempt evidence are added.

Latest means attemptedAt descending, then creation time and UUID descending. Each interval day is exactly 24 elapsed hours. Due means dueAt <= asOf. Results sort by dueAt then problemId. Historical-only problems are excluded. Counts and rows use one SQL snapshot; pagination is offset-based, so concurrent updates can move entries between pages. GET never marks anything complete or writes schedule data.
