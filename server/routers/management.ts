import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createManagedClass, createManagedSubject, getManagementData, setTeacherAssignments, updateManagedUser } from "../db";
import { canChangeUserAccess, canManageSchoolAccess, manageableRoles } from "../managementRules";
import { protectedProcedure, router } from "../_core/trpc";

function requireLeadership(role: string) {
  if (!canManageSchoolAccess(role)) throw new TRPCError({ code: "FORBIDDEN", message: "Leadership access is required." });
}

export const managementRouter = router({
  overview: protectedProcedure.query(({ ctx }) => { requireLeadership(ctx.user.role); return getManagementData(); }),
  updateUser: protectedProcedure.input(z.object({ targetUserId: z.number().int().positive(), role: z.enum(manageableRoles), accessStatus: z.enum(["active", "suspended"]) })).mutation(({ ctx, input }) => {
    requireLeadership(ctx.user.role);
    if (!canChangeUserAccess(ctx.user.id, input.targetUserId)) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot change your own role or access status." });
    return updateManagedUser({ ...input, actorUserId: ctx.user.id });
  }),
  saveTeacherAssignments: protectedProcedure.input(z.object({ teacherUserId: z.number().int().positive(), assignments: z.array(z.object({ classId: z.number().int().positive(), subjectId: z.number().int().positive() })).max(100) })).mutation(({ ctx, input }) => {
    requireLeadership(ctx.user.role);
    return setTeacherAssignments({ ...input, actorUserId: ctx.user.id });
  }),
  createClass: protectedProcedure.input(z.object({ schoolYearId: z.number().int().positive(), segment: z.string().min(2).max(80), grade: z.string().min(1).max(80), name: z.string().min(1).max(100) })).mutation(({ ctx, input }) => {
    requireLeadership(ctx.user.role);
    return createManagedClass({ ...input, actorUserId: ctx.user.id });
  }),
  createSubject: protectedProcedure.input(z.object({ code: z.string().min(2).max(32), name: z.string().min(2).max(120) })).mutation(({ ctx, input }) => {
    requireLeadership(ctx.user.role);
    return createManagedSubject({ ...input, code: input.code.toUpperCase(), actorUserId: ctx.user.id });
  }),
});
