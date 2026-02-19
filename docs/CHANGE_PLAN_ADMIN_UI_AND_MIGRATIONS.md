# TurtleAlbum Admin Refactor Plan (Step-by-Step)

This is the execution doc for the 3 tasks discussed in the Feishu group chat:

1) DB: add `series.code` + maintain a `series_product_rel` table (while keeping `products.series_id` for compatibility)
2) Admin UI: unify palette to waterfall feed black/white/yellow; remove gold gradient; improve mobile (card layout)
3) Feishu → upload automation: OpenClaw skill posts content/images to production API (with safe env switching)

The goal is to avoid big-bang changes: small patches, local verification, screenshots, frequent commits.

---

## Task 1: DB Schema & Migration Safety

### What changed (already implemented in code)

Backend changes live in:
- `backend/app/models/models.py`
  - `Series.code` added (unique, nullable)
  - `Series.name` is no longer unique
  - `SeriesProductRelation` model added (`series_product_rel`)
- `backend/scripts/migrate_series_code_and_rel.py`
  - SQLite migration script that:
    - adds `series.code` column
    - drops the unique index on `series.name` and recreates a non-unique index
    - creates `series_product_rel` table + indexes
    - backfills from `products.series_id`
- `backend/app/db/session.py`
  - `validate_schema_or_raise()` updated to require `series.code` and `series_product_rel`

### Why we must handle migrations before pushing

CI/CD (`.github/workflows/deploy.yml`) does not run DB migrations.
We use SQLite + `create_all()` which does not alter existing tables.
Therefore if production runs an old DB file, deploying new code without migration will crash at startup.

### Recommended migration strategy (safe)

Option A (recommended): run migration on startup (idempotent)
- Add a small bootstrap step before `uvicorn` starts:
  - if `DATABASE_URL` is sqlite file, run `python3 backend/scripts/migrate_series_code_and_rel.py --db <db-path>`
- This script is idempotent (checks for columns/tables/indexes and uses `INSERT OR IGNORE`).

Option B: manual/separate migration step on deploy
- Use a Kubernetes Job or `kubectl exec` to run the migration inside the running container.

### Local verification checklist (Task 1)

1) Run migration:
   - `python3 backend/scripts/migrate_series_code_and_rel.py --db backend/data/app.db`
2) Verify schema:
   - `sqlite3 backend/data/app.db ".schema series"`
   - `sqlite3 backend/data/app.db ".schema series_product_rel"`
3) Boot server and verify endpoints:
   - `curl http://127.0.0.1:8000/health`
   - login `POST /api/auth/login`
   - list series `GET /api/admin/series` and confirm `code` exists

---

## Task 2: Admin UI Theme + Mobile Card Layout

### UI reference

Use waterfall feed palette and components:
- `frontend/src/pages/SeriesFeed.tsx`

Confirmed decisions:
- No dark mode for now
- Remove gold gradient brand text (`gold-text`) from admin
- Admin should be tool-first (clean), use black/white + yellow accent (`#FFD400`)
- Mobile: card layout (not wide tables)

### Step-by-step execution order

Step 2.1: Remove gold gradient usage in admin
- Files to touch:
  - `frontend/src/index.css` (keep `.gold-text` for public pages if still needed)
  - `frontend/src/components/AdminLayout.tsx` (replace `gold-text` brand)
  - `frontend/src/pages/admin/AdminLogin.tsx` (replace `gold-text` heading)
- Expected effect:
  - Admin headers become black/neutral
  - Yellow accent applied only where needed (active nav, primary buttons)
- Screenshot verify:
  - `/admin/login`
  - `/admin/dashboard`

Step 2.2: Define admin-only accent token for `#FFD400`
- Approach:
  - Add utility classes in admin components or a small CSS module.
  - Keep change localized to admin UI.
- Screenshot verify:
  - active nav item highlight
  - primary button states

Step 2.3: Mobile list → card layout
- Convert admin list/table views to cards on small screens.
- Priorities:
  - products list
  - series list
  - image manager panels
- Screenshot verify (mobile viewport):
  - products list
  - product detail/edit

---

## Task 3: Feishu Upload Automation (OpenClaw skill)

Deferred until tasks 1/2 are stable.

Key constraints:
- Must support dev/staging/prod base URL
- Default must not write to prod
- Prod requires explicit confirmation keyword/token

---

## Commit strategy

- Commit after each step with a clear message.
- If a UI step is wrong, revert to the last known good commit.
- Keep DB/migration commits separate from UI commits.
