import type { NextConfig } from "next";

// Security/performance hardening (Phase 11: launch prep). These headers
// apply to every response; they don't affect the app's behavior, only how
// browsers are told to treat it.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Public URLs all end with a slash (src/lib/urls.ts). Next.js would add
  // it with a 308; src/proxy.ts does it instead with a 301, in the same single
  // hop that moves old /tools/ and /pages/ URLs to the new ones.
  skipTrailingSlashRedirect: true,
  // Still needed so the URLs Next.js writes itself (canonical, og:url) get
  // the slash too — it no longer redirects anything (see above).
  trailingSlash: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
