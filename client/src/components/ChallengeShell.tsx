import { cn } from "@/lib/utils";
import { clearOfflineQueueForUser } from "@/lib/offlineQueue";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Award,
  BarChart3,
  BookOpenCheck,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Settings2,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

export type AppSection = "today" | "students" | "leaderboard" | "champions" | "leadership" | "guide";

type ChallengeShellProps = {
  section: AppSection;
  onSectionChange: (section: AppSection) => void;
  role: "teacher" | "leadership" | "viewer";
  onRoleChange: (role: "teacher" | "leadership" | "viewer") => void;
  children: ReactNode;
};

const navigation: Array<{ id: AppSection; label: string; icon: typeof LayoutDashboard; leadershipOnly?: boolean }> = [
  { id: "today", label: "Today", icon: LayoutDashboard },
  { id: "students", label: "Students", icon: UsersRound },
  { id: "leaderboard", label: "Leaderboard", icon: BarChart3 },
  { id: "champions", label: "Champions", icon: Trophy },
  { id: "leadership", label: "Leadership", icon: Settings2, leadershipOnly: true },
  { id: "guide", label: "Rules & Guide", icon: BookOpenCheck },
];

const roleLabel = { teacher: "Teacher", leadership: "Leadership", viewer: "Viewer" };

export function ChallengeShell({ section, onSectionChange, role, onRoleChange, children }: ChallengeShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const { user, isAuthenticated, logout } = useAuth();
  const shownNavigation = navigation.filter(item => !item.leadershipOnly || role === "leadership");

  useEffect(() => {
    const markOnline = () => setIsOnline(true);
    const markOffline = () => setIsOnline(false);
    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);
    return () => { window.removeEventListener("online", markOnline); window.removeEventListener("offline", markOffline); };
  }, []);
  const signOut = async () => { if (user?.id) await clearOfflineQueueForUser(user.id); await logout(); };

  return (
    <div className="min-h-screen bg-[#f5f8f5] text-slate-950">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[260px] lg:flex-col lg:border-r lg:border-[#dfe7e0] lg:bg-white">
        <Brand />
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary navigation">
          {shownNavigation.map(item => (
            <NavButton key={item.id} active={section === item.id} icon={<item.icon size={18} />} label={item.label} onClick={() => onSectionChange(item.id)} />
          ))}
        </nav>
        <div className="m-3 rounded-2xl border border-[#dce9df] bg-[#f2f8f3] p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#207342]"><ShieldCheck size={15} /> Secure school space</div>
          <p className="mt-1.5 text-xs leading-5 text-slate-600">Personal records stay private. Rankings highlight positive progress.</p>
        </div>
        <RolePicker role={role} onRoleChange={onRoleChange} />
        {isAuthenticated && <button type="button" onClick={() => { void signOut(); }} className="mx-3 mb-3 rounded-xl border border-[#dfe7e0] px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">Sign out & clear local queue</button>}
      </aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-[#dfe7e0]/85 bg-[#f5f8f5]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button type="button" className="grid h-10 w-10 place-items-center rounded-xl border border-[#d8e3da] bg-white text-slate-700 lg:hidden" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
              <div className="lg:hidden"><Brand compact /></div>
              <div className="hidden sm:block">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6c7c70]">English Challenge</p>
                <p className="text-sm font-semibold text-slate-800">Spring Cycle · 12 days remaining</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-[#d9e5dc] bg-white px-3 py-1.5 sm:flex"><span className={cn("h-2 w-2 rounded-full", isOnline ? "bg-[#26a269]" : "bg-[#c68b1e]")} /><span className="text-xs font-semibold text-slate-600">{isOnline ? "Connection available" : "Working offline"}</span></div>
              <button type="button" className="flex items-center gap-2 rounded-full border border-[#d8e3da] bg-white py-1.5 pl-2 pr-3 text-left" onClick={() => setMenuOpen(true)}>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#163e2e] text-xs font-extrabold text-white">OG</span>
                <span className="hidden text-xs font-bold text-slate-700 sm:block">Olivia Grant</span>
                <ChevronDown size={14} className="text-slate-500" />
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-5 pb-24 sm:px-6 sm:py-7 lg:px-8 lg:pb-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#dfe7e0] bg-white/95 px-1 py-2 backdrop-blur lg:hidden" aria-label="Mobile navigation">
        {shownNavigation.slice(0, 5).map(item => (
          <button key={item.id} type="button" onClick={() => onSectionChange(item.id)} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold", section === item.id ? "text-[#13713f]" : "text-slate-500")}>
            <item.icon size={18} strokeWidth={section === item.id ? 2.5 : 2} />{item.label}
          </button>
        ))}
      </nav>

      {menuOpen && <div className="fixed inset-0 z-50 bg-slate-950/30 p-3 lg:hidden" onClick={() => setMenuOpen(false)}>
        <div className="h-full w-[min(320px,90vw)] rounded-3xl bg-white p-3 shadow-2xl" onClick={event => event.stopPropagation()}>
          <Brand />
          <nav className="mt-4 space-y-1">{shownNavigation.map(item => <NavButton key={item.id} active={section === item.id} icon={<item.icon size={18} />} label={item.label} onClick={() => { onSectionChange(item.id); setMenuOpen(false); }} />)}</nav>
          <div className="mt-6"><RolePicker role={role} onRoleChange={onRoleChange} />{isAuthenticated && <button type="button" onClick={() => { void signOut(); }} className="mt-3 w-full rounded-xl border border-[#dfe7e0] px-3 py-2 text-xs font-black text-slate-600">Sign out & clear local queue</button>}</div>
        </div>
      </div>}
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={cn("flex items-center gap-3", compact ? "" : "px-5 py-6")}><span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#13713f] text-white shadow-[0_8px_20px_rgba(19,113,63,.2)]"><GraduationCap size={22} /></span>{!compact && <span><span className="block text-base font-black tracking-tight text-[#163e2e]">English</span><span className="block -mt-1 text-base font-black tracking-tight text-[#7d9a41]">Challenge</span></span>}</div>;
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all", active ? "bg-[#e7f3eb] text-[#116a3b] shadow-[inset_0_0_0_1px_rgba(19,113,63,.08)]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}>{icon}<span>{label}</span></button>;
}

function RolePicker({ role, onRoleChange }: Pick<ChallengeShellProps, "role" | "onRoleChange">) {
  return <div className="rounded-2xl border border-[#dfe7e0] bg-white p-2"><p className="px-2 pb-2 pt-1 text-[10px] font-black uppercase tracking-[.13em] text-slate-500">Demo access</p><div className="grid grid-cols-3 gap-1">{(["teacher", "leadership", "viewer"] as const).map(item => <button key={item} type="button" onClick={() => onRoleChange(item)} className={cn("rounded-xl px-1 py-2 text-[10px] font-extrabold transition", role === item ? "bg-[#163e2e] text-white" : "text-slate-500 hover:bg-slate-100")}>{roleLabel[item]}</button>)}</div></div>;
}
