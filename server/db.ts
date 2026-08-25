import { and, desc, eq, gt } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  activityEntries,
  activityActionValues,
  appeals,
  auditLogs,
  championCycles,
  classes,
  entryRevisions,
  gradeConversions,
  importBatches,
  type ChallengeAction,
  type InsertUser,
  schoolYears,
  scoringRules,
  students,
  subjects,
  teacherAssignments,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildCancellationEvents } from "./challengeRules";
import { uniqueTeacherAssignments } from "./managementRules";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  const role = user.role ?? (user.openId === ENV.ownerOpenId ? "leadership" : "viewer");
  values.role = role;
  updateSet.role = role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getChallengeSnapshot() {
  const db = await getDb();
  if (!db) return { connected: false, students: [], entries: [], cycles: [] };
  const [studentRows, entryRows, cycleRows] = await Promise.all([
    db.select().from(students).where(eq(students.status, "active")).limit(250),
    db.select().from(activityEntries).orderBy(desc(activityEntries.recordedAt)).limit(40),
    db.select().from(championCycles).orderBy(desc(championCycles.endsAt)).limit(8),
  ]);
  return { connected: true, students: studentRows, entries: entryRows, cycles: cycleRows };
}

export async function searchActiveStudents(query: string, classId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(students.status, "active")];
  if (classId) conditions.push(eq(students.classId, classId));
  const allStudents = await db.select().from(students).where(and(...conditions)).limit(250);
  const normalizedQuery = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (!normalizedQuery) return allStudents.slice(0, 30);
  return allStudents.filter(student => {
    const searchable = `${student.firstName} ${student.lastName} ${student.enrollmentNumber}`
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return normalizedQuery.split(/\s+/).every(part => searchable.includes(part));
  }).slice(0, 30);
}

export async function teacherCanRecord(userId: number, classId: number, subjectId: number) {
  const db = await getDb();
  if (!db) return false;
  const assignment = await db.select({ id: teacherAssignments.id }).from(teacherAssignments).where(and(
    eq(teacherAssignments.userId, userId),
    eq(teacherAssignments.classId, classId),
    eq(teacherAssignments.subjectId, subjectId),
    eq(teacherAssignments.active, true),
  )).limit(1);
  return assignment.length > 0;
}

export async function findRecentDuplicate(input: {
  userId: number;
  studentId: number;
  subjectId: number;
  action: ChallengeAction;
  cooldownSeconds: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const threshold = new Date(Date.now() - input.cooldownSeconds * 1000);
  const entries = await db.select().from(activityEntries).where(and(
    eq(activityEntries.createdByUserId, input.userId),
    eq(activityEntries.studentId, input.studentId),
    eq(activityEntries.subjectId, input.subjectId),
    eq(activityEntries.action, input.action),
    eq(activityEntries.status, "active"),
    gt(activityEntries.recordedAt, threshold),
  )).limit(1);
  return entries[0];
}

export async function getCurrentRule(action: ChallengeAction) {
  const db = await getDb();
  if (!db) return undefined;
  const rules = await db.select().from(scoringRules).where(and(
    eq(scoringRules.action, action),
    eq(scoringRules.status, "active"),
  )).orderBy(desc(scoringRules.effectiveFrom)).limit(1);
  return rules[0];
}

export async function createActivityEntries(input: {
  userId: number;
  studentIds: number[];
  classId: number;
  subjectId: number;
  cycleId?: number;
  action: ChallengeAction;
  points: number;
  note?: string;
  idempotencyKey: string;
  undoWindowSeconds: number;
  recordedAt?: Date;
  sourceDeviceId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  const recordedAt = input.recordedAt ?? now;
  const undoExpiresAt = new Date(now.getTime() + input.undoWindowSeconds * 1000);
  const rows = input.studentIds.map(studentId => ({
    idempotencyKey: `${input.idempotencyKey}:${studentId}`,
    studentId,
    classId: input.classId,
    subjectId: input.subjectId,
    cycleId: input.cycleId,
    action: input.action,
    points: input.points.toFixed(2),
    note: input.note || null,
    recordedAt,
    syncedAt: now,
    syncStatus: "synced" as const,
    sourceDeviceId: input.sourceDeviceId ?? null,
    createdByUserId: input.userId,
    undoExpiresAt,
  }));
  const insertResult = await db.insert(activityEntries).values(rows);
  await db.insert(auditLogs).values({
    actorUserId: input.userId,
    eventType: "activity_entry_created",
    resourceType: "activity_entry_batch",
    resourceId: input.idempotencyKey,
    detail: `${input.action} applied to ${input.studentIds.length} student(s).`,
  });
  const firstEntryId = Number(insertResult[0].insertId);
  return { created: rows.length, entryIds: rows.map((_, index) => firstEntryId + index), undoExpiresAt };
}

export async function getEntriesByBatchIdempotencyKey(idempotencyKey: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: activityEntries.id }).from(activityEntries).where(sql`${activityEntries.idempotencyKey} LIKE ${`${idempotencyKey}:%`}`);
}

