-- ============================================================
-- Mr. Chavez's Hub — Supabase schema, RLS policies, and RPCs
-- Run this whole file once in Supabase: Dashboard -> SQL Editor -> New query.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- app_config: single settings row ----------
create table if not exists app_config (
  id boolean primary key default true check (id),
  app_name text not null default 'Mr. Chavez''s Hub',
  header_message text not null default 'Coins, attendance, tasks, scores & grades — one roster',
  currency_name text not null default 'Celtix',
  logo_url text,
  -- Only this email can successfully claim the teacher role via claim_teacher_account().
  -- Change it in the table editor if the teacher's email changes.
  teacher_email text not null
);
insert into app_config (id, teacher_email) values (true, 'REPLACE_WITH_YOUR_TEACHER_EMAIL@example.com')
  on conflict (id) do nothing;

-- ---------- students ----------
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_name text not null check (group_name in ('10A','10B','11A','11B','12AB1','12AB2')),
  coins int not null default 0 check (coins >= 0),
  claim_code text not null,
  claimed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Public, minimal view for the student signup picker — no coins, no claim_code.
create or replace view roster_public as
  select id, name, group_name, claimed from students;

-- ---------- profiles: links an auth.users row to a role (+ student, if role=student) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher','student')),
  student_id uuid references students(id),
  created_at timestamptz not null default now()
);

-- ---------- rewards & purchases ----------
create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cost int not null check (cost > 0),
  active boolean not null default true
);

create table if not exists reward_purchases (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  reward_id uuid references rewards(id),
  reward_name text not null,
  cost int not null,
  group_name text not null,
  purchased_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  group_name text not null,
  amount int not null,
  type text not null,
  reason text,
  created_at timestamptz not null default now()
);

-- ---------- attendance ----------
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  group_name text not null,
  period text not null check (period in ('Period 1','Period 2','Period 3','Final')),
  date date not null,
  status text not null check (status in ('present','late','absent')),
  unique (student_id, period, date)
);

-- ---------- tasks ----------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  group_name text not null,
  period text not null check (period in ('Period 1','Period 2','Period 3','Final')),
  created_at timestamptz not null default now()
);

create table if not exists task_results (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text not null check (status in ('Complete','Incomplete','Submitted Late','With Issues','Not Submitted')),
  unique (task_id, student_id)
);

-- ---------- scores ----------
create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  group_name text not null,
  period text not null check (period in ('Period 1','Period 2','Period 3','Final')),
  skill text not null check (skill in ('Listening','Reading','Writing','Speaking','Use of English')),
  value int not null check (value between 0 and 100),
  unique (student_id, period, skill)
);

-- ---------- projects ----------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_name text not null,
  period text not null check (period in ('Period 1','Period 2','Period 3','Final')),
  created_at timestamptz not null default now()
);

create table if not exists project_criteria (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null
);

create table if not exists project_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  criterion_id uuid not null references project_criteria(id) on delete cascade,
  value int not null check (value between 1 and 5),
  unique (student_id, criterion_id)
);

-- ============================================================
-- Helper functions used inside RLS policies
-- ============================================================
create or replace function is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'teacher');
$$;

create or replace function my_student_id() returns uuid
language sql stable security definer set search_path = public as $$
  select student_id from profiles where id = auth.uid();
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table app_config enable row level security;
alter table students enable row level security;
alter table profiles enable row level security;
alter table rewards enable row level security;
alter table reward_purchases enable row level security;
alter table transactions enable row level security;
alter table attendance enable row level security;
alter table tasks enable row level security;
alter table task_results enable row level security;
alter table scores enable row level security;
alter table projects enable row level security;
alter table project_criteria enable row level security;
alter table project_results enable row level security;

-- app_config: everyone signed in can read; only teacher can write.
drop policy if exists "config read" on app_config;
create policy "config read" on app_config for select using (auth.role() = 'authenticated');
drop policy if exists "config write" on app_config;
create policy "config write" on app_config for update using (is_teacher()) with check (is_teacher());

-- students: teacher full access; student can read only their own row.
drop policy if exists "students teacher all" on students;
create policy "students teacher all" on students for all using (is_teacher()) with check (is_teacher());
drop policy if exists "students self read" on students;
create policy "students self read" on students for select using (id = my_student_id());
-- roster_public view is created with security_invoker off by default in Postgres 15+,
-- so grant anon/authenticated select on the view itself for the signup picker:
grant select on roster_public to anon, authenticated;

-- profiles: users can read their own profile; teacher can read all. No direct client
-- inserts — accounts are created only via the claim_* RPC functions below.
drop policy if exists "profiles self read" on profiles;
create policy "profiles self read" on profiles for select using (id = auth.uid() or is_teacher());

-- rewards: teacher full access; students can read active rewards.
drop policy if exists "rewards teacher all" on rewards;
create policy "rewards teacher all" on rewards for all using (is_teacher()) with check (is_teacher());
drop policy if exists "rewards student read" on rewards;
create policy "rewards student read" on rewards for select to authenticated using (active = true);

