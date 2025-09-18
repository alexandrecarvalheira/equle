import { baseSepolia } from "wagmi/chains";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [miniAppConnector(), injected()],
  ssr: true,
  // turn off injected provider discovery
  multiInjectedProviderDiscovery: false,
  transports: {
    [baseSepolia.id]: http(),
  },
});
