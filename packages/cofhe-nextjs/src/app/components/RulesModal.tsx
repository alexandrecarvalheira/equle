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
        style={{ backgroundColor: "#001623" }}
      >
        <div className="px-5 py-4 overflow-y-auto flex-1 text-white uppercase tracking-widest font-mono">
          <div className="space-y-4">
            <div className="font-visitor1 uppercase tracking-widest text-xs text-gray-300 opacity-50 flex items-center gap-2">
              <img src="/button_icon.svg" alt="icon" className="w-3 h-3" />
              Your goal
            </div>
            <p className="text-sm">
              Guess the exact 5-character math equation in 6 tries.
            </p>

            <div className="border-t border-b border-dotted border-cyan-400/60 my-2" />

            <div className="font-visitor1 uppercase tracking-widest text-xs text-gray-300 opacity-50 flex items-center gap-2">
              <img src="/button_icon.svg" alt="icon" className="w-3 h-3" />
              Rules
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <img src="/button_icon.svg" className="w-3 h-3 mt-1" alt="" />
                Your guess must be a valid equation (e.g., 3+4*2).
              </li>
              <li className="flex gap-2">
                <img src="/button_icon.svg" className="w-3 h-3 mt-1" alt="" />
                Use only numbers (0–9) and operators: + – * /
              </li>
              <li className="flex gap-2">
                <img src="/button_icon.svg" className="w-3 h-3 mt-1" alt="" />
                Do NOT include an equals sign =.
              </li>
              <li className="flex gap-2">
                <img src="/button_icon.svg" className="w-3 h-3 mt-1" alt="" />
                The game reads math left to right — not by traditional order of
                operations.
              </li>
              <li className="pl-5 text-gray-300">
                Example: 6+4*2 = 10*2 = 20 (not 14)
              </li>
            </ul>

            <div className="border-t border-b border-dotted border-cyan-400/60 my-2" />

            <div className="font-visitor1 uppercase tracking-widest text-xs text-gray-300 opacity-50 flex items-center gap-2">
              <img src="/button_icon.svg" alt="icon" className="w-3 h-3" />
              Clues you get
            </div>
            <p className="text-sm">Tile Colors = Position Clues</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 inline-block" />
                Green: Right digit/operator in right position
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-500 inline-block" />
                Yellow: Right digit/operator in wrong position
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-500 inline-block" />
                Gray: Not in the target equation
              </li>
            </ul>
            <p className="text-sm mt-2">
              After each guess, tiles tell you how close you are:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>Green Check: Your
                result is exactly correct!
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">↑</span>Blue ↑: Your result is
                too low
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-400">↓</span>Red ↓: Your result is too
                high
              </li>
            </ul>

            <div className="border-t border-b border-dotted border-cyan-400/60 my-2" />

            <div className="font-visitor1 uppercase tracking-widest text-xs text-gray-300 opacity-50 flex items-center gap-2">
              <img src="/button_icon.svg" alt="icon" className="w-3 h-3" />
              Example
            </div>
            <div className="space-y-1 text-sm">
              <p>Target = 15</p>
              <p>You guess 2*3+4</p>
              <p>Evaluates as 2*3 = 6, then 6+4 = 10</p>
              <div>
                You’ll see{" "}
                <span className="text-cyan-400 font-semibold">
                  Your result is too low
                </span>
              </div>
            </div>

            <div className="border-t border-b border-dotted border-cyan-400/60 my-2" />

            <p className="text-sm uppercase tracking-widest">
              Win by guessing the exact equation, both structure and result!
            </p>
          </div>
        </div>
        <div className="p-5 pt-4">
          <button
            onClick={onClose}
            className="w-full py-2 bg-white text-black uppercase tracking-widest flex items-center justify-center gap-2 font-bold"
          >
            <span>Got it</span>
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
