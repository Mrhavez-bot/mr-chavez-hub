# Mr. Chavez's Hub — Vite + React + Supabase

A real multi-user educational platform: teacher and student accounts, row-level
security in Postgres, and the exact grading formulas from the spec (dynamic
30/30/40 ↔ 20/20/30/30 based on whether a Project exists for a group+period).

## 1. Install

```bash
npm install
```

## 2. Create your Supabase project

1. Go to https://supabase.com, create a free account and a new project.
2. In the project, go to **SQL Editor → New query**, paste the entire contents
   of `supabase/schema.sql`, and run it.
3. Before running, edit the one line near the top:
   ```sql
   insert into app_config (id, teacher_email) values (true, 'REPLACE_WITH_YOUR_TEACHER_EMAIL@example.com');
   ```
   Put in the email address you (the teacher) will sign up with. Only this
   exact email can successfully claim the teacher role.
4. In **Authentication → Providers**, Email should already be enabled by
   default. For a classroom pilot you may want to turn off "Confirm email"
   under **Authentication → Settings** so students don't need working inboxes
   to finish signup — turn it back on for a real production rollout.
5. Go to **Project Settings → API** and copy the **Project URL** and **anon
   public key**.

## 3. Configure the app

```bash
cp .env.example .env.local
```
Paste your Project URL and anon key into `.env.local`.

## 4. Run it

```bash
npm run dev
```
Open the printed local URL. Sign up as the teacher first (Auth screen → "I'm
the Teacher" → Create account, using the exact email from step 2.3).

## 5. Add students and get them logged in

1. As the teacher, go to **Students → a group → Add student**.
2. Each new student gets a random **claim code**, shown on their card until
   they claim it.
3. Give each student their name + claim code. They go to the Auth screen →
   "I'm a Student" → "First time — create account", pick their name and
   group, enter the code, and set their own email/password.
4. After that, they just sign in normally from any device.

## What's real here vs. the single-file demo

- Every student/teacher distinction is enforced by Postgres Row Level
  Security (`supabase/schema.sql`), not just by hiding UI — a student's
  Supabase session literally cannot `SELECT` another student's rows.
- Reward redemption and account claiming go through `security definer`
  RPC functions (`redeem_reward`, `claim_student_account`,
  `claim_teacher_account`) so business rules (balance checks, one-account-
  per-student) are enforced server-side, not just in the React code.
- The grading engine (`src/lib/calc.js`) is pure, dependency-free, and
  exactly the same code path used by the Grades tab, Dashboard, Reports,
  and the Excel export — there's one formula, not five copies of it.

## Known limitations / next steps

- Email confirmation, password resets, and "forgot my claim code" flows use
  Supabase's defaults — customize email templates in the Supabase dashboard
  if you want branded emails.
- PDF export uses the browser's print dialog (Ctrl/Cmd+P → Save as PDF) with
  a print stylesheet — swap in `jspdf` + `jspdf-autotable` later if you want
  a one-click PDF without the print dialog.
- Moving a student between groups keeps all historical attendance/task/score
  rows tagged with the group they were recorded in at the time (that's
  stored on each record, not derived from the student's current group), so
  history won't be rewritten by a later move.
- `teacher_email` is a single value in `app_config` — fine for a one-teacher
  classroom app; for multiple teachers you'd extend `profiles` with a list of
  allowed emails or a proper invite-code flow.

## Project layout

```
src/
  lib/
    constants.js   groups, periods, skills, task status % mapping
    calc.js         pure grading engine (no Supabase, no DOM — unit-testable)
    api.js          all Supabase reads/writes, grouped by entity
    excel.js        SheetJS import/export
    supabaseClient.js
  context/
    AuthContext.jsx  session + profile (role) state
    DataContext.jsx  loads all app data, exposes reload()
  components/        one file per tab, plus shared pickers/charts
supabase/
  schema.sql          tables, RLS policies, RPC functions — run this once
```
