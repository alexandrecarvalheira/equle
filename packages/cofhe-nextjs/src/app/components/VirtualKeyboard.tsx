"use client";

import React from "react";

export type KeyFeedback = "correct" | "present" | "absent" | "empty";
export type ProcessingStep =
  | "encrypting"
  | "submitting"
  | "confirming"
  | "decrypting"
  | null;

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

export function VirtualKeyboard({
  onKeyPress,
  isDisabled,
  keyFeedback,
  isProcessingGuess = false,
  processingStep = null,
  currentCol = 0,
  hasAtLeastOneOperation,
  currentInput = "",
}: VirtualKeyboardProps) {
  // SVG keycap renderer
  const renderKey = (
    label: string,
    onClick: () => void,
    options?: { type?: "enter" | "default"; disabled?: boolean; aria?: string }
  ) => {
    const type = options?.type || "default";
    const disabled = options?.disabled || false;
    const isBackspace = options?.aria === "Backspace" || label === "⌫";

    const containerClasses =
      type === "enter"
        ? "w-24 sm:w-32 md:w-40 h-12 sm:h-14 relative"
        : "w-12 sm:w-14 md:w-16 h-12 sm:h-14 relative";

    const svgSrc = type === "enter" ? "/enter_key.svg" : "/number_key.svg";
    const labelClass =
      type === "enter"
        ? isBackspace
          ? "font-visitor1 font-bold text-2xl sm:text-3xl md:text-4xl pb-3"
          : "font-visitor1 uppercase tracking-widest font-bold text-base sm:text-lg md:text-xl"
        : "font-visitor1 font-bold text-2xl sm:text-3xl md:text-4xl pb-3";

    // Determine label color feedback for digits and operators
    let labelColor = "#FFFFFF";
    if (/^[0-9+\-*/]$/.test(label)) {
      const fb = keyFeedback[label] || "empty";
      if (fb === "correct") labelColor = "#1CE07E"; // green
      else if (fb === "present") labelColor = "#eab308"; // yellow
      else if (fb === "absent") labelColor = "#1D4748"; // gray
    }

    return (
      <button
        aria-label={options?.aria || label}
        onClick={onClick}
        disabled={disabled}
        className={`${containerClasses} flex items-center justify-center select-none transition-all duration-75 ${
          disabled
            ? "opacity-60 cursor-not-allowed"
            : "hover:opacity-90 active:opacity-60 active:translate-y-1"
        }`}
        style={{ color: "#FFFFFF" }}
      >
        <img
          src={svgSrc}
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
        <span
          className={`relative z-10 ${labelClass}`}
          style={{ color: labelColor }}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <div
      className="relative z-10 p-2 inline-block mx-auto"
      style={{ backgroundColor: "#021623", border: "2px solid #0AD9DC33" }}
    >
      <div
        aria-hidden
        className="absolute"
        style={{
          top: "26px",
          right: "6px",
          bottom: "6px",
          left: "6px",
          background: "#002033",
          border: "1px solid #0AD9DC33",
          pointerEvents: "none",
        }}
      />
      <div className="relative space-y-0 sm:space-y-1">
        {/* Row 1 */}
        <div className="flex flex-wrap gap-0 justify-center -space-x-0.5 sm:-space-x-1">
          {["0", "1", "2", "3", "4", "+", "-"].map((key) => (
            <React.Fragment key={key}>
              {renderKey(key, () => onKeyPress(key), {
                disabled: isDisabled,
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Row 2 */}
        <div className="flex flex-wrap gap-0 justify-center -space-x-0.5 sm:-space-x-1">
          {["5", "6", "7", "8", "9", "*", "/"].map((key) => (
            <React.Fragment key={key}>
              {renderKey(key, () => onKeyPress(key), {
                disabled: isDisabled,
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Row 3: Enter and Backspace */}
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
          {renderKey("Enter", () => onKeyPress("Enter"), {
            type: "enter",
            disabled: isDisabled,
          })}
          {renderKey("⌫", () => onKeyPress("Backspace"), {
            disabled: isDisabled,
            aria: "Backspace",
            type: "enter",
          })}
        </div>
      </div>
    </div>
  );
}
