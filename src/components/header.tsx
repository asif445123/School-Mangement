"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaCog, FaSignOutAlt } from "react-icons/fa";
import { api, initials } from "@/lib/api";
import { formDialog, toast } from "@/lib/alerts";
import { useSession } from "./session";

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
    <header className="sticky top-0 z-20 flex items-center justify-between bg-blue-700 px-4 py-3 text-white shadow">
      <span className="text-lg font-bold">🎓 School Management</span>
      <div className="relative" ref={box}>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2" aria-label="User menu">
          <span className="hidden text-sm sm:block">{user.name}</span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-bold text-blue-700">{initials(user.name)}</span>
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white py-2 text-slate-700 shadow-lg ring-1 ring-slate-200">
            <div className="border-b px-4 pb-2"><p className="font-semibold">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div>
            <button onClick={settings} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100"><FaCog /> Settings</button>
            <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-slate-100"><FaSignOutAlt /> Logout</button>
          </div>
        )}
      </div>
    </header>
  );
}
