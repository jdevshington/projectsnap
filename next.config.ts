// next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // 50 para los thumbnails de photo-manager (chicos, no necesitan
    // calidad alta), 75 (default de Next) para el resto.
    qualities: [50, 75],
  },
};

export default nextConfig;
