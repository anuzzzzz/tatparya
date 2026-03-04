/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tatparya/shared', 'superjson'],
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
};

module.exports = nextConfig;
