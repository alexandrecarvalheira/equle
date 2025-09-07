import { CofheStatus } from "./CofheStatus";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useState, useEffect } from "react";

export function UserInfo() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [isMounted, setIsMounted] = useState(false);



  useEffect(() => {
    setIsMounted(true);
  }, []);



  // If no context user and not connected, only show Wallet after mounting
  if (!isMounted) {
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

  // If no context user and not connected (after mounting), show connect button
  if (isMounted && !isConnected) {
    return (
      <nav
        className="w-full px-4 py-2 rounded-xl shadow-lg mb-4"
        style={{ backgroundColor: "#122531" }}
      >
        <div className="flex items-center justify-end max-w-2xl mx-auto relative z-50">
          <div className="relative z-50">
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="px-4 py-2 text-white rounded font-semibold transition-colors duration-200 hover:opacity-80"
              style={{ backgroundColor: "#0AD9DC" }}
            >
              Connect Wallet
            </button>
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
        {isConnected && (
          <div className="flex items-center justify-center flex-shrink-0">
            <CofheStatus />
          </div>
        )}

        {/* Show wallet info and disconnect button when connected */}
        {isConnected && (
          <div className="flex items-center justify-end flex-1 relative z-50">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button
                onClick={() => disconnect()}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
