"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { baseSepolia } from "wagmi/chains";
import { ReactNode } from "react";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <MiniKitProvider
      chain={baseSepolia}
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MiniKitProvider>
  );
}
