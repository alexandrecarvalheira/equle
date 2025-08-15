import { mainnet, sepolia, arbitrum, arbitrumSepolia } from 'wagmi/chains'
import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, arbitrum, arbitrumSepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [arbitrum.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
}) 