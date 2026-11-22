"use client";
import { usePortalChild } from "@/components/my-portal-data";
import { ExamsSection } from "@/components/my-portal";

export default function ExamsPage() {
  const { bundle } = usePortalChild();
  if (!bundle) return null;
  return <ExamsSection bundle={bundle} />;
}
