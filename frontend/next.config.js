/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@trpc/server"],
  },
  transpilePackages: ["@trpc/client", "@trpc/react-query"],
};

module.exports = nextConfig;
