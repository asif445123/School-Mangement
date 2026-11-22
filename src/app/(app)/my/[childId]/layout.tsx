"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePortal, usePortalChild } from "@/components/my-portal-data";
import { childClassLine, childTitle, portalHome } from "@/lib/portal-routes";

// Everything below an address like /my/<childId>/... belongs to ONE child.
// Each section page (fees / diary / tests / exams) shows ONLY its own
// content - there are no other tabs on the page. Moving between sections is
// done from the sidebar menu (or the overview cards on /my), so one link
// never shows the other sections' content.
export default function ChildPortalLayout({ children }: { children: React.ReactNode }) {
  const { bundles } = usePortal();
  const { bundle } = usePortalChild();
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

      {children}
    </div>
  );
}
