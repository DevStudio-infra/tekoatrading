/* eslint-disable @typescript-eslint/no-require-imports */
const withNextIntl = require("next-intl/plugin")("./src/i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "fjraryjhmsjmplbpmafw.supabase.co", // Supabase storage for chart images
      "localhost", // Allow localhost for development
    ],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/api/**",
      },
      {
        protocol: "https",
        hostname: "fjraryjhmsjmplbpmafw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    unoptimized: true, // Allow unoptimized images for development
  },
};

module.exports = withNextIntl(nextConfig);
