import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { DataProvider, useData } from "./context/DataContext";
import Auth from "./components/Auth";

import Dashboard from "./components/Dashboard";
import Students from "./components/Students";
import Attendance from "./components/Attendance";
import Tasks from "./components/Tasks";
import Scores from "./components/Scores";
import Project from "./components/Project";
import Grades from "./components/Grades";
import Shop from "./components/Shop";
import Reports from "./components/Reports";
import Settings from "./components/Settings";
import Announcements from "./components/Announcements";
import Surveys from "./components/Surveys";
import StudentPortal from "./components/StudentPortal";

const TEACHER_TABS = [
  ["dashboard", "📊 Dashboard", Dashboard],
  ["students", "👥 Students", Students],
  ["attendance", "📅 Attendance", Attendance],
  ["tasks", "✓ Tasks", Tasks],
  ["scores", "📝 Scores", Scores],
  ["project", "📁 Project", Project],
  ["grades", "🎯 Grades", Grades],
  ["shop", "🎁 Reward Shop", Shop],
  ["announcements", "📢 Announcements", Announcements],
  ["surveys", "🗳 Surveys", Surveys],
  ["reports", "📄 Reports", Reports],
  ["settings", "⚙ Settings", Settings]
];

function Shell() {
  const { profile, signOut } = useAuth();
  const { config, loading } = useData();
  const [tab, setTab] = useState("dashboard");
  const [ui, setUi] = useState({ group: "10A", period: "Period 1", selectedGroup: null, search: "" });

  if (loading) return <div className="app"><div className="spin">Loading your data…</div></div>;

  const appName = config?.app_name || "Mr. Chavez's Hub";
  const headerMessage = config?.header_message || "Coins, attendance, tasks, scores & grades — one roster";
  const logo = config?.logo_url;

  if (profile?.role === "student") {
    return (
      <div className="app">
        <header className="header">
          <div className="headerL">
            <div className="logo">{logo ? <img src={logo} alt="" /> : "🎓"}</div>
            <div><h1>{appName}</h1><div className="sub">{headerMessage}</div></div>
          </div>
          <div className="roleBadge">Student<button onClick={signOut}>Sign out</button></div>
        </header>
        <StudentPortal ui={ui} setUi={setUi} />
      </div>
    );
  }

  if (profile?.role === "teacher") {
    const ActiveComponent = TEACHER_TABS.find((t) => t[0] === tab)?.[2] || Dashboard;
    return (
      <div className="app">
        <header className="header">
          <div className="headerL">
            <div className="logo">{logo ? <img src={logo} alt="" /> : "🎓"}</div>
            <div><h1>{appName}</h1><div className="sub">{headerMessage}</div></div>
          </div>
          <div className="roleBadge">Teacher<button onClick={signOut}>Sign out</button></div>
        </header>
        <nav className="nav">
          {TEACHER_TABS.map(([key, label]) => (
            <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>
          ))}
        </nav>
        <main><ActiveComponent ui={ui} setUi={setUi} /></main>
      </div>
    );
  }

  // Signed in but no profile row yet (e.g. mid-signup, or claim RPC hasn't run) — do not show any data.
  return (
    <div className="app">
      <div className="empty">
        <h3>Setting up your account…</h3>
        If this doesn't resolve after signing in again, your account may not be linked to a role yet.
        <div style={{ marginTop: 12 }}><button className="ghost" onClick={signOut}>Sign out</button></div>
      </div>
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <div className="app"><div className="spin">Loading…</div></div>;
  if (!session) return <div className="app"><Auth /></div>;

  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
