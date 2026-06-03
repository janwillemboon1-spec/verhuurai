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
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
      >
        {/* Achtergrondcirkel */}
        <circle cx="60" cy="60" r="58" fill="#FFF8F0" stroke="#E8E4DF" strokeWidth="1" />

        {/* Haar — halflang, blond, tot onder de oren */}
        {/* Haar massa achter hoofd (links) */}
        <ellipse cx="28" cy="58" rx="12" ry="20" fill="#D4A843" />
        {/* Haar massa achter hoofd (rechts) */}
        <ellipse cx="92" cy="58" rx="12" ry="20" fill="#D4A843" />
        {/* Haar boven hoofd */}
        <ellipse cx="60" cy="36" rx="26" ry="18" fill="#D4A843" />
        {/* Zij-haar links — valt tot onder oor */}
        <ellipse cx="34" cy="62" rx="9" ry="18" fill="#C8A030" />
        {/* Zij-haar rechts — valt tot onder oor */}
        <ellipse cx="86" cy="62" rx="9" ry="18" fill="#C8A030" />
        {/* Haarlokken boven */}
        <path d="M38 44 C34 38 36 30 44 28" stroke="#BF9828" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M82 44 C86 38 84 30 76 28" stroke="#BF9828" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Gezicht */}
        <ellipse cx="60" cy="62" rx="24" ry="26" fill="#FDDBB4" />

        {/* Ogen */}
        <ellipse cx="51" cy="56" rx="4" ry="4.5" fill="#1B2B4B" />
        <ellipse cx="69" cy="56" rx="4" ry="4.5" fill="#1B2B4B" />
        <circle cx="53" cy="54.5" r="1.5" fill="white" />
        <circle cx="71" cy="54.5" r="1.5" fill="white" />

        {/* Wenkbrauwen */}
        <path d="M46 50 Q51 47 56 50" stroke="#C4883A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M64 50 Q69 47 74 50" stroke="#C4883A" strokeWidth="1.5" strokeLinecap="round" fill="none" />

        {/* Neus */}
        <path d="M59 61 Q57 65 60 66 Q63 65 61 61" fill="#F0A070" opacity="0.5" />

        {/* Mond */}
        <path d="M50 72 Q55 78 60 78 Q65 78 70 72" stroke="#C4883A" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M52 72 Q56 76 60 76 Q64 76 68 72" fill="#FF9B8A" opacity="0.4" />

        {/* Wangen */}
        <ellipse cx="46" cy="68" rx="6" ry="4" fill="#FFB3A0" opacity="0.4" />
        <ellipse cx="74" cy="68" rx="6" ry="4" fill="#FFB3A0" opacity="0.4" />

        {/* Kroon/gouden detail */}
        <path
          d="M44 38 L48 30 L54 35 L60 26 L66 35 L72 30 L76 38"
          stroke="#D4A843"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="48" cy="30" r="2.5" fill="#D4A843" />
        <circle cx="60" cy="26" r="3" fill="#D4A843" />
        <circle cx="72" cy="30" r="2.5" fill="#D4A843" />

        {/* Nek & schouders */}
        <rect x="52" y="86" width="16" height="10" rx="4" fill="#FDDBB4" />
        <path d="M20 120 Q30 95 60 92 Q90 95 100 120" fill="#1B2B4B" />

        {/* Gouden details op kleding */}
        <path d="M54 96 L60 100 L66 96" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}
