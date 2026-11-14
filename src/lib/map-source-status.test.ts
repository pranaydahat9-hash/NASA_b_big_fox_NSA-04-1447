import { expect, it } from "vitest";
import { mapSourceStatus } from "./map-source-status";

it("older cached map responses without availability remain unknown", () => {
  expect(mapSourceStatus(undefined, "usgs")).toBe("Status unknown");
  expect(mapSourceStatus(undefined, "eonet")).toBe("Status unknown");
});
it("confirmed feed availability is preserved", () => {
  expect(mapSourceStatus({ usgs: true, eonet: false }, "usgs")).toBe("Updated");
  expect(mapSourceStatus({ usgs: true, eonet: false }, "eonet")).toBe("Unavailable");
});