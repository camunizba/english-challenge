import { describe, expect, it } from "vitest";
import { canChangeUserAccess, canManageSchoolAccess, uniqueTeacherAssignments } from "./managementRules";

describe("school access management rules", () => {
  it("allows only leadership to manage the school directory", () => {
    expect(canManageSchoolAccess("leadership")).toBe(true);
    expect(canManageSchoolAccess("teacher")).toBe(false);
    expect(canManageSchoolAccess("viewer")).toBe(false);
  });

  it("prevents a leadership user from suspending or demoting itself", () => {
    expect(canChangeUserAccess(12, 12)).toBe(false);
    expect(canChangeUserAccess(12, 13)).toBe(true);
  });

  it("deduplicates a teacher class and subject link before it is persisted", () => {
    expect(uniqueTeacherAssignments([{ classId: 1, subjectId: 2 }, { classId: 1, subjectId: 2 }, { classId: 2, subjectId: 2 }])).toEqual([{ classId: 1, subjectId: 2 }, { classId: 2, subjectId: 2 }]);
  });
});
