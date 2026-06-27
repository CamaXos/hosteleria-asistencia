import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/admin/hoy",
        destination: "/admin/resumen-diario",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
