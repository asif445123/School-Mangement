/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "*.e2b.app"],
  serverExternalPackages: ["@resvg/resvg-js"],
  outputFileTracingIncludes: {
    "/api/fees/*/image": ["./src/lib/chalan-fonts/**/*"],
    "/api/fees/*/whatsapp": ["./src/lib/chalan-fonts/**/*"],
  },
};
