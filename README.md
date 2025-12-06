# LearnLynk – Technical Assessment (Completed Submission)

This repository contains my completed solution for the LearnLynk technical assessment.  
The project demonstrates database design, row-level security, Edge Functions, and a small Next.js frontend page integrated with Supabase.

---

# 📌 Deliverables Overview

| Task | File |
|------|------|
| Task 1 — Database Schema | `backend/schema.sql` |
| Task 2 — Row-Level Security Policies | `backend/rls_policies.sql` |
| Task 3 — Edge Function (`/create-task`) | `backend/edge-functions/create-task/index.ts` |
| Task 4 — Frontend Page (`/dashboard/today`) | `frontend/pages/dashboard/today.tsx` |
| Task 5 — Stripe Checkout (Written Answer) | Included at bottom of this README |

All tasks follow the exact requirements outlined in the assignment.

---

# 🧱 Task 1 — Database Schema

File: **`backend/schema.sql`**

Implemented tables:

- `leads`
- `applications`
- `tasks`

Every table includes required fields:

```sql
id uuid primary key default gen_random_uuid(),
tenant_id uuid not null,
created_at timestamptz default now(),
updated_at timestamptz default now()
Additional Requirements Implemented

applications.lead_id → foreign key to leads.id

tasks.application_id → foreign key to applications.id

tasks.type restricted to: 'call', 'email', 'review'

tasks.due_at >= tasks.created_at (check constraint)

Indexes created for typical access patterns:

Leads → (tenant_id, owner_id, stage)

Applications → (tenant_id, lead_id)

Tasks → (tenant_id, due_at, status)

🔐 Task 2 — Row-Level Security

File: backend/rls_policies.sql

RLS enabled and enforced on leads.

Requirements Implemented

Counselors can view:

Leads where they are owner_id

Leads associated with any team they belong to (via user_teams)

Admins can view:

All leads within their same tenant_id

Insert Policy:

Counselors + admins may insert leads only under their own tenant_id

Required Tables (assumed by prompt)
users(id, tenant_id, role)
teams(id, tenant_id)
user_teams(user_id, team_id)


JWT contains: user_id, role, tenant_id.

⚡ Task 3 — Supabase Edge Function: /create-task

File: backend/edge-functions/create-task/index.ts

Function Behavior

Accepts POST input:

{
  "application_id": "uuid",
  "task_type": "call",
  "due_at": "2025-01-01T12:00:00Z"
}

Validation Rules

task_type must be call, email, or review

due_at must:

Be a valid ISO timestamp

Be in the future

On Success

Inserts a new task using the service role key

Returns:

{ "success": true, "task_id": "..." }

On Failure

Returns 400 for validation errors

Returns 500 for unexpected server/database errors

Realtime broadcast event "task.created" is also emitted.

💻 Task 4 — Next.js Page /dashboard/today

File: frontend/pages/dashboard/today.tsx

Page Features

Fetches tasks due today (status != 'completed')

Displays:

type

application_id

due_at

status

Includes “Mark Complete” button:

Calls supabase.from("tasks").update()

Refreshes the page after update

Handles loading + error states

Uses the Supabase client provided at frontend/lib/supabaseClient.ts

💳 Task 5 — Stripe Answer

(As required, the Stripe answer is included inside this README below.)

Stripe Answer

When a user begins the checkout process, I insert a payment_requests row with application_id, fee amount, currency, and status = 'pending'.

The backend calls stripe.checkout.sessions.create() with:

The application fee line item

Success/cancel URLs

Metadata containing payment_request_id and application_id

I store session.id (and optionally payment_intent) back into the payment_requests record.

The frontend receives the session.url and redirects the user to Stripe-hosted Checkout.

A webhook endpoint (e.g., /api/stripe/webhook) validates Stripe events using the signing secret.

When checkout.session.completed or payment_intent.succeeded fires, I update:

payment_requests.status = 'succeeded'

Store payment details for audit

In the same operation, I update applications.stage = 'fee_paid' and optionally add a timeline entry.

If the payment expires or fails, I update payment_requests.status accordingly and the application stays in “awaiting payment” state.

🛠 Running This Project Locally
1. Frontend Setup
cd frontend
npm install
npm run dev


Visit:

http://localhost:3000/dashboard/today

2. Environment Variables

Create file: frontend/.env.local

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here


Restart:

npm run dev

3. Supabase Database Setup

In Supabase SQL Editor:

Run backend/schema.sql

Run backend/rls_policies.sql

4. Edge Function Locally
supabase functions serve create-task


Or deploy:

supabase functions deploy create-task


Secrets required:

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

✔ Notes / Assumptions

Supporting tables such as users, teams, and user_teams are assumed to exist.

.env.local is intentionally not committed.

All components tested successfully with a real Supabase project.

🎉 Thank You!

This completes the LearnLynk technical assessment.