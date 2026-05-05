export function parseExtraArtistNames(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(";").map((s) => s.trim()).filter(Boolean);
}
