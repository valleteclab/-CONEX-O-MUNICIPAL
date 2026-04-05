/** Junta classes Tailwind omitindo valores falsy. */
export function cn(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
}
