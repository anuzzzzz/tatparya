/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tatparya/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'media.tatparya.in',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['superjson'],
  },
};

module.exports = nextConfig;
