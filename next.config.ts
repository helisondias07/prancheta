import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseOrigin = "";
try {
  if (supabaseUrl) {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol === "https:" && parsed.origin === supabaseUrl.replace(/\/$/, "")) supabaseOrigin = parsed.origin;
  }
} catch { /* configuração inválida mantém integração bloqueada pelo navegador */ }
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "worker-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["pdfjs-dist"],
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
