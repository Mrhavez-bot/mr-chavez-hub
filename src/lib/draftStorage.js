// Lightweight localStorage-based draft persistence so in-progress captures
// in Attendance/Tasks/Exam/Project survive an unexpected full page reload —
// for example the browser discarding a background tab to save memory and
// reloading it from scratch when you switch back.
//
// This is purely a local safety net: nothing here touches Supabase. Once
// the teacher clicks "Guardar" and the save succeeds, the draft is cleared.
const PREFIX = "mrchavez-draft:";

export function saveDraft(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch {
    // localStorage can fail (private browsing, storage full, etc).
    // Drafts are a nice-to-have on top of the save button, never a blocker.
  }
}

export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
