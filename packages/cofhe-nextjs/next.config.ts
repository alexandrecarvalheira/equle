import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/.well-known/farcaster.json",
        destination:
          "https://api.farcaster.xyz/miniapps/hosted-manifest/019a746b-a149-df85-9317-22237a0a222c",
        permanent: false,
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
