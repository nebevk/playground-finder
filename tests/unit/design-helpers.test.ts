import { describe, expect, it } from "vitest";
import { formatRating } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { safeNextPath } from "@/lib/site";

describe("distance labels", () => {
  it("[FR-MAP-09] [GDPR-13] formats distances for the visitor's language", () => {
    expect(formatDistance(347, "sl")).toBe("350 m");
    expect(formatDistance(4, "sl")).toBe("10 m");
    expect(formatDistance(1234, "sl")).toBe("1,2 km");
    expect(formatDistance(1234, "en")).toBe("1.2 km");
    expect(formatDistance(18_400, "sl")).toBe("18 km");
  });
});

describe("rating labels", () => {
  it("[FR-MAP-09] ratings use the visitor's decimal separator", () => {
    expect(formatRating(4.6, "sl")).toBe("4,6");
    expect(formatRating(4.6, "en")).toBe("4.6");
    expect(formatRating(4, "sl")).toBe("4,0");
  });
});

describe("return-after-sign-in path", () => {
  it("[FR-ACC-03] keeps same-site paths, including their query", () => {
    expect(safeNextPath("/sl/playground/123", "/sl/profile")).toBe("/sl/playground/123");
    expect(safeNextPath("/sl/add?x=1", "/sl/profile")).toBe("/sl/add?x=1");
  });

  it("[FR-ACC-03] refuses anything that could leave the site", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "sl/profile", "/a b", "", null, undefined, 42]) {
      expect(safeNextPath(bad, "/sl/profile")).toBe("/sl/profile");
    }
    expect(safeNextPath(`/${"a".repeat(600)}`, "/sl/profile")).toBe("/sl/profile");
  });
});
