"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

export function Navbar() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [gratisOpen, setGratisOpen] = useState(false);
  const [ingelogd, setIngelogd] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setGratisOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl text-primary">
          <img src="/boni.png" alt="Boni" className="w-8 h-8 object-contain" />
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
          <Link href="/photo-optimizer" className="text-text-secondary hover:text-primary transition-colors text-sm font-medium">
            {t("photoOptimizer")}
          </Link>

          {/* Gratis tools dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setGratisOpen(!gratisOpen)}
              className="flex items-center gap-1 text-text-secondary hover:text-primary transition-colors text-sm font-medium"
            >
              {t("gratisTools")}
              <svg
                width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"
                viewBox="0 0 24 24"
                className={`transition-transform duration-200 ${gratisOpen ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {gratisOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-background border border-border rounded-xl shadow-lg py-1 z-50">
                <Link
                  href="/prijscalculator"
                  onClick={() => setGratisOpen(false)}
                  className="block px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  {t("prijscalculator")}
                </Link>
                <Link
                  href="/review-remover"
                  onClick={() => setGratisOpen(false)}
                  className="block px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  {t("reviewRemover")}
                </Link>
                <Link
                  href="/gratis"
                  onClick={() => setGratisOpen(false)}
                  className="block px-4 py-2.5 text-sm text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  {t("titelOptimalisatie")}
                </Link>
              </div>
            )}
          </div>

          {ingelogd ? (
            <Link href="/dashboard" className="btn-secondary text-sm py-2 px-4">
              {t("mijnDashboard")}
            </Link>
          ) : (
            <Link href="/login" className="btn-secondary text-sm py-2 px-4">
              {t("inloggen")}
            </Link>
          )}
          <Link href="/community" className="btn-primary text-sm py-2 px-4">
            {t("community")}
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
          <Link href="/photo-optimizer" onClick={() => setOpen(false)} className="text-text-secondary font-medium">
            {t("photoOptimizer")}
          </Link>

          {/* Gratis tools submenu mobiel */}
          <div>
            <button
              onClick={() => setGratisOpen(!gratisOpen)}
              className="flex items-center justify-between w-full text-text-secondary font-medium"
            >
              {t("gratisTools")}
              <svg
                width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
                viewBox="0 0 24 24"
                className={`transition-transform duration-200 ${gratisOpen ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {gratisOpen && (
              <div className="pl-4 mt-3 flex flex-col gap-3 border-l border-border ml-1">
                <Link
                  href="/prijscalculator"
                  onClick={() => { setOpen(false); setGratisOpen(false); }}
                  className="text-text-secondary text-sm hover:text-primary transition-colors"
                >
                  {t("prijscalculator")}
                </Link>
                <Link
                  href="/review-remover"
                  onClick={() => { setOpen(false); setGratisOpen(false); }}
                  className="text-text-secondary text-sm hover:text-primary transition-colors"
                >
                  {t("reviewRemover")}
                </Link>
                <Link
                  href="/gratis"
                  onClick={() => { setOpen(false); setGratisOpen(false); }}
                  className="text-text-secondary text-sm hover:text-primary transition-colors"
                >
                  {t("titelOptimalisatie")}
                </Link>
              </div>
            )}
          </div>

          {ingelogd ? (
            <Link href="/dashboard" onClick={() => setOpen(false)} className="btn-secondary text-center">
              {t("mijnDashboard")}
            </Link>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)} className="btn-secondary text-center">
              {t("inloggen")}
            </Link>
          )}
          <Link href="/community" onClick={() => setOpen(false)} className="btn-primary text-center">
            {t("community")}
          </Link>
        </div>
      )}
    </nav>
  );
}
