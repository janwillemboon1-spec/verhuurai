# Review Remover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free "Review Remover" tool on Host Boni (`/review-remover`) where a host pastes an Airbnb review (+ star rating, optional context, optional evidence screenshots), submits name + email, and gets back an AI verdict (laag/gemiddeld/hoog) on removal chances, a ready-to-paste objection letter, and step-by-step instructions for the official Airbnb dispute form — plus an admin overview of all submissions.

**Architecture:** Single Next.js page (`/review-remover`) with one form (mirrors `/gratis`), a two-step upload flow for screenshots (signed Supabase Storage URLs, mirrors Foto Optimizer), a synchronous API route that calls Claude (vision) against a static "kennisbank" of Airbnb's review/content/anti-discrimination policy + official dispute-form categories, stores the submission + AI result in a new Supabase table, and an optional "email me the result" button via Resend. Admin list + detail pages under `/admin/review-remover`.

**Tech Stack:** Next.js 14 (App Router) + TypeScript, `@anthropic-ai/sdk` (claude-sonnet-4-6, vision), Supabase (Postgres + Storage), Resend, Tailwind (existing design tokens: `card`, `input`, `btn-primary`, etc.)

**Project context:**
- Spec: `docs/superpowers/specs/2026-06-30-review-remover-design.md`
- No automated test suite exists in this project (confirmed: no Jest/RTL/pytest config). Every task below replaces "write failing test" with **manual verification** (dev server + curl + Supabase row checks), matching the project's existing convention.
- Working directory for all paths below: `/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot`

---

### Task 1: Database migration — table + RLS lock-down

**Files:**
- Create: `supabase/review-remover-migration.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================
-- Review Remover — database migratie
-- Uitvoeren in Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS review_remover_rapporten (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  aangemaakt_op     TIMESTAMPTZ DEFAULT NOW(),
  naam              TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  taal              TEXT        NOT NULL DEFAULT 'nl',
  review_tekst      TEXT        NOT NULL,
  sterren           INT         NOT NULL,
  context           TEXT,
  screenshot_urls   TEXT[],
  verdict           TEXT,
    -- laag | gemiddeld | hoog
  onderbouwing      TEXT,
  toegepaste_regels TEXT[],
  bezwaarbrief      TEXT,
  stappenplan       TEXT[],
  email_verzonden   BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_review_remover_rapporten_aangemaakt_op
  ON review_remover_rapporten(aangemaakt_op DESC);

-- RLS inschakelen zonder policies — alleen de service-role (admin client) heeft
-- toegang. Anonieme lead-tabel zonder user_id, zelfde aanpak als gratis_rapporten.
ALTER TABLE review_remover_rapporten ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Run the migration manually in Supabase**

Open the Supabase SQL editor for project `dldxmdpomagqiqrbxrtq` and run the full contents of `supabase/review-remover-migration.sql`.

Verify:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'review_remover_rapporten' ORDER BY ordinal_position;
```
Expected: 13 rows (id, aangemaakt_op, naam, email, taal, review_tekst, sterren, context, screenshot_urls, verdict, onderbouwing, toegepaste_regels, bezwaarbrief, stappenplan, email_verzonden).

- [ ] **Step 3: Create the Storage bucket manually**

In Supabase Dashboard → Storage → New bucket:
- Name: `review-remover-bewijs`
- Public bucket: **ON**

Then in the SQL editor, add the public-read policy:
```sql
CREATE POLICY "Publiek lezen review-remover-bewijs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-remover-bewijs');
```

No INSERT policy is needed — uploads go through signed upload URLs (created with the service-role key), which bypass RLS, identical to the existing `foto-originelen` bucket.

- [ ] **Step 4: Commit**

```bash
git add supabase/review-remover-migration.sql
git commit -m "Add Review Remover database migration"
```

---

### Task 2: Kennisbank module (Airbnb policy reference)

**Files:**
- Create: `src/lib/review-remover-kennisbank.ts`

- [ ] **Step 1: Write the kennisbank constant**

```typescript
export const REVIEW_REMOVER_KENNISBANK = `
AIRBNB RECENSIEBELEID — KENNISBANK VOOR BEOORDELING

Bronnen: Airbnb Recensiebeleid (help/article/2673), Contentbeleid (help/article/546),
Anti-discriminatiebeleid (help/article/2867), Bezwaar maken tegen een recensie (help/article/3582).

Airbnb vereist dat recensies relevant, authentiek en betrouwbaar zijn en het Contentbeleid
respecteren. Een recensie kan alleen verwijderd worden als hij valt onder een van de
volgende 5 OFFICIËLE bezwaarcategorieën — dit zijn EXACT de categorieën die de host moet
kiezen in het Airbnb-bezwaarformulier. Gebruik GEEN andere categorieën.

1. VERGELDING
   De recensie is geschreven als wraak voor het handhaven van een huisregel of beleid
   (bv. de gast kreeg een waarschuwing voor te veel mensen, geluidsoverlast, een boete
   voor schade, of een aanmaning, en plaatst daarna een wraakreview).

2. NIET RELEVANT
   De recensie bevat geen informatie over de boeking zelf, OF de gast is nooit aangekomen,
   OF heeft geannuleerd. Ook recensies die niet gebaseerd zijn op een directe, eigen
   verblijfservaring vallen hieronder (bv. duidelijk een neprecensie van iemand zonder
   echte boeking).

3. DRUK OF DWANG
   De recensie komt van iemand die geïntimideerd, afgeperst of aangemoedigd werd om de
   recensie te schrijven (bv. een gast dreigt met een negatieve review tenzij de host
   geld terugbetaalt of iets gratis geeft).

4. CONCURRENT
   De recensie is geplaatst door iemand die verbonden is aan de accommodatie (bv. een
   ex-medewerker, voormalig co-host) of door een concurrerende verhuurder/host.

