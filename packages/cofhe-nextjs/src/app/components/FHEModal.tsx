"use client";

interface FHEModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FHEModal({ isOpen, onClose }: FHEModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className="rounded-lg max-w-md w-full max-h-[90vh] flex flex-col"
        style={{ backgroundColor: "#001623" }}
      >
        <div className="px-5 py-4 overflow-y-auto flex-1 text-white uppercase tracking-widest font-mono">
          <div className="space-y-4">
            <div className="font-visitor1 uppercase tracking-widest text-xs text-gray-300 opacity-50 flex items-center gap-2">
              <img src="/button_icon.svg" alt="icon" className="w-3 h-3" />
              Fully Homomorphic Encryption (FHE)
            </div>
            <p className="text-sm">
              This game uses Fully Homomorphic Encryption to keep your guesses
              private — even on a public blockchain.
            </p>

            <div className="border-t border-b border-dotted border-cyan-400/60 my-2" />

            <div className="font-visitor1 uppercase tracking-widest text-xs text-gray-300 opacity-50 flex items-center gap-2">
              <img src="/button_icon.svg" alt="icon" className="w-3 h-3" />
              How it works here
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <img src="/button_icon.svg" className="w-3 h-3 mt-1" alt="" />
                Your guess is encrypted before it leaves your browser.
              </li>
              <li className="flex gap-2">
                <img src="/button_icon.svg" className="w-3 h-3 mt-1" alt="" />
                The contract computes feedback on encrypted data (no one sees
                your guess or the answer).
              </li>
              <li className="flex gap-2">
                <img src="/button_icon.svg" className="w-3 h-3 mt-1" alt="" />
                You learn if digits/ops are right and if your result is
                low/high/correct — without revealing details.
              </li>
            </ul>

            <div className="border-t border-b border-dotted border-cyan-400/60 my-2" />

            <div className="font-visitor1 uppercase tracking-widest text-xs text-gray-300 opacity-50 flex items-center gap-2">
              <img src="/button_icon.svg" alt="icon" className="w-3 h-3" />
              Why this matters
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <img src="/button_icon.svg" className="w-3 h-3 mt-1" alt="" />
                True privacy: your strategy and guesses remain confidential.
              </li>
              <li className="flex gap-2">
                <img src="/button_icon.svg" className="w-3 h-3 mt-1" alt="" />
                Fair competition: the target stays hidden from everyone.
              </li>
              <li className="flex gap-2">
                <img src="/button_icon.svg" className="w-3 h-3 mt-1" alt="" />
                On-chain transparency without exposing sensitive data.
              </li>
            </ul>

            <div className="border-t border-b border-dotted border-cyan-400/60 my-2" />

            <div className="font-visitor1 uppercase tracking-widest text-xs text-gray-300 opacity-50 flex items-center gap-2">
              <img src="/button_icon.svg" alt="icon" className="w-3 h-3" />
              The technology
            </div>
            <p className="text-sm">
              FHE enables computations on encrypted inputs without decrypting
              them. It powers privacy-preserving logic for this game while
              keeping everything verifiable on-chain.
            </p>
          </div>
        </div>
        <div className="p-5 pt-4">
          <button
            onClick={onClose}
            className="w-full py-2 bg-white text-black uppercase tracking-widest flex items-center justify-center gap-2 font-bold"
          >
            <span>Amazing! Let me play!</span>
            <img
              src="/button_icon.svg"
              alt="icon"
              className="w-3 h-3"
              style={{ filter: "brightness(0) saturate(100%)" }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
