-- backend/rls_policies.sql

alter table public.leads enable row level security;
alter table public.leads force row level security;

-- Convenience: extract common JWT claims
-- auth.jwt()->>'user_id'   :: text  (cast to uuid where needed)
-- auth.jwt()->>'role'      :: text  ('admin' | 'counselor')
-- auth.jwt()->>'tenant_id' :: text  (cast to uuid)

-- ==========================
-- SELECT policy on leads
-- ==========================
-- Admins: can see all leads belonging to their tenant.
-- Counselors: can see leads they own OR leads assigned to any team they belong to.

create policy select_leads_by_role
on public.leads
for select
using (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    and (
        -- Admin: full tenant visibility
        (auth.jwt()->>'role') = 'admin'
        or (
            -- Counselor: own leads OR leads for their teams
            (auth.jwt()->>'role') = 'counselor'
            and (
                owner_id = (auth.jwt()->>'user_id')::uuid
                or team_id in (
                    select ut.team_id
                    from public.user_teams ut
                    where ut.user_id = (auth.jwt()->>'user_id')::uuid
                )
            )
        )
    )
);

-- ==========================
-- INSERT policy on leads
-- ==========================
-- Admins and counselors can insert leads under their tenant.

create policy insert_leads_for_tenant
on public.leads
for insert
with check (
    (auth.jwt()->>'role') in ('admin', 'counselor')
    and tenant_id = (auth.jwt()->>'tenant_id')::uuid
);