5. SCHENDING VAN CONTENTBELEID
   De recensie is discriminerend (op basis van ras, religie, geslacht, leeftijd, beperking,
   gezinsstatus, etniciteit, herkomst, seksuele geaardheid, genderidentiteit, kaste of
   zwangerschap), bevat privégegevens van de host, of is op een andere manier in strijd met
   het Contentbeleid: spam/reclame, illegale inhoud, expliciete seksuele inhoud, gewelddadige
   of bedreigende taal, of het zich voordoen als een andere persoon.

BELANGRIJKE UITZONDERING (verplicht eerlijk toepassen):
Subjectieve meningen, beoordelingsverschillen en factoren buiten de controle van de host
(bv. een gast vond de matras te hard, het was te warm, de buurt beviel niet) worden NIET
automatisch verwijderd door Airbnb, ook niet als de host het oneerlijk vindt. Dit soort
recensies kan relevant zijn voor toekomstige gasten. Als de recensie hieronder valt, geef dan
EERLIJK een "laag" verdict — geef de host geen valse hoop.

HET OFFICIËLE BEZWAARPROCES (gebruik deze exacte feiten in het stappenplan):
- Bezwaar indienen kan via: https://www.airbnb.nl/resolution/review_dispute/intro
- In dat formulier: recensie selecteren → reden kiezen (één van de 5 categorieën hierboven)
  → toelichting toevoegen in het veld "Informatie toevoegen" (hier plakt de host de
  bezwaarbrief) → eventueel bewijs uploaden → verzenden.
- Airbnb reageert meestal binnen 48 uur per e-mail.
- Een host mag maximaal 2 keer bezwaar indienen per recensie.
- Bezwaar indienen mag door: de advertentie-eigenaar, co-hosts met volledige toegang,
  professionele verhuurders met uitgebreide rechten, teamleden met de juiste rechten, of de
  gast zelf.
- Let op: geen gevoelige persoonsgegevens (ID's, gezondheidsdata) uploaden in het formulier.
`.trim();
```

- [ ] **Step 2: Manual verification**

```bash
node -e "const {REVIEW_REMOVER_KENNISBANK} = require('./src/lib/review-remover-kennisbank.ts')" 2>&1 | head -5
```
This will fail (no ts-node), which is expected — instead verify with TypeScript directly:
```bash
npx tsc --noEmit src/lib/review-remover-kennisbank.ts 2>&1 | head -20
```
Expected: no syntax errors reported for this file (unrelated project-wide errors, if any, are fine to ignore).

- [ ] **Step 3: Commit**

```bash
git add src/lib/review-remover-kennisbank.ts
git commit -m "Add Review Remover policy kennisbank"
```

---

### Task 3: Prompt builder

**Files:**
- Create: `src/lib/review-remover-prompt.ts`

- [ ] **Step 1: Write the prompt builder**

```typescript
import { REVIEW_REMOVER_KENNISBANK } from "./review-remover-kennisbank";

export function buildReviewRemoverSystemPrompt(taal: string): string {
  const isEn = taal === "en";

  const taalInstructie = isEn
    ? `IMPORTANT: Write ALL text fields in your JSON response (onderbouwing, bezwaarbrief, stappenplan) entirely in English. Do not use any Dutch words.`
    : `BELANGRIJK: Schrijf alle tekstvelden in je JSON-antwoord (onderbouwing, bezwaarbrief, stappenplan) volledig in het Nederlands.`;

  return `Je bent een ervaren Airbnb-verhuurexpert die hosts helpt beoordelen of een
ontvangen recensie kans maakt om verwijderd te worden door Airbnb, op basis van Airbnb's
officiële beleid. Je bent eerlijk en nuchter: je geeft nooit valse hoop. Als een recensie
gewoon een negatieve maar legitieme mening is, zeg je dat duidelijk met een "laag" verdict.

${REVIEW_REMOVER_KENNISBANK}

${taalInstructie}

Als er screenshots zijn bijgevoegd (gelabeld als "Bewijs-screenshot"), bekijk deze dan en
gebruik de inhoud actief in je onderbouwing en bezwaarbrief — bijvoorbeeld als de screenshot
bewijst dat een claim in de recensie feitelijk onjuist is, of dat de gast nooit is
aangekomen, of dat er sprake was van dreiging/afpersing in een chatgesprek.

Genereer je antwoord als GELDIG JSON (geen markdown codeblokken, direct JSON) met deze
exacte structuur:
{
  "verdict": "laag" | "gemiddeld" | "hoog",
  "onderbouwing": "2-4 zinnen die uitleggen waarom dit verdict, met verwijzing naar welke categorie(ën) van toepassing zijn of waarom geen enkele van toepassing is",
  "toegepaste_regels": ["Vergelding" | "Niet relevant" | "Druk of dwang" | "Concurrent" | "Schending van Contentbeleid"],
    // leeg array als geen enkele categorie van toepassing is
  "bezwaarbrief": "Een volledige, kant-en-klare, zakelijke bezwaarbrief die de host direct kan plakken in het 'Informatie toevoegen' veld van het Airbnb-bezwaarformulier. Verwijs naar de toepasselijke categorie(ën) en leg feitelijk uit waarom de recensie in strijd is met Airbnb's beleid. Gebruik geen aanhef/afsluiting met naam, want dit wordt in een formulierveld geplakt.",
  "stappenplan": ["Stap 1: ...", "Stap 2: ...", "..."]
    // gebruik de exacte feiten uit de kennisbank hierboven (URL, max 2 pogingen, 48 uur, wie mag indienen)
}`;
}

export function buildReviewRemoverUserPrompt(input: {
  reviewTekst: string;
  sterren: number;
  context?: string;
  aantalScreenshots: number;
}): string {
  const delen = [
    `RECENSIE VAN DE GAST (ontvangen sterren: ${input.sterren}/5):\n"${input.reviewTekst.trim()}"`,
    input.context?.trim() ? `CONTEXT VAN DE HOST:\n${input.context.trim()}` : "",
    input.aantalScreenshots > 0
      ? `Er zijn ${input.aantalScreenshots} bewijs-screenshot(s) bijgevoegd hieronder. Bekijk deze en gebruik ze in je beoordeling.`
      : "",
  ].filter(Boolean);

  return delen.join("\n\n");
}
```

- [ ] **Step 2: Manual verification**

```bash
npx tsc --noEmit src/lib/review-remover-prompt.ts 2>&1 | head -20
```
Expected: no syntax errors for this file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/review-remover-prompt.ts
git commit -m "Add Review Remover prompt builder"
```

---

### Task 4: Rate-limit helper

**Files:**
- Create: `src/lib/rate-limit.ts`

- [ ] **Step 1: Write the in-memory rate limiter**

```typescript
const hits = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number = 60 * 60 * 1000
): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);
  return true;
}
```

In-memory means the counter resets on every deploy/restart — acceptable for an MVP abuse
guard on a free lead-gen tool, avoids adding Redis infrastructure that doesn't exist
elsewhere in this project.

- [ ] **Step 2: Manual verification**

```bash
node --experimental-strip-types -e "
const { checkRateLimit } = require('./src/lib/rate-limit.ts');
console.log(checkRateLimit('test@x.com', 2));
console.log(checkRateLimit('test@x.com', 2));
console.log(checkRateLimit('test@x.com', 2));
"
```
If `--experimental-strip-types` isn't available on the installed Node version, instead just run:
```bash
npx tsc --noEmit src/lib/rate-limit.ts
```
Expected: no errors. Logic will be exercised end-to-end in Task 7's manual test.

- [ ] **Step 3: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "Add in-memory rate limiter for Review Remover"
```

