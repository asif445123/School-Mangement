"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Inventory & Purchases is one page with six tabs (same tab style as Student
// Data / Teacher Data / Enter Expenses).
export const inventoryTabs: { href: string; label: string }[] = [
  { href: "/inventory", label: "Items (Stock)" },
  { href: "/inventory/requisitions", label: "Purchase Requisition" },
  { href: "/inventory/purchases", label: "Purchase Invoice" },
  { href: "/inventory/stock", label: "Stock In / Out" },
  { href: "/inventory/suppliers", label: "Suppliers" },
  { href: "/inventory/ledger", label: "Supplier Ledger" },
];

export const inventoryRoutes = inventoryTabs.map((t) => t.href);
// Pages that live inside Inventory as tabs (kept as pages, not repeated in the navbar)
export const inventoryTabRoutes = inventoryRoutes.filter((href) => href !== "/inventory");

export default function InventoryTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Inventory sections" className="mb-4 border-b border-slate-200">
      <div role="tablist" className="flex gap-1 overflow-x-auto pb-0">
        {inventoryTabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              role="tab"
              aria-selected={active}
              className={`-mb-px flex min-h-[40px] items-center whitespace-nowrap rounded-t-lg px-3 py-2 text-[13px] font-medium sm:text-sm ${
                active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
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
