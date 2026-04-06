/** Converte duração ISO 8601 do YouTube (`contentDetails.duration`, ex.: PT1H2M10S) para segundos. */
export function parseIso8601DurationToSeconds(iso: string): number {
  if (!iso?.trim() || !iso.startsWith('PT')) {
    return 0;
  }
  const h = /(\d+)H/.exec(iso);
  const m = /(\d+)M/.exec(iso);
  const s = /(\d+)S/.exec(iso);
  const hours = h ? parseInt(h[1], 10) : 0;
  const minutes = m ? parseInt(m[1], 10) : 0;
  const seconds = s ? parseInt(s[1], 10) : 0;
  return hours * 3600 + minutes * 60 + seconds;
}
