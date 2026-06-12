export type FotoStatus = "wachtrij" | "verwerking" | "klaar" | "overgeslagen" | "fout";
export type SessieStatus = "betaald" | "verwerking" | "klaar" | "fout";

export type Ruimte =
  | "woonkamer"
  | "keuken"
  | "eetgedeelte"
  | "slaapkamer"
  | "badkamer"
  | "buitenruimte"
  | "exterieur"
  | "overig";

export interface FotoCriteria {
  orientatie: boolean;        // EXIF-rotatie gecorrigeerd
  hoek: boolean;              // perspectief/hoek gecorrigeerd
  compositie: boolean;        // compositie verbeterd
  kleur: boolean;             // kleur & witbalans gecorrigeerd
  rommel: boolean;            // rommel verwijderd
  belichting: boolean;        // belichting gecorrigeerd
  rimpels: boolean;           // rimpels beddengoed gladgemaakt
  enscenering: boolean;       // staging/accessoires toegevoegd
  opschaling: boolean;        // upscaled
  lucht: boolean;             // lucht blauw gemaakt
}

export interface FotoBewerking {
  id: string;
  sessieId: string;
  volgnummer: number;
  ruimte: Ruimte | null;
  origineelPad: string | null;
  bewerktPad: string | null;
  origineelUrl: string | null;
  bewerktUrl: string | null;
  status: FotoStatus;
  overslaanReden: string | null;
  criteria: FotoCriteria | null;
  aangemaaktOp: string;
  klaarOp: string | null;
}

export interface FotoSessie {
  id: string;
  naam: string;
  email: string;
  userId: string | null;
  status: SessieStatus;
  aantalFotos: number;
  totaalPrijs: number;
  stripeSessionId: string | null;
  zipUrl: string | null;
  aangemaaktOp: string;
  klaarOp: string | null;
  bewerkingen?: FotoBewerking[];
}

// In-memory voortgang voor SSE (wordt gewist bij server restart)
export interface FotoVoortgang {
  sessieId: string;
  totaal: number;
  klaar: number;
  overgeslagen: number;
  fout: number;
  huidigeFoto: number | null;
  status: SessieStatus;
}
