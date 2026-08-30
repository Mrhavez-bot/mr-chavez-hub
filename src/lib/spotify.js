// Converts a normal Spotify share link (playlist/album/track/artist) into
// the embeddable player URL. Returns null if the URL doesn't look like Spotify.
export function toSpotifyEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/open\.spotify\.com\/(playlist|album|track|artist)\/([a-zA-Z0-9]+)/);
  if (!m) return null;
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator`;
}
