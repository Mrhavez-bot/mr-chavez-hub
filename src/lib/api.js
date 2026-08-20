// All Supabase reads/writes live here, grouped by entity. Teacher-only
// mutations rely on RLS policies (see supabase/schema.sql) to reject
// anything a student account attempts — the UI hides the controls too,
// but the database is the real enforcement point.
import { supabase } from "./supabaseClient";

async function unwrap(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

/* ---------- App config (singleton row) ---------- */
export const configApi = {
  get: () => unwrap(supabase.from("app_config").select("*").single()),
  update: (fields) => unwrap(supabase.from("app_config").update(fields).eq("id", true).select().single())
};

/* ---------- Students ---------- */
export const studentsApi = {
  list: () => unwrap(supabase.from("students").select("*").order("name")),
  // Public, unauthenticated-readable view (name + group only, no coins, no
  // claim_code) so the student signup picker works before login exists.
  rosterPublic: (group_name) =>
    unwrap(supabase.from("roster_public").select("*").eq("group_name", group_name).eq("claimed", false).order("name")),
  create: (name, group_name) =>
    unwrap(
      supabase
        .from("students")
        .insert({ name, group_name, claim_code: Math.random().toString(36).slice(2, 8).toUpperCase() })
        .select()
        .single()
    ),
  rename: (id, name) => unwrap(supabase.from("students").update({ name }).eq("id", id).select().single()),
  move: (id, group_name) => unwrap(supabase.from("students").update({ group_name }).eq("id", id).select().single()),
  remove: (id) => unwrap(supabase.from("students").delete().eq("id", id)),
  adjustCoins: async (id, delta, reason) => {
    // Read-modify-write guarded by the DB check constraint coins >= 0.
    const student = await unwrap(supabase.from("students").select("coins, group_name").eq("id", id).single());
    const newBalance = Math.max(0, student.coins + delta);
    const applied = newBalance - student.coins;
    await unwrap(supabase.from("students").update({ coins: newBalance }).eq("id", id));
    if (applied !== 0) {
      await unwrap(
        supabase.from("transactions").insert({
          student_id: id,
          group_name: student.group_name,
          amount: applied,
          type: applied > 0 ? "add" : "subtract",
          reason: reason || "Manual adjustment"
        })
      );
    }
    return newBalance;
  },
  applyToGroup: async (group_name, amount, type, reason) => {
    const list = await unwrap(supabase.from("students").select("id, coins").eq("group_name", group_name));
    for (const s of list) {
      const delta = type === "add" ? amount : -amount;
      const newBalance = Math.max(0, s.coins + delta);
      const applied = newBalance - s.coins;
      await unwrap(supabase.from("students").update({ coins: newBalance }).eq("id", s.id));
      if (applied !== 0) {
        await unwrap(
          supabase.from("transactions").insert({
            student_id: s.id,
            group_name,
            amount: applied,
            type,
            reason: reason || "Group transaction"
          })
        );
      }
    }
    return list.length;
  }
};

/* ---------- Rewards & purchases ---------- */
export const rewardsApi = {
  list: () => unwrap(supabase.from("rewards").select("*").order("cost")),
  create: (name, cost) => unwrap(supabase.from("rewards").insert({ name, cost, active: true }).select().single()),
  update: (id, fields) => unwrap(supabase.from("rewards").update(fields).eq("id", id).select().single()),
  remove: (id) => unwrap(supabase.from("rewards").delete().eq("id", id)),
  // Teacher redeeming on a student's behalf — direct write is fine, RLS allows teacher.
  redeemAsTeacher: async (studentId, reward) => {
    const student = await unwrap(supabase.from("students").select("coins, group_name").eq("id", studentId).single());
    if (student.coins < reward.cost) throw new Error("Insufficient balance");
    await unwrap(supabase.from("students").update({ coins: student.coins - reward.cost }).eq("id", studentId));
    await unwrap(
      supabase.from("reward_purchases").insert({
        student_id: studentId, reward_id: reward.id, reward_name: reward.name,
        cost: reward.cost, group_name: student.group_name
      })
    );
    await unwrap(
      supabase.from("transactions").insert({
        student_id: studentId, group_name: student.group_name, amount: -reward.cost,
        type: "redeem", reason: "Redeemed: " + reward.name
      })
    );
  },
  // Student redeeming for themselves — goes through a security-definer RPC
  // so a student can never write coins/purchases directly (see schema.sql).
  redeemAsStudent: (rewardId) => unwrap(supabase.rpc("redeem_reward", { p_reward_id: rewardId })),
  purchases: () => unwrap(supabase.from("reward_purchases").select("*").order("purchased_at", { ascending: false }))
};

export const transactionsApi = {
  list: () => unwrap(supabase.from("transactions").select("*").order("created_at", { ascending: false }))
};

/* ---------- Attendance ---------- */
export const attendanceApi = {
  list: () => unwrap(supabase.from("attendance").select("*")),
  upsert: (student_id, group_name, period, date, status) =>
    unwrap(
      supabase
        .from("attendance")
        .upsert({ student_id, group_name, period, date, status }, { onConflict: "student_id,period,date" })
        .select()
        .single()
    ),
  markAllPresent: async (group_name, period, date, studentIds) => {
    const rows = studentIds.map((student_id) => ({ student_id, group_name, period, date, status: "present" }));
    return unwrap(supabase.from("attendance").upsert(rows, { onConflict: "student_id,period,date" }));
  }
};

/* ---------- Tasks ---------- */
export const tasksApi = {
  list: () => unwrap(supabase.from("tasks").select("*")),
  create: (title, group_name, period) =>
    unwrap(supabase.from("tasks").insert({ title, group_name, period }).select().single()),
  remove: (id) => unwrap(supabase.from("tasks").delete().eq("id", id)),
  results: () => unwrap(supabase.from("task_results").select("*")),
  setResult: (task_id, student_id, status) =>
    status
      ? unwrap(
          supabase
            .from("task_results")
            .upsert({ task_id, student_id, status }, { onConflict: "task_id,student_id" })
            .select()
            .single()
        )
      : unwrap(supabase.from("task_results").delete().eq("task_id", task_id).eq("student_id", student_id))
};

/* ---------- Scores ---------- */
export const scoresApi = {
  list: () => unwrap(supabase.from("scores").select("*")),
  setScore: (student_id, group_name, period, skill, value) =>
    value === null || value === ""
      ? unwrap(supabase.from("scores").delete().eq("student_id", student_id).eq("period", period).eq("skill", skill))
      : unwrap(
          supabase
            .from("scores")
            .upsert(
              { student_id, group_name, period, skill, value: Math.max(0, Math.min(100, Number(value))) },
              { onConflict: "student_id,period,skill" }
            )
            .select()
            .single()
        )
};

/* ---------- Projects ---------- */
export const projectsApi = {
  list: () => unwrap(supabase.from("projects").select("*")),
  create: (name, group_name, period) =>
    unwrap(supabase.from("projects").insert({ name, group_name, period }).select().single()),
  remove: (id) => unwrap(supabase.from("projects").delete().eq("id", id)),
  criteria: () => unwrap(supabase.from("project_criteria").select("*")),
  addCriterion: (project_id, name) =>
    unwrap(supabase.from("project_criteria").insert({ project_id, name }).select().single()),
  renameCriterion: (id, name) =>
    unwrap(supabase.from("project_criteria").update({ name }).eq("id", id).select().single()),
  removeCriterion: (id) => unwrap(supabase.from("project_criteria").delete().eq("id", id)),
  results: () => unwrap(supabase.from("project_results").select("*")),
  setResult: (project_id, student_id, criterion_id, value) =>
    value === null || value === ""
      ? unwrap(supabase.from("project_results").delete().eq("student_id", student_id).eq("criterion_id", criterion_id))
      : unwrap(
          supabase
            .from("project_results")
            .upsert(
              { project_id, student_id, criterion_id, value: Math.max(1, Math.min(5, Number(value))) },
              { onConflict: "student_id,criterion_id" }
            )
            .select()
            .single()
        )
};

/* ---------- Auth / profile ---------- */
export const authApi = {
  signUp: (email, password) => unwrap(supabase.auth.signUp({ email, password })),
  signIn: (email, password) => unwrap(supabase.auth.signInWithPassword({ email, password })),
  signOut: () => supabase.auth.signOut(),
  getProfile: (userId) =>
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle().then(({ data }) => data),
  // Security-definer RPCs — see schema.sql for the checks each performs.
  claimTeacher: () => unwrap(supabase.rpc("claim_teacher_account")),
  claimStudent: (studentId, code) => unwrap(supabase.rpc("claim_student_account", { p_student_id: studentId, p_code: code }))
};
