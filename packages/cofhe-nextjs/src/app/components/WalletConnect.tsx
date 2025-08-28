"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useChainId } from "wagmi";
import { useEffect, useState } from "react";
import { WalletDropdown } from "@coinbase/onchainkit/wallet";
import { WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { Wallet } from "@coinbase/onchainkit/wallet";
import { Avatar } from "@coinbase/onchainkit/identity";
import { Name } from "@coinbase/onchainkit/identity";
import { EthBalance } from "@coinbase/onchainkit/identity";
import { Identity } from "@coinbase/onchainkit/identity";

const CHAIN_NAMES: { [key: number]: string } = {
  1: "Ethereum Mainnet",
  11155111: "Sepolia",
  42161: "Arbitrum One",
  421614: "Arbitrum Sepolia",
};

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  console.log("isConnected", isConnected);
  console.log("address", address);

  return (
    // <div className="flex flex-col gap-2">
    //   {connectors.map((connector) => (
    //     <button
    //       key={connector.uid}
    //       onClick={() => connect({ connector })}
    //       className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
    //     >
    //       Connect {connector.name}
    //     </button>
    //   ))}
    // </div>
    <Wallet>
      <ConnectWallet>
        <Avatar className="h-6 w-6" />
        <Name />
      </ConnectWallet>
      <WalletDropdown>
        <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
          <Avatar />
          <Name />
          <EthBalance />
        </Identity>
        <WalletDropdownDisconnect />
      </WalletDropdown>
    </Wallet>
  );
}
