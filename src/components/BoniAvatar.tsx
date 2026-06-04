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

        {/* ── HAAR ACHTERLAAG (geeft volume en diepte) ── */}
        {/* Links buiten — valt ruim langs oor */}
        <path d="M34 50 C29 56 28 66 30 76 C33 83 40 84 44 80 C42 72 40 60 40 50 Z" fill="#B8901E" />
        {/* Rechts buiten */}
        <path d="M86 50 C91 56 92 66 90 76 C87 83 80 84 76 80 C78 72 80 60 80 50 Z" fill="#B8901E" />

        {/* ── HAAR HOOFDVOLUME ZIJKANTEN ── */}
        {/* Links — dik, valt langs kaak */}
        <path d="M38 50 C35 56 35 66 37 74 C39 79 45 80 48 76 C46 68 44 56 44 48 Z" fill="#D4A843" />
        {/* Rechts */}
        <path d="M82 50 C85 56 85 66 83 74 C81 79 75 80 72 76 C74 68 76 56 76 48 Z" fill="#D4A843" />

        {/* ── HAAR BOVENKANT (grote platte massa) ── */}
        <path d="M38 50 C40 40 48 34 60 33 C72 34 80 40 82 50 C78 54 70 56 60 56 C50 56 42 54 38 50 Z" fill="#D4A843" />

        {/* ── KUIF LINKS (grote golf, sweept omhoog-links) ── */}
        <path d="M44 46 C40 38 37 26 43 18 C48 22 50 34 50 44 Z" fill="#C8960C" />
        <path d="M50 44 C48 36 46 26 43 18 C47 20 52 30 53 42 Z" fill="#D4A843" />
        <path d="M43 18 C47 24 50 34 51 44" stroke="#E8C050" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />

        {/* ── KUIF RECHTS (golf, sweept omhoog) ── */}
        <path d="M76 46 C80 38 83 26 77 18 C72 22 70 34 70 44 Z" fill="#C8960C" />
        <path d="M70 44 C72 36 74 26 77 18 C73 20 68 30 67 42 Z" fill="#D4A843" />
        <path d="M77 18 C73 24 70 34 69 44" stroke="#E8C050" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />

        {/* Haar highlights links */}
        <path d="M40 52 C41 62 42 70 43 76" stroke="#E8C860" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
        {/* Haar highlights rechts */}
        <path d="M80 52 C79 62 78 70 77 76" stroke="#E8C860" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />

        {/* ── KROONTJE ── */}
        <path
          d="M44 22 L48 13 L54 20 L60 10 L66 20 L72 13 L76 22"
          stroke="#FFD700"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="48" cy="13" r="2.5" fill="#FFD700" />
        <circle cx="60" cy="10" r="3" fill="#FFD700" />
        <circle cx="72" cy="13" r="2.5" fill="#FFD700" />

        {/* ── GEZICHT ── */}
        <ellipse cx="60" cy="63" rx="22" ry="24" fill="#FDDBB4" />

        {/* Ogen */}
        <ellipse cx="51" cy="57" rx="3.5" ry="4" fill="#1B2B4B" />
        <ellipse cx="69" cy="57" rx="3.5" ry="4" fill="#1B2B4B" />
        <circle cx="52.5" cy="55.5" r="1.5" fill="white" />
        <circle cx="70.5" cy="55.5" r="1.5" fill="white" />

        {/* Wenkbrauwen — mannelijk, iets dikker */}
        <path d="M46 51 Q51 48 56 51" stroke="#8B6914" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M64 51 Q69 48 74 51" stroke="#8B6914" strokeWidth="2.2" strokeLinecap="round" fill="none" />

        {/* Neus */}
        <path d="M59 62 Q57 66 60 67 Q63 66 61 62" fill="#F0A070" opacity="0.5" />

        {/* Mond — zelfverzekerde glimlach */}
        <path d="M52 73 Q56 79 60 79 Q64 79 68 73" stroke="#C4883A" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M53 73 Q57 77 60 77 Q63 77 67 73" fill="#FF9B8A" opacity="0.4" />

        {/* Wangen */}
        <ellipse cx="46" cy="69" rx="6" ry="4" fill="#FFB3A0" opacity="0.35" />
        <ellipse cx="74" cy="69" rx="6" ry="4" fill="#FFB3A0" opacity="0.35" />

        {/* Nek */}
        <rect x="53" y="86" width="14" height="8" rx="2" fill="#FDDBB4" />

        {/* Outfit */}
        <path d="M18 120 Q28 94 60 91 Q92 94 102 120" fill="#1B2B4B" />

        {/* ── GOUDEN KETTING ── */}
        {/* Bovenste boog */}
        <path d="M40 96 Q50 104 60 105 Q70 104 80 96" stroke="#D4A843" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Onderste boog (glans) */}
        <path d="M44 98 Q52 106 60 107 Q68 106 76 98" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.85" />
        {/* Hanger */}
        <circle cx="60" cy="109" r="3.5" fill="#D4A843" />
        <circle cx="60" cy="109" r="2" fill="#FFD700" />
      </svg>
    </div>
  );
}
