import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },
      ],
    },
    {
      source: "/api/:path*",
      headers: [
        {
          key: "Access-Control-Allow-Origin",
          value: "https://sbpay.me",
        },
        {
          key: "Access-Control-Allow-Methods",
          value: "POST, OPTIONS",
        },
        {
          key: "Access-Control-Allow-Headers",
          value: "Content-Type, X-SBPay-Signature",
        },
      ],
    },
  ],
  // Add CSP if needed
  // Add other security configurations
};

export default nextConfig;