-- reward_purchases: teacher full access; students read only their own.
drop policy if exists "purchases teacher all" on reward_purchases;
create policy "purchases teacher all" on reward_purchases for all using (is_teacher()) with check (is_teacher());
drop policy if exists "purchases self read" on reward_purchases;
create policy "purchases self read" on reward_purchases for select using (student_id = my_student_id());

-- transactions: teacher full access; students read only their own.
drop policy if exists "tx teacher all" on transactions;
create policy "tx teacher all" on transactions for all using (is_teacher()) with check (is_teacher());
drop policy if exists "tx self read" on transactions;
create policy "tx self read" on transactions for select using (student_id = my_student_id());

-- attendance / tasks / task_results / scores / projects / project_criteria / project_results:
-- teacher full access (create/edit); students read-only, own records only.
drop policy if exists "attendance teacher all" on attendance;
create policy "attendance teacher all" on attendance for all using (is_teacher()) with check (is_teacher());
drop policy if exists "attendance self read" on attendance;
create policy "attendance self read" on attendance for select using (student_id = my_student_id());

drop policy if exists "tasks teacher all" on tasks;
create policy "tasks teacher all" on tasks for all using (is_teacher()) with check (is_teacher());
drop policy if exists "tasks student read" on tasks;
create policy "tasks student read" on tasks for select to authenticated using (true); -- task metadata isn't sensitive; results are restricted below

drop policy if exists "task_results teacher all" on task_results;
create policy "task_results teacher all" on task_results for all using (is_teacher()) with check (is_teacher());
drop policy if exists "task_results self read" on task_results;
create policy "task_results self read" on task_results for select using (student_id = my_student_id());

drop policy if exists "scores teacher all" on scores;
create policy "scores teacher all" on scores for all using (is_teacher()) with check (is_teacher());
drop policy if exists "scores self read" on scores;
create policy "scores self read" on scores for select using (student_id = my_student_id());

drop policy if exists "projects teacher all" on projects;
create policy "projects teacher all" on projects for all using (is_teacher()) with check (is_teacher());
drop policy if exists "projects student read" on projects;
create policy "projects student read" on projects for select to authenticated using (true); -- project metadata isn't sensitive

drop policy if exists "criteria teacher all" on project_criteria;
create policy "criteria teacher all" on project_criteria for all using (is_teacher()) with check (is_teacher());
drop policy if exists "criteria student read" on project_criteria;
create policy "criteria student read" on project_criteria for select to authenticated using (true);

drop policy if exists "project_results teacher all" on project_results;
create policy "project_results teacher all" on project_results for all using (is_teacher()) with check (is_teacher());
drop policy if exists "project_results self read" on project_results;
create policy "project_results self read" on project_results for select using (student_id = my_student_id());

-- ============================================================
-- Security-definer RPCs — the only way client code can create a profile
-- or redeem a reward as a student. Each does its own server-side check,
-- so the frontend never needs elevated credentials.
-- ============================================================
create or replace function claim_teacher_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select teacher_email from app_config limit 1) is distinct from (auth.jwt()->>'email') then
    raise exception 'This email is not authorized for the teacher role.';
  end if;
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'Account already has a role.';
  end if;
  insert into profiles(id, role) values (auth.uid(), 'teacher');
end;
$$;

create or replace function claim_student_account(p_student_id uuid, p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from students where id = p_student_id and claim_code = p_code and claimed = false
  ) then
    raise exception 'Invalid claim code, or this student account is already linked.';
  end if;
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'Account already has a role.';
  end if;
  insert into profiles(id, role, student_id) values (auth.uid(), 'student', p_student_id);
  update students set claimed = true where id = p_student_id;
end;
$$;

create or replace function redeem_reward(p_reward_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  sid uuid := my_student_id();
  bal int;
  grp text;
  r_name text;
  r_cost int;
  r_active boolean;
begin
  if sid is null then raise exception 'Not a student account.'; end if;
  select coins, group_name into bal, grp from students where id = sid;
  select name, cost, active into r_name, r_cost, r_active from rewards where id = p_reward_id;
  if not r_active then raise exception 'This reward is not available.'; end if;
  if bal < r_cost then raise exception 'Not enough balance.'; end if;
  update students set coins = coins - r_cost where id = sid;
  insert into reward_purchases(student_id, reward_id, reward_name, cost, group_name)
    values (sid, p_reward_id, r_name, r_cost, grp);
  insert into transactions(student_id, group_name, amount, type, reason)
    values (sid, grp, -r_cost, 'redeem', 'Redeemed: ' || r_name);
end;
$$;

-- ============================================================
-- Done. Next: create your teacher account in the app (Auth screen ->
-- "I'm the Teacher" -> Create account, using the same email you put
-- in app_config.teacher_email above).
-- ============================================================
