import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "https://equle.fhenix.io/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
