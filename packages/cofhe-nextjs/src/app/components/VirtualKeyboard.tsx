"use client";

import React from "react";

export type KeyFeedback = "correct" | "present" | "absent" | "empty";
export type ProcessingStep = "encrypting" | "submitting" | "confirming" | null;

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  isDisabled: boolean;
  keyFeedback: Record<string, KeyFeedback>;
  isProcessingGuess?: boolean;
  processingStep?: ProcessingStep;
  currentCol?: number;
  hasAtLeastOneOperation?: (input: string) => boolean;
  currentInput?: string;
}

export const VirtualKeyboard = React.memo(function VirtualKeyboard({
  onKeyPress,
  isDisabled,
  keyFeedback,
  isProcessingGuess = false,
  processingStep = null,
  currentCol = 0,
  hasAtLeastOneOperation,
  currentInput = "",
}: VirtualKeyboardProps) {
  const getKeyStyle = (key: string) => {
    const baseClass =
      "w-8 h-10 rounded text-sm font-semibold transition-colors duration-200";
    const feedback = keyFeedback[key] || "empty";

    let backgroundColor: string;
    let textColor: string;

    switch (feedback) {
      case "correct":
        backgroundColor = "#10b981"; // Green (matches grid tiles)
        textColor = "white";
        break;
      case "present":
        backgroundColor = "#eab308"; // Yellow (matches grid tiles)
        textColor = "white";
        break;
      case "absent":
        backgroundColor = "#6b7280"; // Gray (matches grid tiles)
        textColor = "white";
        break;
      default: // "empty"
        backgroundColor = "#9ca3af"; // Light gray (default)
        textColor = "white";
        break;
    }

    return {
      className: `${baseClass} ${
        isDisabled ? "opacity-50 cursor-not-allowed" : ""
      }`,
      style: {
        backgroundColor,
        color: textColor,
      },
    };
  };

  return (
    <div className="space-y-2 relative z-10">
      {/* Number keys */}
      <div className="flex gap-1 justify-center">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((key) => {
          const { className, style } = getKeyStyle(key);
          return (
            <button
              key={key}
              onClick={() => onKeyPress(key)}
              disabled={isDisabled}
              className={className}
              style={style}
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Operator keys */}
      <div className="flex gap-1 justify-center">
        {["+", "-", "*", "/"].map((key) => {
          const { className, style } = getKeyStyle(key);
          return (
            <button
              key={key}
              onClick={() => onKeyPress(key)}
              disabled={isDisabled}
              className={className}
              style={style}
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Action keys */}
      <div className="flex gap-2 justify-center mt-4">
        <button
          onClick={() => onKeyPress("Enter")}
          disabled={isDisabled}
          className={`px-6 py-3 text-white rounded font-semibold transition-all duration-300 relative ${
            isDisabled ? "opacity-60 cursor-not-allowed" : "hover:opacity-80"
          }`}
          style={{ backgroundColor: "#0AD9DC" }}
        >
          {isProcessingGuess ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>
                {processingStep === "encrypting" && "Encrypting..."}
                {processingStep === "submitting" && "Submitting..."}
                {processingStep === "confirming" && "Confirming..."}
                {!processingStep && "Processing..."}
              </span>
            </div>
          ) : (
            <>
              {currentCol === 5 && hasAtLeastOneOperation?.(currentInput)
                ? "Submit Guess"
                : "Enter"}
            </>
          )}
        </button>
        <button
          onClick={() => onKeyPress("Backspace")}
          disabled={isDisabled}
          className={`px-4 py-2 bg-gray-500 text-white rounded font-semibold transition-colors duration-200 ${
            isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-600"
          }`}
        >
          ⌫
        </button>
      </div>
    </div>
  );
});