export async function listReferenceData() {
  const db = await getDb();
  if (!db) return { classes: [], subjects: [], actions: activityActionValues };
  const [classRows, subjectRows] = await Promise.all([
    db.select().from(classes).where(eq(classes.active, true)).orderBy(classes.name),
    db.select().from(subjects).where(eq(subjects.active, true)).orderBy(subjects.name),
  ]);
  return { classes: classRows, subjects: subjectRows, actions: activityActionValues };
}

export async function cancelActivityEntry(input: { entryId: number; actorUserId: number; reason: string; leadership: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const entry = (await db.select().from(activityEntries).where(eq(activityEntries.id, input.entryId)).limit(1))[0];
  if (!entry) throw new Error("Activity entry not found");
  if (entry.status !== "active") throw new Error("Only active entries can be cancelled");
  if (!input.leadership && entry.createdByUserId !== input.actorUserId) throw new Error("Only the original teacher can cancel this entry");
  const events = buildCancellationEvents({ entryId: input.entryId, previousPoints: entry.points, actorUserId: input.actorUserId, reason: input.reason });
  await db.update(activityEntries).set({ status: "cancelled" }).where(eq(activityEntries.id, input.entryId));
  await db.insert(entryRevisions).values(events.revision);
  await db.insert(auditLogs).values(events.audit);
  return { success: true, entryId: input.entryId };
}

export async function createEntryAppeal(input: { entryId: number; studentId: number; requesterUserId: number; reason: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const student = (await db.select({ viewerUserId: students.viewerUserId }).from(students).where(eq(students.id, input.studentId)).limit(1))[0];
  if (!student || student.viewerUserId !== input.requesterUserId) throw new Error("A viewer may only appeal an entry from their own statement");
  await db.insert(appeals).values({
    entryId: input.entryId,
    studentId: input.studentId,
    requesterUserId: input.requesterUserId,
    reason: input.reason,
  });
  await db.update(activityEntries).set({ status: "under_review" }).where(eq(activityEntries.id, input.entryId));
  await db.insert(auditLogs).values({
    actorUserId: input.requesterUserId,
    eventType: "entry_appeal_created",
    resourceType: "activity_entry",
    resourceId: String(input.entryId),
    detail: "Viewer requested a review.",
  });
  return { success: true };
}

export async function importStudents(input: { userId: number; classId: number; fileName: string; rows: Array<{ enrollmentNumber: string; firstName: string; lastName: string; publicName?: string; status: "active" | "inactive" }> }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const batchResult = await db.insert(importBatches).values({
    fileName: input.fileName,
    sourceType: "csv",
    status: "validated",
    totalRows: input.rows.length,
    createdByUserId: input.userId,
  });
  for (const row of input.rows) {
    await db.insert(students).values({
      enrollmentNumber: row.enrollmentNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      publicName: row.publicName || null,
      classId: input.classId,
      status: row.status,
    }).onDuplicateKeyUpdate({
      set: { firstName: row.firstName, lastName: row.lastName, publicName: row.publicName || null, classId: input.classId, status: row.status },
    });
  }
  const batchId = Number(batchResult[0].insertId);
  await db.update(importBatches).set({ status: "imported", importedRows: input.rows.length }).where(eq(importBatches.id, batchId));
  await db.insert(auditLogs).values({
    actorUserId: input.userId,
    eventType: "student_csv_imported",
    resourceType: "import_batch",
    resourceId: String(batchId),
    detail: `${input.rows.length} student row(s) inserted or updated.`,
  });
  return { batchId, importedRows: input.rows.length };
}

export async function getConversionExport(classId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = classId ? [eq(students.classId, classId)] : [];
  return db.select({
    enrollmentNumber: students.enrollmentNumber,
    studentName: students.firstName,
    lastName: students.lastName,
    className: classes.name,
    subjectName: subjects.name,
    rawPoints: gradeConversions.rawPoints,
    configuredCeiling: gradeConversions.configuredCeiling,
    convertedPoints: gradeConversions.convertedPoints,
    administrativeAdjustment: gradeConversions.administrativeAdjustment,
    approvedPoints: gradeConversions.approvedPoints,
    status: gradeConversions.status,
    approvedAt: gradeConversions.approvedAt,
  }).from(gradeConversions)
    .innerJoin(students, eq(gradeConversions.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(subjects, eq(gradeConversions.subjectId, subjects.id))
    .where(conditions.length ? and(...conditions) : undefined);
}

export async function getStudentStatement(input: { studentId: number; userId: number; role: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const student = (await db.select().from(students).where(eq(students.id, input.studentId)).limit(1))[0];
  if (!student) throw new Error("Student not found");
  const isLeadership = input.role === "leadership" || input.role === "admin";
  const isViewer = input.role === "viewer" || input.role === "user";
  if (isViewer && student.viewerUserId !== input.userId) throw new Error("A viewer may only access their linked student statement");
  if (!isViewer && !isLeadership) {
    const assignment = await db.select({ id: teacherAssignments.id }).from(teacherAssignments).where(and(
      eq(teacherAssignments.userId, input.userId),
      eq(teacherAssignments.classId, student.classId ?? -1),
      eq(teacherAssignments.active, true),
    )).limit(1);
    if (!assignment.length) throw new Error("Teacher is not assigned to this student's class");
  }
  const entries = await db.select({
    id: activityEntries.id,
    action: activityEntries.action,
    points: activityEntries.points,
    status: activityEntries.status,
    recordedAt: activityEntries.recordedAt,
    subjectName: subjects.name,
    teacherName: users.name,
  }).from(activityEntries)
    .innerJoin(subjects, eq(activityEntries.subjectId, subjects.id))
    .innerJoin(users, eq(activityEntries.createdByUserId, users.id))
    .where(eq(activityEntries.studentId, student.id))
    .orderBy(desc(activityEntries.recordedAt));
  return { student, entries };
}

export async function getMyStudentStatement(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const student = (await db.select({ id: students.id }).from(students).where(eq(students.viewerUserId, userId)).limit(1))[0];
  if (!student) return null;
  return getStudentStatement({ studentId: student.id, userId, role: "viewer" });
}

export async function getManagementData() {
  const db = await getDb();
  if (!db) return { users: [], schoolYears: [], classes: [], subjects: [], assignments: [] };
  const [userRows, schoolYearRows, classRows, subjectRows, assignmentRows] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, accessStatus: users.accessStatus, lastSignedIn: users.lastSignedIn }).from(users).orderBy(users.name),
    db.select().from(schoolYears).orderBy(desc(schoolYears.startsAt)),
    db.select().from(classes).orderBy(classes.name),
    db.select().from(subjects).orderBy(subjects.name),
    db.select({ id: teacherAssignments.id, userId: teacherAssignments.userId, classId: teacherAssignments.classId, className: classes.name, subjectId: teacherAssignments.subjectId, subjectName: subjects.name, active: teacherAssignments.active }).from(teacherAssignments).innerJoin(classes, eq(teacherAssignments.classId, classes.id)).innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id)),
  ]);
  return { users: userRows, schoolYears: schoolYearRows, classes: classRows, subjects: subjectRows, assignments: assignmentRows };
}

