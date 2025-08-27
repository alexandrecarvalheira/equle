import { baseSepolia, base } from "wagmi/chains";
import { createConfig, http } from "wagmi";
import { coinbaseWallet, injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: "onchainkit",
      preference: "eoaOnly",
      version: "4",
    }),
  ],
  ssr: true,
  // turn off injected provider discovery
  multiInjectedProviderDiscovery: false,
  transports: {
    [baseSepolia.id]: http(),
  },
});
