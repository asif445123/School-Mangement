"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Enter Expenses is one page with tabs: Account Types, Account Master and the
// expense Entries page (same tab style as Student Data / Teacher Data).
export const expenseTabs: { href: string; label: string }[] = [
  { href: "/account-types", label: "Account Types" },
  { href: "/accounts", label: "Account Master" },
  { href: "/entries", label: "Enter Expenses" },
];

export const expenseRoutes = expenseTabs.map((t) => t.href);
// Pages that live inside Enter Expenses as tabs for the school
// (kept as pages, but not repeated in the navbar)
export const expenseTabRoutes = expenseRoutes.filter((href) => href !== "/entries");

export default function ExpenseTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Enter Expenses sections" className="mb-4 border-b border-slate-200">
      <div role="tablist" className="flex gap-1 overflow-x-auto pb-0">
        {expenseTabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              role="tab"
              aria-selected={active}
              className={`-mb-px flex min-h-[40px] items-center whitespace-nowrap rounded-t-lg px-3 py-2 text-[13px] font-medium sm:text-sm ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
