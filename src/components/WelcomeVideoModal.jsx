import { useState } from "react";
import { studentsApi } from "../lib/api";
import { toEmbedVideo } from "../lib/video";

export default function WelcomeVideoModal({ videoUrl, onClose }) {
  const [closing, setClosing] = useState(false);
  const embed = toEmbedVideo(videoUrl);
  if (!embed) return null;

  async function close() {
    setClosing(true);
    try { await studentsApi.markWelcomeSeen(); } catch { /* non-fatal */ }
    onClose();
  }

  return (
    <div className="modalBg">
      <div className="modal" style={{ maxWidth: 640, width: "100%" }}>
        <h2>¡Bienvenido!</h2>
        <div style={{ position: "relative", paddingTop: "56.25%", marginTop: 10 }}>
          {embed.type === "iframe" ? (
            <iframe
              src={embed.src}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0, borderRadius: 10 }}
              allow="autoplay; fullscreen"
              allowFullScreen
              title="Video de bienvenida"
            />
          ) : (
            <video
              src={embed.src}
              controls
              autoPlay
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: 10 }}
            />
          )}
        </div>
        <div style={{ marginTop: 14, textAlign: "right" }}>
          <button className="primary" disabled={closing} onClick={close}>Continuar</button>
        </div>
      </div>
    </div>
  );
}
