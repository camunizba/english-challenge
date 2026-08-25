export const manageableRoles = ["viewer", "teacher", "leadership"] as const;
export type ManageableRole = (typeof manageableRoles)[number];

export function canManageSchoolAccess(role: string) {
  return role === "leadership" || role === "admin";
}

export function canChangeUserAccess(actorId: number, targetId: number) {
  return actorId !== targetId;
}

export function uniqueTeacherAssignments(assignments: Array<{ classId: number; subjectId: number }>) {
  const seen = new Set<string>();
  return assignments.filter(assignment => {
    const key = `${assignment.classId}:${assignment.subjectId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
