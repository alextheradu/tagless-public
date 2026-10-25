import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/admin/admin", destination: "/admin", permanent: true },
      { source: "/admin/admin/:path*", destination: "/admin/:path*", permanent: true },
      { source: "/docs/docs", destination: "/docs", permanent: true },
      { source: "/docs/docs/:path*", destination: "/docs/:path*", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.airtableusercontent.com" },
      { protocol: "https", hostname: "dl.airtable.com" },
    ],
  },
};

export default nextConfig;
