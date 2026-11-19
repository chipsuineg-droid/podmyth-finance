/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Disable webpack disk cache to prevent OneDrive file lock conflicts on Windows
    config.cache = false;
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
}

module.exports = nextConfig
