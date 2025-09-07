"use client";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className="rounded-lg max-w-md w-full max-h-[90vh] flex flex-col"
        style={{ backgroundColor: "#122531" }}
      >
        <div className="p-6 pb-0">
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            How to Play
          </h3>
        </div>
        <div className="px-6 overflow-y-auto flex-1">
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              • Find the exact 5-character mathematical expression in 6
              tries
            </p>
            <p>• You must match the exact equation, not just the result</p>
            <p>• Each guess must be valid (no = sign, use +, -, *, /)</p>
            <p>
              • <strong>Important:</strong> Math is evaluated left-to-right
              (6+4*2 = 20, not 14)
            </p>
            <p>• Two types of clues help you:</p>

            <div className="ml-4">
              <p className="font-semibold mb-1">
                1. Tile Colors (Position Clues):
              </p>
              <div className="space-y-1 ml-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded"></div>
                  <span>Green: Right digit/operator in right position</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                  <span>
                    Yellow: Right digit/operator in wrong position
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-500 rounded"></div>
                  <span>Gray: Not in the target equation</span>
                </div>
              </div>

              <p className="font-semibold mt-3 mb-1">
                2. Result Feedback (Math Clues):
              </p>
              <div className="ml-2 space-y-2">
                <p>• After each guess, check the result tile for hints:</p>
                <div className="space-y-1 ml-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">
                      ✓
                    </div>
                    <span>Green: Your result matches exactly!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 border rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{
                        backgroundColor: "#0AD9DC",
                        borderColor: "#0AD9DC",
                      }}
                    >
                      ↑
                    </div>
                    <span>
                      Blue with ↑: Your result is too low (aim higher)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-100 border border-red-300 rounded flex items-center justify-center text-red-800 text-xs font-bold">
                      ↓
                    </div>
                    <span>
                      Red with ↓: Your result is too high (aim lower)
                    </span>
                  </div>
                </div>
                <p className="mt-2">
                  <strong>Example:</strong> If target result is 15 and you
                  guess "2*3+4" = 10 (left-to-right: 2*3=6, then 6+4=10),
                  you'll see a blue tile with ↑ (too low)
                </p>
              </div>
            </div>

            <p>• Win by finding the exact equation structure!</p>
          </div>
        </div>
        <div className="p-6 pt-4">
          <button
            onClick={onClose}
            className="w-full py-2 text-white rounded font-semibold transition-colors duration-200 hover:opacity-80"
            style={{ backgroundColor: "#0AD9DC" }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}