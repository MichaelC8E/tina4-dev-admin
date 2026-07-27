# Feature: dev-admin test harness + thread-pane guard test

First real tests for the dev-admin SPA. Motivated by PR #1 (+ the 2788
follow-up): the thread-pane toggle functions must not throw when a pane element
is absent. That behaviour had no test — only a browser eyeball was possible,
which is a smoke test. This adds a real, fail-first behavioural test.

## Scope
- [x] Add vitest + happy-dom dev-deps and a `test` script (repo had none)
- [x] `vitest.config.ts` with the happy-dom environment + `test/setup.ts`
      (no-op WebSocket/EventSource + default offline fetch, so import-time
      background connections don't hit the network)
- [x] Real test file for the thread-pane guards — kept PURELY ADDITIVE (no
      shipping-source change, so no bundle rebuild/redeploy). Dropped the
      testability seam in favour of `vi.waitFor` polling + vitest's
      unhandled-rejection-fails-the-test behaviour.

## Tests (written first, real — no smoke tests)
- [x] `threadsShowList` with `threads-detail-view` REMOVED → does NOT throw, and
      still toggles the surviving elements. FAILS FIRST: `TypeError: Cannot set
      properties of null (setting 'hidden')`.
- [x] `threadsShowDetail` happy path (threadList seeded via the real refresh +
      stubbed `fetch`) → detail head/view shown, title + meta strip populated.
- [x] `threadsShowDetail` with `threads-detail-title` REMOVED → does not abort,
      still writes the meta strip. FAILS FIRST: `Cannot set ... 'textContent'`.
- [x] `threadsShowDetail` with `threads-detail-meta` REMOVED (the 2788 guard) →
      does not abort, still paints the chat. FAILS FIRST: `Cannot set ...
      'innerHTML'`.

The transit functions (`renderThreadSidebar`/`loadThreadMessages`/
`paintThreadMessages`/`renderThreadsListView`) each self-guard on their own
element, so only the elements the tested functions touch need mounting.

## Bugs
- (none)

## Commits
- (pending — this commit)

## Status: ✅ Complete — 4/4 real tests green, each fail-first proven; `tsc` clean
