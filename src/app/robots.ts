import type { MetadataRoute } from "next";
const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/login", "/signup", "/demo", "/contact"], disallow: ["/api/", "/reset-password", "/dashboard", "/students", "/fees", "/diary", "/papers", "/marks", "/reports", "/users"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
