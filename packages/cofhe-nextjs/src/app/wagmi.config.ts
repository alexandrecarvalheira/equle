import { baseSepolia, base, arbitrumSepolia } from "wagmi/chains";
import { createConfig, http } from "wagmi";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";

export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia],
  connectors: [
    coinbaseWallet({
      appName: "onchainkit",
      version: "4",
    }),
    miniAppConnector(),
  ],
  ssr: true,
  // turn off injected provider discovery
  multiInjectedProviderDiscovery: false,
  transports: {
    [arbitrumSepolia.id]: http(),
  },
});
