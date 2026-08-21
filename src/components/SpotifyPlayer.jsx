import { toSpotifyEmbedUrl } from "../lib/spotify";

export default function SpotifyPlayer({ url }) {
  const embed = toSpotifyEmbedUrl(url);
  if (!embed) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <iframe
        style={{ borderRadius: 12, border: 0 }}
        src={embed}
        width="100%"
        height="80"
        allowFullScreen=""
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="Spotify playlist"
      />
    </div>
  );
}
