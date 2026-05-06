import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@lotris/ui', '@lotris/types'],
  experimental: {
    // Enable React Server Components optimisations
    serverComponentsExternalPackages: ['@lotris/db'],
  },
};

export default nextConfig;
