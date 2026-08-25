import { describe, expect, it } from "vitest";
import { rowsToCsv } from "../shared/csvExport";

describe("CSV export", () => {
  it("keeps the approved value and escapes student names safely", () => {
    const csv = rowsToCsv(
      [{ key: "student", label: "Student" }, { key: "raw", label: "Raw points" }, { key: "approved", label: "Approved value" }],
      [{ student: "Amelia, Carter", raw: 2.6, approved: 1.0 }],
    );
    expect(csv).toBe('Student,Raw points,Approved value\n"Amelia, Carter",2.6,1');
  });
});
