"use client";

import { useConnect } from "wagmi";

export function ConnectWalletButton({
  fullWidth = false,
}: {
  fullWidth?: boolean;
}) {
  const { connect, connectors } = useConnect();

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      className={`inline-flex items-center gap-2 px-6 py-2 text-white uppercase tracking-widest transition-opacity duration-200 hover:opacity-90 ${
        fullWidth ? "w-full justify-center" : ""
      }`}
      style={{
        backgroundColor: "transparent",
        borderTop: "2px dotted #0AD9DC",
        borderBottom: "2px dotted #0AD9DC",
        borderLeft: "none",
        borderRight: "none",
      }}
    >
      <span>Connect Wallet</span>
      <img src="/button_icon.svg" alt="button icon" className="w-3 h-3" />
    </button>
  );
}
