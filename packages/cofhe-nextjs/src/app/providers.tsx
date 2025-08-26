"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./wagmi.config";
import { baseSepolia } from "wagmi/chains";
import { ReactNode } from "react";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MiniKitProvider
          chain={baseSepolia}
          config={{
            appearance: {
              name: "(Equle*)", // Displayed in modal header
              mode: "dark", // 'light' | 'dark' | '400'
              theme: "default", // 'default' or custom theme
            },
            wallet: {
              display: "modal",
            },
          }}
        >
          {children}
        </MiniKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
