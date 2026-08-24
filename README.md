# Rush Republic — Employee Management Portal

React + Django REST Framework + PostgreSQL.

- Exact Login/Signup pages (unchanged from the approved design).
- Dark top-nav shell (no sidebar). Every department gets the same nav —
  **Shoot Plans / Brands / Team / Freelancers / Models** — because those are
  shared data, not department-owned data (see [Role-based access](#6-role-based-access-recap)).
- **Shoot Plans** dashboard — status-tabbed card grid; each card's completion
  percentage is computed live from the plan's real progress (reels, photos,
  crew, budget, feedback), not a stored value that can go stale.
- **Brands / Team / Freelancers / Models** — four full-CRUD directory
  modules. Every one of the 6 roles can view, add, edit, and delete; there is
  one shared copy of each record, not a per-department copy.
- **Shoot Plan wizard** — 8 steps:
  1. **Shoot Details** — title, date/time, searchable Brand picker (auto-fills
     the brand's assigned team), freelancer chips with per-person time in/out.
  2. **Reels** — script, notes, storyboard photo uploads, assignment to
     Models/Locations/Props (added inline, from the shared per-plan pool).
     Each reel carries its own **submit → pending approval → approve /
     return-for-changes** workflow (see below).
  3. **Photos** — shot briefs (with a required description), moodboard
     uploads, multiple reference links, assignment to Models/Locations/Props.
     Same per-shot approval workflow as Reels.
  4. **Shoot Crew** — manual entries, or "Sync from Models" to pull in every
     model booked in Reels/Photos; freelancers from Step 1 appear automatically.
  5. **Budget Allowance** — live rollup computed from Props/Crew meal
     costs/Travel expenses, not manually re-entered.
  6. **Review & Approval** — full read-only summary, completion checklist, and
     the shoot plan's own two-step approval workflow: *Submit for Internal
     Approval → Production Head Approval* (Admin/Production Head only).
  7. **Print Details** — a complete, print-ready snapshot of the whole plan.
     "Preview Printable Version" opens the browser print dialog with the Rush
     Republic logo centered at the top, consistent compact spacing, and every
     Reel's storyboard appended as full-page images at the very end of the
     document (never mixed into the middle).
  8. **Feedback** — leave feedback on the plan; once at least one entry is
     saved, Admin/Production Head can **Mark Shoot Completed** here (moved out
     of Review & Approval — a shoot can't be marked complete with no feedback
     on record).

**Reel/Photo approval workflow** (Production Coordinator, Social Media
Specialist, Client Servicing, and Script Writer can all create/edit/submit;
only Admin/Production Head can approve or return):

```
Fill in the Reel/Shot  →  Submit  →  Pending Approval
                                          │
                          ┌───────────────┴───────────────┐
                          ▼                                ▼
                      Approved                    Returned for Changes
                  (shown in green,             (mandatory suggestions box,
                 approver + timestamp            saved to the record, shown
                      recorded)                  to the creator) → edit →
                                                  Submit again → Pending
                                                  Approval, reviewed again
```

Every submit/return/approve is enforced on the backend (not just hidden
buttons), and the full history of a Reel/Shot's approval rounds is preserved
across resubmissions — nothing is overwritten.

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

Run migrations:

```bash
python manage.py migrate
```

The database currently has **no users and no data** — it's a fresh install.
The only way in is the Signup page (`http://localhost:3000/signup`, public,
no invite needed); the first account you create picks its own department.

If you want sample data to explore the app with instead of starting from
nothing, two optional seed commands are still available:

```bash
python manage.py seed_demo        # 6 demo accounts (one per department) + sample shoot plans
python manage.py seed_directory   # demo Team/Freelancer/Model/Brand rows
```

`seed_demo` creates one login per department, all with the password
`Rush@2026Demo`:

| Department | Email |
|---|---|
| Admin | admin.demo@therushrepublic.com |
| Production Head | prodhead.demo@therushrepublic.com |
| Social Media Specialist | social.demo@therushrepublic.com |
| Production Coordinator | prod.demo@therushrepublic.com |
| Client Servicing | client.demo@therushrepublic.com |
| Script Writer | writer.demo@therushrepublic.com |

You can also create your own Django admin-site login at any time:

```bash
python manage.py createsuperuser  # for /admin/
```

Start the server:

```bash
python manage.py runserver 8001
```

> Port **8001**, not 8000 — this machine already has another Django project
> bound to 8000. If that's not true on your machine, you can use 8000
> instead; just update `frontend/.env` (`REACT_APP_API_BASE_URL`) to match.

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
  rush_republic/       Django project settings, URLs
  users/                Custom user model, JWT auth, RBAC permission classes,
                        department switcher, department dashboards
  shootplan/            ShootPlan + Reel/Photo/PlanModel/PlanLocation/Prop/
                        CrewMember/BudgetItem/TravelExpense/ReviewApproval/
                        Feedback + photo galleries. ReviewApproval doubles as
                        the shared approval-history table for the ShootPlan-
                        level workflow AND the per-Reel/per-Photo workflow
                        (optional `reel`/`photo` FK).
  directory/            Team, Freelancer, Model, Brand CRUD (shared data,
                        full CRUD for every role)
  media/                Uploaded brand logos, model/location/reel/prop photos
                        (created at runtime)

frontend/src/
  context/AuthContext.js          originalRole (the role actually logged in
                                   with, never overwritten) vs. selectedDepartment
                                   (the "Preview As" context) kept as two
                                   independent values on purpose
  components/AppShell.js          Dark top-nav shell; "Preview As" switcher
                                   for Admin (all 6 departments) and
                                   Production Head (all except Admin)
  components/ApprovalPanel.js     Submit / Approve / Return-for-Changes UI,
                                   shared by StepReels.js and StepPhotos.js
  components/Drawer.js            Right-side slide-in form panel used by the
                                   4 directory pages
  components/RepeatingCard.js     Collapsible reorder/duplicate/remove card
                                   used by every wizard step
  components/PhotoUploadGrid.js   Dropzone + thumbnail grid, wired to a
                                   photo-gallery endpoint
  components/SearchPicker.js      Searchable single-select dropdown (Brand
                                   picker, etc.)
  utils/printUtils.js             Shared "wait for images, then print with a
                                   branded document title" helper
  pages/ShootPlans.js             Dashboard — status-tabbed card grid
  pages/wizard/ShootPlanWizard.js Wizard shell — owns all state,
                                   fetch-and-refetch-on-change
  pages/wizard/Step*.js           One file per step (Details/Reels/Photos/
                                   Crew/Budget/Review/PrintDetails/Feedback)
  pages/wizard/PrintableSections.js, PrintDetailsSections.js
                                   Shared read-only renderers behind both
                                   Review & Approval and Print Details, so
                                   the two pages can't drift apart
  pages/Brands.js, Team.js, Freelancers.js, Models.js   The 4 directory modules
  pages/Feedback.js               Standalone cross-plan feedback list (all
                                   departments, all plans — separate from the
                                   per-plan Feedback wizard step)
  pages/Login.js, Signup.js       Unchanged from the approved design
```

## 6. Role-based access, recap

Department determines **which interface a user is viewing**, not what data
they can reach — Brands, Team, Freelancers, Models, and every Shoot Plan
(with its Reels/Photos/Crew/Budget/Feedback) are shared data, visible and
fully editable by all 6 roles.

- **Admin & Production Head**: the only two roles with the "Preview As"
  department switcher — Admin can switch into any of the 6 departments;
  Production Head can switch into any department except Admin (enforced on
  the backend, not just hidden in the dropdown). They're also the only roles
  that can move a shoot plan through its approval workflow (Submit →
  Production Head Approval → Mark Shoot Completed) and the only roles that
  can Approve or Return for Changes on an individual Reel/Photo.
- **Production Coordinator, Social Media Specialist, Client Servicing,
  Script Writer**: no department switcher — their interface stays on their
  own department context — but full create/edit/delete on all shared data,
  and full ability to create, edit, and submit Reels/Photos for approval.
  They cannot approve or return their own (or anyone's) submissions; a
  hand-crafted API call to the approve/return endpoints is rejected
  server-side for these roles regardless of what the UI shows.

## 7. Known simplifications vs. the original design reference

- **Reordering** uses ↑/↓ buttons, not real drag-and-drop — the reference
  mockup itself also uses these buttons for reordering (its "drag & drop"
  wording only applies to the file-upload dropzones, which this build matches).
- **Per-assignment overrides**: when you assign a Model or Location to a Reel
  or Photo brief, the wizard shows that model/location's own time-in/out and
  photos (set once, in the Models/Locations pools) rather than a separate
  override captured per-reel. The original design reference shows a
  per-assignment override with its own costume photos; this build keeps one
  source of truth per model/location instead of duplicating it per assignment.
- **Two feedback surfaces, on purpose**: `/feedback` is a standalone page
  listing every feedback entry across every shoot plan; the Feedback step
  inside a shoot plan's own wizard (step 8) is scoped to that one plan and is
  also where Admin/Production Head mark a shoot completed. They read/write
  the same underlying `Feedback` records — no duplicate data.