---

### Task 5: BoniAvatar — support a custom image

**Files:**
- Modify: `src/components/BoniAvatar.tsx`

The user asked to use `Boni-rechter.png` (exact filename, capital B, confirmed present in
`public/`) instead of the default `boni.png` for this tool. `BoniAvatar` currently hardcodes
`/boni.png` with no way to override it — add an optional `src` prop, defaulting to current
behavior so no other usage breaks.

- [ ] **Step 1: Add the `src` prop**

```typescript
"use client";

interface BoniAvatarProps {
  size?: number;
  className?: string;
  animate?: boolean;
  src?: string;
}

export function BoniAvatar({ size = 120, className = "", animate = false, src = "/boni.png" }: BoniAvatarProps) {
  return (
    <div
      className={`inline-flex items-center justify-center ${animate ? "boni-float" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Boni"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

```bash
grep -rn "BoniAvatar size=" src/app --include="*.tsx" | head -5
```
Confirm existing call sites (e.g. `src/app/gratis/page.tsx`) don't pass `src` — they'll keep
using the default `/boni.png` unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/components/BoniAvatar.tsx
git commit -m "Allow BoniAvatar to render a custom image variant"
```

---

### Task 6: Upload-urls API route

**Files:**
- Create: `src/app/api/review-remover/upload-urls/route.ts`

Mirrors the Foto Optimizer `/api/foto-optimizer/start` signed-upload pattern, simplified:
no Stripe, no DB row at this stage (the submission row is created later in Task 7's
`analyseer` route once the AI result is known).

- [ ] **Step 1: Write the route**

```typescript
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "review-remover-bewijs";
const MAX_SCREENSHOTS = 5;

function extFromType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: Request) {
  try {
    const { screenshots } = await request.json();

    if (!Array.isArray(screenshots) || screenshots.length === 0) {
      return NextResponse.json({ error: "Geen screenshots opgegeven" }, { status: 400 });
    }
    if (screenshots.length > MAX_SCREENSHOTS) {
      return NextResponse.json({ error: `Maximaal ${MAX_SCREENSHOTS} screenshots toegestaan` }, { status: 400 });
    }

    const admin = createAdminClient();
    const sessieId = crypto.randomUUID();

    const uploadTokens = await Promise.all(
      screenshots.map(async (s: { volgnummer: number; type: string }) => {
        const pad = `${sessieId}/${s.volgnummer}.${extFromType(s.type)}`;
        const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(pad);
        if (error || !data) throw new Error("Upload URL genereren mislukt");
        return { volgnummer: s.volgnummer, pad, token: data.token };
      })
    );

    return NextResponse.json({ sessieId, uploadTokens });
  } catch (error) {
    console.error("Review Remover upload-urls fout:", error);
    return NextResponse.json({ error: "Er ging iets mis bij het voorbereiden van de upload" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Manual verification**

Start the dev server in a separate terminal: `npm run dev`. Then:
```bash
curl -s -X POST http://localhost:3000/api/review-remover/upload-urls \
  -H "Content-Type: application/json" \
  -d '{"screenshots":[{"volgnummer":1,"type":"image/jpeg"}]}' | head -c 500
```
Expected: JSON with `sessieId` (a UUID) and `uploadTokens` array containing one object with
`volgnummer`, `pad` (ending in `.jpg`), and `token`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/review-remover/upload-urls/route.ts
git commit -m "Add Review Remover signed-upload-URL API route"
```

---

### Task 7: Analyseer API route

**Files:**
- Create: `src/app/api/review-remover/analyseer/route.ts`

This is the core route: validates input, rate-limits by email, downloads any uploaded
screenshots from Storage, calls Claude with vision, parses the JSON verdict, stores the
full submission + result in `review_remover_rapporten`, and returns the result to the client.

- [ ] **Step 1: Write the route**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildReviewRemoverSystemPrompt, buildReviewRemoverUserPrompt } from "@/lib/review-remover-prompt";

const BUCKET = "review-remover-bewijs";

function mediaTypeFromPad(pad: string): "image/jpeg" | "image/png" | "image/webp" {
  if (pad.endsWith(".png")) return "image/png";
  if (pad.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { naam, email, taal, reviewTekst, sterren, context, screenshotPaden } = body;

    if (!naam?.trim() || !email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Naam en geldig e-mailadres zijn verplicht" }, { status: 400 });
    }
    if (!reviewTekst?.trim()) {
      return NextResponse.json({ error: "Review-tekst is verplicht" }, { status: 400 });
    }
    if (!Number.isInteger(sterren) || sterren < 1 || sterren > 5) {
      return NextResponse.json({ error: "Sterrenbeoordeling moet 1 t/m 5 zijn" }, { status: 400 });
    }
    const paden: string[] = Array.isArray(screenshotPaden) ? screenshotPaden.slice(0, 5) : [];

    if (!checkRateLimit(email.trim().toLowerCase(), 5)) {
      return NextResponse.json({ error: "Te veel aanvragen vanaf dit e-mailadres. Probeer het over een uur opnieuw." }, { status: 429 });
    }

    const admin = createAdminClient();

    // Screenshots downloaden uit Storage en omzetten naar base64 voor Claude vision
    const screenshotBlocks = await Promise.all(
      paden.map(async (pad) => {
        const { data, error } = await admin.storage.from(BUCKET).download(pad);
        if (error || !data) throw new Error(`Screenshot downloaden mislukt: ${pad}`);
        const buffer = Buffer.from(await data.arrayBuffer());
        return {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mediaTypeFromPad(pad),
            data: buffer.toString("base64"),
          },
        };
      })
    );

    const taalGekozen = taal === "en" ? "en" : "nl";
    const systemPrompt = buildReviewRemoverSystemPrompt(taalGekozen);
    const userPrompt = buildReviewRemoverUserPrompt({
      reviewTekst: reviewTekst.trim(),
      sterren,
      context: context?.trim(),
      aantalScreenshots: screenshotBlocks.length,
    });

    const userContent: Anthropic.MessageParam["content"] = [{ type: "text", text: userPrompt }];
    for (const block of screenshotBlocks) {
      userContent.push({ type: "text", text: "Bewijs-screenshot:" });
      userContent.push(block);
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Onverwacht antwoordtype van Claude");
    }

    const raw = content.text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(raw);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const screenshotUrls = paden.map((pad) => `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${pad}`);

    const { data: rapport, error: insertError } = await admin
      .from("review_remover_rapporten")
      .insert({
        naam: naam.trim(),
        email: email.trim(),
        taal: taalGekozen,
        review_tekst: reviewTekst.trim(),
        sterren,
        context: context?.trim() || null,
        screenshot_urls: screenshotUrls,
        verdict: parsed.verdict,
        onderbouwing: parsed.onderbouwing,
        toegepaste_regels: parsed.toegepaste_regels ?? [],
        bezwaarbrief: parsed.bezwaarbrief,
        stappenplan: parsed.stappenplan ?? [],
      })
      .select("id")
      .single();

    if (insertError || !rapport) {
      throw new Error("Rapport opslaan mislukt: " + insertError?.message);
    }

    return NextResponse.json({
      id: rapport.id,
      verdict: parsed.verdict,
      onderbouwing: parsed.onderbouwing,
      toegepaste_regels: parsed.toegepaste_regels ?? [],
      bezwaarbrief: parsed.bezwaarbrief,
      stappenplan: parsed.stappenplan ?? [],
    });
  } catch (error) {
    console.error("Review Remover analyseer fout:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het analyseren van de recensie. Probeer het zo opnieuw." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Manual verification — without screenshots**

With `npm run dev` running and `ANTHROPIC_API_KEY` / Supabase env vars set locally:
```bash
curl -s -X POST http://localhost:3000/api/review-remover/analyseer \
  -H "Content-Type: application/json" \
  -d '{
    "naam": "Test Host",
    "email": "test@example.com",
    "taal": "nl",
    "reviewTekst": "De gast kwam nooit aan en heeft geannuleerd, maar er staat toch een recensie met 1 ster over slechte communicatie.",
    "sterren": 1,
    "context": "Boeking is geannuleerd door de gast zelf, 2 dagen voor aankomst."
  }' | head -c 1000
```
Expected: HTTP 200, JSON containing `"verdict":"hoog"` (or similar), `"toegepaste_regels":["Niet relevant"]`, a non-empty `bezwaarbrief`, and a `stappenplan` array mentioning the dispute form URL.

Then verify the row landed in Supabase:
```sql
SELECT id, naam, verdict, sterren FROM review_remover_rapporten ORDER BY aangemaakt_op DESC LIMIT 1;
```

- [ ] **Step 3: Manual verification — rate limit**

Run the same curl command 6 times in a row (same email). Expected: the 6th request returns
HTTP 429 with `"error":"Te veel aanvragen..."`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/review-remover/analyseer/route.ts
git commit -m "Add Review Remover analyse API route"
```

---

### Task 8: Email builder

**Files:**
- Create: `src/lib/review-remover-email.ts`

- [ ] **Step 1: Write the HTML email builder**

```typescript
export function buildReviewRemoverEmailHtml(input: {
  naam: string;
  verdict: string;
  onderbouwing: string;
  bezwaarbrief: string;
  stappenplan: string[];
  baseUrl: string;
}): string {
  const verdictKleur = input.verdict === "hoog" ? "#10b981" : input.verdict === "gemiddeld" ? "#f59e0b" : "#ef4444";
  const verdictLabel = input.verdict === "hoog" ? "Hoge kans" : input.verdict === "gemiddeld" ? "Gemiddelde kans" : "Lage kans";

  const stappenHtml = input.stappenplan
    .map((stap, i) => `<li style="margin-bottom:8px;color:#374151;font-size:14px;">${i + 1}. ${stap}</li>`)
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#1B2B4B;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="color:white;margin:0;font-size:22px;">🏠 Host Boni</h1>
        <p style="color:#a5b4fc;margin:8px 0 0;">Review Remover — jouw beoordeling</p>
      </div>
      <p style="color:#374151;">Hey ${input.naam}! Hier is de beoordeling van jouw recensie:</p>
      <div style="display:inline-block;background:${verdictKleur}1a;border:1px solid ${verdictKleur}55;color:${verdictKleur};padding:8px 16px;border-radius:8px;font-weight:bold;font-size:14px;margin:12px 0;">
        ${verdictLabel} op verwijdering
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;font-size:14px;color:#1B2B4B;">${input.onderbouwing}</p>
      </div>
      <h2 style="font-size:16px;color:#1B2B4B;">Jouw bezwaarbrief</h2>
      <div style="background:#eef7fe;border-radius:8px;padding:16px;margin-bottom:16px;white-space:pre-wrap;font-size:14px;color:#1B2B4B;">${input.bezwaarbrief}</div>
      <h2 style="font-size:16px;color:#1B2B4B;">Stappenplan</h2>
      <ol style="padding-left:20px;">${stappenHtml}</ol>
      <div style="text-align:center;margin:32px 0;">
        <a href="${input.baseUrl}/review-remover" style="background:#FF6B6B;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;">
          Nog een recensie checken →
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
        Host Boni · <a href="${input.baseUrl}" style="color:#9ca3af;">hostboni.com</a>
      </p>
    </div>`;
}
```

- [ ] **Step 2: Manual verification**

```bash
npx tsc --noEmit src/lib/review-remover-email.ts 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/review-remover-email.ts
git commit -m "Add Review Remover email HTML builder"
```

---

### Task 9: Email API route

**Files:**
- Create: `src/app/api/review-remover/email/route.ts`

- [ ] **Step 1: Write the route**

```typescript
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReviewRemoverEmailHtml } from "@/lib/review-remover-email";

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id is verplicht" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: rapport, error } = await admin
      .from("review_remover_rapporten")
      .select("naam, email, verdict, onderbouwing, bezwaarbrief, stappenplan")
      .eq("id", id)
      .maybeSingle();

    if (error || !rapport) {
      return NextResponse.json({ error: "Rapport niet gevonden" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "Boni van Host Boni <boni@verhuurai.nl>",
      to: rapport.email,
      subject: "Jouw Review Remover beoordeling is klaar! 🏠",
      html: buildReviewRemoverEmailHtml({
        naam: rapport.naam,
        verdict: rapport.verdict,
        onderbouwing: rapport.onderbouwing,
        bezwaarbrief: rapport.bezwaarbrief,
        stappenplan: rapport.stappenplan ?? [],
        baseUrl,
      }),
    });

    await admin.from("review_remover_rapporten").update({ email_verzonden: true }).eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Review Remover email fout:", error);
    return NextResponse.json({ error: "E-mail versturen mislukt" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Manual verification**

Use the `id` returned from Task 7's curl test:
```bash
curl -s -X POST http://localhost:3000/api/review-remover/email \
  -H "Content-Type: application/json" \
  -d '{"id":"<paste-id-here>"}'
```
Expected: `{"ok":true}`, and the email arrives at the test inbox. Then verify:
```sql
SELECT email_verzonden FROM review_remover_rapporten WHERE id = '<paste-id-here>';
```
Expected: `true`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/review-remover/email/route.ts
git commit -m "Add Review Remover email-on-demand API route"
```

---

### Task 10: Page UI

**Files:**
- Create: `src/app/review-remover/page.tsx`

This mirrors `/gratis`'s single-page form pattern (naam/email act as a built-in lead gate
since the submit button stays disabled until they're filled — no separate "gate screen"
needed) plus the Foto Optimizer two-step screenshot upload flow.

- [ ] **Step 1: Write the page**

```typescript
"use client";

import { useState } from "react";
import { BoniAvatar } from "@/components/BoniAvatar";
import { CopyButton } from "@/components/CopyButton";
import { createClient } from "@/lib/supabase/client";

const TOEGESTANE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 5;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const MAX_SCREENSHOTS = 5;

interface ScreenshotItem {
  id: string;
  bestand: File;
  preview: string;
  fout: string | null;
}

interface Resultaat {
  id: string;
  verdict: "laag" | "gemiddeld" | "hoog";
  onderbouwing: string;
  toegepaste_regels: string[];
  bezwaarbrief: string;
  stappenplan: string[];
}

export default function ReviewRemoverPage() {
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [taal, setTaal] = useState("nl");
  const [reviewTekst, setReviewTekst] = useState("");
  const [sterren, setSterren] = useState<number | null>(null);
  const [context, setContext] = useState("");
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [resultaat, setResultaat] = useState<Resultaat | null>(null);
  const [emailVerzonden, setEmailVerzonden] = useState(false);
  const [emailVerzendBezig, setEmailVerzendBezig] = useState(false);

  const geldigeScreenshots = screenshots.filter((s) => !s.fout);
  const kanAnalyseren =
    naam.trim().length > 0 &&
    email.trim().includes("@") &&
    reviewTekst.trim().length > 0 &&
    sterren !== null &&
    !laden;

  const voegToe = (bestanden: File[]) => {
    const ruimte = MAX_SCREENSHOTS - screenshots.length;
    const items: ScreenshotItem[] = bestanden.slice(0, Math.max(ruimte, 0)).map((b) => ({
      id: crypto.randomUUID(),
      bestand: b,
      preview: URL.createObjectURL(b),
      fout: !TOEGESTANE_TYPES.includes(b.type)
        ? "Ongeldig type — gebruik JPEG, PNG of WEBP"
        : b.size > MAX_BYTES
          ? `Te groot — max ${MAX_MB} MB`
          : null,
    }));
    setScreenshots((prev) => [...prev, ...items]);
  };

  const verwijder = (id: string) => {
    setScreenshots((prev) => {
      const item = prev.find((s) => s.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((s) => s.id !== id);
    });
  };

  const analyseer = async () => {
    if (!kanAnalyseren || sterren === null) return;
    setLaden(true);
    setFout(null);
    setResultaat(null);
    setEmailVerzonden(false);

    try {
      let screenshotPaden: string[] = [];

      if (geldigeScreenshots.length > 0) {
        const uploadUrlsRes = await fetch("/api/review-remover/upload-urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            screenshots: geldigeScreenshots.map((s, i) => ({ volgnummer: i + 1, type: s.bestand.type })),
          }),
        });
        if (!uploadUrlsRes.ok) throw new Error("Upload voorbereiden mislukt");
        const { uploadTokens } = await uploadUrlsRes.json();

        const supabase = createClient();
        await Promise.all(
          uploadTokens.map(async (t: { volgnummer: number; pad: string; token: string }) => {
            const item = geldigeScreenshots[t.volgnummer - 1];
            const { error } = await supabase.storage
              .from("review-remover-bewijs")
              .uploadToSignedUrl(t.pad, t.token, item.bestand, { contentType: item.bestand.type });
            if (error) throw new Error(`Screenshot uploaden mislukt: ${error.message}`);
          })
        );
        screenshotPaden = uploadTokens.map((t: { pad: string }) => t.pad);
      }

      const res = await fetch("/api/review-remover/analyseer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: naam.trim(),
          email: email.trim(),
          taal,
          reviewTekst: reviewTekst.trim(),
          sterren,
          context: context.trim() || undefined,
          screenshotPaden,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "API fout");
      }
      const data: Resultaat = await res.json();
      setResultaat(data);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis. Probeer het zo opnieuw.");
    } finally {
      setLaden(false);
    }
  };

  const stuurEmail = async () => {
    if (!resultaat) return;
    setEmailVerzendBezig(true);
    try {
      const res = await fetch("/api/review-remover/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resultaat.id }),
      });
      if (res.ok) setEmailVerzonden(true);
    } finally {
      setEmailVerzendBezig(false);
    }
  };

  const verdictLabel =
    resultaat?.verdict === "hoog" ? "Hoge kans op verwijdering" :
    resultaat?.verdict === "gemiddeld" ? "Gemiddelde kans op verwijdering" :
    "Lage kans op verwijdering";

  const verdictKleur =
    resultaat?.verdict === "hoog" ? "text-success bg-success/10 border-success/20" :
    resultaat?.verdict === "gemiddeld" ? "text-warning bg-warning/10 border-warning/20" :
    "text-danger bg-danger/10 border-danger/20";

  return (
    <div className="section">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 mb-8">
          <BoniAvatar size={80} animate={false} src="/Boni-rechter.png" className="flex-shrink-0" />
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary leading-tight">
              Review Remover — check of je een recensie kunt laten verwijderen
            </h1>
            <p className="text-text-secondary mt-1">
              Plak de recensie, geef context en eventueel bewijs. Gratis, geen account nodig.
            </p>
          </div>
        </div>

        <div className="card p-6 sm:p-8 mb-6 space-y-5">
          {/* Naam + email */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-primary mb-1.5">
                Voornaam <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                placeholder="Jouw voornaam"
                className="input"
                disabled={laden}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-1.5">
                E-mailadres <span className="text-accent">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jij@voorbeeld.nl"
                className="input"
                disabled={laden}
              />
            </div>
          </div>

          {/* Review tekst */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">
              De recensie <span className="text-accent">*</span>
            </label>
            <textarea
              value={reviewTekst}
              onChange={(e) => setReviewTekst(e.target.value)}
              placeholder="Plak hier de volledige tekst van de recensie..."
              rows={5}
              className="input"
              disabled={laden}
            />
          </div>

          {/* Sterren */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Hoeveel sterren gaf de gast? <span className="text-accent">*</span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSterren(n)}
                  disabled={laden}
                  className={`w-12 h-12 rounded-xl border text-lg font-semibold transition-colors ${
                    sterren === n ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary hover:border-accent/50"
                  }`}
                >
                  {n}★
                </button>
              ))}
            </div>
          </div>

          {/* Context */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">Context (optioneel)</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Wat is er volgens jou gebeurd? Eventuele relevante details..."
              rows={3}
              className="input"
              disabled={laden}
            />
          </div>

          {/* Screenshots */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">
              Bewijs-screenshots (optioneel, max {MAX_SCREENSHOTS})
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => e.target.files && voegToe(Array.from(e.target.files))}
              disabled={laden || screenshots.length >= MAX_SCREENSHOTS}
              className="text-sm"
            />
            {screenshots.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                {screenshots.map((s) => (
                  <div key={s.id} className="relative">
                    <img src={s.preview} alt="" className="w-full aspect-square object-cover rounded-lg" />
                    {s.fout && <p className="text-xs text-danger mt-1">{s.fout}</p>}
                    <button
                      type="button"
                      onClick={() => verwijder(s.id)}
                      className="absolute -top-2 -right-2 bg-danger text-white w-6 h-6 rounded-full text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Taal */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">Taal van de bezwaarbrief</label>
            <div className="flex gap-3">
              {[{ waarde: "nl", label: "🇳🇱 Nederlands" }, { waarde: "en", label: "🇬🇧 English" }].map((optie) => (
                <label key={optie.waarde} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${taal === optie.waarde ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary hover:border-accent/50"}`}>
                  <input type="radio" name="taal" value={optie.waarde} checked={taal === optie.waarde} onChange={() => setTaal(optie.waarde)} className="sr-only" />
                  {optie.label}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={analyseer}
            disabled={!kanAnalyseren}
            className={`btn-primary w-full ${!kanAnalyseren ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {laden ? "Boni beoordeelt..." : "Beoordeel mijn recensie →"}
          </button>
        </div>

        {fout && (
          <div className="card p-5 border-danger/30 bg-danger/5 flex items-start gap-3 mb-6">
            <BoniAvatar size={40} src="/Boni-rechter.png" className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-danger mb-1">Boni kon de recensie niet beoordelen</p>
              <p className="text-text-secondary text-sm">{fout}</p>
            </div>
          </div>
        )}

        {resultaat && (
          <div className="flex flex-col gap-5">
            <div className="card p-6 sm:p-8">
              <div className={`inline-flex items-center px-4 py-2 rounded-xl border font-semibold text-sm mb-4 ${verdictKleur}`}>
                {verdictLabel}
              </div>
              <p className="text-primary leading-relaxed mb-4">{resultaat.onderbouwing}</p>
              {resultaat.toegepaste_regels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {resultaat.toegepaste_regels.map((regel) => (
                    <span key={regel} className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {regel}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="font-display text-xl font-bold text-primary">Jouw bezwaarbrief</h2>
                <CopyButton tekst={resultaat.bezwaarbrief} />
              </div>
              <p className="text-text-secondary text-sm whitespace-pre-wrap bg-primary/5 rounded-xl p-4">
                {resultaat.bezwaarbrief}
              </p>
            </div>

            <div className="card p-6 sm:p-8">
              <h2 className="font-display text-xl font-bold text-primary mb-3">Stappenplan</h2>
              <ol className="space-y-2">
                {resultaat.stappenplan.map((stap, i) => (
                  <li key={i} className="flex items-start gap-2 text-text-secondary text-sm">
                    <span className="text-accent font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                    {stap}
                  </li>
                ))}
              </ol>
            </div>

            <div className="card p-6 sm:p-8 text-center">
              {emailVerzonden ? (
                <p className="text-success font-semibold">✅ Verstuurd naar {email}</p>
              ) : (
                <button onClick={stuurEmail} disabled={emailVerzendBezig} className="btn-secondary">
                  {emailVerzendBezig ? "Versturen..." : "Stuur naar mijn e-mail"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

```bash
npm run dev
```
Open `http://localhost:3000/review-remover` in a browser. Fill in naam, email, a review
text, pick a star rating, optionally attach a screenshot and context, submit. Confirm:
- The submit button stays disabled until naam/email/reviewTekst/sterren are filled
- Loading state shows "Boni beoordeelt..."
- Result renders with verdict badge, onderbouwing, toegepaste_regels chips, bezwaarbrief
  with working copy button, and a numbered stappenplan
- "Stuur naar mijn e-mail" button works and the email arrives
- If a screenshot was attached, confirm it appears in the Supabase `review-remover-bewijs`
  bucket and the public URL in `screenshot_urls` loads in a browser tab

- [ ] **Step 3: Commit**

```bash
git add src/app/review-remover/page.tsx
git commit -m "Add Review Remover page UI"
```

---

### Task 11: Navbar link + i18n

**Files:**
- Modify: `src/components/Navbar.tsx`
- Modify: `messages/nl.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add the `nav.reviewRemover` key to both message files**

In `messages/nl.json`, inside the `"nav"` object (after `"prijscalculator"`):
```json
    "prijscalculator": "Prijscalculator",
    "reviewRemover": "Review Remover",
```

In `messages/en.json`, find the equivalent `"nav"` object and add the same key in the same
position (translate other surrounding keys only if they're already in English there — leave
existing keys untouched, only add the new one):
```json
    "reviewRemover": "Review Remover",
```

- [ ] **Step 2: Add the Navbar link (desktop)**

In `src/components/Navbar.tsx`, add a new `<Link>` after the `prijscalculator` link in the
desktop nav block (around line 44, right before the `/gratis` link):

```typescript
          <Link href="/prijscalculator" className="text-text-secondary hover:text-primary transition-colors text-sm font-medium">
            {t("prijscalculator")}
          </Link>
          <Link href="/review-remover" className="text-text-secondary hover:text-primary transition-colors text-sm font-medium">
            {t("reviewRemover")}
          </Link>
          <Link href="/gratis" className="text-accent font-semibold text-sm hover:underline">
            {t("gratisProberen")}
          </Link>
```

- [ ] **Step 3: Add the Navbar link (mobile)**

In the mobile menu block (around line 89), add the matching link before `/gratis`:

```typescript
          <Link href="/prijscalculator" onClick={() => setOpen(false)} className="text-text-secondary font-medium">
            {t("prijscalculator")}
          </Link>
          <Link href="/review-remover" onClick={() => setOpen(false)} className="text-text-secondary font-medium">
            {t("reviewRemover")}
          </Link>
          <Link href="/gratis" onClick={() => setOpen(false)} className="text-accent font-semibold">
            {t("gratisProberen")}
          </Link>
```

- [ ] **Step 4: Manual verification**

```bash
npm run dev
```
Open `http://localhost:3000` — confirm "Review Remover" appears in the navbar between
"Prijscalculator" and "Gratis proberen", and links to `/review-remover`. Resize to mobile
width, open the hamburger menu, confirm the same link appears there.

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.tsx messages/nl.json messages/en.json
git commit -m "Add Review Remover link to navbar"
```

---

### Task 12: Admin list page

**Files:**
- Create: `src/app/admin/review-remover/page.tsx`

- [ ] **Step 1: Write the list page**

```typescript
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const ADMIN_EMAIL = "info@bnbassistant.com";

export default async function AdminReviewRemoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();
  const { data: rapporten } = await admin
    .from("review_remover_rapporten")
    .select("id, naam, email, sterren, verdict, aangemaakt_op, email_verzonden")
    .order("aangemaakt_op", { ascending: false })
    .limit(200);

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display text-3xl text-primary">Review Remover — Admin</h1>
          <Link href="/admin" className="btn-secondary text-sm">← Admin</Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Totaal", aantal: rapporten?.length ?? 0, kleur: "text-primary" },
            { label: "Hoge kans", aantal: rapporten?.filter((r) => r.verdict === "hoog").length ?? 0, kleur: "text-success" },
            { label: "Gemiddelde kans", aantal: rapporten?.filter((r) => r.verdict === "gemiddeld").length ?? 0, kleur: "text-warning" },
            { label: "Lage kans", aantal: rapporten?.filter((r) => r.verdict === "laag").length ?? 0, kleur: "text-danger" },
          ].map(({ label, aantal, kleur }) => (
            <div key={label} className="card p-4 text-center">
              <p className={`text-3xl font-bold ${kleur}`}>{aantal}</p>
              <p className="text-xs text-text-secondary mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-display text-xl text-primary">Alle rapporten ({rapporten?.length ?? 0})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Naam", "Email", "Sterren", "Verdict", "E-mail verstuurd", "Datum", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(!rapporten || rapporten.length === 0) && (
                  <tr><td colSpan={7} className="px-5 py-4 text-sm text-text-secondary">Nog geen rapporten.</td></tr>
                )}
                {rapporten?.map((r) => (
                  <tr key={r.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3 font-semibold text-primary">{r.naam}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{r.email}</td>
                    <td className="px-4 py-3 text-text-secondary">{r.sterren}★</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        r.verdict === "hoog" ? "bg-success/10 text-success" :
                        r.verdict === "gemiddeld" ? "bg-warning/10 text-warning" :
                        "bg-danger/10 text-danger"
                      }`}>
                        {r.verdict}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{r.email_verzonden ? "✅" : "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                      {new Date(r.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/review-remover/${r.id}`} className="text-accent text-sm font-semibold hover:underline">
                        Bekijk →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Log in as `info@bnbassistant.com` and visit `http://localhost:3000/admin/review-remover`.
Confirm the row created in Task 7/10 shows up with correct naam/email/sterren/verdict.
Then log in as a different user (or log out) and visit the same URL — confirm it redirects
to `/login`.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/review-remover/page.tsx
git commit -m "Add Review Remover admin list page"
```

---

### Task 13: Admin detail page

**Files:**
- Create: `src/app/admin/review-remover/[id]/page.tsx`

- [ ] **Step 1: Write the detail page**

```typescript
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

const ADMIN_EMAIL = "info@bnbassistant.com";

export default async function AdminReviewRemoverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();
  const { data: rapport } = await admin
    .from("review_remover_rapporten")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!rapport) notFound();

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display text-2xl text-primary">{rapport.naam} — {rapport.email}</h1>
          <Link href="/admin/review-remover" className="btn-secondary text-sm">← Terug</Link>
        </div>

        <div className="card p-6 space-y-2">
          <p className="text-sm text-text-secondary">
            Sterren: <strong>{rapport.sterren}★</strong> · Taal: <strong>{rapport.taal}</strong> ·
            Verdict: <strong>{rapport.verdict}</strong> · E-mail verstuurd: <strong>{rapport.email_verzonden ? "Ja" : "Nee"}</strong>
          </p>
          <p className="text-xs text-text-secondary">
            {new Date(rapport.aangemaakt_op).toLocaleString("nl-NL")}
          </p>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg text-primary mb-2">Recensie-tekst</h2>
          <p className="text-text-secondary text-sm whitespace-pre-wrap">{rapport.review_tekst}</p>
        </div>

        {rapport.context && (
          <div className="card p-6">
            <h2 className="font-display text-lg text-primary mb-2">Context van de host</h2>
            <p className="text-text-secondary text-sm whitespace-pre-wrap">{rapport.context}</p>
          </div>
        )}

        {Array.isArray(rapport.screenshot_urls) && rapport.screenshot_urls.length > 0 && (
          <div className="card p-6">
            <h2 className="font-display text-lg text-primary mb-3">Screenshots</h2>
            <div className="grid grid-cols-3 gap-3">
              {(rapport.screenshot_urls as string[]).map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="card p-6">
          <h2 className="font-display text-lg text-primary mb-2">Onderbouwing</h2>
          <p className="text-text-secondary text-sm">{rapport.onderbouwing}</p>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg text-primary mb-2">Bezwaarbrief</h2>
          <p className="text-text-secondary text-sm whitespace-pre-wrap">{rapport.bezwaarbrief}</p>
        </div>

        {Array.isArray(rapport.stappenplan) && rapport.stappenplan.length > 0 && (
          <div className="card p-6">
            <h2 className="font-display text-lg text-primary mb-2">Stappenplan</h2>
            <ol className="text-text-secondary text-sm space-y-1 list-decimal list-inside">
              {(rapport.stappenplan as string[]).map((stap, i) => <li key={i}>{stap}</li>)}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Click "Bekijk →" from the admin list page for the test row. Confirm review text, context,
screenshots (if any), verdict, onderbouwing, bezwaarbrief, and stappenplan all render
correctly.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/review-remover/[id]/page.tsx"
git commit -m "Add Review Remover admin detail page"
```

---

## Plan self-review notes

- **Spec coverage:** Flow (Task 10), datamodel (Task 1), AI logic + kennisbank (Tasks 2-3, 7), e-mail (Tasks 8-9), admin (Tasks 12-13), error handling (validation + rate limit in Task 7), screenshots (Tasks 5-7 client+server), sterren field (Tasks 1, 7, 10) — all covered.
- **Deviation from spec:** the spec described `stappenplan` as purely AI-generated; this plan keeps it AI-generated but feeds the exact URL/process facts into the system prompt (Task 2's kennisbank) so Claude reproduces them faithfully rather than risking hallucination of the form URL or the "max 2 attempts / 48 hours" facts.
- **No automated tests:** consistent with the rest of the codebase; every task has a manual verification step instead (dev server + curl + Supabase checks).
