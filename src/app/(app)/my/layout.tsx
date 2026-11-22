"use client";
import MyPortalProvider from "@/components/my-portal-data";

// One /api/my call for the whole portal (see components/my-portal-data).
export default function MyPortalLayout({ children }: { children: React.ReactNode }) {
  return <MyPortalProvider>{children}</MyPortalProvider>;
}
