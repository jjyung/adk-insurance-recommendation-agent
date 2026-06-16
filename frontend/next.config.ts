import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    // Only rewrite websocket connections, as they are not easily proxied by Next.js API routes.
    // Ensure you build the image with the correct NEXT_PUBLIC_FASTAPI_BASE_URL for the environment,
    // or use a custom server. For Cloud Run, this is built via Dockerfile args.
    const backendUrl = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || process.env.FASTAPI_BASE_URL || 'http://127.0.0.1:8080';
    return [
      {
        source: '/api/agent/live/ws/:path*',
        destination: `${backendUrl}/api/agent/live/ws/:path*`,
      },
    ];
  },
};

export default nextConfig;