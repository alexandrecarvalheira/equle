import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/.well-known/farcaster.json",
        destination:
          "https://api.farcaster.xyz/miniapps/hosted-manifest/019a0efd-67f5-341b-34b8-32987f42a3c9",
        permanent: false,
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
