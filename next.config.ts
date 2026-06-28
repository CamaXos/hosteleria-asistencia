import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/admin/hoy",
        destination: "/admin/resumen-diario",
        permanent: true,
      },
      {
        source: "/admin/monthly",
        destination: "/admin/analytics",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
