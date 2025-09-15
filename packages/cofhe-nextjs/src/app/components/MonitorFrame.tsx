"use client";

import React from "react";

type Insets = { top: number; right: number; bottom: number; left: number };

export function MonitorFrame({
  children,
  src = "/monitorframe.svg",
  aspect = "16 / 13",
  screenInsets = { top: 6, right: 6, bottom: 10, left: 6 },
}: {
  children: React.ReactNode;
  src?: string;
  aspect?: string;
  screenInsets?: Insets;
}) {
  return (
    <div
      className="relative w-full max-w-4xl mx-auto"
      style={{
        aspectRatio: aspect,
        backgroundImage: `url('${src}')`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
        backgroundPosition: "center",
      }}
    >
      <div
        className="absolute overflow-hidden m-6"
        style={{
          top: `${screenInsets.top}%`,
          right: `${screenInsets.right}%`,
          bottom: `${screenInsets.bottom}%`,
          left: `${screenInsets.left}%`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
