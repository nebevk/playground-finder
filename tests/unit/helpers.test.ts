import { describe, expect, it } from "vitest";
import { parseBool, parseCsv } from "@/lib/csv";
import { directionsUrl } from "@/lib/directions";

describe("directions link", () => {
  it("[FR-PG-02] opens Google Maps directions with the playground as destination", () => {
    const url = new URL(directionsUrl(46.0569, 14.5058));
    expect(url.origin).toBe("https://www.google.com");
    expect(url.pathname).toBe("/maps/dir/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("destination")).toBe("46.0569,14.5058");
  });
});

describe("CSV import parser", () => {
  it("[FR-ADM-04] parses plain rows", () => {
    expect(parseCsv("name,lat\nTivoli,46.05\n")).toEqual([
      ["name", "lat"],
      ["Tivoli", "46.05"],
    ]);
  });

  it("[FR-ADM-04] keeps commas, newlines and escaped quotes inside quoted fields", () => {
    const csv = 'name,description\n"Park, Zvezda","Ob ""reki""\nin senca"\n';
    expect(parseCsv(csv)).toEqual([
      ["name", "description"],
      ["Park, Zvezda", 'Ob "reki"\nin senca'],
    ]);
  });

  it("[FR-ADM-04] handles CRLF line endings, a missing final newline and blank rows", () => {
    expect(parseCsv("a,b\r\n\r\n , \r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("[FR-ADM-04] reads spreadsheet-style booleans, including Slovenian 'da'", () => {
    for (const v of ["1", "true", "YES", "y", "da", "x", "✓", " Da "]) expect(parseBool(v)).toBe(true);
    for (const v of ["0", "false", "no", "ne", "", undefined]) expect(parseBool(v)).toBe(false);
  });
});
