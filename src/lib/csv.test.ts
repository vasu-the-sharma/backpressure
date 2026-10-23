import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csv", () => {
  it("quotes only what needs quoting", () => {
    expect(csvCell("ada@example.com")).toBe("ada@example.com");
    expect(csvCell("₹4,999 a year")).toBe('"₹4,999 a year"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe("");
    expect(csvCell(new Date("2026-10-20T00:00:00Z"))).toBe("2026-10-20T00:00:00.000Z");
  });

  it("stops a spreadsheet from running a cell as a formula", () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("+1@example.com")).toBe("'+1@example.com");
    expect(csvCell("-x")).toBe("'-x");
    expect(csvCell("@sum")).toBe("'@sum");
  });

  it("joins rows with CRLF", () => {
    expect(toCsv(["a", "b"], [[1, "x,y"]])).toBe('a,b\r\n1,"x,y"\r\n');
  });
});
