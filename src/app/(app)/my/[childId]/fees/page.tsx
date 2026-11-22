"use client";
import { usePortal, usePortalChild } from "@/components/my-portal-data";
import { FeeChalanSection } from "@/components/my-portal";

export default function FeeChalanPage() {
  const { data } = usePortal();
  const { bundle } = usePortalChild();
  if (!bundle) return null;
  return <FeeChalanSection bundle={bundle} schoolInfo={data.schoolInfo} accounts={data.paymentAccounts || []} />;
}
