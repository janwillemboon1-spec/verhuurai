"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

export function Navbar() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [ingelogd, setIngelogd] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIngelogd(!!user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIngelogd(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl text-primary">
          <span className="text-2xl">🏠</span>
          <span>{t("logo")}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/listing-optimizer" className="text-text-secondary hover:text-primary transition-colors text-sm font-medium">
            {t("listingOptimizer")}
          </Link>
          <Link href="/host-performance" className="text-text-secondary hover:text-primary transition-colors text-sm font-medium">
            {t("reviewMonitor")}
          </Link>
          <Link href="/prijscalculator" className="text-text-secondary hover:text-primary transition-colors text-sm font-medium">
            {t("prijscalculator")}
          </Link>
          <Link href="/gratis" className="text-accent font-semibold text-sm hover:underline">
            {t("gratisProberen")}
          </Link>
          {ingelogd ? (
            <Link href="/dashboard" className="btn-secondary text-sm py-2 px-4">
              {t("mijnDashboard")}
            </Link>
          ) : (
            <Link href="/login" className="btn-secondary text-sm py-2 px-4">
              {t("inloggen")}
            </Link>
          )}
          <Link href="/starten" className="btn-primary text-sm py-2 px-4">
            {t("analyseer")}
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
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-background border-t border-border px-4 py-4 flex flex-col gap-4">
          <Link href="/listing-optimizer" onClick={() => setOpen(false)} className="text-text-secondary font-medium">
            {t("listingOptimizer")}
          </Link>
          <Link href="/host-performance" onClick={() => setOpen(false)} className="text-text-secondary font-medium">
            {t("reviewMonitor")}
          </Link>
          <Link href="/prijscalculator" onClick={() => setOpen(false)} className="text-text-secondary font-medium">
            {t("prijscalculator")}
          </Link>
          <Link href="/gratis" onClick={() => setOpen(false)} className="text-accent font-semibold">
            {t("gratisProberen")}
          </Link>
          {ingelogd ? (
            <Link href="/dashboard" onClick={() => setOpen(false)} className="btn-secondary text-center">
              {t("mijnDashboard")}
            </Link>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)} className="btn-secondary text-center">
              {t("inloggen")}
            </Link>
          )}
          <Link href="/starten" onClick={() => setOpen(false)} className="btn-primary text-center">
            {t("analyseer")}
          </Link>
        </div>
      )}
    </nav>
  );
}
