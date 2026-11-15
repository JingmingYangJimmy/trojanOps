import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The gateway and DB code run on the Node.js runtime (I14); postgres.js stays server-side.
  serverExternalPackages: ['postgres'],
  // Management previews and roster sync read this server-only CSV at runtime.
  outputFileTracingIncludes: {
    '/*': ['./db/seed/roster.csv'],
  },
};

export default nextConfig;
