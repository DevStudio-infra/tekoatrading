const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./src/i18n/config.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ["@trpc/server"],
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ["@trpc/client", "@trpc/react-query"],
  typescript: {
    // Ignore TypeScript errors during build for now
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore ESLint errors during build for now
    ignoreDuringBuilds: true,
  },
};

module.exports = withNextIntl(nextConfig);
