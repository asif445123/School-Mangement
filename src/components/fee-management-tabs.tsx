"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// All school fee work lives under one sidebar item. Each route remains directly
// addressable so refreshes and bookmarks keep the selected tab.
export const feeManagementTabs = [
  { href: "/fees", label: "Chalans & Payments" },
  { href: "/fee-structure", label: "Fee Structure" },
  { href: "/student-fee-ledger", label: "Student Fee Ledger" },
  { href: "/fee-defaulters", label: "Defaulters & WhatsApp" },
];

export const feeManagementRoutes = feeManagementTabs.map((tab) => tab.href);
export const feeManagementTabRoutes = feeManagementRoutes.filter((href) => href !== "/fees");

export default function FeeManagementTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Fee Management sections" className="mb-4 border-b border-slate-200">
      <div role="tablist" className="flex gap-1 overflow-x-auto pb-0">
        {feeManagementTabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={active}
              className={`-mb-px flex min-h-[40px] items-center whitespace-nowrap rounded-t-lg px-3 py-2 text-[13px] font-medium sm:text-sm ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
