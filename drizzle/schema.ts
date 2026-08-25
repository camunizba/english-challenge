import {
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

// "user" e "admin" permanecem por compatibilidade com a autenticação base;
// a aplicação escolar apresenta e controla os perfis viewer, teacher e leadership.
export const userRoleValues = ["user", "admin", "viewer", "teacher", "leadership"] as const;
export const activityActionValues = [
  "English Interaction",
  "Initiative Bonus",
  "Portuguese Occurrence",
] as const;

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", userRoleValues).default("viewer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const schoolYears = mysqlTable("schoolYears", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 40 }).notNull(),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("America/Sao_Paulo").notNull(),
  status: mysqlEnum("status", ["active", "closed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const classes = mysqlTable(
  "classes",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolYearId: int("schoolYearId").notNull().references(() => schoolYears.id),
    segment: varchar("segment", { length: 80 }).notNull(),
    grade: varchar("grade", { length: 80 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("class_year_name_unique").on(table.schoolYearId, table.name)],
);

export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const students = mysqlTable(
  "students",
  {
    id: int("id").autoincrement().primaryKey(),
    enrollmentNumber: varchar("enrollmentNumber", { length: 64 }).notNull().unique(),
    firstName: varchar("firstName", { length: 120 }).notNull(),
    lastName: varchar("lastName", { length: 120 }).notNull(),
    publicName: varchar("publicName", { length: 140 }),
    viewerUserId: int("viewerUserId").unique().references(() => users.id),
    classId: int("classId").references(() => classes.id),
    status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("student_class_status_idx").on(table.classId, table.status)],
);

export const teacherAssignments = mysqlTable(
  "teacherAssignments",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    classId: int("classId").notNull().references(() => classes.id),
    subjectId: int("subjectId").notNull().references(() => subjects.id),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("teacher_assignment_unique").on(table.userId, table.classId, table.subjectId)],
);

export const scoringRules = mysqlTable(
  "scoringRules",
  {
    id: int("id").autoincrement().primaryKey(),
    action: mysqlEnum("action", activityActionValues).notNull(),
    points: decimal("points", { precision: 6, scale: 2 }).notNull(),
    effectiveFrom: timestamp("effectiveFrom").notNull(),
    effectiveUntil: timestamp("effectiveUntil"),
    maxPositivePoints: decimal("maxPositivePoints", { precision: 6, scale: 2 }),
    maxNegativePoints: decimal("maxNegativePoints", { precision: 6, scale: 2 }),
    cooldownSeconds: int("cooldownSeconds").default(15).notNull(),
    correctionWindowHours: int("correctionWindowHours").default(24).notNull(),
    status: mysqlEnum("status", ["active", "superseded"]).default("active").notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("rule_action_status_idx").on(table.action, table.status)],
);

export const championCycles = mysqlTable("championCycles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 140 }).notNull(),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  status: mysqlEnum("status", ["draft", "active", "review", "closed", "archived"]).default("draft").notNull(),
  prizeName: varchar("prizeName", { length: 160 }).notNull(),
  prizeDescription: text("prizeDescription"),
  minInteractions: int("minInteractions").default(3).notNull(),
  minParticipationDays: int("minParticipationDays").default(2).notNull(),
  requireZeroPortugueseOccurrences: boolean("requireZeroPortugueseOccurrences").default(true).notNull(),
  createdByUserId: int("createdByUserId").references(() => users.id),
  closedByUserId: int("closedByUserId").references(() => users.id),
  closureReason: text("closureReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const activityEntries = mysqlTable(
  "activityEntries",
  {
    id: int("id").autoincrement().primaryKey(),
    idempotencyKey: varchar("idempotencyKey", { length: 128 }).notNull().unique(),
    studentId: int("studentId").notNull().references(() => students.id),
    classId: int("classId").notNull().references(() => classes.id),
    subjectId: int("subjectId").notNull().references(() => subjects.id),
    cycleId: int("cycleId").references(() => championCycles.id),
    action: mysqlEnum("action", activityActionValues).notNull(),
    points: decimal("points", { precision: 6, scale: 2 }).notNull(),
    status: mysqlEnum("status", ["active", "cancelled", "under_review"]).default("active").notNull(),
    note: text("note"),
    recordedAt: timestamp("recordedAt").notNull(),
    syncedAt: timestamp("syncedAt"),
    syncStatus: mysqlEnum("syncStatus", ["synced", "pending", "conflict"]).default("synced").notNull(),
    createdByUserId: int("createdByUserId").notNull().references(() => users.id),
    undoExpiresAt: timestamp("undoExpiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("activity_student_subject_idx").on(table.studentId, table.subjectId, table.recordedAt),
    index("activity_teacher_cooldown_idx").on(table.createdByUserId, table.studentId, table.action, table.recordedAt),
  ],
);

export const entryRevisions = mysqlTable("entryRevisions", {
  id: int("id").autoincrement().primaryKey(),
  entryId: int("entryId").notNull().references(() => activityEntries.id),
  revisionType: mysqlEnum("revisionType", ["cancelled", "corrected", "restored"]).notNull(),
  previousPoints: decimal("previousPoints", { precision: 6, scale: 2 }),
  newPoints: decimal("newPoints", { precision: 6, scale: 2 }),
  reason: text("reason").notNull(),
  revisedByUserId: int("revisedByUserId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const appeals = mysqlTable("appeals", {
  id: int("id").autoincrement().primaryKey(),
  entryId: int("entryId").notNull().references(() => activityEntries.id),
  studentId: int("studentId").notNull().references(() => students.id),
  requesterUserId: int("requesterUserId").references(() => users.id),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["pending", "in_review", "maintained", "corrected", "cancelled"]).default("pending").notNull(),
  resolution: text("resolution"),
  resolvedByUserId: int("resolvedByUserId").references(() => users.id),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const gradeConversions = mysqlTable(
  "gradeConversions",
  {
    id: int("id").autoincrement().primaryKey(),
    studentId: int("studentId").notNull().references(() => students.id),
    subjectId: int("subjectId").notNull().references(() => subjects.id),
    schoolYearId: int("schoolYearId").notNull().references(() => schoolYears.id),
    periodLabel: varchar("periodLabel", { length: 80 }).notNull(),
    rawPoints: decimal("rawPoints", { precision: 7, scale: 2 }).notNull(),
    configuredCeiling: decimal("configuredCeiling", { precision: 6, scale: 2 }).notNull(),
    convertedPoints: decimal("convertedPoints", { precision: 6, scale: 2 }).notNull(),
    administrativeAdjustment: decimal("administrativeAdjustment", { precision: 6, scale: 2 }).default("0.00").notNull(),
    approvedPoints: decimal("approvedPoints", { precision: 6, scale: 2 }),
    status: mysqlEnum("status", ["preview", "approved", "rejected"]).default("preview").notNull(),
    approvedByUserId: int("approvedByUserId").references(() => users.id),
    approvedAt: timestamp("approvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("conversion_period_unique").on(table.studentId, table.subjectId, table.schoolYearId, table.periodLabel)],
);

export const championWinners = mysqlTable(
  "championWinners",
  {
    id: int("id").autoincrement().primaryKey(),
    cycleId: int("cycleId").notNull().references(() => championCycles.id),
    studentId: int("studentId").notNull().references(() => students.id),
    confirmedByUserId: int("confirmedByUserId").references(() => users.id),
    confirmedAt: timestamp("confirmedAt"),
    published: boolean("published").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("champion_winner_unique").on(table.cycleId, table.studentId)],
);

export const importBatches = mysqlTable("importBatches", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["csv", "spreadsheet", "pdf"]).notNull(),
  status: mysqlEnum("status", ["draft", "validated", "imported", "failed"]).default("draft").notNull(),
  totalRows: int("totalRows").default(0).notNull(),
  importedRows: int("importedRows").default(0).notNull(),
  errorSummary: text("errorSummary"),
  createdByUserId: int("createdByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable(
  "auditLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    actorUserId: int("actorUserId").references(() => users.id),
    eventType: varchar("eventType", { length: 120 }).notNull(),
    resourceType: varchar("resourceType", { length: 120 }).notNull(),
    resourceId: varchar("resourceId", { length: 120 }).notNull(),
    detail: text("detail").notNull(),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  },
  table => [index("audit_resource_idx").on(table.resourceType, table.resourceId, table.occurredAt)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ChallengeAction = (typeof activityActionValues)[number];
