# Kosten per maand aanpasbaar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kostenposten met `frequentie = 'maandelijks'` (bv. Hostaway, Pricelabs) krijgen een los bedrag per maand, zodat een prijsverhoging alleen toekomstige maanden raakt en historische maanden hun oude, kloppende bedrag behouden.

**Architecture:** `cockpit_fin_kosten` krijgt 12 nieuwe kolommen (`jan`...`dec`), naar het patroon van `cockpit_fin_overig`. De berekeningslogica (backend én frontend) leest voor `maandelijks`-posten voortaan die kolommen i.p.v. één `bedrag` over een `van_maand`–`tot_maand`-bereik. De bewerk-modal toont voor `maandelijks`-posten een grid van 12 invoervelden i.p.v. "Vanaf/tot maand".

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (Postgres). Geen testframework in dit project — verificatie gebeurt via `npm run build` (TypeScript type-check) en handmatige verificatie in de browser/Supabase SQL editor, zoals de rest van de codebase dat al doet.

**Context voor de engineer:** Dit is Boni's Cockpit, een intern Next.js-dashboard voor een vakantieverhuurbedrijf. Database-migraties worden niet automatisch uitgevoerd — ze worden als los `.sql`-bestand in `supabase/migrations/` gezet en de gebruiker plakt de inhoud handmatig in de Supabase SQL editor. Er is geen ORM; alle queries gaan via de Supabase JS-client (`createAdminClient()`), en `select("*")` retourneert gewoon elke kolom die in de tabel bestaat — ontbrekende kolommen leveren `undefined` op in JS, geen crash.

---

### Task 1: Database-migratie — kolommen per maand + backfill

**Files:**
- Create: `supabase/migrations/20260713_kosten_per_maand.sql`

- [ ] **Step 1: Schrijf het migratiebestand**

```sql
-- =========================================================
-- Kosten per maand aanpasbaar
-- Voer uit in Supabase SQL editor
-- =========================================================

-- 1. Kolommen per maand toevoegen aan kostenposten
ALTER TABLE cockpit_fin_kosten
  ADD COLUMN IF NOT EXISTS jan NUMERIC,
  ADD COLUMN IF NOT EXISTS feb NUMERIC,
  ADD COLUMN IF NOT EXISTS mrt NUMERIC,
  ADD COLUMN IF NOT EXISTS apr NUMERIC,
  ADD COLUMN IF NOT EXISTS mei NUMERIC,
  ADD COLUMN IF NOT EXISTS jun NUMERIC,
  ADD COLUMN IF NOT EXISTS jul NUMERIC,
  ADD COLUMN IF NOT EXISTS aug NUMERIC,
  ADD COLUMN IF NOT EXISTS sep NUMERIC,
  ADD COLUMN IF NOT EXISTS okt NUMERIC,
  ADD COLUMN IF NOT EXISTS nov NUMERIC,
  ADD COLUMN IF NOT EXISTS dec NUMERIC;

-- 2. Backfill: bestaande 'maandelijks'-posten krijgen hun huidige
--    bedrag in elke maand binnen van_maand..tot_maand, 0 daarbuiten.
--    Posten met andere frequenties raken we niet aan (jan..dec blijft NULL).
UPDATE cockpit_fin_kosten
SET
  jan = CASE WHEN 1  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  feb = CASE WHEN 2  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  mrt = CASE WHEN 3  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  apr = CASE WHEN 4  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  mei = CASE WHEN 5  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  jun = CASE WHEN 6  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  jul = CASE WHEN 7  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  aug = CASE WHEN 8  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  sep = CASE WHEN 9  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  okt = CASE WHEN 10 BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  nov = CASE WHEN 11 BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  dec = CASE WHEN 12 BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END
WHERE frequentie = 'maandelijks';
```

- [ ] **Step 2: Verifieer lokaal dat het bestand geldig staat opgeslagen**

Run: `test -f "supabase/migrations/20260713_kosten_per_maand.sql" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260713_kosten_per_maand.sql
git commit -m "feat: voeg jan-dec kolommen toe aan kostenposten met backfill"
```

