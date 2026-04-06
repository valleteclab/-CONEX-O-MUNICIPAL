/** ID de 11 caracteres a partir da URL do vídeo (miniaturas, etc.). */
export function youtubeVideoIdFromUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) {
    return null;
  }
  const u = url.trim();
  const fromV = u.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (fromV) {
    return fromV[1];
  }
  const fromShort = u.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (fromShort) {
    return fromShort[1];
  }
  const fromEmbed = u.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (fromEmbed) {
    return fromEmbed[1];
  }
  return null;
}

export function youtubeThumbUrl(videoId: string, size: "default" | "hq" = "default"): string {
  const s = size === "hq" ? "hqdefault" : "mqdefault";
  return `https://i.ytimg.com/vi/${videoId}/${s}.jpg`;
}

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
