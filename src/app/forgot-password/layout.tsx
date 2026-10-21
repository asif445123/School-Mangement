import type { Metadata } from "next";
export const metadata: Metadata = { title: "Forgot password", description: "Get a password reset link by email.", alternates: { canonical: "/forgot-password" } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
