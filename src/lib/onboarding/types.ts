// src/lib/onboarding/types.ts

export type OnboardingKlant = {
  id: string;
  naam: string;
  email: string;
  link_token: string;
  startdatum: string;
  aangemaakt_op: string;
  kpi_bezetting_nulmeting: number | null;
  kpi_adr_nulmeting: number | null;
  kpi_reviewscore_nulmeting: number | null;
  kpi_reviews_nulmeting: number | null;
  extra_omzet_periode: string;
  kpi_omzet_365d_nulmeting?: number | null;
  geen_cijfers_nulmeting?: boolean | null;
  voornaam?: string | null;
  achternaam?: string | null;
  datum_nulmeting?: string | null;
};

export type OnboardingChecklistItem = {
  id: string;
  klant_id: string;
  fase: string;
  naam: string;
  voltooid: boolean;
  voltooid_op: string | null;
  notitie: string | null;
  volgorde: number;
  aangemaakt_op: string;
};

export type OnboardingTodo = {
  id: string;
  klant_id: string;
  tekst: string;
  deadline: string | null;
  gedaan: boolean;
  gedaan_op: string | null;
  aangemaakt_op: string;
};

export type OnboardingActiviteit = {
  id: string;
  klant_id: string;
  tekst: string;
  categorie: "prijs" | "advertentie" | "review" | "overig";
  datum: string;
};

export type OnboardingKpiMeting = {
  id: string;
  klant_id: string;
  datum: string;
  bezetting: number | null;
  adr: number | null;
  reviewscore: number | null;
  reviews_aantal: number | null;
  omzet_periode_bedrag: number | null;
  omzet_periode_label: string | null;
  notitie: string | null;
  omzet_365d?: number | null;
  meting_datum?: string | null;
};
