"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaBars, FaCog, FaSignOutAlt, FaUniversity, FaWhatsapp, FaPlus } from "react-icons/fa";
import { api, initials } from "@/lib/api";
import { formDialog, toast } from "@/lib/alerts";
import { useSession } from "./session";
import { InstallButton } from "./pwa-install";
import { editPaymentAccount } from "./payment-account-dialog";

const roleNames: Record<string, string> = {
  admin: "Admin",
  school: "Admin",
  teacher: "Teacher",
  student: "Student",
};

export default function Header({ title = "Dashboard", onOpenMenu }: { title?: string; onOpenMenu?: () => void }) {
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
        <div className="relative" ref={box}>
          <button onClick={() => setOpen(!open)} className="flex min-h-[36px] items-center gap-2 rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100" aria-label="User menu">
            <span className="hidden max-w-[200px] truncate text-[13px] text-slate-500 md:block">
              {user.name} ({roleLabel})
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{initials(user.name)}</span>
          </button>
          {open && (
            <div className="absolute right-0 z-30 mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-lg bg-white py-2 text-slate-700 shadow-lg ring-1 ring-slate-200">
              <div className="border-b px-4 pb-2"><p className="font-semibold">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div>
              <button onClick={settings} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100"><FaCog /> Settings</button>
              {user.role === "school" && <div className="my-1 border-y py-1"><button onClick={async () => { setOpen(false); await editPaymentAccount(); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100"><FaPlus /> Add payment account</button><button onClick={() => { setOpen(false); router.push("/payment-accounts"); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100"><FaUniversity /> Payment accounts</button><button onClick={() => { setOpen(false); router.push("/whatsapp-settings"); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100"><FaWhatsapp /> WhatsApp settings</button></div>}
              <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-slate-100"><FaSignOutAlt /> Logout</button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={logout}
          className="hidden rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 sm:inline-flex"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
