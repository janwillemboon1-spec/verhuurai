"use client";

import { useState } from "react";

export function WachtwoordForm({ token }: { token: string }) {
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

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
    </form>
  );
}
