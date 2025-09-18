import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/.well-known/farcaster.json",
        destination:
          "https://api.farcaster.xyz/miniapps/hosted-manifest/01995ce2-90c7-b0a7-e100-047a90bc4b2c",
        permanent: false,
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
