import type { NextConfig } from "next";

const secureDeployment = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false;

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: [
    "@mediamatrix/api-client",
    "@mediamatrix/config",
    "@mediamatrix/database",
    "@mediamatrix/github-sync",
    "@mediamatrix/media-engine",
    "@mediamatrix/media-server",
    "@mediamatrix/playlist-manager",
    "@mediamatrix/shared",
    "@mediamatrix/streaming-availability",
    "@mediamatrix/tmdb",
    "@mediamatrix/ui",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "cdn.movieofthenight.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data:",
            `connect-src 'self' https: wss:${process.env.NODE_ENV === "development" ? " http: ws:" : ""}`,
            "media-src 'self' blob: https: http:",
            "worker-src 'self' blob:",
            "manifest-src 'self'",
            ...(secureDeployment ? ["upgrade-insecure-requests"] : []),
          ].join("; ") },
          ...(process.env.NODE_ENV === "production" && secureDeployment ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
