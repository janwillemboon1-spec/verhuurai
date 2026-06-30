"use client";

interface BoniAvatarProps {
  size?: number;
  className?: string;
  animate?: boolean;
  src?: string;
}

export function BoniAvatar({ size = 120, className = "", animate = false, src = "/boni.png" }: BoniAvatarProps) {
  return (
    <div
      className={`inline-flex items-center justify-center ${animate ? "boni-float" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Boni"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    </div>
  );
}
