"use client";
import { usePortalChild } from "@/components/my-portal-data";
import { DiarySection } from "@/components/my-portal";

export default function DailyDiaryPage() {
  const { bundle } = usePortalChild();
  if (!bundle) return null;
  return <DiarySection bundle={bundle} />;
}
