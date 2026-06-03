"use client";

import Link from "next/link";
import { useState } from "react";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl text-primary">
          <span className="text-2xl">🏠</span>
          <span>VerhuurAI</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/#hoe-het-werkt" className="text-text-secondary hover:text-primary transition-colors text-sm font-medium">
            Hoe het werkt
          </Link>
          <Link href="/#prijzen" className="text-text-secondary hover:text-primary transition-colors text-sm font-medium">
            Prijzen
          </Link>
          <Link href="/#faq" className="text-text-secondary hover:text-primary transition-colors text-sm font-medium">
            FAQ
          </Link>
          <Link
            href="/gratis"
            className="text-accent font-semibold text-sm hover:underline"
          >
            Gratis proberen
          </Link>
          <Link href="/starten" className="btn-primary text-sm py-2 px-4">
            Analyseer mijn advertentie
          </Link>
        </div>

        {/* Mobile menu knop */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-primary"
          aria-label="Menu"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            ) : (
              <>
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-background border-t border-border px-4 py-4 flex flex-col gap-4">
          <Link href="/#hoe-het-werkt" onClick={() => setOpen(false)} className="text-text-secondary font-medium">
            Hoe het werkt
          </Link>
          <Link href="/#prijzen" onClick={() => setOpen(false)} className="text-text-secondary font-medium">
            Prijzen
          </Link>
          <Link href="/#faq" onClick={() => setOpen(false)} className="text-text-secondary font-medium">
            FAQ
          </Link>
          <Link href="/gratis" onClick={() => setOpen(false)} className="text-accent font-semibold">
            Gratis proberen
          </Link>
          <Link href="/starten" onClick={() => setOpen(false)} className="btn-primary text-center">
            Analyseer mijn advertentie
          </Link>
        </div>
      )}
    </nav>
  );
}
