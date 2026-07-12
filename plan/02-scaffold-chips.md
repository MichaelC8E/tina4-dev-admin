# Plan 02 — Make the scaffolding chips actually work

## Goal
The 7 bottom-left scaffold chips (+ Route/Model/Migration/Middleware, ▶ Migrate/
Test/Seed) all report success but do nothing. Wire every one end-to-end, and kill
the false-success masking so failures are visible.

## Root causes (verified in preview against the live node backend)
1. **`api()` never checks `res.ok`** (`src/api.ts`) — returns the error body as if
   it succeeded. A 405/400 renders as a green ✔. Latent bug for EVERY caller.
2. **Create chips** POST `/scaffold` `{type,name}` → 405. Correct contract (all 4
   backends agree): `POST /scaffold/run` `{kind,name}`.
3. **Run chips** POST `/scaffold/run` `{command}` → hits the create endpoint,
   which ignores it. No migrate/test endpoint exists in ANY backend; seed exists
   only per-table (`POST /seed` needs `{table}`).

## Backend contract (target — same across Python/PHP/Ruby/Node)
| Endpoint | Method | Body | Does |
|---|---|---|---|
| `/__dev/api/scaffold` | GET | — | list kinds (exists) |
| `/__dev/api/scaffold/run` | POST | `{kind,name}` | create file (exists) |
| `/__dev/api/migrate` | POST | — | run pending migrations → `{ok,applied,skipped,failed}` (**NEW**) |
| `/__dev/api/test` | POST | — | run the project test suite → `{ok,output,code}` (**NEW**) |
| `/__dev/api/seed/run` | POST | `{count?}` | seed all models FK-ordered → `{ok,seeded,failed}` (**NEW**) |

## Scope
### SPA (this repo — self-contained, testable now)
- [x] `api.ts`: throw on non-2xx, surfacing the backend error message.
- [x] `scaffold(type)`: POST `/scaffold/run` `{kind:type,name}`; open the path.
- [x] `scaffoldRun`: migrate→`/migrate`, test→`/test`, seed→`/seed/run`; real
      result summary; refresh tree after migrate/seed.
- [x] Regression: create chip creates REAL files live; run chips now show honest
      `✗ 404` against a stale backend instead of a false ✔.

### Backends (parity — node reference done + verified)
- [x] Node: `POST /migrate` (orm `migrate()`), `/test` (child proc `npm test`),
      `/seed/run` (orm `discoverModels` → `seedModels`). Verified: real SQLite
      integration test (migrate applied, 5 rows seeded, DB row-count confirmed).
- [ ] Python (reference): same three. ❌ BUILD
- [ ] PHP: same three. ❌ BUILD
- [ ] Ruby: same three. ❌ BUILD

## Tests (real — no mocks)
- [x] Preview: `+ Route` created real files in the live project (get/post/[id]…
      + test), no false ✔; create + api() fix verified live.
- [x] Node endpoints: real-SQLite integration test — migrate applies migration,
      seed inserts 5 rows, `SELECT COUNT(*)` confirms 5. No mocks.
- [x] `devAdmin.test.ts`: 193 passed / 0 failed (no regression from new handlers).
- [ ] Python/PHP/Ruby: per-framework real tests once their endpoints land.

## Verification honesty
SPA + **node** verified live here (preview + real-DB integration test). Python/
PHP/Ruby endpoints are NOT yet built — node stands as the reference contract.
SPA bundle needs `npm run build` + deploy for frameworks to pick up the fix; the
running server also needs a rebuild/restart to serve the new run endpoints.

## Status: SPA + node done & verified. Remaining: Python/PHP/Ruby parity + deploy.
