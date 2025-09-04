import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { Wallet } from "@coinbase/onchainkit/wallet";
import { CofheStatus } from "./CofheStatus";
import { useAccount, usePublicClient } from "wagmi";
import { useState, useEffect } from "react";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/contract";
import { contractStore } from "../store/contractStore";
import { useCofheStore } from "../store/cofheStore";
import { getContract, createWalletClient, custom } from "viem";

export function UserInfo() {
  const { context } = useMiniKit();
  const { address, chain, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [isMounted, setIsMounted] = useState(false);

  // Contract store
  const setEquleContract = contractStore((state) => state.setEqule);
  const equleContract = contractStore((state) => state.equle);

  // CoFHE store
  const isInitialized = useCofheStore((state) => state.isInitialized);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize contract when wallet is connected and CoFHE is initialized
  useEffect(() => {
    const initializeContract = async () => {
      if (
        isConnected &&
        address &&
        chain &&
        publicClient &&
        isInitialized &&
        !equleContract
      ) {
        try {
          console.log("Initializing Equle contract...");

          const walletClient = createWalletClient({
            account: address,
            chain,
            transport: custom((window as any).ethereum),
          });

          const contract = getContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: CONTRACT_ABI,
            client: {
              public: publicClient,
              wallet: walletClient,
            },
          });
          console.log("contract", contract);
          setEquleContract(contract as any);
          console.log("Equle contract initialized:", contract);
        } catch (error) {
          console.error("Failed to initialize Equle contract:", error);
        }
      }
    };

    initializeContract();
  }, [
    isConnected,
    address,
    chain,
    publicClient,
    isInitialized,
    equleContract,
    setEquleContract,
  ]);

  // Create read-only contract when wallet disconnects
  useEffect(() => {
    if (!isConnected && publicClient) {
      // Create a read-only contract with just the public client
      const readOnlyContract = getContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        client: publicClient,
      });

      setEquleContract(readOnlyContract as any);
      console.log("Created read-only Equle contract");
    }
  }, [isConnected, publicClient, setEquleContract]);

  // If no context user and not connected, only show Wallet after mounting
  if (!context?.user && !isMounted) {
    return (
      <nav
        className="w-full px-4 py-2 rounded-xl shadow-lg mb-4"
        style={{ backgroundColor: "#122531" }}
      >
        <div className="flex items-center justify-end max-w-2xl mx-auto relative z-50">
          {/* Show placeholder during hydration */}
          <div className="h-10 w-24 bg-gray-700 rounded animate-pulse"></div>
        </div>
      </nav>
    );
  }

  // If no context user and not connected (after mounting), show Wallet
  if (!context?.user && isMounted && !isConnected) {
    return (
      <nav
        className="w-full px-4 py-2 rounded-xl shadow-lg mb-4"
        style={{ backgroundColor: "#122531" }}
      >
        <div className="flex items-center justify-end max-w-2xl mx-auto relative z-50">
          <div className="relative z-50">
            <Wallet />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="w-full px-4 py-2 rounded-xl shadow-lg mb-4"
      style={{ backgroundColor: "#122531" }}
    >
      <div className="flex items-center justify-between max-w-2xl mx-auto gap-4">
        {/* CofheStatus - only show when user is connected or context available */}
        {(context?.user || isConnected) && (
          <div className="flex items-center justify-center flex-shrink-0">
            <CofheStatus />
          </div>
        )}

        {/* User Info - only show when context user is available */}
        {context?.user && (
          <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
            {/* Display Name */}
            <span className="text-lg sm:text-xl font-medium text-white truncate">
              {context.user.displayName || "Unknown"}
            </span>

            {/* Profile Picture */}
            {context.user.pfpUrl && (
              <img
                src={context.user.pfpUrl}
                alt={`${context.user.displayName || "User"}'s profile picture`}
                className="w-8 h-8 rounded-full object-cover border-2 flex-shrink-0"
                style={{ borderColor: "#0AD9DC" }}
              />
            )}
          </div>
        )}

        {/* Show Wallet if no context user but connected */}
        {!context?.user && isConnected && (
          <div className="flex items-center justify-end flex-1 relative z-50">
            <Wallet />
          </div>
        )}
      </div>
    </nav>
  );
}
