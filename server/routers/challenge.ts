import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { activityActionValues, type ChallengeAction } from "../../drizzle/schema";
import {
  cancelActivityEntry,
  createActivityEntries,
  createEntryAppeal,
  findRecentDuplicate,
  getChallengeSnapshot,
  getConversionExport,
  getMyStudentStatement,
  getStudentStatement,
  getCurrentRule,
  getEntriesByBatchIdempotencyKey,
  listReferenceData,
  importStudents,
  searchActiveStudents,
  teacherCanRecord,
} from "../db";
import { actionDefaults } from "../challengeRules";
import { protectedProcedure, router } from "../_core/trpc";

const activityInput = z.object({
  studentIds: z.array(z.number().int().positive()).min(1).max(40),
  classId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  cycleId: z.number().int().positive().optional(),
  action: z.enum(activityActionValues),
  note: z.string().max(500).optional(),
  confirmedPortugueseOccurrence: z.boolean().default(false),
  idempotencyKey: z.string().min(12).max(100),
  sourceDeviceId: z.string().min(8).max(96).optional(),
  originalRecordedAt: z.coerce.date().optional(),
});

function requireStaff(role: string) {
  if (role !== "teacher" && role !== "leadership" && role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only teachers and leadership can register activities." });
  }
}

async function persistActivity({ ctx, input }: { ctx: { user: { id: number; role: string } }; input: z.infer<typeof activityInput> }) {
  requireStaff(ctx.user.role);
  if (input.action === "Portuguese Occurrence" && !input.confirmedPortugueseOccurrence) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Portuguese Occurrence requires confirmation." });
  }
  if (input.originalRecordedAt && input.originalRecordedAt.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The original activity time cannot be in the future." });
  }
  const existing = await getEntriesByBatchIdempotencyKey(input.idempotencyKey);
  if (existing.length) return { created: 0, entryIds: existing.map(entry => entry.id), alreadySynced: true, undoExpiresAt: new Date() };
  if (ctx.user.role === "teacher") {
    const assigned = await teacherCanRecord(ctx.user.id, input.classId, input.subjectId);
    if (!assigned) throw new TRPCError({ code: "FORBIDDEN", message: "This class and subject are not assigned to this teacher." });
  }
  const rule = await getCurrentRule(input.action as ChallengeAction);
  const cooldownSeconds = rule?.cooldownSeconds ?? 15;
  for (const studentId of input.studentIds) {
    const duplicate = await findRecentDuplicate({ userId: ctx.user.id, studentId, subjectId: input.subjectId, action: input.action as ChallengeAction, cooldownSeconds });
    if (duplicate) throw new TRPCError({ code: "CONFLICT", message: "A recent matching entry is still inside the cooldown window." });
  }
  return createActivityEntries({
    userId: ctx.user.id,
    studentIds: input.studentIds,
    classId: input.classId,
    subjectId: input.subjectId,
    cycleId: input.cycleId,
    action: input.action as ChallengeAction,
    points: Number(rule?.points ?? actionDefaults[input.action as ChallengeAction]),
    note: input.note,
    idempotencyKey: input.idempotencyKey,
    undoWindowSeconds: 8,
    recordedAt: input.originalRecordedAt,
    sourceDeviceId: input.sourceDeviceId,
  });
}

export const challengeRouter = router({
  snapshot: protectedProcedure.query(() => getChallengeSnapshot()),
  references: protectedProcedure.query(() => listReferenceData()),
  searchStudents: protectedProcedure.input(z.object({ query: z.string().max(80), classId: z.number().int().positive().optional() }))
    .query(({ input }) => searchActiveStudents(input.query, input.classId)),
  record: protectedProcedure.input(activityInput).mutation(({ ctx, input }) => persistActivity({ ctx, input })),
  syncOffline: protectedProcedure.input(z.object({ items: z.array(activityInput.extend({ queueId: z.string().min(8).max(128), originUserId: z.number().int().positive() })).min(1).max(100) })).mutation(async ({ ctx, input }) => {
    const results: Array<{ queueId: string; status: "synced" | "conflict"; entryIds?: number[]; message?: string }> = [];
    for (const item of input.items) {
      const { queueId, originUserId, ...activity } = item;
      try {
        if (originUserId !== ctx.user.id) throw new TRPCError({ code: "CONFLICT", message: "This offline activity belongs to a different signed-in user." });
        const result = await persistActivity({ ctx, input: activity });
        results.push({ queueId, status: "synced", entryIds: result.entryIds });
      } catch (error) {
        results.push({ queueId, status: "conflict", message: error instanceof Error ? error.message : "Unable to synchronize this activity." });
      }
    }
    return { results };
  }),
  cancel: protectedProcedure.input(z.object({ entryId: z.number().int().positive(), reason: z.string().min(3).max(500) })).mutation(({ ctx, input }) => {
    requireStaff(ctx.user.role);
    return cancelActivityEntry({
      entryId: input.entryId,
      actorUserId: ctx.user.id,
      reason: input.reason,
      leadership: ctx.user.role === "leadership" || ctx.user.role === "admin",
    });
  }),
  appeal: protectedProcedure.input(z.object({ entryId: z.number().int().positive(), studentId: z.number().int().positive(), reason: z.string().min(5).max(1000) })).mutation(({ ctx, input }) => {
    if (ctx.user.role !== "viewer" && ctx.user.role !== "user") throw new TRPCError({ code: "FORBIDDEN", message: "Only a viewer may submit their own review request." });
    return createEntryAppeal({ ...input, requesterUserId: ctx.user.id });
  }),
  importStudents: protectedProcedure.input(z.object({
    classId: z.number().int().positive(),
    fileName: z.string().min(1).max(255),
    rows: z.array(z.object({ enrollmentNumber: z.string().min(1).max(64), firstName: z.string().min(1).max(120), lastName: z.string().min(1).max(120), publicName: z.string().max(140).optional(), status: z.enum(["active", "inactive"]) })).min(1).max(500),
  })).mutation(({ ctx, input }) => {
    if (ctx.user.role !== "leadership" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only leadership can import students." });
    return importStudents({ userId: ctx.user.id, ...input });
  }),
  exportConversions: protectedProcedure.input(z.object({ classId: z.number().int().positive().optional() }).optional()).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "leadership" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only leadership can export conversion results." });
    const rows = await getConversionExport(input?.classId);
    return rows.map(row => ({
      enrollmentNumber: row.enrollmentNumber,
      studentName: `${row.studentName} ${row.lastName}`,
      className: row.className,
      subjectName: row.subjectName,
      rawPoints: row.rawPoints,
      configuredCeiling: row.configuredCeiling,
      convertedPoints: row.convertedPoints,
      administrativeAdjustment: row.administrativeAdjustment,
      approvedPoints: row.approvedPoints,
      status: row.status,
      approvedAt: row.approvedAt?.toISOString() ?? "",
    }));
  }),
  studentStatement: protectedProcedure.input(z.object({ studentId: z.number().int().positive() })).query(({ ctx, input }) =>
    getStudentStatement({ studentId: input.studentId, userId: ctx.user.id, role: ctx.user.role }),
  ),
  myStatement: protectedProcedure.query(({ ctx }) => {
    if (ctx.user.role !== "viewer" && ctx.user.role !== "user") throw new TRPCError({ code: "FORBIDDEN", message: "Only a viewer may access a personal statement." });
    return getMyStudentStatement(ctx.user.id);
  }),
});
