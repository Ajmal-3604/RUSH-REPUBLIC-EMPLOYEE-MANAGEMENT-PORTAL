# Rush Republic — Employee Management Portal

React + Django REST Framework + PostgreSQL.

- Exact Login/Signup pages (unchanged from your approved design).
- Dark top-nav shell (no sidebar), "Preview As" department switcher for Admin.
- **Shoot Plans** dashboard — status-tabbed card grid, matches the design reference.
- **Brands / Team / Freelancers / Models** — four full CRUD directory modules, Admin-managed.
- **Shoot Plan wizard** — the full 9-step flow, matching the design reference:
  1. Shoot Details — title, date/time, searchable Brand picker (auto-fills the
     brand's assigned team), freelancer chips with per-person time in/out.
  2. People & Models — add manually or pick from the Models directory, per-model
     approval status, 3 photo galleries per model (model/costume/costume-color-ref).
  3. Locations — permit status, approval status, 2 photo galleries per location.
  4. Reels — script, notes, storyboard photo uploads, checkbox assignment to
     Models/Locations/Props added in earlier steps.
  5. Photos — shot briefs with moodboard uploads, assignment to Models/Locations.
  6. Props — sourcing status, reference photos.
  7. Shoot Crew — manual entries, or "Sync from Models" to pull in every model
     booked in Step 2; freelancers added in Step 1 appear here automatically.
  8. Budget Allowance — live rollup computed from Locations/Props/Crew meal
     costs/Travel expenses, not manually re-entered.
  9. Review & Approval — full read-only summary, completion checklist, and the
     Production Review → Creative Review → Approved approval workflow (buttons
     drive the shoot plan's status directly; Admin only).

All photo uploads are real file uploads to Django's `MEDIA_ROOT`, not placeholders.

---

## 1. Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (you already have PostgreSQL 18 installed and running locally)

## 2. Connect PostgreSQL

You already have a PostgreSQL server running locally (the one pgAdmin connects to).
This project uses its own database, separate from any other Rush Republic project
on this machine.

**Create the database** — open pgAdmin's Query tool (or any SQL client) connected
to your `postgres` server, and run:

```sql
CREATE DATABASE rush_republic_final_db;
```

That's it — no separate DB user is required; the app connects as `postgres` using
the credentials in `backend/.env`.

**Configure the connection** — open `backend/.env` (already created for you) and
confirm/edit these values to match your local PostgreSQL:

```
DB_NAME=rush_republic_final_db
DB_USER=postgres
DB_PASSWORD=<your postgres password>
DB_HOST=127.0.0.1
DB_PORT=5432
```

If you ever need to point this app at a different database or a different
Postgres user, this is the only file you need to change.

## 3. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

`backend/.env` is already filled in with a generated `SECRET_KEY` and your DB
settings. If you ever need to regenerate the key:

```bash
python -c "from django.core.management.utils import get_random_secret_key as k; print(k())"
```

Run migrations, seed demo data, and create your own admin login:

```bash
python manage.py migrate
python manage.py seed_demo        # 5 demo accounts (one per department) + sample shoot plans

  password for every demo account: Rush@2026Demo
  ADMIN                    admin.demo@therushrepublic.com
  PRODUCTION_HEAD          prodhead.demo@therushrepublic.com
  SOCIAL_MEDIA             social.demo@therushrepublic.com
  PRODUCTION_COORDINATOR   prod.demo@therushrepublic.com
  CLIENT_SERVICING         client.demo@therushrepublic.com
  SCRIPT_WRITER            writer.demo@therushrepublic.com

  
python manage.py seed_directory   # demo Team/Freelancer/Model/Brand rows matching the design reference
python manage.py createsuperuser  # optional: your own admin account for /admin/
```

  password for every demo account: Rush@2026Demo
  ADMIN                    admin.demo@therushrepublic.com
  SOCIAL_MEDIA             social.demo@therushrepublic.com
  PRODUCTION_COORDINATOR   prod.demo@therushrepublic.com
  CLIENT_SERVICING         client.demo@therushrepublic.com
  SCRIPT_WRITER            writer.demo@therushrepublic.com

Start the server:

```bash
python manage.py runserver 127.0.0.1:8001
```

> Port **8001**, not 8000 — this machine already has another Django project bound
> to 8000. If that's not true on your machine, you can use 8000 instead; just
> update `frontend/.env` (`REACT_APP_API_BASE_URL`) to match.

**Demo logins** (password for all: `Rush@2026Demo`):

| Department | Email |
|---|---|
| Admin | admin.demo@therushrepublic.com |
| Social Media | social.demo@therushrepublic.com |
| Production Co-Ordinator | prod.demo@therushrepublic.com |
| Client-Servicing | client.demo@therushrepublic.com |
| Script Writer | writer.demo@therushrepublic.com |

## 4. Frontend setup

```bash
cd frontend
npm install
npm start
```

Runs on `http://localhost:3000`. `frontend/.env` already points it at
`http://localhost:8001/api`.

## 5. What's where

```
backend/
  rush_republic/     Django project settings, URLs
  users/              Custom user model, JWT auth, RBAC, department dashboards
  shootplan/           ShootPlan + PlanModel/PlanLocation/Prop/Reel/Photo/CrewMember/
                       BudgetItem/TravelExpense/ReviewApproval/Feedback + photo galleries
  directory/          Team, Freelancer, Model, Brand CRUD (Admin-managed)
  media/              Uploaded brand logos, model/location/reel/prop photos (created at runtime)

frontend/src/
  components/AppShell.js         Dark top-nav shell (replaces the old sidebar)
  components/Drawer.js           Right-side slide-in form panel used by the 4 directory pages
  components/RepeatingCard.js    Collapsible reorder/duplicate/remove card used by every wizard step
  components/PhotoUploadGrid.js  Dropzone + thumbnail grid, wired to a photo-gallery endpoint
  components/SearchPicker.js     Searchable single-select dropdown (Brand picker, etc.)
  pages/ShootPlans.js            Dashboard — status-tabbed card grid
  pages/wizard/ShootPlanWizard.js   Wizard shell -- owns all state, fetch-and-refetch-on-change
  pages/wizard/Step*.js             One file per step (Details/People/Locations/Reels/
                                     Photos/Props/Crew/Budget/Review)
  pages/Brands.js, Team.js, Freelancers.js, Models.js   The 4 directory modules
  pages/Login.js, Signup.js      Unchanged from your approved design
```

## 6. Role-based access, recap

- **Admin**: sees all 5 nav items, "Preview As" department switcher, full CRUD on
  everything including Team/Brands/Freelancers/Models, and is the only role that
  can move a shoot plan's status in the Review & Approval step.
- **Every other department**: sees only "Shoot Plans" in the nav, scoped to their
  own department's plans and feedback (enforced server-side, not just hidden in
  the UI). Directory pages (`/brands`, `/team`, `/freelancers`, `/models`) redirect
  non-admins to `/unauthorized` if typed directly into the address bar.

## 7. Known simplifications vs. the design reference

- **Reordering** uses ↑/↓ buttons, not real drag-and-drop — the reference mockup
  itself also uses these buttons for reordering (its "drag & drop" wording only
  applies to the file-upload dropzones, which this build matches).
- **Per-assignment overrides**: when you assign a Model or Location to a Reel or
  Photo brief, the wizard shows that model/location's own time-in/out and photos
  (set once, in Steps 2/3) rather than a separate override captured per-reel. The
  design reference shows a per-assignment override with its own costume photos;
  this build keeps one source of truth per model/location instead of duplicating
  it per assignment.
- **Feedback module** (from your original written spec, not shown in this design
  reference) is still the standalone `/feedback` page from the previous build.
