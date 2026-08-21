// Converts a YouTube/Vimeo share link into an embeddable iframe URL, or
// falls back to treating the URL as a direct video file (mp4/webm).
export function toEmbedVideo(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}?autoplay=1` };
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return { type: "iframe", src: `https://player.vimeo.com/video/${vim[1]}?autoplay=1` };
  return { type: "video", src: url };
}
