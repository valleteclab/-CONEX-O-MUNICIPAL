/** Extrai o ID de 11 caracteres de URLs YouTube conhecidas. */
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

export function youtubeThumbnailUrlFromVideoId(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
