/** Converte URL de YouTube (vários formatos) para URL de embed. */
export function toYoutubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) {
    return null;
  }
  const u = url.trim();
  if (u.includes("youtube.com/embed/")) {
    return u.split("?")[0];
  }
  const fromV = u.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (fromV) {
    return `https://www.youtube.com/embed/${fromV[1]}`;
  }
  const fromShort = u.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (fromShort) {
    return `https://www.youtube.com/embed/${fromShort[1]}`;
  }
  return null;
}
