"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaCog, FaSignOutAlt } from "react-icons/fa";
import { api, initials } from "@/lib/api";
import { formDialog, toast } from "@/lib/alerts";
import { useSession } from "./session";
import { InstallButton } from "./pwa-install";

export default function Header() {
  const { user, setUser } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }
  async function settings() {
    setOpen(false);
    const v = await formDialog("Account settings", [
      { name: "name", label: "Name", required: true },
      { name: "phone", label: "Phone" },
      { name: "email", label: "Email", type: "email", required: true },
      ...(user.role === "school" ? [{ name: "logo", label: "School logo (choose an image to change it)", type: "image" }] : []),
      { name: "currentPassword", label: "Current password (only to change password)", type: "password" },
      { name: "newPassword", label: "New password (leave empty to keep)", type: "password" },
    ], { ...user, logo: user.schoolInfo?.logo || "" });
    if (!v) return;
    try {
      const d = await api("/api/auth/me", { method: "PUT", body: v });
      setUser({ ...user, ...d.user }); toast("success", "Settings updated");
    } catch (err: any) { toast("error", err.message); }
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-blue-700 px-3 py-2.5 text-white shadow sm:px-4">
      <span className="min-w-0 truncate text-base font-bold sm:text-lg">🎓 <span className="hidden min-[420px]:inline">School Management</span><span className="min-[420px]:hidden">School</span></span>
      <div className="flex shrink-0 items-center gap-2">
      <InstallButton />
      <div className="relative" ref={box}>
        <button onClick={() => setOpen(!open)} className="flex min-h-[40px] items-center gap-2" aria-label="User menu">
          <span className="hidden max-w-[140px] truncate text-sm md:block">{user.name}</span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-700 sm:h-10 sm:w-10">{initials(user.name)}</span>
        </button>
        {open && (
          <div className="absolute right-0 z-30 mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-lg bg-white py-2 text-slate-700 shadow-lg ring-1 ring-slate-200">
            <div className="border-b px-4 pb-2"><p className="font-semibold">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div>
            <button onClick={settings} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100"><FaCog /> Settings</button>
            <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-slate-100"><FaSignOutAlt /> Logout</button>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
