import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact us for school account approval, help and questions about the School Management System.",
  alternates: { canonical: "/contact" },
};
export default function ContactLayout({ children }: { children: React.ReactNode }) { return children; }
