import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The gateway and DB code run on the Node.js runtime (I14); postgres.js stays server-side.
  serverExternalPackages: ['postgres'],
};

export default nextConfig;
