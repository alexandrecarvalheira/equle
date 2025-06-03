import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi'

export function useWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()

  return {
    address,
    isConnected,
    connect,
    disconnect,
    connectors,
    chainId
  }
} 