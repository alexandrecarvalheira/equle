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
        className="rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col"
        style={{ backgroundColor: "#122531" }}
      >
        <div className="p-6 pb-0">
          <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            🔐 Fully Homomorphic Encryption (FHE)
          </h3>
        </div>
        <div className="px-6 overflow-y-auto flex-1">
          <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">
                🛡️ Your Privacy is Protected
              </h4>
              <p className="text-blue-700 dark:text-blue-200">
                This game uses cutting-edge Fully Homomorphic Encryption (FHE) to ensure your guesses remain completely private, even on the public blockchain.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-lg">How FHE Works in This Game:</h4>
              
              <div className="ml-4 space-y-3">
                <div>
                  <p className="font-semibold mb-1">🔒 Your Input is Encrypted</p>
                  <p>When you submit a guess like "2+3*4", it's immediately encrypted before leaving your browser. No one can see what you guessed - not other players, not the blockchain validators, not even us!</p>
                </div>

                <div>
                  <p className="font-semibold mb-1">🧮 Computation on Encrypted Data</p>
                  <p>The smart contract compares your encrypted guess with the encrypted target equation. It can determine if positions match, calculate results, and provide feedback - all while keeping both your guess and the answer completely hidden.</p>
                </div>

                <div>
                  <p className="font-semibold mb-1">✅ Secure Result Verification</p>
                  <p>The contract knows if you won or lost, and can tell you if your result is too high or low, but the actual equations remain encrypted. Even when the game ends, only the win/loss status is revealed.</p>
                </div>

                <div>
                  <p className="font-semibold mb-1">🌐 Transparent Yet Private</p>
                  <p>Everything happens on the public blockchain for transparency and trust, but FHE ensures that sensitive data (your guesses and the target equation) stays completely private throughout the entire process.</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-bold text-green-800 dark:text-green-300 mb-2">
                🎯 Why This Matters
              </h4>
              <div className="text-green-700 dark:text-green-200 space-y-1">
                <p>• <strong>No Strategy Leaking:</strong> Other players can't see your approach</p>
                <p>• <strong>Fair Competition:</strong> The target equation stays hidden from everyone</p>
                <p>• <strong>True Privacy:</strong> Your gameplay patterns remain confidential</p>
                <p>• <strong>Blockchain Security:</strong> All the benefits of decentralization without sacrificing privacy</p>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <h4 className="font-bold text-purple-800 dark:text-purple-300 mb-2">
                🔬 The Technology
              </h4>
              <p className="text-purple-700 dark:text-purple-200">
                FHE is a breakthrough in cryptography that allows computations on encrypted data without ever decrypting it. This game demonstrates real-world FHE applications, showing how we can have both transparency and privacy in decentralized applications.
              </p>
            </div>

            <p className="text-center font-medium">
              Experience the future of privacy-preserving blockchain gaming! 🚀
            </p>
          </div>
        </div>
        <div className="p-6 pt-4">
          <button
            onClick={onClose}
            className="w-full py-2 text-white rounded font-semibold transition-colors duration-200 hover:opacity-80"
            style={{ backgroundColor: "#0AD9DC" }}
          >
            Amazing! Let me play!
          </button>
        </div>
      </div>
    </div>
  );
}