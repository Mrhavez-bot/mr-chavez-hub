import { useState } from "react";
import { useData } from "../context/DataContext";
import { configApi } from "../lib/api";
import { GROUPS, PERIODS } from "../lib/constants";

export default function Settings() {
  const { config, reload } = useData();
  const [appName, setAppName] = useState(config?.app_name || "");
  const [headerMessage, setHeaderMessage] = useState(config?.header_message || "");
  const [currencyName, setCurrencyName] = useState(config?.currency_name || "");
  const [welcomeVideoUrl, setWelcomeVideoUrl] = useState(config?.welcome_video_url || "");
  const [spotifyUrl, setSpotifyUrl] = useState(config?.spotify_playlist_url || "");
  const [msg, setMsg] = useState(null);
  const [msg2, setMsg2] = useState(null);
  const [msg3, setMsg3] = useState(null);

  const [wAttNoProj, setWAttNoProj] = useState(config?.weight_attendance_no_project ?? 30);
  const [wTskNoProj, setWTskNoProj] = useState(config?.weight_tasks_no_project ?? 30);
  const [wScrNoProj, setWScrNoProj] = useState(config?.weight_scores_no_project ?? 40);
  const [wLpNoProj, setWLpNoProj] = useState(config?.weight_language_portfolio_no_project ?? 0);
  const [wAttProj, setWAttProj] = useState(config?.weight_attendance_project ?? 20);
  const [wTskProj, setWTskProj] = useState(config?.weight_tasks_project ?? 20);
  const [wScrProj, setWScrProj] = useState(config?.weight_scores_project ?? 30);
  const [wProjProj, setWProjProj] = useState(config?.weight_project_project ?? 30);
  const [wLpProj, setWLpProj] = useState(config?.weight_language_portfolio_project ?? 0);

  async function save() {
    if (!appName.trim() || !headerMessage.trim() || !currencyName.trim()) {
      setMsg({ type: "err", text: "App name, header message and currency name cannot be empty." });
      return;
    }
    await configApi.update({ app_name: appName.trim(), header_message: headerMessage.trim(), currency_name: currencyName.trim() });
    setMsg({ type: "ok", text: "Settings saved." });
    reload();
  }

  async function uploadLogo(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 800000) { alert("Please choose an image smaller than 800KB."); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      await configApi.update({ logo_url: reader.result });
      reload();
    };
    reader.readAsDataURL(f);
  }
  async function removeLogo() { await configApi.update({ logo_url: null }); reload(); }
  async function saveStudentDashboard() {
    await configApi.update({ welcome_video_url: welcomeVideoUrl.trim() || null, spotify_playlist_url: spotifyUrl.trim() || null });
    setMsg2({ type: "ok", text: "Guardado." });
    reload();
  }

  async function saveWeights() {
    const a1 = Number(wAttNoProj), t1 = Number(wTskNoProj), s1 = Number(wScrNoProj), l1 = Number(wLpNoProj);
    const a2 = Number(wAttProj), t2 = Number(wTskProj), s2 = Number(wScrProj), p2 = Number(wProjProj), l2 = Number(wLpProj);
    const sum1 = a1 + t1 + s1 + l1;
    const sum2 = a2 + t2 + s2 + p2 + l2;
    if ([a1, t1, s1, l1, a2, t2, s2, p2, l2].some((n) => isNaN(n) || n < 0)) {
      setMsg3({ type: "err", text: "Todos los porcentajes deben ser números positivos." });
      return;
    }
    if (sum1 !== 100) {
      setMsg3({ type: "err", text: `Los porcentajes SIN proyecto suman ${sum1}%, deben sumar exactamente 100%.` });
      return;
    }
    if (sum2 !== 100) {
      setMsg3({ type: "err", text: `Los porcentajes CON proyecto suman ${sum2}%, deben sumar exactamente 100%.` });
      return;
    }
    await configApi.update({
      weight_attendance_no_project: a1, weight_tasks_no_project: t1, weight_scores_no_project: s1, weight_language_portfolio_no_project: l1,
      weight_attendance_project: a2, weight_tasks_project: t2, weight_scores_project: s2, weight_project_project: p2, weight_language_portfolio_project: l2
    });
    setMsg3({ type: "ok", text: "Ponderaciones guardadas. Se aplican de inmediato en Grades, Reports y las exportaciones." });
    reload();
  }

  return (
    <div>
      <h2>Settings</h2>
      <div className="banner warn">
        ⚠ App name, header message, currency, and logo are shared settings stored in the database — every teacher and student sees the same values. Only accounts with the "teacher" role can save changes here (enforced by database policy, not just by hiding this tab).
      </div>
      <div className="card">
        <label className="flabel">Application name</label>
        <input value={appName} onChange={(e) => setAppName(e.target.value)} />
        <label className="flabel" style={{ marginTop: 10 }}>Header message</label>
        <input value={headerMessage} onChange={(e) => setHeaderMessage(e.target.value)} />
        <label className="flabel" style={{ marginTop: 10 }}>Currency name</label>
        <input value={currencyName} onChange={(e) => setCurrencyName(e.target.value)} />
        <div style={{ marginTop: 14 }}><button className="primary" onClick={save}>Save settings</button></div>
        {msg && <div className={"banner " + msg.type}>{msg.text}</div>}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <label className="flabel">Logo</label>
        {config?.logo_url ? <div className="logo" style={{ width: 64, height: 64, marginBottom: 10 }}><img src={config.logo_url} alt="" /></div> : <div className="muted" style={{ marginBottom: 10 }}>No logo uploaded — using default icon.</div>}
        <input type="file" accept="image/*" onChange={uploadLogo} />
        {config?.logo_url && <button className="danger" style={{ marginLeft: 8 }} onClick={removeLogo}>Remove logo</button>}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <b>Dashboard del alumno</b>
        <label className="flabel" style={{ marginTop: 10 }}>Video de bienvenida (link de YouTube, Vimeo, o .mp4 directo)</label>
        <input value={welcomeVideoUrl} onChange={(e) => setWelcomeVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
        <label className="flabel" style={{ marginTop: 10 }}>Playlist de Spotify (pega el link para compartir de la playlist)</label>
        <input value={spotifyUrl} onChange={(e) => setSpotifyUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/..." />
        <div style={{ marginTop: 14 }}><button className="primary" onClick={saveStudentDashboard}>Guardar</button></div>
        {msg2 && <div className={"banner " + msg2.type}>{msg2.text}</div>}
        <div className="small" style={{ marginTop: 8 }}>El video de bienvenida solo se le muestra a cada alumno la primera vez que entra a su cuenta.</div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <b>Ponderaciones de calificación (Grades)</b>
        <div className="small" style={{ marginTop: 6 }}>
          Define qué porcentaje pesa cada componente en la calificación final. El sistema detecta solo si hay un
          Project para el grupo/periodo y usa el juego de porcentajes correspondiente. Cada grupo debe sumar
          exactamente 100%.
        </div>

        <label className="flabel" style={{ marginTop: 14 }}>Sin Project — deben sumar 100%</label>
        <div className="row" style={{ marginTop: 6 }}>
          <div style={{ flex: 1 }}>
            <label className="small">Attendance %</label>
            <input type="number" min="0" max="100" value={wAttNoProj} onChange={(e) => setWAttNoProj(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">Tasks %</label>
            <input type="number" min="0" max="100" value={wTskNoProj} onChange={(e) => setWTskNoProj(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">Exam %</label>
            <input type="number" min="0" max="100" value={wScrNoProj} onChange={(e) => setWScrNoProj(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">Language Portfolio %</label>
            <input type="number" min="0" max="100" value={wLpNoProj} onChange={(e) => setWLpNoProj(e.target.value)} />
          </div>
        </div>
        <div className="small" style={{ marginTop: 4 }}>
          Suma actual: {Number(wAttNoProj || 0) + Number(wTskNoProj || 0) + Number(wScrNoProj || 0) + Number(wLpNoProj || 0)}%
        </div>

        <label className="flabel" style={{ marginTop: 16 }}>Con Project — deben sumar 100%</label>
        <div className="row" style={{ marginTop: 6 }}>
          <div style={{ flex: 1 }}>
            <label className="small">Attendance %</label>
            <input type="number" min="0" max="100" value={wAttProj} onChange={(e) => setWAttProj(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">Tasks %</label>
            <input type="number" min="0" max="100" value={wTskProj} onChange={(e) => setWTskProj(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">Exam %</label>
            <input type="number" min="0" max="100" value={wScrProj} onChange={(e) => setWScrProj(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">Project %</label>
            <input type="number" min="0" max="100" value={wProjProj} onChange={(e) => setWProjProj(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small">Language Portfolio %</label>
            <input type="number" min="0" max="100" value={wLpProj} onChange={(e) => setWLpProj(e.target.value)} />
          </div>
        </div>
        <div className="small" style={{ marginTop: 4 }}>
          Suma actual: {Number(wAttProj || 0) + Number(wTskProj || 0) + Number(wScrProj || 0) + Number(wProjProj || 0) + Number(wLpProj || 0)}%
        </div>

        <div style={{ marginTop: 14 }}><button className="primary" onClick={saveWeights}>Guardar ponderaciones</button></div>
        {msg3 && <div className={"banner " + msg3.type}>{msg3.text}</div>}
      </div>
      <div className="card" style={{ marginTop: 14 }}><b>Groups</b><div className="muted" style={{ marginTop: 6 }}>Fixed groups: {GROUPS.join(", ")}</div></div>
      <div className="card" style={{ marginTop: 14 }}><b>Periods</b><div className="muted" style={{ marginTop: 6 }}>{PERIODS.join(", ")}</div></div>
      <div className="card" style={{ marginTop: 14 }}>
        <b>Teacher account</b>
        <div className="muted" style={{ marginTop: 6 }}>The email allowed to claim the teacher role is stored in app_config.teacher_email in the database — update it directly in the Supabase table editor if you need to change who can be the teacher.</div>
      </div>
    </div>
  );
}
