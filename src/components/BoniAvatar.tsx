"use client";

interface BoniAvatarProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export function BoniAvatar({ size = 120, className = "", animate = false }: BoniAvatarProps) {
  return (
    <div
      className={`inline-flex items-center justify-center ${animate ? "boni-float" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/boni.png"
        alt="Boni"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    </div>
  );
}
