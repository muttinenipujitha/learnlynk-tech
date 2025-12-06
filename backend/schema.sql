-- backend/schema.sql

create extension if not exists "pgcrypto";

-- ==========================
-- LEADS
-- ==========================
create table if not exists public.leads (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    owner_id uuid not null,                      -- counselor who owns the lead
    team_id uuid,                                -- for team-based access
    stage text not null default 'new',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Typical query: Leads by tenant, owner, stage
create index if not exists idx_leads_tenant_owner_stage
    on public.leads (tenant_id, owner_id, stage);

-- ==========================
-- APPLICATIONS
-- ==========================
create table if not exists public.applications (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    lead_id uuid not null,
    status text not null default 'started',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint applications_lead_fk
        foreign key (lead_id)
        references public.leads (id)
        on delete cascade
);

-- Typical query: Applications by tenant, lead
create index if not exists idx_applications_tenant_lead
    on public.applications (tenant_id, lead_id);

-- ==========================
-- TASKS
-- ==========================
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    application_id uuid not null,
    type text not null,                          -- 'call' | 'email' | 'review'
    status text not null default 'pending',
    due_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint tasks_application_fk
        foreign key (application_id)
        references public.applications (id)
        on delete cascade,

    -- tasks.type should only allow: call, email, review
    constraint tasks_type_check
        check (type in ('call', 'email', 'review')),

    -- tasks.due_at >= tasks.created_at
    constraint tasks_due_at_check
        check (due_at >= created_at)
);

-- Typical query: Tasks by tenant, due_at, status
create index if not exists idx_tasks_tenant_due_status
    on public.tasks (tenant_id, due_at, status);
