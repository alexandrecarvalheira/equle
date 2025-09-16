"use client";

import React from "react";

export function VirtualKeyboardSkeleton() {
  const renderKey = (
    label: string,
    options?: {
      type?: "enter" | "default";
      aria?: string;
      isBackspace?: boolean;
    }
  ) => {
    const type = options?.type || "default";
    const isBackspace = options?.isBackspace || false;

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

    return (
      <div
        aria-label={options?.aria || label}
        className={`${containerClasses} flex items-center justify-center select-none opacity-80`}
        style={{ color: "#FFFFFF" }}
      >
        <img
          src={svgSrc}
          alt=""
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
        <span className={`relative z-10 ${labelClass}`}>{label}</span>
      </div>
    );
  };

  return (
    <div
      className="relative z-10 p-2 inline-block mx-auto"
      style={{
        backgroundColor: "#021623",
        border: "2px solid #0AD9DC33",
        width: "fit-content",
      }}
    >
      {/* Decorative inner frame that doesn't constrain content */}
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
        <div
          className="flex gap-0 justify-center -space-x-0.5 sm:-space-x-1"
          style={{ flexWrap: "nowrap" }}
        >
          {["0", "1", "2", "3", "4", "+", "-"].map((key) => (
            <React.Fragment key={key}>{renderKey(key)}</React.Fragment>
          ))}
        </div>

        {/* Row 2 */}
        <div
          className="flex gap-0 justify-center -space-x-0.5 sm:-space-x-1"
          style={{ flexWrap: "nowrap" }}
        >
          {["5", "6", "7", "8", "9", "*", "/"].map((key) => (
            <React.Fragment key={key}>{renderKey(key)}</React.Fragment>
          ))}
        </div>

        {/* Row 3 */}
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
          {renderKey("Enter", { type: "enter" })}
          {renderKey("⌫", {
            type: "enter",
            aria: "Backspace",
            isBackspace: true,
          })}
        </div>
      </div>
    </div>
  );
}
