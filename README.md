# AI Workspace

Single-project Next.js app with:
- Dataset dashboard on home
- Form creation and response management
- Invitation email generation
- AI post generation
- Event timeline generation
- Volunteer task assignment planning
- Reminder schedule generation

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Supabase/Postgres backend

## Project Structure

- `app/` routes and API handlers
- `components/` UI and feature components
- `lib/` server/client utilities
- `scripts/schema.sql` database schema
- `run-sql.js` execute schema using `DATABASE_URL` or `DIRECT_URL`

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy env template and fill values:

```bash
cp .env.example .env.local
```

3. Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Database Setup

Option 1 (direct DB URL):

```bash
node run-sql.js
```

Option 2 (Supabase RPC, if available):

```bash
node run-sql-supabase.js
```

If RPC is unavailable, run `scripts/schema.sql` in the Supabase SQL Editor.

## Scripts

- `npm run dev` start dev server
- `npm run build` production build
- `npm run start` run production server
- `npm run lint` TypeScript check
- `npm run typecheck` TypeScript check

## Core Routes

- `/` unified home dashboard
- `/forms/[id]/edit` edit form
- `/forms/[id]/integrate` integration settings
- `/forms/[id]/responses` view submissions
- `/submit/[id-or-custom-link]` public form page
- `/invitation-emails` invitation email generator
- `/post-generator` AI post generation
- `/timeline-generator` event timeline generation
- `/volunteer-assignments` volunteer task assignment planner
- `/reminder-schedule` reminder schedule generator

## API Routes

- `GET /api/health`
- `GET /api/forms`
- `POST /api/forms`
- `GET /api/forms/[id]`
- `PUT /api/forms/[id]`
- `DELETE /api/forms/[id]`
- `POST /api/forms/[id]/sheet`
- `GET /api/submissions?formId=<id>`
- `POST /api/submissions`
- `POST /api/generate-invitation`
- `POST /api/generate-post`
- `POST /api/generate-timeline`
- `POST /api/assign-volunteers`
- `POST /api/generate-reminders`
