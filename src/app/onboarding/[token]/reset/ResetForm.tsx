"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetForm({ token, rt }: { token: string; rt: string }) {
  const router = useRouter();
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestig, setBevestig] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (wachtwoord !== bevestig) {
      setFout("Wachtwoorden komen niet overeen");
      return;
    }
    if (wachtwoord.length < 4) {
      setFout("Wachtwoord moet minimaal 4 tekens zijn");
      return;
    }
    setBezig(true);
    setFout(null);
    const res = await fetch(`/api/onboarding/auth/${token}/reset-uitvoeren`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rt, nieuwWachtwoord: wachtwoord }),
    });
    if (res.ok) {
      router.push(`/onboarding/${token}?reset=1`);
    } else {
      const data = await res.json();
      setFout(data.error || "Er ging iets mis");
      setBezig(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-sm text-text-secondary block mb-1">Nieuw wachtwoord</label>
        <input
          type="password"
          className="input w-full"
          value={wachtwoord}
          onChange={e => setWachtwoord(e.target.value)}
          placeholder="Minimaal 4 tekens"
          required
          minLength={4}
          autoFocus
        />
      </div>
      <div>
        <label className="text-sm text-text-secondary block mb-1">Bevestig wachtwoord</label>
        <input
          type="password"
          className="input w-full"
          value={bevestig}
          onChange={e => setBevestig(e.target.value)}
          placeholder="Herhaal wachtwoord"
          required
        />
      </div>
      {fout && <p className="text-sm text-danger bg-danger/10 rounded-xl px-3 py-2">{fout}</p>}
      <button type="submit" disabled={bezig} className="btn-primary w-full">
        {bezig ? "Opslaan..." : "Wachtwoord opslaan"}
      </button>
    </form>
  );
}
