"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./wagmi.config";
import { baseSepolia, base, arbitrumSepolia } from "wagmi/chains";
import { ReactNode } from "react";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MiniKitProvider
      chain={arbitrumSepolia}
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      config={{
        appearance: {
          name: "(Equle*)", // Displayed in modal header
          mode: "dark", // 'light' | 'dark' | '400'
        },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </MiniKitProvider>
  );
}
