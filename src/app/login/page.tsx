"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BoniAvatar } from "@/components/BoniAvatar";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stap, setStap] = useState<"email" | "code">("email");
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const stuurCode = async () => {
    if (!email.includes("@")) return;
    setLaden(true);
    setFout(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    if (error) {
      setFout(`Fout: ${error.message}`);
    } else {
      setStap("code");
    }
    setLaden(false);
  };

  const verifieerCode = async () => {
    if (code.length < 4) return;
    setLaden(true);
    setFout(null);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setFout(`Ongeldige code: ${error.message}`);
      setLaden(false);
    } else {
      router.replace("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <BoniAvatar size={80} className="mx-auto mb-4" />
          <h1 className="font-display text-3xl text-primary mb-2">Inloggen</h1>
          <p className="text-text-secondary">
            {stap === "email"
              ? "Vul je e-mailadres in — we sturen je een inlogcode."
              : `We hebben een 6-cijferige code gestuurd naar ${email}.`}
          </p>
        </div>

        <div className="card p-6 md:p-8 space-y-5">
          {stap === "email" ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-primary mb-1.5">
                  E-mailadres
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && stuurCode()}
                  placeholder="jij@voorbeeld.nl"
                  className="input"
                  autoFocus
                />
              </div>

              {fout && (
                <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-danger text-sm">
                  {fout}
                </div>
              )}

              <button
                onClick={stuurCode}
                disabled={!email.includes("@") || laden}
                className={`btn-primary w-full flex items-center justify-center gap-2 ${
                  !email.includes("@") || laden ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                {laden ? "Versturen..." : "Stuur inlogcode →"}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-primary mb-1.5">
                  Inlogcode uit je email
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.trim())}
                  onKeyDown={(e) => e.key === "Enter" && verifieerCode()}
                  placeholder="Vul je code in"
                  className="input text-center font-mono text-2xl tracking-widest"
                  autoFocus
                />
                <p className="text-xs text-text-secondary mt-1">
                  Check ook je spammap. De code is 10 minuten geldig.
                </p>
              </div>

              {fout && (
                <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-danger text-sm">
                  {fout}
                </div>
              )}

              <button
                onClick={verifieerCode}
                disabled={code.length < 4 || laden}
                className={`btn-primary w-full flex items-center justify-center gap-2 ${
                  code.length < 6 || laden ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                {laden ? "Controleren..." : "Inloggen →"}
              </button>

              <button
                onClick={() => { setStap("email"); setCode(""); setFout(null); }}
                className="btn-secondary w-full text-sm"
              >
                ← Ander e-mailadres gebruiken
              </button>
            </>
          )}

          <p className="text-xs text-text-secondary text-center">
            Nog geen account?{" "}
            <Link href="/review-monitor" className="text-accent underline">
              Start hier met de Review Monitor
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