> **Let op voor de gebruiker:** dit script moet handmatig in de Supabase SQL editor gedraaid worden (zelfde werkwijze als eerdere migraties in deze map) vóórdat de codewijzigingen uit Task 2-6 live gaan. Tot die tijd geeft `select("*")` op `cockpit_fin_kosten` gewoon `jan`...`dec` als `undefined` terug — de nieuwe rekenlogica vangt dat af met `?? 0`, dus er is geen crash, maar kosten tonen dan tijdelijk €0 voor `maandelijks`-posten. Verifieer na het draaien met:
> ```sql
> SELECT naam, bedrag, jan, feb, mrt, apr, mei, jun, jul, aug, sep, okt, nov, dec
> FROM cockpit_fin_kosten
> WHERE frequentie = 'maandelijks'
> ORDER BY sort_order;
> ```
> Verwacht: voor Hostaway staat `590` in elke maandkolom, voor Pricelabs `283` in elke maandkolom (en zo voor elke andere `maandelijks`-post — elke kolom moet gelijk zijn aan het huidige `bedrag`, tenzij die maand buiten het oude `van_maand`/`tot_maand`-bereik viel, dan `0`).

---

### Task 2: Rekenlogica en types in `page.tsx`

**Files:**
- Modify: `src/app/cockpit/financien/page.tsx:62-72` (interface `Kostenpost`)
- Modify: `src/app/cockpit/financien/page.tsx:638-660` (functie `berekenKostenMaanden`)

- [ ] **Step 1: Voeg de 12 maandvelden toe aan de `Kostenpost`-interface**

Vervang:

```ts
interface Kostenpost {
  id: number;
  naam: string;
  categorie: string;
  bedrag: number;
  frequentie: string;
  betaalmaand: number | null;
  van_maand: number | null;
  tot_maand: number | null;
  actief: boolean;
}
```

door:

```ts
interface Kostenpost {
  id: number;
  naam: string;
  categorie: string;
  bedrag: number;
  frequentie: string;
  betaalmaand: number | null;
  van_maand: number | null;
  tot_maand: number | null;
  actief: boolean;
  jan: number | null;
  feb: number | null;
  mrt: number | null;
  apr: number | null;
  mei: number | null;
  jun: number | null;
  jul: number | null;
  aug: number | null;
  sep: number | null;
  okt: number | null;
  nov: number | null;
  dec: number | null;
}
```

- [ ] **Step 2: Pas `berekenKostenMaanden` aan om voor `maandelijks` de losse kolommen te gebruiken**

Vervang:

```ts
function berekenKostenMaanden(k: Kostenpost): number[] {
  const result = Array(12).fill(0);
  switch (k.frequentie) {
    case "maandelijks": {
      const van = (k.van_maand ?? 1) - 1;
      const tot = (k.tot_maand ?? 12) - 1;
      for (let m = van; m <= tot; m++) result[m] = k.bedrag;
      break;
    }
    case "jaarlijks":
    case "eenmalig": {
      const m = (k.betaalmaand ?? 1) - 1;
      result[m] = k.bedrag;
      break;
    }
    case "kwartaal": {
      const start = (k.betaalmaand ?? 1) - 1;
      for (let q = 0; q < 4; q++) result[(start + q * 3) % 12] += k.bedrag;
      break;
    }
  }
  return result;
}
```

door:

```ts
function berekenKostenMaanden(k: Kostenpost): number[] {
  const result = Array(12).fill(0);
  switch (k.frequentie) {
    case "maandelijks": {
      const maanden = [k.jan, k.feb, k.mrt, k.apr, k.mei, k.jun, k.jul, k.aug, k.sep, k.okt, k.nov, k.dec];
      for (let m = 0; m < 12; m++) result[m] = maanden[m] ?? 0;
      break;
    }
    case "jaarlijks":
    case "eenmalig": {
      const m = (k.betaalmaand ?? 1) - 1;
      result[m] = k.bedrag;
      break;
    }
    case "kwartaal": {
      const start = (k.betaalmaand ?? 1) - 1;
      for (let q = 0; q < 4; q++) result[(start + q * 3) % 12] += k.bedrag;
      break;
    }
  }
  return result;
}
```

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: build faalt op dit moment nog niet op deze functie op zich, maar zal wél falen door de `KostenModal`-component die in Task 3 nog `van_maand`/`tot_maand`-only formstate gebruikt zonder de nieuwe velden — dat is verwacht en wordt in Task 3 opgelost. Controleer nu alleen dat er geen fouten zijn die verwijzen naar regels buiten `KostenModal` (rond regel 662+).

