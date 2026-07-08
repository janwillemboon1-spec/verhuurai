"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export function WachtwoordForm({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const resetSucces = searchParams.get("reset") === "1";

  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [resetVerzonden, setResetVerzonden] = useState(false);
  const [resetBezig, setResetBezig] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    const res = await fetch(`/api/onboarding/auth/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wachtwoord }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const data = await res.json();
      setFout(data.error || "Onjuist wachtwoord");
      setBezig(false);
    }
  }

  async function vraagReset() {
    setResetBezig(true);
    await fetch(`/api/onboarding/auth/${token}/reset-aanvragen`, { method: "POST" });
    setResetVerzonden(true);
    setResetBezig(false);
  }

  if (resetSucces) {
    return (
      <div className="space-y-4">
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center">
          <p className="text-success font-semibold text-sm">Wachtwoord succesvol gewijzigd!</p>
          <p className="text-xs text-text-secondary mt-1">Log in met je nieuwe wachtwoord.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary block mb-1">Wachtwoord</label>
            <input
              type="password"
              className="input w-full"
              value={wachtwoord}
              onChange={e => setWachtwoord(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
            />
          </div>
          {fout && <p className="text-sm text-danger bg-danger/10 rounded-xl px-3 py-2">{fout}</p>}
          <button type="submit" disabled={bezig} className="btn-primary w-full">
            {bezig ? "Controleren..." : "Inloggen"}
          </button>
        </form>
      </div>
    );
  }

  if (resetVerzonden) {
    return (
      <div className="bg-surface rounded-xl p-5 text-center space-y-2">
        <p className="text-primary font-semibold">Check je e-mail</p>
        <p className="text-sm text-text-secondary">
          We hebben een link gestuurd waarmee je een nieuw wachtwoord kunt instellen. De link is 1 uur geldig.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-sm text-text-secondary block mb-1">Wachtwoord</label>
        <input
          type="password"
          className="input w-full"
          value={wachtwoord}
          onChange={e => setWachtwoord(e.target.value)}
          placeholder="••••••••"
          required
          autoFocus
        />
      </div>
      {fout && (
        <p className="text-sm text-danger bg-danger/10 rounded-xl px-3 py-2">{fout}</p>
      )}
      <button type="submit" disabled={bezig} className="btn-primary w-full">
        {bezig ? "Controleren..." : "Inloggen"}
      </button>
      <div className="text-center">
        <button
          type="button"
          onClick={vraagReset}
          disabled={resetBezig}
          className="text-xs text-text-secondary hover:text-accent underline"
        >
          {resetBezig ? "Versturen..." : "Wachtwoord vergeten?"}
        </button>
      </div>
    </form>
  );
}
