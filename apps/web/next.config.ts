import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@lotris/ui', '@lotris/types'],
  async redirects() {
    return [{ source: '/system-health', destination: '/ops', permanent: false }];
  },
};

export default nextConfig;
