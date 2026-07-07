"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NieuweKlantPage() {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [form, setForm] = useState({
    naam: "",
    email: "",
    wachtwoord: "",
    kpi_bezetting_nulmeting: "",
    kpi_adr_nulmeting: "",
    kpi_reviewscore_nulmeting: "",
    kpi_reviews_nulmeting: "",
    extra_omzet_periode: "afgelopen 30 dagen",
  });

  const stuur = async (e: React.FormEvent) => {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/onboarding/klanten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: form.naam,
          email: form.email,
          wachtwoord: form.wachtwoord,
          kpi_bezetting_nulmeting: form.kpi_bezetting_nulmeting ? parseFloat(form.kpi_bezetting_nulmeting) : null,
          kpi_adr_nulmeting: form.kpi_adr_nulmeting ? parseFloat(form.kpi_adr_nulmeting) : null,
          kpi_reviewscore_nulmeting: form.kpi_reviewscore_nulmeting ? parseFloat(form.kpi_reviewscore_nulmeting) : null,
          kpi_reviews_nulmeting: form.kpi_reviews_nulmeting ? parseInt(form.kpi_reviews_nulmeting) : null,
          extra_omzet_periode: form.extra_omzet_periode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aanmaken mislukt");
      router.push(`/admin/onboarding/${data.klant.id}`);
    } catch (err: any) {
      setFout(err.message);
    } finally {
      setBezig(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl text-primary">Nieuwe onboarding klant</h1>
          <Link href="/admin/onboarding" className="btn-secondary text-sm">← Terug</Link>
        </div>

        <form onSubmit={stuur} className="card p-6 space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-primary">Naam woning *</label>
            <input
              className="input w-full"
              placeholder="bijv. Villa De Parel"
              value={form.naam}
              onChange={e => setForm(f => ({ ...f, naam: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-primary">E-mailadres klant *</label>
            <input
              type="email"
              className="input w-full"
              placeholder="klant@email.nl"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-primary">Wachtwoord voor klant *</label>
            <input
              className="input w-full"
              placeholder="Bijv. villa2026"
              value={form.wachtwoord}
              onChange={e => setForm(f => ({ ...f, wachtwoord: e.target.value }))}
              required
              minLength={4}
            />
            <p className="text-xs text-text-secondary">Dit wachtwoord geef je door aan de klant.</p>
          </div>

          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-primary mb-3">KPI nulmeting (optioneel)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-secondary">Bezettingsgraad (%)</label>
                <input
                  type="number"
                  className="input w-full"
                  placeholder="bijv. 62"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.kpi_bezetting_nulmeting}
                  onChange={e => setForm(f => ({ ...f, kpi_bezetting_nulmeting: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-secondary">Gem. dagprijs (ADR) €</label>
                <input
                  type="number"
                  className="input w-full"
                  placeholder="bijv. 89"
                  min="0"
                  step="0.01"
                  value={form.kpi_adr_nulmeting}
                  onChange={e => setForm(f => ({ ...f, kpi_adr_nulmeting: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-secondary">Reviewscore (gem.)</label>
                <input
                  type="number"
                  className="input w-full"
                  placeholder="bijv. 4.6"
                  min="1"
                  max="5"
                  step="0.1"
                  value={form.kpi_reviewscore_nulmeting}
                  onChange={e => setForm(f => ({ ...f, kpi_reviewscore_nulmeting: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-secondary">Aantal reviews</label>
                <input
                  type="number"
                  className="input w-full"
                  placeholder="bijv. 24"
                  min="0"
                  value={form.kpi_reviews_nulmeting}
                  onChange={e => setForm(f => ({ ...f, kpi_reviews_nulmeting: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-primary">Meetperiode extra omzet</label>
            <input
              className="input w-full"
              placeholder="bijv. afgelopen 30 dagen"
              value={form.extra_omzet_periode}
              onChange={e => setForm(f => ({ ...f, extra_omzet_periode: e.target.value }))}
            />
          </div>

          {fout && <p className="text-sm text-danger bg-danger/10 rounded-xl p-3">{fout}</p>}

          <button type="submit" disabled={bezig} className="btn-primary w-full">
            {bezig ? "Aanmaken..." : "Klant aanmaken"}
          </button>
        </form>
      </div>
    </div>
  );
}
