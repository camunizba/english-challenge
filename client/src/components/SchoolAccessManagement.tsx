import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Check, Link2, Plus, ShieldCheck, UserCog, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ManagedRole = "viewer" | "teacher" | "leadership";
type ManagedUser = { id: number; name: string | null; email: string | null; role: string; accessStatus: "active" | "suspended" };
type Assignment = { id: number; userId: number; classId: number; className: string; subjectId: number; subjectName: string; active: boolean };

const demoUsers: ManagedUser[] = [
  { id: 101, name: "Olivia Grant", email: "olivia.grant@school.demo", role: "leadership", accessStatus: "active" },
  { id: 102, name: "Ethan Woods", email: "ethan.woods@school.demo", role: "teacher", accessStatus: "active" },
  { id: 103, name: "Priya Shah", email: "priya.shah@school.demo", role: "teacher", accessStatus: "active" },
  { id: 104, name: "Maya Rodrigues", email: "maya.rodrigues@student.demo", role: "viewer", accessStatus: "active" },
];

const demoClasses = [{ id: 1, name: "8B", grade: "Grade 8", segment: "Middle School" }, { id: 2, name: "8A", grade: "Grade 8", segment: "Middle School" }];
const demoSubjects = [{ id: 1, code: "ELA", name: "English Language Arts" }, { id: 2, code: "ENG-C", name: "English Conversation" }];

