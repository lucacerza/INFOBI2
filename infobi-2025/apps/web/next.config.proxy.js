# API proxy configuration for development
# This allows the frontend to make API calls without CORS issues

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8090/api/v1/:path*',
      },
    ]
  },
}

module.exports = nextConfig
