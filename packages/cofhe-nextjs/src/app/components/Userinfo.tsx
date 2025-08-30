import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { Wallet } from "@coinbase/onchainkit/wallet";
import { CofheStatus } from "./CofheStatus";

export function UserInfo() {
  const { context } = useMiniKit();

  if (!context?.user) {
    return (
      <nav className="w-full px-4 py-4 rounded-xl shadow-lg mb-4">
        <div className="flex items-center justify-end max-w-2xl mx-auto relative z-50">
          <Wallet />
        </div>
      </nav>
    );
  }

  return (
    <nav className="w-full px-4 py-4 rounded-xl shadow-lg mb-4">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Profile Picture */}
          {context.user.pfpUrl && (
            <img
              src={context.user.pfpUrl}
              alt={`${context.user.displayName || "User"}'s profile picture`}
              className="w-10 h-10 rounded-full object-cover border-2"
              style={{ borderColor: "#0AD9DC" }}
            />
          )}

          {/* Display Name */}
          <span className="text-xl font-medium text-white">
            {context.user.displayName || "Unknown"}
          </span>
        </div>

        {/* CofheStatus - only show when user is connected */}
        <div className="flex items-center">
          <CofheStatus />
        </div>
      </div>
    </nav>
  );
}
