import { useState } from "react";
import { useData } from "../context/DataContext";
import { configApi } from "../lib/api";
import { GROUPS, PERIODS } from "../lib/constants";

export default function Settings() {
  const { config, reload } = useData();
  const [appName, setAppName] = useState(config?.app_name || "");
  const [headerMessage, setHeaderMessage] = useState(config?.header_message || "");
  const [currencyName, setCurrencyName] = useState(config?.currency_name || "");
  const [msg, setMsg] = useState(null);

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
      <div className="card" style={{ marginTop: 14 }}><b>Groups</b><div className="muted" style={{ marginTop: 6 }}>Fixed groups: {GROUPS.join(", ")}</div></div>
      <div className="card" style={{ marginTop: 14 }}><b>Periods</b><div className="muted" style={{ marginTop: 6 }}>{PERIODS.join(", ")}</div></div>
      <div className="card" style={{ marginTop: 14 }}>
        <b>Teacher account</b>
        <div className="muted" style={{ marginTop: 6 }}>The email allowed to claim the teacher role is stored in app_config.teacher_email in the database — update it directly in the Supabase table editor if you need to change who can be the teacher.</div>
      </div>
    </div>
  );
}
