import { expect, it } from "vitest";
import { mapDownloadOptions } from "./map-download-policy";

it.each(["abyss", "light", "blossom", "system"] as const)("PDF downloads are available in %s theme", (theme) => {
  expect(mapDownloadOptions(theme).pdfAllowed).toBe(true);
});
it("light maps never permit standard OSM bulk downloads", () => {
  expect(mapDownloadOptions("light").tilesAllowed).toBe(false);
});
it("system dark uses the dark map provider", () => {
  expect(mapDownloadOptions("system", true).style).toBe("dark");
});