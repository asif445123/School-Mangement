"use client";
import { useRouter } from "next/navigation";
import { FaBars } from "react-icons/fa";
import { api, initials } from "@/lib/api";
import { useSession } from "./session";
import { InstallButton } from "./pwa-install";

const roleNames: Record<string, string> = {
  admin: "Admin",
  school: "Admin",
  teacher: "Teacher",
  student: "Student",
};

export default function Header({ title = "Dashboard", onOpenMenu }: { title?: string; onOpenMenu?: () => void }) {
  const { user } = useSession();
  const router = useRouter();
  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }
  const roleLabel = roleNames[user.role] || user.role;

  return (
    <header className="sticky top-0 z-20 flex min-h-[50px] items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 text-slate-800 print:hidden sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open menu"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 md:hidden"
          >
            <FaBars />
          </button>
        )}
        <span className="min-w-0 truncate text-base font-bold text-slate-900 sm:text-[17px]">{title}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <InstallButton variant="light" className="hidden sm:inline-flex" />
        <div className="flex items-center gap-2">
            <span className="hidden max-w-[200px] truncate text-[13px] text-slate-500 md:block">
              {user.name} ({roleLabel})
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{initials(user.name)}</span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 sm:inline-flex"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