- [ ] **Step 4: Commit**

```bash
git add src/app/cockpit/financien/page.tsx
git commit -m "feat: bereken maandelijkse kosten per maand-kolom i.p.v. bereik"
```

---

### Task 3: Rekenlogica in `overzicht/route.ts`

**Files:**
- Modify: `src/app/api/cockpit/financien/overzicht/route.ts:8-42` (functie `berekenKostenPerMaand`)

- [ ] **Step 1: Vervang de functie**

Vervang:

```ts
function berekenKostenPerMaand(kosten: {
  bedrag: number; frequentie: string; betaalmaand: number | null;
  van_maand: number | null; tot_maand: number | null;
}[]): number[] {
  const perMaand = Array(12).fill(0);

  for (const k of kosten) {
    switch (k.frequentie) {
      case "maandelijks": {
        const van = (k.van_maand ?? 1) - 1;
        const tot = (k.tot_maand ?? 12) - 1;
        for (let m = van; m <= tot; m++) {
          perMaand[m] += k.bedrag;
        }
        break;
      }
      case "jaarlijks":
      case "eenmalig": {
        const m = (k.betaalmaand ?? 1) - 1;
        perMaand[m] += k.bedrag;
        break;
      }
      case "kwartaal": {
        const startM = (k.betaalmaand ?? 1) - 1;
        for (let q = 0; q < 4; q++) {
          const m = (startM + q * 3) % 12;
          perMaand[m] += k.bedrag;
        }
        break;
      }
    }
  }

  return perMaand;
}
```

door:

```ts
function berekenKostenPerMaand(kosten: {
  bedrag: number; frequentie: string; betaalmaand: number | null;
  van_maand: number | null; tot_maand: number | null;
  jan: number | null; feb: number | null; mrt: number | null; apr: number | null;
  mei: number | null; jun: number | null; jul: number | null; aug: number | null;
  sep: number | null; okt: number | null; nov: number | null; dec: number | null;
}[]): number[] {
  const perMaand = Array(12).fill(0);

  for (const k of kosten) {
    switch (k.frequentie) {
      case "maandelijks": {
        const maanden = [k.jan, k.feb, k.mrt, k.apr, k.mei, k.jun, k.jul, k.aug, k.sep, k.okt, k.nov, k.dec];
        for (let m = 0; m < 12; m++) {
          perMaand[m] += maanden[m] ?? 0;
        }
        break;
      }
      case "jaarlijks":
      case "eenmalig": {
        const m = (k.betaalmaand ?? 1) - 1;
        perMaand[m] += k.bedrag;
        break;
      }
      case "kwartaal": {
        const startM = (k.betaalmaand ?? 1) - 1;
        for (let q = 0; q < 4; q++) {
          const m = (startM + q * 3) % 12;
          perMaand[m] += k.bedrag;
        }
        break;
      }
    }
  }

  return perMaand;
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: geen nieuwe fouten in `overzicht/route.ts`. De aanroep `berekenKostenPerMaand(kosten ?? [])` op regel 85 geeft data terug van `admin.from("cockpit_fin_kosten").select("*")`, wat losjes getypeerd is — als de build hier over valt, cast de aanroep expliciet naar het juiste type in plaats van de functie-signature te versoepelen.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cockpit/financien/overzicht/route.ts
git commit -m "feat: overzicht-API rekent maandelijkse kosten per maand-kolom"
```

---

### Task 4: POST-route — aanmaken met auto-fill fallback

**Files:**
- Modify: `src/app/api/cockpit/financien/kosten/route.ts:29-53` (functie `POST`)

- [ ] **Step 1: Vervang de `POST`-functie**

Vervang:

```ts
export async function POST(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });

  const body = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("cockpit_fin_kosten")
    .insert({
      naam: body.naam,
      categorie: body.categorie,
      bedrag: body.bedrag,
      frequentie: body.frequentie,
      betaalmaand: body.betaalmaand ?? null,
      van_maand: body.van_maand ?? null,
      tot_maand: body.tot_maand ?? null,
      jaar: body.jaar ?? new Date().getFullYear(),
      actief: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

door:

```ts
const MAAND_KEYS = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"] as const;

