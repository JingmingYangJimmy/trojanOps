-- Roles, grants, RLS, the read_grants trigger and the agent_runs_meta view (docs/architecture.md §5).
-- Runs as the owner (DATABASE_OWNER_URL). The role survives `pnpm db:reset`; the do block skips it.

do $$ begin
  if not exists (select from pg_roles where rolname = 'trojanops_app') then
    create role trojanops_app login password 'app' nosuperuser nobypassrls;
  end if;
end $$;
--> statement-breakpoint
grant usage on schema public to trojanops_app;
--> statement-breakpoint
grant select, insert, update on all tables in schema public to trojanops_app;
--> statement-breakpoint
grant usage, select on all sequences in schema public to trojanops_app;
--> statement-breakpoint
alter default privileges in schema public grant select, insert, update on tables to trojanops_app;
--> statement-breakpoint
alter default privileges in schema public grant usage, select on sequences to trojanops_app;
--> statement-breakpoint
revoke update, delete on audit_events, ai_usage from trojanops_app;
--> statement-breakpoint

create or replace function app_setting_array(name text) returns text[] language sql stable as $$
  select coalesce(nullif(current_setting(name, true), ''), '{}')::text[] $$;
--> statement-breakpoint

-- read_grants is derived from tier and allowed_positions; code never writes it.
--   public       → {'*'}
--   members      → {'<orgId>:*'}
--   officers     → {'<orgId>:president'} ∪ {'<orgId>:<p>' for p in allowed_positions}
--   usg_internal → {'<usgId>:reviewer', '<usgId>:admin'}
create or replace function documents_set_read_grants() returns trigger language plpgsql as $$
declare
  usg_id uuid;
begin
  if new.tier = 'public' then
    new.read_grants := array['*'];
  elsif new.tier = 'members' then
    new.read_grants := array[new.org_id::text || ':*'];
  elsif new.tier = 'officers' then
    new.read_grants := array(
      select distinct new.org_id::text || ':' || p
      from unnest(array['president'] || coalesce(new.allowed_positions, '{}')) as p
    );
  elsif new.tier = 'usg_internal' then
    select id into usg_id from orgs where kind = 'usg' order by created_at limit 1;
    if usg_id is null then
      raise exception 'usg_internal document needs a USG org';
    end if;
    new.read_grants := array[usg_id::text || ':reviewer', usg_id::text || ':admin'];
  end if;
  return new;
end $$;
--> statement-breakpoint
create trigger documents_read_grants
  before insert or update on documents
  for each row execute function documents_set_read_grants();
--> statement-breakpoint

alter table documents enable row level security;
--> statement-breakpoint
alter table documents force row level security;
--> statement-breakpoint
create policy documents_read on documents for select to trojanops_app using (
  read_grants && app_setting_array('app.grants')
  and source_id::text = any (app_setting_array('app.agent_sources')));
--> statement-breakpoint
create policy documents_insert on documents for insert to trojanops_app
  with check (org_id::text = current_setting('app.manage_org', true));
--> statement-breakpoint
create policy documents_update on documents for update to trojanops_app
  using (org_id::text = current_setting('app.manage_org', true))
  with check (org_id::text = current_setting('app.manage_org', true));
--> statement-breakpoint

alter table agent_runs enable row level security;
--> statement-breakpoint
alter table agent_runs force row level security;
--> statement-breakpoint
create policy runs_own on agent_runs for all to trojanops_app
  using (user_id::text = current_setting('app.user_id', true))
  with check (user_id::text = current_setting('app.user_id', true));
--> statement-breakpoint

-- Run metadata for club and USG pages (I15). The view runs with its owner's rights, so it lists every
-- run; services filter by org. It never exposes input or output.
create view agent_runs_meta as
  select id, installation_id, template_version, rule_pack_version, org_id, billed_org_id, user_id,
         accessible_document_ids, cited_document_ids, model, cost_micro, status, started_at,
         finished_at, created_at
  from agent_runs;
--> statement-breakpoint
grant select on agent_runs_meta to trojanops_app;
