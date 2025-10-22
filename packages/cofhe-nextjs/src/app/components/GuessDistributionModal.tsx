"use client";

interface GuessDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  distribution: number[];
  totalWins?: number;
}

export function GuessDistributionModal({
  isOpen,
  onClose,
  distribution,
  totalWins,
}: GuessDistributionModalProps) {
  if (!isOpen) return null;

  const total =
    typeof totalWins === "number" && totalWins > 0
      ? totalWins
      : distribution.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

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
              Guess Distribution
            </div>

            <div className="space-y-2">
              {distribution.map((count, idx) => {
                const pct =
                  total > 0
                    ? Math.min(100, Math.max(0, (count / total) * 100))
                    : 0;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-4 text-[10px] sm:text-xs text-gray-300 font-visitor1 text-right">
                      {idx + 1}
                    </div>
                    <div
                      className="flex-1 h-5 rounded overflow-hidden"
                      style={{
                        backgroundColor: "#0AD9DC22",
                        border: "1px solid #0AD9DC44",
                      }}
                    >
                      <div
                        className="h-full"
                        style={{
                          width: `${pct}%`,
                          background:
                            "linear-gradient(90deg, #0AD9DC 0%, #1DCAD6 100%)",
                        }}
                      />
                    </div>
                    <div className="w-10 text-[10px] sm:text-xs text-gray-300 font-visitor1 text-right">
                      {Math.round(pct)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="p-5 pt-4">
          <button
            onClick={onClose}
            className="w-full py-2 bg-white text-black uppercase tracking-widest flex items-center justify-center gap-2 font-bold"
          >
            <span>Close</span>
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
