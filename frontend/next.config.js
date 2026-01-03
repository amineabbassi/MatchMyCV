/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  // Increase timeout for API routes
  experimental: {
    proxyTimeout: 120000, // 2 minutes
  },
};

module.exports = nextConfig;
