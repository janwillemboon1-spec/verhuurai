import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-primary text-white/80 py-12 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo + tagline */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2 font-display font-bold text-xl text-white">
              <span>🏠</span>
              <span>Host Boni</span>
            </div>
            <p className="text-sm text-white/50">
              Jouw advertentie geoptimaliseerd door Boni.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-6 text-sm justify-center">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/algemene-voorwaarden" className="hover:text-white transition-colors">
              Algemene voorwaarden
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Host Boni — Alle rechten voorbehouden
        </div>
      </div>
    </footer>
  );
}
