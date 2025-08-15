'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useChainId } from 'wagmi'
import { useEffect, useState } from 'react'

const CHAIN_NAMES: { [key: number]: string } = {
  1: 'Ethereum Mainnet',
  11155111: 'Sepolia',
  42161: 'Arbitrum One',
  421614: 'Arbitrum Sepolia',
}

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  if (isConnected) {
    return (
      <div className="flex flex-col gap-2">
        <p>Connected to {address}</p>
        <p>Network: {CHAIN_NAMES[chainId] || `Unknown (${chainId})`}</p>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  )
} 