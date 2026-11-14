export function mapDownloadOptions(theme: "abyss" | "light" | "blossom" | "system", systemDark = false) {
  const style = theme === "abyss" || (theme === "system" && systemDark) ? "dark" : "light";
  return { style, pdfAllowed: true, tilesAllowed: style === "dark" } as const;
}