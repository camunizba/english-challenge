import { describe, expect, it } from "vitest";
import { validateStudentCsv } from "../shared/studentCsv";

describe("student CSV validation", () => {
  it("accepts the required Portuguese school headers and maps inactive status", () => {
    const result = validateStudentCsv("Matrícula,Nome,Série,Turma,Status\nA-001,Maya Rodrigues,8,8B,Ativo\nA-002,Theo Ferreira,8,8B,Inativo");
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[1]).toMatchObject({ enrollmentNumber: "A-002", firstName: "Theo", lastName: "Ferreira", status: "inactive" });
  });

  it("flags duplicate enrolment numbers and incomplete student rows", () => {
    const result = validateStudentCsv("enrollment number,name,grade,class,status\nA-001,Amelia Carter,8,8B,active\nA-001,Lucas Bennett,8,8B,active\nA-003,Noah,8,8B,active");
    expect(result.duplicateEnrollmentNumbers).toEqual(["A-001"]);
    expect(result.errors).toEqual([{ line: 4, message: "Required values: enrollment number, full name, grade and class." }]);
  });
});
