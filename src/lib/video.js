// Converts a YouTube/Vimeo share link into an embeddable iframe URL, or
// falls back to treating the URL as a direct video file (mp4/webm).
//
// Autoplay is intentionally NOT forced here: browsers block autoplay-with-
// sound by default, which makes an embedded video look "stuck" even though
// it loaded correctly. Leaving it off shows a normal player with a visible
// play button the student can click — reliable everywhere.
export function toEmbedVideo(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return { type: "iframe", src: `https://player.vimeo.com/video/${vim[1]}` };
  return { type: "video", src: url };
}
