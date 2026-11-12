# NOTES

Each fix was delivered as its own pull request (#1–#5) and merged into `main`.

## What I fixed, and why

### 1. Bulk delete with a locked document deleted only part of the selection (the known issue) — PR #2
- **Cause:** the controller deleted one document at a time and threw on the first locked or missing one. Documents before it were already deleted, documents after it were never tried.
- **Impact:** the user saw "Something went wrong", the selection was cleared, and some documents were permanently gone without any indication.
- **Fix:**
  - A new `DocumentsService.bulkDelete()` tries every ID and never stops partway through.
  - It returns `200 { deleted: string[], failed: [{ id, reason: 'locked' | 'not_found', lockedBy? }] }`.
- **UI:**
  - The confirm step warns which locked documents will be skipped.
  - After the delete, a summary names what was deleted and what was skipped, and who holds each lock.
  - Skipped documents stay selected. Selecting only locked documents explains why and sends no request.
  - The Delete button is disabled while the request runs, so a double-click can't send two requests.

### 2. The document list was frozen at startup — PR #2
- **Cause:** `DocumentsService` copied the store once in `onModuleInit`, and `findAll()` returned that copy forever.
- **Impact:** created documents never appeared and deleted ones never disappeared. This also hid bug 1, because a partial delete looked like nothing had happened.
- **Fix:** removed the cache; `findAll()` reads from the store. The data is a small in-memory array, so the cache saved nothing and only added a way to go stale.

### 3. Bulk delete failed on duplicate or missing IDs after deleting some — PR #2
- **Cause:** `["doc-05", "doc-05"]` deleted the document, then threw a 404 on the second copy. Users can hit this by double-clicking, retrying, or deleting something already removed in another tab.
- **Fix:** IDs are de-duplicated. A missing ID is reported as `not_found` instead of stopping the request, so retries are safe.

### 4. The UI never showed lock status — PR #1
- **Cause:** the client type expected `locked: boolean`, but the API sends `lockedBy: string | null`, so `doc.locked` was always `undefined`.
- **Why TypeScript missed it:** `fetchDocuments()` returned `any`.
- **Fix:**
  - The client uses `lockedBy`, and the badge reads "Locked by {holder}" so users know who to ask.
  - `fetchDocuments()` is now typed as `Promise<Doc[]>`, so a future mismatch fails type-checking.

### 5. No input validation on the API — PRs #4 and #5
- **Impact:**
  - A missing or whitespace-only title created blank rows.
  - Numbers were stored as titles, and there was no length limit.
  - **`{"title": {"x": 1}}` crashed the React app to a blank page for every user** until the server restarted. Any client that can reach the API could do this.
  - `{}` sent to bulk-delete returned 500.
- **Fix:**
  - DTO classes with `class-validator` and a global `ValidationPipe`.
  - Titles are trimmed, then must be present, text, and at most 200 characters.
  - `ids` must be an array of at most 1,000 strings, and unknown fields are rejected.
  - Invalid requests get a 400 with one clear message per field.
- **UI:**
  - A character counter appears near the limit. Past 200 characters it turns red ("265 / 200 — 65 characters too long"), the input is marked invalid, Create is disabled, and screen readers are told once.
  - Validation errors show the server's message, e.g. "Title must be 200 characters or fewer.", instead of "Something went wrong".
- **Follow-up (PR #5):** PR #4 first used `maxLength={200}` on the input. Testing showed it silently cut typed or pasted text at 200 characters (mid-word) and saved the cut-off title, with no warning. So I replaced it with the warning above, which keeps the user's text.
- **Long titles broke the layout (PR #5):** a 200-character title with no spaces made the table wider than the page, pushing the date and status columns off screen. It also overflowed the confirm dialog. Now:
  - The table uses fixed column widths, and titles stay on one line ending in "…", with the full title on hover. Screen readers still read the whole title.
  - On narrow screens the table scrolls inside its own box instead of squeezing the title column to nothing.
  - The dialog's list truncates the same way. Titles quoted in the locked-document warning and in the result message are cut to 60 characters.

### 6. A failed create cleared the typed title — PR #4
- **Cause:** `handleCreate` swallowed errors, so the form always thought it had succeeded and cleared the input.
- **Fix:** the form only clears the input on success, and uses `try/finally` so it can't get stuck in the submitting state.

### 7. The delete confirmation was a plain browser `confirm()` — PR #3
- **Problem:** the browser draws that box, so it can't be styled: plain text only, headed "localhost:5173 says", with OK/Cancel buttons. The locked-document warning was easy to miss.
- **Fix:** a `ConfirmDeleteDialog` built on the native `<dialog>` element (`showModal()`). It provides:
  - a dimmed backdrop and Esc to cancel,
  - keyboard focus kept inside the dialog, and returned to the Delete button on Cancel or Esc,
  - after a confirmed delete, focus moved to the result message. The Delete button is disabled while the request runs, so the browser's default would drop focus to the page body and screen-reader users would lose their place,
  - focus starting on Cancel, so an accidental Enter never deletes anything,
  - a highlighted warning for locked documents.

## Decisions where the requirement was unclear

- **Partial delete instead of all-or-nothing.** For a bulk action, deleting what can be deleted and reporting the rest is more useful than one locked document blocking everything.
  - Trade-off: a user can end up with part of their selection deleted, so the response and UI say exactly what happened, both before (dialog) and after (summary).
- **200 with per-document results, not 207 Multi-Status or 409.** The request itself succeeded, and 207 is a WebDAV code most clients don't handle well.
- **Show lock status, but don't build locking.** The README says documents "can be locked by a user", but there is no lock/unlock endpoint and no user identity (no login or session). Locking needs real identity and rules about who may unlock, which is beyond this task. Locks still come only from seed data.
- **Locked rows stay selectable.** Delete is currently the only bulk action, so disabling locked rows would be reasonable. But a real product would likely add bulk actions that do apply to locked documents (export, move, share).
  - So the server skips locked documents and reports them back.
  - Trade-off: users can select documents that won't be deleted. The dialog warns them before anything happens.
- **The client sends the whole selection, including locked documents.** The server is the source of truth for locks, which may have changed since the page loaded.
- **A missing ID is not an error.** If the document is already gone, the user's goal is met, so it's reported as `not_found` rather than failing the request.
- **Validation rules:**
  - Titles are trimmed and limited to 200 characters, which is long enough for real titles and keeps the table readable.
  - Duplicate titles are still allowed.
  - Unknown fields are rejected rather than silently dropped.
  - Bulk delete accepts at most 1,000 IDs per request.
- **Warn instead of `maxLength`.** Keeping over-long text and saying how much to cut is better than the browser silently dropping it. The client counts characters the same way the server does, so an emoji counts as one character.
- **The 200-character limit is defined twice**, in the server DTO and in `client/src/api.ts`, with comments linking them, because the repo has no shared package.

## What I would flag in code review but did not fix

### Correctness
- `DocumentsStore.remove()`: when the ID isn't found, `findIndex` returns `-1` and `splice(-1, 1)` deletes the **last** document (`server/src/documents/documents.store.ts:36`). The service always checks first, so it can't happen today, but any new caller would silently delete the wrong data.
- `DocumentsStore.findById()` returns the stored object itself, while `all()` and `insert()` return copies. A caller that modifies the result modifies the stored data.
- An error from loading the list is never cleared by a later successful reload; only a create or delete clears it.

### Security
- No authentication or authorization: anyone who can reach the API can create documents and delete any unlocked one.
- Validation now blocks malformed input, but there is no rate limiting on create or bulk delete.

### Accessibility
- The select-all checkbox has no label, so screen readers announce just "checkbox".
- The "—" in the Status column has no text alternative (e.g. "Not locked").

### Performance and UX
- `GET /documents` returns every document with no pagination. That's fine for 20, not for thousands.
- The table is replaced by "Loading…" on every reload, so it flickers and loses the scroll position.
- New documents are added at the bottom, though the list is otherwise newest-first.

### Tests
- The server now has 24 tests, including real HTTP tests for validation. The client has no test runner, so the dialog, the result summary and the form behaviour were checked manually in the browser.

## Where I used AI assistance
I used Claude Code to trace how the app works, and wrote a prioritised list of fixes. I reviewed the list and reproduced the important bugs myself. 
Then I fixed and tested each bug one by one. For every fix, I first reproduced the bug myself, then I reviewed each change and made sure the problem was solved in the running app before it was committed, then reviewed and merged each PR myself.