export function SchoolAccessManagement({ enabled }: { enabled: boolean }) {
  const overview = trpc.management.overview.useQuery(undefined, { enabled, retry: false });
  const updateUser = trpc.management.updateUser.useMutation({ onSuccess: () => { void overview.refetch(); toast.success("User access updated"); }, onError: error => toast.error("Unable to update user", { description: error.message }) });
  const saveAssignments = trpc.management.saveTeacherAssignments.useMutation({ onSuccess: () => { void overview.refetch(); toast.success("Teaching assignments saved"); }, onError: error => toast.error("Unable to save assignments", { description: error.message }) });
  const createSubject = trpc.management.createSubject.useMutation({ onSuccess: () => { void overview.refetch(); toast.success("Subject created"); }, onError: error => toast.error("Unable to create subject", { description: error.message }) });
  const createClass = trpc.management.createClass.useMutation({ onSuccess: () => { void overview.refetch(); toast.success("Class created"); }, onError: error => toast.error("Unable to create class", { description: error.message }) });

  const sourceUsers = overview.data?.users?.length ? overview.data.users : demoUsers;
  const sourceSchoolYears = overview.data?.schoolYears || [];
  const sourceClasses = overview.data?.classes?.length ? overview.data.classes : demoClasses;
  const sourceSubjects = overview.data?.subjects?.length ? overview.data.subjects : demoSubjects;
  const sourceAssignments = overview.data?.assignments?.length ? overview.data.assignments : [{ id: 1, userId: 102, classId: 1, className: "8B", subjectId: 1, subjectName: "English Language Arts", active: true }];
  const teachers = sourceUsers.filter(user => user.role === "teacher");
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(() => teachers[0]?.id ?? 0);
  const [selectedClassId, setSelectedClassId] = useState<number>(() => sourceClasses[0]?.id ?? 0);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(() => sourceSubjects[0]?.id ?? 0);
  const [draftAssignments, setDraftAssignments] = useState<Array<{ classId: number; subjectId: number }>>([]);
  const [newSubject, setNewSubject] = useState({ code: "", name: "" });
  const [newClass, setNewClass] = useState({ name: "", grade: "", segment: "" });

  useEffect(() => { if (!selectedTeacherId && teachers[0]) setSelectedTeacherId(teachers[0].id); }, [selectedTeacherId, teachers]);
  useEffect(() => { if (!selectedClassId && sourceClasses[0]) setSelectedClassId(sourceClasses[0].id); }, [selectedClassId, sourceClasses]);
  useEffect(() => { if (!selectedSubjectId && sourceSubjects[0]) setSelectedSubjectId(sourceSubjects[0].id); }, [selectedSubjectId, sourceSubjects]);
  useEffect(() => {
    const assignments = sourceAssignments.filter(assignment => assignment.userId === selectedTeacherId && assignment.active).map(assignment => ({ classId: assignment.classId, subjectId: assignment.subjectId }));
    setDraftAssignments(assignments);
  }, [selectedTeacherId, sourceAssignments]);

  const selectedTeacher = teachers.find(teacher => teacher.id === selectedTeacherId);
  const assignmentLabels = useMemo(() => draftAssignments.map(assignment => ({ ...assignment, className: sourceClasses.find(item => item.id === assignment.classId)?.name || "Class", subjectName: sourceSubjects.find(item => item.id === assignment.subjectId)?.name || "Subject" })), [draftAssignments, sourceClasses, sourceSubjects]);
  const addAssignment = () => {
    if (!selectedClassId || !selectedSubjectId) return;
    if (draftAssignments.some(item => item.classId === selectedClassId && item.subjectId === selectedSubjectId)) { toast.info("This class and subject link is already listed."); return; }
    setDraftAssignments(current => [...current, { classId: selectedClassId, subjectId: selectedSubjectId }]);
  };
  const saveTeacher = () => {
    if (!selectedTeacherId) return;
    if (!enabled) { toast.info("Demo update", { description: "Sign in as leadership to save this link in the school directory." }); return; }
    saveAssignments.mutate({ teacherUserId: selectedTeacherId, assignments: draftAssignments });
  };
  const saveUser = (user: ManagedUser, role: ManagedRole, accessStatus: "active" | "suspended") => {
    if (!enabled) { toast.info("Demo update", { description: "Sign in as leadership to apply user access changes." }); return; }
    updateUser.mutate({ targetUserId: user.id, role, accessStatus });
  };
  const addSubject = () => {
    if (!newSubject.code.trim() || !newSubject.name.trim()) { toast.error("Enter a subject code and name."); return; }
    if (!enabled) { toast.info("Demo subject ready", { description: "Sign in as leadership to save it." }); return; }
    createSubject.mutate({ code: newSubject.code, name: newSubject.name });
    setNewSubject({ code: "", name: "" });
  };
  const addClass = () => {
    if (!newClass.name.trim() || !newClass.grade.trim() || !newClass.segment.trim()) { toast.error("Enter the class name, grade and school segment."); return; }
    if (!enabled || !sourceSchoolYears[0]) { toast.info("Demo class ready", { description: "Sign in as leadership with an active school year to save it." }); return; }
    createClass.mutate({ schoolYearId: sourceSchoolYears[0].id, ...newClass });
    setNewClass({ name: "", grade: "", segment: "" });
  };

  return <section className="rounded-[24px] border border-[#dce7df] bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#6c856e]">School access</p><h2 className="mt-1 text-xl font-black text-[#163e2e]">Users & teaching assignments</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Leadership controls user status and roles. A teacher receives access to a student group only through an active class and subject link.</p></div><span className="inline-flex items-center gap-2 rounded-full bg-[#eaf6ed] px-3 py-1.5 text-xs font-black text-[#167344]"><ShieldCheck size={14} /> Server-verified</span></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.22fr_.78fr]"><div className="overflow-hidden rounded-2xl border border-[#e2e9e3]"><div className="overflow-x-auto"><table className="w-full min-w-[610px] text-left"><thead><tr className="border-b border-[#e8eeea] bg-[#f8fbf8] text-[10px] font-black uppercase tracking-[.12em] text-slate-400"><th className="px-4 py-3">User</th><th className="py-3">Role</th><th className="py-3">Status</th><th className="py-3 text-right">Access action</th></tr></thead><tbody>{sourceUsers.map(user => <tr key={user.id} className="border-b border-[#f0f3f0] last:border-0"><td className="px-4 py-3"><p className="text-sm font-bold text-slate-800">{user.name || "Unnamed user"}</p><p className="text-xs text-slate-500">{user.email || "No institutional e-mail"}</p></td><td className="py-3"><select aria-label={`Role for ${user.name || "user"}`} value={user.role === "admin" ? "leadership" : user.role === "user" ? "viewer" : user.role} onChange={event => saveUser(user, event.target.value as ManagedRole, user.accessStatus)} className="rounded-lg border border-[#dbe6dd] bg-white px-2 py-1.5 text-xs font-bold text-slate-700"><option value="leadership">Leadership</option><option value="teacher">Teacher</option><option value="viewer">Viewer</option></select></td><td className="py-3"><Badge className={cn("border-0", user.accessStatus === "active" ? "bg-[#eaf6ed] text-[#167344]" : "bg-red-100 text-red-800")}>{user.accessStatus}</Badge></td><td className="py-3 pr-4 text-right"><button type="button" onClick={() => saveUser(user, (user.role === "admin" ? "leadership" : user.role === "user" ? "viewer" : user.role) as ManagedRole, user.accessStatus === "active" ? "suspended" : "active")} className="rounded-lg px-2 py-1.5 text-xs font-black text-[#167344] hover:bg-[#edf7ef]">{user.accessStatus === "active" ? "Suspend" : "Reactivate"}</button></td></tr>)}</tbody></table></div></div>
      <aside className="rounded-2xl bg-[#f5faf6] p-4"><div className="flex items-center gap-2"><Link2 size={17} className="text-[#167344]" /><h3 className="text-sm font-black text-[#163e2e]">Teacher assignment</h3></div><p className="mt-1 text-xs leading-5 text-slate-600">Choose the class and discipline that a teacher may use for records.</p><label className="mt-4 block text-xs font-black text-slate-600">Teacher<select value={selectedTeacherId} onChange={event => setSelectedTeacherId(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-[#d7e3d9] bg-white px-3 py-2 text-sm font-bold text-slate-700">{teachers.length ? teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name || teacher.email}</option>) : <option value="0">No teacher profile available</option>}</select></label><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-black text-slate-600">Class<select value={selectedClassId} onChange={event => setSelectedClassId(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-[#d7e3d9] bg-white px-2 py-2 text-xs font-bold text-slate-700">{sourceClasses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-black text-slate-600">Subject<select value={selectedSubjectId} onChange={event => setSelectedSubjectId(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-[#d7e3d9] bg-white px-2 py-2 text-xs font-bold text-slate-700">{sourceSubjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><Button variant="outline" size="sm" className="mt-3 w-full" onClick={addAssignment}><Plus size={14} /> Add assignment</Button><div className="mt-3 space-y-2">{assignmentLabels.length ? assignmentLabels.map(assignment => <div key={`${assignment.classId}-${assignment.subjectId}`} className="flex items-center justify-between rounded-xl border border-[#dce7df] bg-white px-3 py-2"><span className="text-xs font-bold text-slate-700">{assignment.className} · {assignment.subjectName}</span><button type="button" onClick={() => setDraftAssignments(current => current.filter(item => item.classId !== assignment.classId || item.subjectId !== assignment.subjectId))} className="text-xs font-black text-red-700">Remove</button></div>) : <p className="rounded-xl border border-dashed border-[#cbdccc] p-3 text-xs leading-5 text-slate-500">No active link selected for {selectedTeacher?.name || "this teacher"}.</p>}</div><Button className="mt-3 w-full" onClick={saveTeacher} disabled={!selectedTeacherId || saveAssignments.isPending}>{saveAssignments.isPending ? "Saving…" : "Save teaching access"}</Button></aside></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-[#e2e9e3] p-4"><div className="flex items-center gap-2"><UsersRound size={17} className="text-[#167344]" /><h3 className="text-sm font-black text-[#163e2e]">Classes</h3></div><div className="mt-3 grid grid-cols-[.8fr_1fr_1fr_auto] gap-2"><Input value={newClass.name} onChange={event => setNewClass(current => ({ ...current, name: event.target.value }))} placeholder="8C" className="h-9 text-xs" /><Input value={newClass.grade} onChange={event => setNewClass(current => ({ ...current, grade: event.target.value }))} placeholder="Grade" className="h-9 text-xs" /><Input value={newClass.segment} onChange={event => setNewClass(current => ({ ...current, segment: event.target.value }))} placeholder="Segment" className="h-9 text-xs" /><Button size="sm" onClick={addClass} disabled={createClass.isPending}><Plus size={14} /></Button></div><div className="mt-3 flex flex-wrap gap-2">{sourceClasses.map(item => <Badge key={item.id} className="border border-[#d8e7dc] bg-[#f7fbf8] px-2.5 py-1 text-xs font-bold text-slate-700">{item.name} · {item.grade}</Badge>)}</div></div><div className="rounded-2xl border border-[#e2e9e3] p-4"><div className="flex items-center gap-2"><UserCog size={17} className="text-[#167344]" /><h3 className="text-sm font-black text-[#163e2e]">Subjects</h3></div><div className="mt-3 flex gap-2"><Input value={newSubject.code} onChange={event => setNewSubject(current => ({ ...current, code: event.target.value }))} placeholder="Code" className="h-9 max-w-24 text-xs" /><Input value={newSubject.name} onChange={event => setNewSubject(current => ({ ...current, name: event.target.value }))} placeholder="New subject" className="h-9 text-xs" /><Button size="sm" onClick={addSubject} disabled={createSubject.isPending}><Plus size={14} /></Button></div><div className="mt-3 flex flex-wrap gap-2">{sourceSubjects.map(item => <Badge key={item.id} className="border border-[#d8e7dc] bg-[#f7fbf8] px-2.5 py-1 text-xs font-bold text-slate-700"><Check className="mr-1 inline" size={12} />{item.code}</Badge>)}</div></div></div>
  </section>;
}
