import { useState } from "react";
import { useData } from "../context/DataContext";
import { announcementsApi } from "../lib/api";
import { GROUPS } from "../lib/constants";

// mode="teacher": full CRUD with group targeting.
// mode="student": read-only, pass myGroup to filter (defense in depth —
// the database already only returns rows for the student's own group).
export default function Announcements({ mode = "teacher", myGroup }) {
  const { announcements, reload } = useData();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [groups, setGroups] = useState([]);

  function toggleGroup(g) {
    setGroups((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));
  }
  async function create() {
    if (!title.trim() || !body.trim()) { alert("Escribe un título y un mensaje."); return; }
    if (!groups.length) { alert("Selecciona al menos un grupo."); return; }
    await announcementsApi.create(title.trim(), body.trim(), groups);
    setTitle(""); setBody(""); setGroups([]);
    reload();
  }
  async function remove(id) {
    if (!confirm("¿Eliminar este anuncio?")) return;
    await announcementsApi.remove(id);
    reload();
  }

  const visible = mode === "student" ? announcements.filter((a) => a.groups.includes(myGroup)) : announcements;

  return (
    <div>
      <h2>Announcements</h2>
      {mode === "teacher" && (
        <div className="card" style={{ marginBottom: 16 }}>
          <label className="flabel">Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="flabel" style={{ marginTop: 10 }}>Mensaje</label>
          <input value={body} onChange={(e) => setBody(e.target.value)} />
          <label className="flabel" style={{ marginTop: 10 }}>¿A qué grupos les aparece?</label>
          <div className="row" style={{ marginTop: 6 }}>
            {GROUPS.map((g) => (
              <button key={g} type="button" className={groups.includes(g) ? "teal" : "ghost"} onClick={() => toggleGroup(g)}>{g}</button>
            ))}
          </div>
          <div style={{ marginTop: 12 }}><button className="primary" onClick={create}>＋ Publicar anuncio</button></div>
        </div>
      )}
      {visible.length ? visible.map((a) => (
        <div className="card" key={a.id} style={{ marginBottom: 10 }}>
          <div className="row" style={{ marginBottom: 0 }}>
            <div style={{ flex: 1 }}>
              <div className="name">{a.title}</div>
              <div style={{ marginTop: 6 }}>{a.body}</div>
              <div className="muted" style={{ marginTop: 6 }}>{a.groups.join(", ")} · {a.created_at?.slice(0, 10)}</div>
            </div>
            {mode === "teacher" && <button className="danger" onClick={() => remove(a.id)}>Eliminar</button>}
          </div>
        </div>
      )) : <div className="empty"><h3>No hay anuncios{mode === "student" ? " por ahora" : ""}</h3></div>}
    </div>
  );
}