export async function POST(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });

  const body = await req.json();
  const admin = createAdminClient();

  // Voor 'maandelijks'-posten: als de client geen expliciete maandbedragen meestuurt
  // (bv. een directe API-aanroep zonder de grid-UI), vullen we ze af op basis van
  // bedrag + van_maand/tot_maand, zoals het oude gedrag. De cockpit-UI stuurt altijd
  // expliciete waarden mee (zie KostenModal), dus dit is een defensieve fallback.
  const maandVelden: Record<string, number> = {};
  if (body.frequentie === "maandelijks") {
    const heeftExpliciteMaanden = MAAND_KEYS.some(m => body[m] !== undefined);
    if (heeftExpliciteMaanden) {
      for (const m of MAAND_KEYS) maandVelden[m] = body[m] ?? 0;
    } else {
      const van = body.van_maand ?? 1;
      const tot = body.tot_maand ?? 12;
      MAAND_KEYS.forEach((m, i) => {
        maandVelden[m] = (i + 1 >= van && i + 1 <= tot) ? body.bedrag : 0;
      });
    }
  }

  const { data, error } = await admin
    .from("cockpit_fin_kosten")
    .insert({
      naam: body.naam,
      categorie: body.categorie,
      bedrag: body.bedrag,
      frequentie: body.frequentie,
      betaalmaand: body.betaalmaand ?? null,
      van_maand: body.van_maand ?? null,
      tot_maand: body.tot_maand ?? null,
      jaar: body.jaar ?? new Date().getFullYear(),
      actief: true,
      ...maandVelden,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: geen fouten in `kosten/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cockpit/financien/kosten/route.ts
git commit -m "feat: kosten-POST slaat maandbedragen op met fallback-vulling"
```

---

### Task 5: PUT-route — bewerken slaat maandbedragen op

**Files:**
- Modify: `src/app/api/cockpit/financien/kosten/[id]/route.ts:13-38` (functie `PUT`)

- [ ] **Step 1: Vervang de `PUT`-functie**

Vervang:

```ts
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAuth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("cockpit_fin_kosten")
    .update({
      naam: body.naam,
      categorie: body.categorie,
      bedrag: body.bedrag,
      frequentie: body.frequentie,
      betaalmaand: body.betaalmaand ?? null,
      van_maand: body.van_maand ?? null,
      tot_maand: body.tot_maand ?? null,
      actief: body.actief ?? true,
    })
    .eq("id", parseInt(id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

door:

```ts
const MAAND_KEYS = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAuth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const admin = createAdminClient();

  const maandVelden: Record<string, number> = {};
  if (body.frequentie === "maandelijks") {
    for (const m of MAAND_KEYS) maandVelden[m] = body[m] ?? 0;
  }

  const { data, error } = await admin
    .from("cockpit_fin_kosten")
    .update({
      naam: body.naam,
      categorie: body.categorie,
      bedrag: body.bedrag,
      frequentie: body.frequentie,
      betaalmaand: body.betaalmaand ?? null,
      van_maand: body.van_maand ?? null,
      tot_maand: body.tot_maand ?? null,
      actief: body.actief ?? true,
      ...maandVelden,
    })
    .eq("id", parseInt(id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: geen fouten in `kosten/[id]/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/cockpit/financien/kosten/[id]/route.ts"
git commit -m "feat: kosten-PUT slaat maandbedragen op"
```

---

### Task 6: UI — grid van 12 maanden in `KostenModal`

**Files:**
- Modify: `src/app/cockpit/financien/page.tsx:662-739` (component `KostenModal`)

- [ ] **Step 1: Voeg een `MAAND_KEYS`-constante toe boven de component (of hergebruik de bestaande `MAANDEN`-array uit de top van het bestand voor labels; voor de state-keys gebruiken we dezelfde korte namen als de DB-kolommen)**

Voeg toe, vlak boven `function KostenModal(...)`:

```ts
const MAAND_KEYS = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"] as const;
```

- [ ] **Step 2: Voeg maand-state toe aan `KostenModal` en initialiseer die uit de props**

Vervang:

```ts
function KostenModal({ kosten, onOpslaan, onSluiten }: {
  kosten: Kostenpost | null;
  onOpslaan: (d: Partial<Kostenpost>) => Promise<void>;
  onSluiten: () => void;
}) {
  const [form, setForm] = useState({
    naam: kosten?.naam ?? "",
    categorie: kosten?.categorie ?? "Software",
    bedrag: String(kosten?.bedrag ?? ""),
    frequentie: kosten?.frequentie ?? "maandelijks",
    betaalmaand: String(kosten?.betaalmaand ?? ""),
    van_maand: String(kosten?.van_maand ?? "1"),
    tot_maand: String(kosten?.tot_maand ?? "12"),
  });
  const [bezig, setBezig] = useState(false);
```

door:

```ts
function KostenModal({ kosten, onOpslaan, onSluiten }: {
  kosten: Kostenpost | null;
  onOpslaan: (d: Partial<Kostenpost>) => Promise<void>;
  onSluiten: () => void;
}) {
  const [form, setForm] = useState({
    naam: kosten?.naam ?? "",
    categorie: kosten?.categorie ?? "Software",
    bedrag: String(kosten?.bedrag ?? ""),
    frequentie: kosten?.frequentie ?? "maandelijks",
    betaalmaand: String(kosten?.betaalmaand ?? ""),
    van_maand: String(kosten?.van_maand ?? "1"),
    tot_maand: String(kosten?.tot_maand ?? "12"),
  });
  const [maanden, setMaanden] = useState<Record<string, number>>(() => {
    if (kosten) {
      return {
        jan: kosten.jan ?? 0, feb: kosten.feb ?? 0, mrt: kosten.mrt ?? 0, apr: kosten.apr ?? 0,
        mei: kosten.mei ?? 0, jun: kosten.jun ?? 0, jul: kosten.jul ?? 0, aug: kosten.aug ?? 0,
        sep: kosten.sep ?? 0, okt: kosten.okt ?? 0, nov: kosten.nov ?? 0, dec: kosten.dec ?? 0,
      };
    }
    return Object.fromEntries(MAAND_KEYS.map(m => [m, 0]));
  });
  const [bezig, setBezig] = useState(false);

  function vulAlleMaanden() {
    const v = parseFloat(form.bedrag) || 0;
    setMaanden(Object.fromEntries(MAAND_KEYS.map(m => [m, v])));
  }
```

- [ ] **Step 3: Stuur de maandbedragen mee bij opslaan**

Vervang:

```ts
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    await onOpslaan({
      naam: form.naam,
      categorie: form.categorie,
      bedrag: parseFloat(form.bedrag),
      frequentie: form.frequentie,
      betaalmaand: form.betaalmaand ? parseInt(form.betaalmaand) : null,
      van_maand: form.van_maand ? parseInt(form.van_maand) : null,
      tot_maand: form.tot_maand ? parseInt(form.tot_maand) : null,
      actief: true,
    });
    setBezig(false);
  }
```

door:

```ts
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    await onOpslaan({
      naam: form.naam,
      categorie: form.categorie,
      bedrag: parseFloat(form.bedrag),
      frequentie: form.frequentie,
      betaalmaand: form.betaalmaand ? parseInt(form.betaalmaand) : null,
      van_maand: form.van_maand ? parseInt(form.van_maand) : null,
      tot_maand: form.tot_maand ? parseInt(form.tot_maand) : null,
      actief: true,
      ...(form.frequentie === "maandelijks" ? maanden : {}),
    });
    setBezig(false);
  }
```

- [ ] **Step 4: Vervang het "Vanaf maand / Tot en met maand"-blok door de 12-maanden grid**

Vervang:

```tsx
        {form.frequentie === "maandelijks" && (
          <div className="flex gap-3">
            <Veld label="Vanaf maand">
              <input type="number" min={1} max={12} className={invoerKlasse} value={form.van_maand} onChange={e => setForm({...form, van_maand: e.target.value})} />
            </Veld>
            <Veld label="Tot en met maand">
              <input type="number" min={1} max={12} className={invoerKlasse} value={form.tot_maand} onChange={e => setForm({...form, tot_maand: e.target.value})} />
            </Veld>
          </div>
        )}
```

door:

```tsx
        {form.frequentie === "maandelijks" && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-600">Bedragen per maand (€)</label>
              <button type="button" onClick={vulAlleMaanden} className="text-xs text-[#2b3885] hover:underline">
                Toepassen op alle maanden
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {MAAND_KEYS.map(m => (
                <div key={m}>
                  <span className="text-xs text-gray-500">{m}</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 mt-0.5"
                    value={maanden[m] ?? 0}
                    onChange={e => setMaanden({...maanden, [m]: parseFloat(e.target.value) || 0})}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
```

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: build slaagt zonder fouten (dit lost ook de verwachte fout uit Task 2 Step 3 op).

- [ ] **Step 6: Commit**

```bash
git add src/app/cockpit/financien/page.tsx
git commit -m "feat: grid van 12 maanden i.p.v. van/tot-maand in kosten-modal"
```

---

### Task 7: Handmatige end-to-end verificatie

Er is geen testframework in dit project — deze stap is de daadwerkelijke functionele verificatie en mag niet worden overgeslagen.

**Vereiste:** de migratie uit Task 1 moet al in Supabase gedraaid zijn (zie de "Let op" onder Task 1) voordat je dit uitvoert.

- [ ] **Step 1: Start de dev-server**

Run: `npm run dev`
Expected: server draait op `http://localhost:3000` zonder compile-errors.

- [ ] **Step 2: Log in en open Financiën**

Log in als `info@bnbassistant.com` (de enige toegestane cockpit-gebruiker, zie `COCKPIT_EMAIL` in de API-routes) en navigeer naar `/cockpit/financien`, tabblad **Kosten**.

Expected: Hostaway en Pricelabs tonen hetzelfde bedrag (590 resp. 283) in elke maandkolom — identiek aan vóór deze wijziging.

- [ ] **Step 3: Bewerk een bestaande maandelijkse kostenpost met een prijswijziging halverwege het jaar**

Klik op het potlood-icoon bij **Pricelabs**. In het formulier: klik "Toepassen op alle maanden" niet, maar pas handmatig de velden `jul` t/m `dec` aan naar bv. `320`, laat `jan` t/m `jun` op `283` staan. Klik **Opslaan**.

Expected: modal sluit, tabel ververst. In de kosten-tab (bij periode "Dit jaar") tonen `jan`–`jun` nog `€283` en `jul`–`dec` nu `€320`.

- [ ] **Step 4: Controleer het P&L-tabblad**

Ga naar tabblad **P&L**, periode "Dit jaar". Vergelijk de "Kosten"-rij voor juni en juli.

Expected: het verschil tussen juni en juli is precies €37 (320 − 283) hoger dan voorheen, en de KPI-cards bovenaan (kosten YTD/jaar) zijn hierop aangepast.

- [ ] **Step 5: Maak een nieuwe maandelijkse kostenpost aan**

Klik "+ Nieuwe kostenpost". Vul naam, categorie, bedrag `50`, frequentie `maandelijks` in. Klik "Toepassen op alle maanden", controleer dat alle 12 velden `50` tonen, en sla op.

Expected: nieuwe post verschijnt in de tabel met `€50` in elke maand.

- [ ] **Step 6: Controleer dat een jaarlijkse/kwartaal-kostenpost ongewijzigd werkt**

Bewerk een bestaande post met frequentie `jaarlijks` (bv. Hostnet). Controleer dat het formulier nog steeds "Betaalmaand" toont (geen maanden-grid), en dat het bedrag na opslaan nog steeds op de juiste betaalmaand in de kosten-tab verschijnt.

Expected: geen regressie — dit pad is niet aangeraakt door deze wijziging.

- [ ] **Step 7: Stop de dev-server**

Run: Ctrl+C in de terminal waar `npm run dev` draaide.

---

## Samenvatting van bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/migrations/20260713_kosten_per_maand.sql` | Nieuw — kolommen + backfill |
| `src/app/cockpit/financien/page.tsx` | `Kostenpost`-interface, `berekenKostenMaanden`, `KostenModal` (state, submit, grid-UI) |
| `src/app/api/cockpit/financien/overzicht/route.ts` | `berekenKostenPerMaand` |
| `src/app/api/cockpit/financien/kosten/route.ts` | `POST` — maandvelden + fallback-vulling |
| `src/app/api/cockpit/financien/kosten/[id]/route.ts` | `PUT` — maandvelden doorzetten |
