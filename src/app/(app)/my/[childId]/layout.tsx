"use client";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePortal, usePortalChild } from "@/components/my-portal-data";
import { childClassLine, childTitle, portalHome, portalPath, portalSections } from "@/lib/portal-routes";

// Everything below an address like /my/<childId>/... belongs to ONE child.
// The header and the section tabs are drawn once here; each section page
// (fees / diary / tests / exams) only renders its own table.
export default function ChildPortalLayout({ children }: { children: React.ReactNode }) {
  const { bundles } = usePortal();
  const { bundle } = usePortalChild();
  const pathname = usePathname();
  const router = useRouter();

  // A link to a child this login is not linked to goes back to the overview.
  useEffect(() => {
    if (bundles.length && !bundle) router.replace(portalHome);
  }, [bundles.length, bundle, router]);

  if (!bundle) return <p className="p-6 text-center text-slate-500">Loading child...</p>;

  const student = bundle.student;
  return (
    <div className="space-y-4">
      <div className="card text-center">
        <h1 className="text-lg font-bold sm:text-xl">{childTitle(student)}</h1>
        <p className="text-sm text-slate-600">{childClassLine(student)}</p>
        {bundles.length > 1 && (
          <Link href={portalHome} className="mt-2 inline-block text-xs font-medium text-blue-700 hover:underline">
            &larr; All children / family summary
          </Link>
        )}
      </div>

      <nav aria-label="Portal sections" className="border-b border-slate-200">
        <div role="tablist" className="flex gap-1 overflow-x-auto pb-0">
          {portalSections.map((section) => {
            const href = portalPath(student._id, section.key);
            const active = pathname === href;
            return (
              <Link
                key={section.key}
                href={href}
                role="tab"
                aria-selected={active}
                className={`-mb-px flex min-h-[40px] items-center whitespace-nowrap rounded-t-lg px-3 py-2 text-[13px] font-medium sm:text-sm ${
                  active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {section.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {children}
    </div>
  );
}
