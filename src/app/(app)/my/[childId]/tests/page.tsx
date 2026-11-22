"use client";
import { usePortalChild } from "@/components/my-portal-data";
import { TestsSection } from "@/components/my-portal";

export default function TestsPage() {
  const { bundle } = usePortalChild();
  if (!bundle) return null;
  return <TestsSection bundle={bundle} />;
}
