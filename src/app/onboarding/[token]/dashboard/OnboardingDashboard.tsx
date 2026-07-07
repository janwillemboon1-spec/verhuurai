"use client";

import { useState } from "react";
import type {
  OnboardingKlant,
  OnboardingChecklistItem,
  OnboardingTodo,
  OnboardingActiviteit,
  OnboardingKpiMeting,
} from "@/lib/onboarding/types";

type Props = {
  klant: OnboardingKlant;
  checklist: OnboardingChecklistItem[];
  todos: OnboardingTodo[];
  activiteiten: OnboardingActiviteit[];
  metingen: OnboardingKpiMeting[];
};

export function OnboardingDashboard({ klant, checklist, todos: todosInit, activiteiten, metingen }: Props) {
  const [todos, setTodos] = useState(todosInit);
  const [bezig, setBezig] = useState<string | null>(null);

  const voltooid = checklist.filter(i => i.voltooid).length;
  const totaal = checklist.length;
  const pct = totaal > 0 ? Math.round((voltooid / totaal) * 100) : 0;

  const openTodos = todos.filter(t => !t.gedaan);
  const gedaanTodos = todos.filter(t => t.gedaan);
  const laatste = metingen[0];

  const groepen = checklist.reduce((acc, item) => {
    if (!acc[item.fase]) acc[item.fase] = [];
    acc[item.fase].push(item);
    return acc;
  }, {} as Record<string, OnboardingChecklistItem[]>);

  async function markeerGedaan(todoId: string) {
    setBezig(todoId);
    const res = await fetch(`/api/onboarding/todos/${todoId}/gedaan`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setTodos(prev => prev.map(t => t.id === todoId ? data.todo : t));
    }
    setBezig(null);
  }

  return (
    <div className="space-y-6">
      {/* Voortgang */}
      <div className="card p-5 text-center">
        <p className="text-xs text-text-secondary mb-3 uppercase tracking-wider">Voortgang onboarding</p>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 bg-border rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${pct >= 80 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-accent"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-bold text-primary text-2xl">{pct}%</span>
        </div>
        <p className="text-sm text-text-secondary">{voltooid} van {totaal} stappen afgerond</p>
      </div>

      {/* To-do's voor jou */}
      {openTodos.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-primary mb-4">Jouw to-do&apos;s</h2>
          <div className="space-y-3">
            {openTodos.map(todo => (
              <div key={todo.id} className="flex items-start gap-3 p-3 bg-surface rounded-xl">
                <div className="flex-1">
                  <p className="text-sm text-primary">{todo.tekst}</p>
                  {todo.deadline && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      Deadline: {new Date(todo.deadline).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => markeerGedaan(todo.id)}
                  disabled={bezig === todo.id}
                  className="btn-primary text-xs shrink-0"
                >
                  {bezig === todo.id ? "..." : "Gedaan ✓"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {gedaanTodos.length > 0 && openTodos.length === 0 && (
        <div className="card p-5 border-success/20">
          <p className="text-sm text-success font-semibold text-center">Alle to-do&apos;s afgerond! Goed gedaan.</p>
        </div>
      )}

      {/* Checklist (read-only) */}
      {checklist.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-primary mb-4">Onboarding stappen</h2>
          <div className="space-y-4">
            {Object.entries(groepen).map(([fase, items]) => (
              <div key={fase}>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{fase}</h3>
                <div className="space-y-1">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${item.voltooid ? "bg-success border-success text-white" : "border-border"}`}>
                        {item.voltooid && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm ${item.voltooid ? "line-through text-text-secondary" : "text-primary"}`}>{item.naam}</span>
                      {item.voltooid_op && (
                        <span className="text-xs text-text-secondary ml-auto">
                          {new Date(item.voltooid_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Laatste KPI's */}
      {laatste && (
        <div className="card p-5">
          <h2 className="font-semibold text-primary mb-3">Jouw resultaten</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Bezetting", waarde: laatste.bezetting != null ? `${laatste.bezetting}%` : null },
              { label: "Gemiddelde dagprijs", waarde: laatste.adr != null ? `€${laatste.adr}` : null },
              { label: "Reviewscore", waarde: laatste.reviewscore != null ? `${laatste.reviewscore}/5` : null },
              { label: "Recensies", waarde: laatste.reviews_aantal != null ? `${laatste.reviews_aantal}` : null },
            ].filter(k => k.waarde !== null).map(({ label, waarde }) => (
              <div key={label} className="bg-surface rounded-xl p-3 text-center">
                <p className="text-xs text-text-secondary mb-1">{label}</p>
                <p className="text-lg font-bold text-primary">{waarde}</p>
              </div>
            ))}
          </div>
          {laatste.omzet_periode_bedrag && (
            <div className="mt-3 bg-success/10 rounded-xl p-3 text-center">
              <p className="text-xs text-text-secondary mb-0.5">Omzet {laatste.omzet_periode_label || ""}</p>
              <p className="text-xl font-bold text-success">€{laatste.omzet_periode_bedrag.toLocaleString("nl-NL")}</p>
            </div>
          )}
        </div>
      )}

      {/* Activiteiten */}
      {activiteiten.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-primary mb-4">Wat we voor je hebben gedaan</h2>
          <div className="space-y-3">
            {activiteiten.slice(0, 10).map(act => (
              <div key={act.id} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-primary">{act.tekst}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(act.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
