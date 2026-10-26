import { supabase } from "../supabaseClient";

// Calls the Supabase Edge Function "claude-planner" with the teacher's session.
export async function askClaude(action, payload) {
  const { data, error } = await supabase.functions.invoke("claude-planner", { body: { action, payload } });
  if (error) {
    let msg = error.message;
    try { const b = await error.context.json(); if (b && b.error) msg = b.error; } catch { /* keep default message */ }
    if (/Failed to send a request|Failed to fetch|not found/i.test(msg)) msg = "No se pudo contactar a la función de Claude. Revisa que esté publicada en Supabase.";
    throw new Error(msg);
  }
  if (data && data.error) throw new Error(data.error);
  return data.result;
}
