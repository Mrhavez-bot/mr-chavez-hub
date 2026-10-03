import { useState } from "react";
import { authApi, studentsApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { GROUPS } from "../lib/constants";

export default function Auth() {
  const { refreshProfile } = useAuth();
  const [mode, setMode] = useState("choose"); // choose | teacher | student | student-claim
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  // student claim flow state
  const [group, setGroup] = useState(GROUPS[0]);
  const [roster, setRoster] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [code, setCode] = useState("");

  async function loadRoster(g) {
    setGroup(g);
    try {
      setRoster(await studentsApi.rosterPublic(g));
    } catch {
      setRoster([]);
    }
  }

  async function teacherAuth(isSignUp) {
    setBusy(true); setMsg(null);
    try {
      if (isSignUp) {
        await authApi.signUp(email, password);
        await authApi.claimTeacher();
        setMsg({ type: "ok", text: "Account created. If email confirmation is on, check your inbox, then sign in." });
      } else {
        await authApi.signIn(email, password);
      }
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function studentAuth(isSignUp) {
    setBusy(true); setMsg(null);
    try {
      if (isSignUp) {
        if (!studentId) throw new Error("Select your name from the list.");
        if (!code) throw new Error("Enter the claim code your teacher gave you.");
        await authApi.signUp(email, password);
        await authApi.claimStudent(studentId, code.trim().toUpperCase());
        setMsg({ type: "ok", text: "Account created. If email confirmation is on, check your inbox, then sign in." });
      } else {
        await authApi.signIn(email, password);
      }
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  if (mode === "choose") {
    return (
      <div className="loginBox">
        <div style={{ fontSize: 38 }}>🎓</div>
        <h1 style={{ marginTop: 10 }}>Mr. Chavez's Hub</h1>
        <div className="section">
          <button className="primary" style={{ width: "100%" }} onClick={() => setMode("teacher")}>I'm the Teacher</button>
        </div>
        <div className="section">
          <button className="teal" style={{ width: "100%" }} onClick={() => setMode("student")}>I'm a Student</button>
        </div>
      </div>
    );
  }

  if (mode === "teacher") {
    return (
      <div className="loginBox">
        <h1>Teacher Login</h1>
        <p className="small">First time here? Use "Create account" once — only the email configured as the teacher email in Settings/app_config can successfully claim the teacher role.</p>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {msg && <div className={"banner " + (msg.type === "ok" ? "ok" : "err")}>{msg.text}</div>}
        <button className="primary" style={{ width: "100%" }} disabled={busy} onClick={() => teacherAuth(false)}>Sign in</button>
        <button className="ghost" style={{ width: "100%", marginTop: 8 }} disabled={busy} onClick={() => teacherAuth(true)}>Create account</button>
        <button className="ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => setMode("choose")}>← Back</button>
      </div>
    );
  }

  // student
  return (
    <div className="loginBox">
      <h1>Student Login</h1>
      {mode === "student" && (
        <>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {msg && <div className={"banner " + (msg.type === "ok" ? "ok" : "err")}>{msg.text}</div>}
          <button className="primary" style={{ width: "100%" }} disabled={busy} onClick={() => studentAuth(false)}>Sign in</button>
          <button className="ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => { setMode("student-claim"); loadRoster(GROUPS[0]); }}>First time — create account</button>
          <button className="ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => setMode("choose")}>← Back</button>
        </>
      )}
      {mode === "student-claim" && (
        <>
          <p className="small">Ask your teacher for your claim code, then set up your login.</p>
          <select value={group} onChange={(e) => loadRoster(e.target.value)}>
            {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Select your name…</option>
            {roster.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input placeholder="Claim code from your teacher" value={code} onChange={(e) => setCode(e.target.value)} />
          <input placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Choose a password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {msg && <div className={"banner " + (msg.type === "ok" ? "ok" : "err")}>{msg.text}</div>}
          <button className="primary" style={{ width: "100%" }} disabled={busy} onClick={() => studentAuth(true)}>Create my account</button>
          <button className="ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => setMode("student")}>← Back</button>
        </>
      )}
    </div>
  );
}