export async function updateManagedUser(input: { targetUserId: number; role: "viewer" | "teacher" | "leadership"; accessStatus: "active" | "suspended"; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ role: input.role, accessStatus: input.accessStatus }).where(eq(users.id, input.targetUserId));
  await db.insert(auditLogs).values({ actorUserId: input.actorUserId, eventType: "school_user_updated", resourceType: "user", resourceId: String(input.targetUserId), detail: `Role set to ${input.role}; access status set to ${input.accessStatus}.` });
  return { success: true };
}

export async function setTeacherAssignments(input: { teacherUserId: number; assignments: Array<{ classId: number; subjectId: number }>; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const teacher = (await db.select({ role: users.role }).from(users).where(eq(users.id, input.teacherUserId)).limit(1))[0];
  if (!teacher || teacher.role !== "teacher") throw new Error("Assignments can only be created for an active teacher profile.");
  const assignments = uniqueTeacherAssignments(input.assignments);
  await db.update(teacherAssignments).set({ active: false }).where(eq(teacherAssignments.userId, input.teacherUserId));
  for (const assignment of assignments) {
    await db.insert(teacherAssignments).values({ userId: input.teacherUserId, classId: assignment.classId, subjectId: assignment.subjectId, active: true }).onDuplicateKeyUpdate({ set: { active: true } });
  }
  await db.insert(auditLogs).values({ actorUserId: input.actorUserId, eventType: "teacher_assignments_updated", resourceType: "user", resourceId: String(input.teacherUserId), detail: `${assignments.length} active class and subject assignment(s).` });
  return { success: true, activeAssignments: assignments.length };
}

export async function createManagedClass(input: { schoolYearId: number; segment: string; grade: string; name: string; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(classes).values({ schoolYearId: input.schoolYearId, segment: input.segment, grade: input.grade, name: input.name, active: true });
  const classId = Number(result[0].insertId);
  await db.insert(auditLogs).values({ actorUserId: input.actorUserId, eventType: "class_created", resourceType: "class", resourceId: String(classId), detail: `${input.name} created for ${input.grade}.` });
  return { classId };
}

export async function createManagedSubject(input: { code: string; name: string; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(subjects).values({ code: input.code, name: input.name, active: true });
  const subjectId = Number(result[0].insertId);
  await db.insert(auditLogs).values({ actorUserId: input.actorUserId, eventType: "subject_created", resourceType: "subject", resourceId: String(subjectId), detail: `${input.code}: ${input.name}.` });
  return { subjectId };
}
