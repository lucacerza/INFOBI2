import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8090/api/:path*", // Proxy verso FastAPI
      },
    ];
  },
};

export default nextConfig;