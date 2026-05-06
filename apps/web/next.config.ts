import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@lotris/ui', '@lotris/types'],
  serverExternalPackages: ['@lotris/db'],
};

export default nextConfig;
