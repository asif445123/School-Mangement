import type { Metadata, Viewport } from "next";
import "./globals.css";
import PublicChrome from "@/components/public-chrome";
import PwaInstall from "@/components/pwa-install";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2563eb",
};
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "School Management System | Fee Chalan, Diary, Papers & Results", template: "%s | School Management" },
  description: "Manage student monthly fee chalan and fee receiving, daily diary, test and exam papers, marks entry and result reports in one simple school management system.",
  keywords: ["school management system", "fee chalan", "fee receipt", "daily diary", "exam paper maker", "marks entry", "result report", "Pakistan school software"],
  authors: [{ name: "School Management" }],
  alternates: { canonical: "/" },
  // PWA — lets every visitor install this app on mobile, PC or laptop
  manifest: "/manifest.webmanifest",
  applicationName: "School Management",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "School Mgmt" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.jpg", type: "image/jpeg" },
    ],
    shortcut: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: { type: "website", url: siteUrl, siteName: "School Management System", title: "School Management System", description: "Fee chalan, daily diary, test papers, exams, marks and reports.", images: ["/favicon.jpg"] },
  twitter: { card: "summary", title: "School Management System", description: "Fee chalan, daily diary, test papers, exams, marks and reports." },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "School Management System", applicationCategory: "EducationalApplication", operatingSystem: "Web", description: "Fee chalan, daily diary, papers, marks and reports for schools." };
  return (
    <html lang="en">
      <body>
        <PublicChrome />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
        {/* "Install this app" banner + service worker — on every page/link */}
        <PwaInstall />
      </body>
    </html>
  );
}
