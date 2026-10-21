"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";
import { CONTACT } from "@/lib/contact";

const PUBLIC = ["/", "/login", "/signup", "/demo", "/contact", "/forgot-password", "/reset-password"];

// Top navbar (with Contact us) and the floating WhatsApp button - shown on the public pages only
export default function PublicChrome() {
  const pathname = usePathname();
  const show = PUBLIC.includes(pathname);
  useEffect(() => {
    document.body.classList.toggle("has-public-nav", show);
    return () => document.body.classList.remove("has-public-nav");
  }, [show]);
  if (!show) return null;
  const wa = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent("Hello, I need help with the School Management System.")}`;
  const link = (href: string, label: string, extra = "") => (
    <Link key={href} href={href} className={`rounded-lg px-3 py-2 hover:bg-blue-600 ${pathname === href ? "bg-blue-800" : ""} ${extra}`}>{label}</Link>
  );
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between bg-blue-700 px-3 text-white shadow sm:px-4">
        <Link href="/" className="font-bold">🎓<span className="ml-2 hidden sm:inline">School Management</span></Link>
        <nav className="flex items-center gap-1 text-sm">
          {link("/", "Home", "hidden sm:block")}
          {link("/demo", "View Demo")}
          {link("/contact", "Contact us")}
          <Link href="/login" className="ml-1 rounded-lg bg-white px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50">Login</Link>
        </nav>
      </header>
      <a href={wa} target="_blank" rel="noopener" aria-label="Chat on WhatsApp" title="Chat on WhatsApp"
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-3xl text-white shadow-lg hover:bg-green-600"><FaWhatsapp /></a>
    </>
  );
}
