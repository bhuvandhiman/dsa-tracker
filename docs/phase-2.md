# Phase 2: database and API walkthrough

Run these commands in PowerShell from `C:\Users\bhuva\Documents\Projects\dsa-tracker`.

## 1. Set up PostgreSQL

Install PostgreSQL using the Windows installer linked from https://www.postgresql.org/download/windows/. Include the server and pgAdmin, remember the postgres account password, and use port 5432 unless already occupied.

In pgAdmin, connect to the local server, right-click Databases, choose Create → Database, and create `dsa_tracker`. No manual table creation is needed.

```powershell
if (!(Test-Path apps/api/.env)) {
  Copy-Item apps/api/.env.example apps/api/.env
}
notepad apps/api/.env
```

Set the following, replacing YOUR_PASSWORD with your own URL-encoded PostgreSQL password:

```dotenv
HOST=127.0.0.1
PORT=3001
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/dsa_tracker
```

Then:

```powershell
npm.cmd run db:check
npm.cmd run db:migrate
npm.cmd run test:db
```

Expected: connection OK, migration `001_domain.sql` applied, and the PostgreSQL integration test passing. Rerunning db:migrate reports the schema is up to date. It does not clear existing data.

The integration test creates and drops only its own random `dsa_test_...` schema. It needs CREATE permission on the configured database. You may set TEST_DATABASE_URL to a separate test database before running it.

## 2. Start the app

```powershell
npm.cmd run dev
```

Leave that terminal open. Use a second terminal for the commands below. If the API was running before you edited .env, restart it.

```powershell
$api = 'http://127.0.0.1:3001/api'
Invoke-RestMethod "$api/health"
(Invoke-RestMethod "$api/patterns").patterns | Format-Table
```

Health responds even without PostgreSQL. The patterns request is the first real database read and should return 15 starter patterns after migration.

## 3. Add a problem and its possible approaches

```powershell
$problemBody = @{
  url = 'https://leetcode.com/problems/two-sum/'
  title = 'Two Sum'
  difficulty = 'easy'
  patternSlugs = @('arrays-hashing', 'two-pointers')
} | ConvertTo-Json

$problemResult = Invoke-RestMethod "$api/problems" -Method Post -ContentType 'application/json' -Body $problemBody
$problemId = $problemResult.problem.id
$problemResult | ConvertTo-Json -Depth 6
```

The first request creates a problem. Repeating it returns the existing problem without duplicating it or overwriting metadata. The unique identity is LeetCode plus `two-sum`, even when a supplied URL has a description subpage or query parameters.

## 4. Record an actual practice attempt

```powershell
$attemptBody = @{
  requestId = [guid]::NewGuid().ToString()
  problemId = $problemId
  assistance = 'independent'
  patternSlugs = @('arrays-hashing')
  notes = 'Used a map for complements. Did not practice the two-pointer approach.'
  attemptedAt = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
} | ConvertTo-Json

Invoke-RestMethod "$api/attempts" -Method Post -ContentType 'application/json' -Body $attemptBody
(Invoke-RestMethod "$api/attempts").attempts | ConvertTo-Json -Depth 6
```

Although the problem has two possible approaches, this attempt includes only arrays-hashing. Assistance may instead be `hint` or `solution`. Notes are optional. Timestamps must be UTC with three fractional digits.

To simulate a network retry, send the same stored payload again:

```powershell
Invoke-RestMethod "$api/attempts" -Method Post -ContentType 'application/json' -Body $attemptBody
```

The response has `created: false`, and the attempt count does not grow. For a real new attempt, generate a new requestId and timestamp. Reusing an old requestId with changed contents returns HTTP 409.

## 5. Import historical completion without inventing an attempt

```powershell
$oldProblem = @{
  url = 'https://leetcode.com/problems/valid-parentheses/'
  title = 'Valid Parentheses'
  difficulty = 'easy'
  patternSlugs = @('stack')
} | ConvertTo-Json

$oldResult = Invoke-RestMethod "$api/problems" -Method Post -ContentType 'application/json' -Body $oldProblem
$importBody = @{ problemIds = @($oldResult.problem.id) } | ConvertTo-Json
Invoke-RestMethod "$api/imports" -Method Post -ContentType 'application/json' -Body $importBody
(Invoke-RestMethod "$api/imports").imports | Format-Table
(Invoke-RestMethod "$api/attempts").attempts | ConvertTo-Json -Depth 6
```

The historical record exists, but the attempts list has not gained a fabricated solve. Repeating the import returns `alreadyImported: 1`. Unknown IDs reject the entire batch. This phase accepts explicit problem IDs; parsing pasted LeetCode history comes later.

## 6. Verify persistence and checks

Stop the app with Ctrl+C, start it again, and request /api/problems, /api/attempts and /api/imports. Data should remain.

```powershell
npm.cmd run check
npm.cmd run test:db
```

The first command runs linting, 68 database-independent tests and a dashboard build. The second exercises real PostgreSQL, including migration reruns, rollback, concurrent retries, pattern separation, imports, and reads after reopening the connection.

The dashboard still displays a connection shell, not these records. Forms/history views and extension submission capture are future phases; the extension can still be tested with the Phase 1 README instructions.
