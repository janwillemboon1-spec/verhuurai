# Onboarding: Gedeelde Login Per Klant — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Klanten met meerdere woningen krijgen één login (e-mail/wachtwoord/link) in plaats van een aparte inloglink per woning, terwijl checklist/to-do's/KPI's per woning apart blijven.

**Architecture:** Nieuwe tabel `onboarding_logins` bevat de auth-velden (e-mail, wachtwoord_hash, link_token, voornaam, achternaam). De bestaande tabel `onboarding_klanten` blijft de woning-tabel (checklist/todo's/activiteiten/KPI's blijven ongewijzigd aan `klant_id` hangen) en krijgt een `login_id`-koppeling. De klant-facing dashboard-route splitst in een woningkeuzescherm (`/onboarding/[token]/dashboard`) en een per-woning dashboard (`/onboarding/[token]/dashboard/[woningId]`); bij precies 1 woning wordt automatisch doorgeredirect zodat bestaande links blijven werken.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + PostgREST), Resend (e-mail). Geen geautomatiseerde testsuite in dit project — verificatie gebeurt via `tsc --noEmit`, handmatige browser-tests en directe Supabase REST-checks.

**Achtergrond spec:** `docs/superpowers/specs/2026-07-17-onboarding-gedeelde-login-design.md`

**Supabase project:** `https://dldxmdpomagqiqrbxrtq.supabase.co` — SQL Editor: `https://supabase.com/dashboard/project/dldxmdpomagqiqrbxrtq/sql/new`

**Belangrijk over het toolset:** Dit project heeft geen `npm test`. Gebruik voor elke code-stap `npx tsc --noEmit -p tsconfig.json` als snelle verificatie (moet foutloos zijn — bevestigd als schone baseline voor dit plan). `node`/`npm` staan niet standaard op het PATH van een niet-interactieve shell; run eerst `source ~/.nvm/nvm.sh` in dezelfde shell-sessie. Supabase heeft geen CLI/`psql`/`DATABASE_URL` in dit project — SQL-migraties worden geplakt en uitgevoerd in de Supabase SQL Editor (browser), dat is het bestaande patroon in dit project (zie `supabase/*-migration.sql`).

---

### Task 1: Database — nieuwe login-tabel + backfill (additief, breekt niets)

**Files:**
- Create: `supabase/onboarding-gedeelde-login-migration.sql`

- [ ] **Step 1: Schrijf de migratie**

```sql
-- supabase/onboarding-gedeelde-login-migration.sql
-- Stap 1: nieuwe tabel voor de login (los van de woning)
CREATE TABLE IF NOT EXISTS onboarding_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voornaam TEXT,
  achternaam TEXT,
  email TEXT UNIQUE NOT NULL,
  wachtwoord_hash TEXT NOT NULL,
  link_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

-- Stap 2: koppeling toevoegen aan de woning-tabel (nog nullable — bestaande rijen/code blijven werken)
ALTER TABLE onboarding_klanten ADD COLUMN IF NOT EXISTS login_id UUID REFERENCES onboarding_logins(id);

-- Stap 3: backfill — groepeer bestaande klanten-rijen op e-mailadres,
-- de oudst aangemaakte rij per groep wordt de login van die klant
INSERT INTO onboarding_logins (voornaam, achternaam, email, wachtwoord_hash, link_token, aangemaakt_op)
SELECT DISTINCT ON (lower(email))
  voornaam, achternaam, lower(email), wachtwoord_hash, link_token, aangemaakt_op
FROM onboarding_klanten
WHERE login_id IS NULL
ORDER BY lower(email), aangemaakt_op ASC;

UPDATE onboarding_klanten k
SET login_id = l.id
FROM onboarding_logins l
WHERE lower(k.email) = l.email
  AND k.login_id IS NULL;
```

- [ ] **Step 2: Voer de migratie uit in Supabase**

Open `https://supabase.com/dashboard/project/dldxmdpomagqiqrbxrtq/sql/new`, plak de inhoud van `supabase/onboarding-gedeelde-login-migration.sql`, klik **Run**.

- [ ] **Step 3: Verifieer de backfill**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
SUPA_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d'=' -f2-)
SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d'=' -f2-)
curl -s "${SUPA_URL}/rest/v1/onboarding_klanten?select=id,naam,login_id,email" \
  -H "apikey: ${SERVICE_KEY}" -H "Authorization: Bearer ${SERVICE_KEY}" | python3 -m json.tool
```

Expected: elke rij heeft een niet-lege `login_id`. Rijen met hetzelfde (lowercase) e-mailadres hebben hetzelfde `login_id`. Voor de bekende Saskia-case: beide woningen ("Villa Vreeland", "Rumah Rama - Villa Bali") hebben hetzelfde `login_id`, gelijk aan het `id` dat hoort bij de rij met de oudste `aangemaakt_op` (Villa Vreeland).

- [ ] **Step 4: Commit**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
git add supabase/onboarding-gedeelde-login-migration.sql
git commit -m "Voeg onboarding_logins tabel toe + backfill login_id per klant"
```

---

### Task 2: Types bijwerken

**Files:**
- Modify: `src/lib/onboarding/types.ts`

- [ ] **Step 1: Vervang de inhoud van het bestand**

```ts
// src/lib/onboarding/types.ts

export type OnboardingLogin = {
  id: string;
  voornaam: string | null;
  achternaam: string | null;
  email: string;
  link_token: string;
  aangemaakt_op: string;
};

export type OnboardingKlant = {
  id: string;
  login_id: string;
  naam: string;
  startdatum: string;
  aangemaakt_op: string;
  kpi_bezetting_nulmeting: number | null;
  kpi_adr_nulmeting: number | null;
  kpi_reviewscore_nulmeting: number | null;
  kpi_reviews_nulmeting: number | null;
  extra_omzet_periode: string;
  kpi_omzet_365d_nulmeting?: number | null;
  geen_cijfers_nulmeting?: boolean | null;
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
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
source ~/.nvm/nvm.sh
npx tsc --noEmit -p tsconfig.json
```

Expected: veel fouten in andere bestanden die nog `klant.email`/`klant.voornaam`/`klant.link_token` gebruiken — dat lossen de volgende taken op. Bevestig alleen dat dít bestand zelf geen syntaxfouten geeft (geen fouten die naar `types.ts:regel` verwijzen).

- [ ] **Step 3: Commit**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
git add src/lib/onboarding/types.ts
git commit -m "Splits OnboardingKlant type: login-velden naar nieuw OnboardingLogin type"
```

---

### Task 3: E-mailfuncties aanpassen (login-brede mails hebben geen woningnaam meer)

**Files:**
- Modify: `src/lib/onboarding/email.ts:38-82`

- [ ] **Step 1: Vervang `stuurWachtwoordResetEmail` en `stuurUitnodigingsEmail`**

Vervang regels 38 t/m 82 (de twee functies `stuurWachtwoordResetEmail` en `stuurUitnodigingsEmail`) door:

```ts
export async function stuurWachtwoordResetEmail(
  klantEmail: string,
  resetUrl: string,
  voornaam?: string | null
): Promise<void> {
  await resend.emails.send({
    from: "Host Boni <boni@verhuurai.nl>",
    to: klantEmail,
    subject: "Nieuw wachtwoord instellen — Host Boni Onboarding",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #2b3885; margin-bottom: 8px;">Wachtwoord opnieuw instellen</h2>
        <p style="color: #555; margin-bottom: 24px;">Hallo ${aanspreking("daar", voornaam)},<br>Klik op de knop om een nieuw wachtwoord in te stellen. Deze link is 1 uur geldig.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #2b3885; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Wachtwoord instellen</a>
        <p style="color: #aaa; font-size: 12px; margin-top: 24px;">Als je dit niet hebt aangevraagd, kun je deze mail negeren.</p>
      </div>
    `,
  });
}

export async function stuurUitnodigingsEmail(
  klantEmail: string,
  dashboardUrl: string,
  resetUrl: string,
  voornaam?: string | null
): Promise<void> {
  const naam = aanspreking("daar", voornaam);
  await resend.emails.send({
    from: "Host Boni <boni@verhuurai.nl>",
    to: klantEmail,
    subject: "Jouw onboarding dashboard is klaar — Host Boni",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #2b3885; margin-bottom: 8px;">Welkom bij Host Boni, ${naam}!</h2>
        <p style="color: #555; margin-bottom: 8px;">Je persoonlijke onboarding dashboard is aangemaakt. Hier kun je de voortgang van jouw woning(en) volgen en to-do's afvinken.</p>
        <p style="color: #555; margin-bottom: 24px;">Klik op de knop hieronder om eerst een wachtwoord in te stellen, daarna kom je direct op je dashboard.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #2b3885; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 16px;">Wachtwoord instellen & inloggen</a>
        <p style="color: #aaa; font-size: 12px; margin-top: 8px;">Of ga direct naar je dashboard: <a href="${dashboardUrl}" style="color: #2b3885;">${dashboardUrl}</a></p>
        <p style="color: #aaa; font-size: 12px; margin-top: 24px;">Deze link is 1 uur geldig. Daarna kun je een nieuwe aanvragen via de loginpagina.</p>
      </div>
    `,
  });
}
```

`aanspreking`, `stuurStapVoltooidEmail` en `stuurTodoGedaanEmail` blijven ongewijzigd (die krijgen nog steeds een specifieke woningnaam mee vanuit hun eigen caller).

- [ ] **Step 2: Commit**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
git add src/lib/onboarding/email.ts
git commit -m "Ontkoppel reset/uitnodigingsmail van woningnaam (nu login-breed)"
```

---

### Task 4: Nieuwe API-routes voor logins

**Files:**
- Create: `src/app/api/onboarding/logins/route.ts`
- Create: `src/app/api/onboarding/logins/[id]/route.ts`

- [ ] **Step 1: Maak de lijst-route**

```ts
// src/app/api/onboarding/logins/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "info@bnbassistant.com";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("onboarding_logins")
    .select("id, voornaam, achternaam, email, link_token, aangemaakt_op")
    .order("aangemaakt_op", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logins: data });
}
```

- [ ] **Step 2: Maak de detail/PATCH-route**

```ts
// src/app/api/onboarding/logins/[id]/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashWachtwoord } from "@/lib/onboarding/auth";

const ADMIN_EMAIL = "info@bnbassistant.com";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const admin = createAdminClient();
  const { data: login, error } = await admin
    .from("onboarding_logins")
    .select("id, voornaam, achternaam, email, link_token, aangemaakt_op")
    .eq("id", params.id)
    .single();

  if (error || !login) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json({ login });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (body.email !== undefined) updates.email = body.email;
  if (body.wachtwoord) updates.wachtwoord_hash = hashWachtwoord(body.wachtwoord);
  if (body.voornaam !== undefined) updates.voornaam = body.voornaam || null;
  if (body.achternaam !== undefined) updates.achternaam = body.achternaam || null;

  const { data, error } = await admin
    .from("onboarding_logins")
    .update(updates)
    .eq("id", params.id)
    .select("id, voornaam, achternaam, email, link_token, aangemaakt_op")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ login: data });
}
```

- [ ] **Step 3: Type-check**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
source ~/.nvm/nvm.sh
npx tsc --noEmit -p tsconfig.json
```

Expected: geen fouten die verwijzen naar `src/app/api/onboarding/logins/`.

- [ ] **Step 4: Commit**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
git add src/app/api/onboarding/logins
git commit -m "Voeg API routes toe voor onboarding_logins (lijst + detail/PATCH)"
```

---

### Task 5: Auth-routes (login, reset) omzetten naar onboarding_logins

**Files:**
- Modify: `src/app/api/onboarding/auth/[token]/route.ts`
- Modify: `src/app/api/onboarding/auth/[token]/reset-aanvragen/route.ts`
- Modify: `src/app/api/onboarding/auth/[token]/reset-uitvoeren/route.ts`

- [ ] **Step 1: Vervang de inhoud van `route.ts` (login)**

```ts
// src/app/api/onboarding/auth/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWachtwoord, maakCookieWaarde, COOKIE_NAAM, COOKIE_MAX_AGE } from "@/lib/onboarding/auth";

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const body = await request.json();
  const { wachtwoord } = body;
  if (!wachtwoord) return NextResponse.json({ error: "wachtwoord ontbreekt" }, { status: 400 });

  const admin = createAdminClient();
  const { data: login, error } = await admin
    .from("onboarding_logins")
    .select("id, wachtwoord_hash, link_token")
    .eq("link_token", params.token)
    .single();

  if (error || !login) return NextResponse.json({ error: "Ongeldige link" }, { status: 404 });

  const correct = verifyWachtwoord(wachtwoord, login.wachtwoord_hash);
  if (!correct) return NextResponse.json({ error: "Onjuist wachtwoord" }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAAM, maakCookieWaarde(login.link_token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}
```

- [ ] **Step 2: Vervang de inhoud van `reset-aanvragen/route.ts`**

```ts
// src/app/api/onboarding/auth/[token]/reset-aanvragen/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { maakResetToken } from "@/lib/onboarding/auth";
import { stuurWachtwoordResetEmail } from "@/lib/onboarding/email";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data: login } = await admin
    .from("onboarding_logins")
    .select("id, email, link_token, voornaam")
    .eq("link_token", params.token)
    .single();

  if (!login) {
    // Geef altijd 200 terug om e-mail enumeration te voorkomen
    return NextResponse.json({ ok: true });
  }

  const rt = maakResetToken(params.token);
  const resetUrl = `${BASE_URL}/onboarding/${params.token}/reset?rt=${rt}`;

  try {
    await stuurWachtwoordResetEmail(login.email, resetUrl, login.voornaam);
  } catch (err) {
    console.error("Reset email fout:", err);
    return NextResponse.json({ error: "E-mail kon niet worden verstuurd" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Vervang de inhoud van `reset-uitvoeren/route.ts`**

```ts
// src/app/api/onboarding/auth/[token]/reset-uitvoeren/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyResetToken, hashWachtwoord } from "@/lib/onboarding/auth";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { rt, nieuwWachtwoord } = await req.json();

  if (!rt || !nieuwWachtwoord || nieuwWachtwoord.length < 4) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  if (!verifyResetToken(params.token, rt)) {
    return NextResponse.json({ error: "Link is verlopen of ongeldig" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: login } = await admin
    .from("onboarding_logins")
    .select("id")
    .eq("link_token", params.token)
    .single();

  if (!login) {
    return NextResponse.json({ error: "Login niet gevonden" }, { status: 404 });
  }

  const wachtwoord_hash = hashWachtwoord(nieuwWachtwoord);
  await admin.from("onboarding_logins").update({ wachtwoord_hash }).eq("id", login.id);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Type-check en commit**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
source ~/.nvm/nvm.sh
npx tsc --noEmit -p tsconfig.json
git add src/app/api/onboarding/auth
git commit -m "Auth-routes (login/reset) lezen en schrijven nu onboarding_logins"
```

---

### Task 6: Klant-facing login- en resetpagina's

**Files:**
- Modify: `src/app/onboarding/[token]/page.tsx`
- Modify: `src/app/onboarding/[token]/reset/page.tsx`

- [ ] **Step 1: Vervang de inhoud van `onboarding/[token]/page.tsx`**

```tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { COOKIE_NAAM, verifyCookieWaarde } from "@/lib/onboarding/auth";
import { WachtwoordForm } from "./WachtwoordForm";

export default async function OnboardingLoginPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data: login } = await admin
    .from("onboarding_logins")
    .select("id, voornaam, achternaam, link_token")
    .eq("link_token", params.token)
    .single();

  if (!login) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-sm w-full">
          <p className="text-text-secondary">Onbekende onboarding link.</p>
        </div>
      </div>
    );
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAAM);
  if (cookie && verifyCookieWaarde(cookie.value, params.token)) {
    redirect(`/onboarding/${params.token}/dashboard`);
  }

  const naam = login.voornaam || login.achternaam || "daar";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="card p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-display text-2xl text-primary">Welkom, {naam}</h1>
          <p className="text-sm text-text-secondary">Voer je wachtwoord in om je onboarding voortgang te bekijken.</p>
        </div>
        <WachtwoordForm token={params.token} />
      </div>
    </div>
  );
}
```

`WachtwoordForm.tsx` gebruikt geen klant-velden en blijft ongewijzigd.

- [ ] **Step 2: Vervang de inhoud van `onboarding/[token]/reset/page.tsx`**

```tsx
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyResetToken } from "@/lib/onboarding/auth";
import { notFound } from "next/navigation";
import { ResetForm } from "./ResetForm";

export default async function ResetPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { rt?: string };
}) {
  const rt = searchParams.rt;

  if (!rt || !verifyResetToken(params.token, rt)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-sm w-full space-y-3">
          <p className="text-danger font-semibold">Link verlopen</p>
          <p className="text-sm text-text-secondary">
            Deze link is verlopen of ongeldig. Vraag een nieuwe aan via de loginpagina.
          </p>
          <a
            href={`/onboarding/${params.token}`}
            className="btn-secondary text-sm block text-center"
          >
            Terug naar login
          </a>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: login } = await admin
    .from("onboarding_logins")
    .select("voornaam, achternaam")
    .eq("link_token", params.token)
    .single();

  if (!login) notFound();

  const naam = login.voornaam || login.achternaam || "daar";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="card p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-display text-2xl text-primary">Nieuw wachtwoord</h1>
          <p className="text-sm text-text-secondary">Kies een nieuw wachtwoord voor {naam}.</p>
        </div>
        <ResetForm token={params.token} rt={rt} />
      </div>
    </div>
  );
}
```

`ResetForm.tsx` gebruikt geen klant-velden en blijft ongewijzigd.

- [ ] **Step 3: Type-check en commit**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
source ~/.nvm/nvm.sh
npx tsc --noEmit -p tsconfig.json
git add src/app/onboarding/\[token\]/page.tsx src/app/onboarding/\[token\]/reset/page.tsx
git commit -m "Login- en resetpagina's lezen nu onboarding_logins"
```

---

### Task 7: Dashboard splitsen in woningkeuze + per-woning pagina

**Files:**
- Modify: `src/app/onboarding/[token]/dashboard/page.tsx` (wordt woningkeuze/redirect)
- Create: `src/app/onboarding/[token]/dashboard/[woningId]/page.tsx` (het huidige dashboard, verplaatst)

- [ ] **Step 1: Vervang de inhoud van `dashboard/page.tsx`**

```tsx
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { COOKIE_NAAM, verifyCookieWaarde } from "@/lib/onboarding/auth";
import Link from "next/link";

export default async function OnboardingDashboardPage({ params }: { params: { token: string } }) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAAM);
  if (!cookie || !verifyCookieWaarde(cookie.value, params.token)) {
    redirect(`/onboarding/${params.token}`);
  }

  const admin = createAdminClient();
  const { data: login } = await admin
    .from("onboarding_logins")
    .select("id, voornaam, achternaam")
    .eq("link_token", params.token)
    .single();

  if (!login) notFound();

  const { data: woningen } = await admin
    .from("onboarding_klanten")
    .select("id, naam, onboarding_checklist_items(id, voltooid)")
    .eq("login_id", login.id)
    .order("aangemaakt_op");

  if (!woningen || woningen.length === 0) notFound();

  if (woningen.length === 1) {
    redirect(`/onboarding/${params.token}/dashboard/${woningen[0].id}`);
  }

  const naam = login.voornaam || login.achternaam || "daar";

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <p className="text-xs text-text-secondary uppercase tracking-wider">Jouw onboarding bij</p>
          <h1 className="font-display text-2xl text-primary">Host Boni</h1>
          <p className="text-sm text-text-secondary">Hallo {naam} 👋 — kies een woning</p>
        </div>
        <div className="space-y-3">
          {woningen.map((woning: any) => {
            const items = woning.onboarding_checklist_items || [];
            const voltooid = items.filter((i: any) => i.voltooid).length;
            const totaal = items.length;
            const pct = totaal > 0 ? Math.round((voltooid / totaal) * 100) : 0;
            return (
              <Link
                key={woning.id}
                href={`/onboarding/${params.token}/dashboard/${woning.id}`}
                className="card p-5 flex items-center justify-between gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-primary">{woning.naam}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 bg-border rounded-full h-2 max-w-xs">
                      <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-primary">{pct}%</span>
                  </div>
                </div>
                <span className="text-text-secondary">→</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Maak `dashboard/[woningId]/page.tsx`**

```tsx
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { COOKIE_NAAM, verifyCookieWaarde } from "@/lib/onboarding/auth";
import { OnboardingDashboard } from "../OnboardingDashboard";

export default async function OnboardingWoningDashboardPage({ params }: { params: { token: string; woningId: string } }) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAAM);
  if (!cookie || !verifyCookieWaarde(cookie.value, params.token)) {
    redirect(`/onboarding/${params.token}`);
  }

  const admin = createAdminClient();
  const { data: login } = await admin
    .from("onboarding_logins")
    .select("id, voornaam, achternaam")
    .eq("link_token", params.token)
    .single();

  if (!login) notFound();

  const { data: klant } = await admin
    .from("onboarding_klanten")
    .select("*")
    .eq("id", params.woningId)
    .eq("login_id", login.id)
    .single();

  if (!klant) notFound();

  const [
    { data: checklist },
    { data: todos },
    { data: activiteiten },
    { data: metingen },
  ] = await Promise.all([
    admin.from("onboarding_checklist_items").select("*").eq("klant_id", klant.id).order("volgorde"),
    admin.from("onboarding_todos").select("*").eq("klant_id", klant.id).order("aangemaakt_op"),
    admin.from("onboarding_activiteiten").select("*").eq("klant_id", klant.id).order("datum", { ascending: false }),
    admin.from("onboarding_kpi_metingen").select("*").eq("klant_id", klant.id).order("datum", { ascending: false }),
  ]);

  const naam = login.voornaam || login.achternaam || "daar";

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <p className="text-xs text-text-secondary uppercase tracking-wider">Jouw onboarding bij</p>
          <h1 className="font-display text-2xl text-primary">Host Boni</h1>
          <p className="text-sm text-text-secondary">Hallo {naam} 👋 — {klant.naam}</p>
        </div>
        <OnboardingDashboard
          klant={klant}
          checklist={checklist || []}
          todos={todos || []}
          activiteiten={activiteiten || []}
          metingen={metingen || []}
        />
      </div>
    </div>
  );
}
```

`OnboardingDashboard.tsx` gebruikt de `klant`-prop nergens rechtstreeks (alleen checklist/todos/activiteiten/metingen) en blijft ongewijzigd.

- [ ] **Step 3: Type-check en commit**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
source ~/.nvm/nvm.sh
npx tsc --noEmit -p tsconfig.json
git add src/app/onboarding/\[token\]/dashboard
git commit -m "Splits klant-dashboard in woningkeuze en per-woning pagina"
```

---

### Task 8: Klanten-API (POST/PATCH) — login_id ondersteunen + duplicaat-check

**Files:**
- Modify: `src/app/api/onboarding/klanten/route.ts`
- Modify: `src/app/api/onboarding/klanten/[id]/route.ts`

- [ ] **Step 1: Vervang de inhoud van `klanten/route.ts`**

```ts
// src/app/api/onboarding/klanten/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashWachtwoord } from "@/lib/onboarding/auth";

const ADMIN_EMAIL = "info@bnbassistant.com";

const STANDAARD_CHECKLIST = [
  { fase: "Advertentie optimalisatie", naam: "Advertentietitel geanalyseerd", volgorde: 1 },
  { fase: "Advertentie optimalisatie", naam: "Omschrijving herschreven", volgorde: 2 },
  { fase: "Advertentie optimalisatie", naam: "Foto's beoordeeld en aanbevelingen gegeven", volgorde: 3 },
  { fase: "Advertentie optimalisatie", naam: "Voorzieningenlijst gecontroleerd", volgorde: 4 },
  { fase: "Advertentie optimalisatie", naam: "Huisregels gecheckt", volgorde: 5 },
  { fase: "Prijsstrategie", naam: "Basisprijs ingesteld", volgorde: 6 },
  { fase: "Prijsstrategie", naam: "Weekendtoeslag geconfigureerd", volgorde: 7 },
  { fase: "Prijsstrategie", naam: "Seizoensprijzen ingesteld", volgorde: 8 },
  { fase: "Prijsstrategie", naam: "Minimum nachten bepaald", volgorde: 9 },
  { fase: "Prijsstrategie", naam: "Last-minute korting ingesteld", volgorde: 10 },
  { fase: "Reviews & profiel", naam: "Reviews geanalyseerd", volgorde: 11 },
  { fase: "Reviews & profiel", naam: "Antwoordstrategie bepaald", volgorde: 12 },
  { fase: "Reviews & profiel", naam: "Host profiel beoordeeld", volgorde: 13 },
  { fase: "Go-live", naam: "Alles gereviewed", volgorde: 14 },
  { fase: "Go-live", naam: "Klant geïnformeerd", volgorde: 15 },
  { fase: "Go-live", naam: "Live gegaan", volgorde: 16 },
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("onboarding_klanten")
    .select("*, onboarding_logins(id, voornaam, achternaam, email, link_token), onboarding_checklist_items(id, voltooid), onboarding_todos(id, gedaan)")
    .order("aangemaakt_op", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ klanten: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const body = await request.json();
  const { naam, login_id, email, wachtwoord, voornaam, achternaam, kpi_bezetting_nulmeting, kpi_adr_nulmeting,
          kpi_reviewscore_nulmeting, kpi_reviews_nulmeting, kpi_omzet_365d_nulmeting,
          geen_cijfers_nulmeting, extra_omzet_periode, datum_nulmeting } = body;

  if (!naam) {
    return NextResponse.json({ error: "naam van de woning is verplicht" }, { status: 400 });
  }

  const admin = createAdminClient();
  let loginId: string | undefined = login_id;

  if (!loginId) {
    if (!email || !wachtwoord) {
      return NextResponse.json({ error: "email en wachtwoord zijn verplicht voor een nieuwe klant" }, { status: 400 });
    }

    const { data: bestaand } = await admin
      .from("onboarding_logins")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (bestaand) {
      return NextResponse.json(
        { error: "Dit e-mailadres bestaat al — voeg de woning toe via 'Bestaande klant'" },
        { status: 409 }
      );
    }

    const { data: login, error: loginError } = await admin
      .from("onboarding_logins")
      .insert({
        email: email.toLowerCase(),
        wachtwoord_hash: hashWachtwoord(wachtwoord),
        voornaam: voornaam || null,
        achternaam: achternaam || null,
      })
      .select("id")
      .single();

    if (loginError || !login) return NextResponse.json({ error: loginError?.message || "Klant aanmaken mislukt" }, { status: 500 });
    loginId = login.id;
  }

  const { data: klant, error } = await admin
    .from("onboarding_klanten")
    .insert({
      naam,
      login_id: loginId,
      kpi_bezetting_nulmeting: kpi_bezetting_nulmeting ?? null,
      kpi_adr_nulmeting: kpi_adr_nulmeting ?? null,
      kpi_reviewscore_nulmeting: kpi_reviewscore_nulmeting ?? null,
      kpi_reviews_nulmeting: kpi_reviews_nulmeting ?? null,
      kpi_omzet_365d_nulmeting: kpi_omzet_365d_nulmeting ?? null,
      geen_cijfers_nulmeting: geen_cijfers_nulmeting ?? false,
      extra_omzet_periode: extra_omzet_periode || "afgelopen 30 dagen",
      datum_nulmeting: datum_nulmeting || null,
    })
    .select()
    .single();

  if (error || !klant) return NextResponse.json({ error: error?.message || "Aanmaken mislukt" }, { status: 500 });

  const checklistItems = STANDAARD_CHECKLIST.map(item => ({
    klant_id: klant.id,
    fase: item.fase,
    naam: item.naam,
    volgorde: item.volgorde,
  }));
  await admin.from("onboarding_checklist_items").insert(checklistItems);

  return NextResponse.json({ klant }, { status: 201 });
}
```

- [ ] **Step 2: Vervang de inhoud van `klanten/[id]/route.ts`**

```ts
// src/app/api/onboarding/klanten/[id]/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "info@bnbassistant.com";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const admin = createAdminClient();
  const { data: klant, error } = await admin
    .from("onboarding_klanten")
    .select("*, onboarding_logins(id, voornaam, achternaam, email, link_token)")
    .eq("id", params.id)
    .single();

  if (error || !klant) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const [
    { data: checklist },
    { data: todos },
    { data: activiteiten },
    { data: metingen },
  ] = await Promise.all([
    admin.from("onboarding_checklist_items").select("*").eq("klant_id", params.id).order("volgorde"),
    admin.from("onboarding_todos").select("*").eq("klant_id", params.id).order("aangemaakt_op"),
    admin.from("onboarding_activiteiten").select("*").eq("klant_id", params.id).order("datum", { ascending: false }),
    admin.from("onboarding_kpi_metingen").select("*").eq("klant_id", params.id).order("datum", { ascending: false }),
  ]);

  return NextResponse.json({ klant, checklist, todos, activiteiten, metingen });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (body.naam !== undefined) updates.naam = body.naam;
  if (body.kpi_bezetting_nulmeting !== undefined) updates.kpi_bezetting_nulmeting = body.kpi_bezetting_nulmeting;
  if (body.kpi_adr_nulmeting !== undefined) updates.kpi_adr_nulmeting = body.kpi_adr_nulmeting;
  if (body.kpi_reviewscore_nulmeting !== undefined) updates.kpi_reviewscore_nulmeting = body.kpi_reviewscore_nulmeting;
  if (body.kpi_reviews_nulmeting !== undefined) updates.kpi_reviews_nulmeting = body.kpi_reviews_nulmeting;
  if (body.extra_omzet_periode !== undefined) updates.extra_omzet_periode = body.extra_omzet_periode;
  if (body.geen_cijfers_nulmeting !== undefined) updates.geen_cijfers_nulmeting = body.geen_cijfers_nulmeting;
  if (body.kpi_omzet_365d_nulmeting !== undefined) updates.kpi_omzet_365d_nulmeting = body.kpi_omzet_365d_nulmeting;
  if (body.datum_nulmeting !== undefined) updates.datum_nulmeting = body.datum_nulmeting || null;

  const { data, error } = await admin
    .from("onboarding_klanten")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ klant: data });
}
```

- [ ] **Step 3: Type-check en commit**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
source ~/.nvm/nvm.sh
npx tsc --noEmit -p tsconfig.json
git add src/app/api/onboarding/klanten/route.ts src/app/api/onboarding/klanten/\[id\]/route.ts
git commit -m "Klanten-API ondersteunt koppelen aan bestaande login + duplicaat-check"
```

---

### Task 9: Uitnodiging-, checklist- en todo-routes met geneste login-join

**Files:**
- Modify: `src/app/api/onboarding/klanten/[id]/uitnodiging/route.ts`
- Modify: `src/app/api/onboarding/checklist/[item-id]/route.ts`
- Modify: `src/app/api/onboarding/todos/[todo-id]/gedaan/route.ts`

- [ ] **Step 1: Vervang de inhoud van `uitnodiging/route.ts`**

```ts
// src/app/api/onboarding/klanten/[id]/uitnodiging/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { maakResetToken } from "@/lib/onboarding/auth";
import { stuurUitnodigingsEmail } from "@/lib/onboarding/email";

const ADMIN_EMAIL = "info@bnbassistant.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: klant } = await admin
    .from("onboarding_klanten")
    .select("id, onboarding_logins(email, link_token, voornaam)")
    .eq("id", params.id)
    .single();

  const login = (klant as any)?.onboarding_logins;
  if (!klant || !login) {
    return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
  }

  const token = login.link_token;
  const rt = maakResetToken(token);
  const dashboardUrl = `${BASE_URL}/onboarding/${token}/dashboard`;
  const resetUrl = `${BASE_URL}/onboarding/${token}/reset?rt=${rt}`;

  try {
    await stuurUitnodigingsEmail(login.email, dashboardUrl, resetUrl, login.voornaam);
  } catch (err) {
    console.error("Uitnodigingsmail fout:", err);
    return NextResponse.json({ error: "E-mail kon niet worden verstuurd" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Vervang de inhoud van `checklist/[item-id]/route.ts`**

```ts
// src/app/api/onboarding/checklist/[item-id]/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { stuurStapVoltooidEmail } from "@/lib/onboarding/email";

const ADMIN_EMAIL = "info@bnbassistant.com";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL;
}

export async function PATCH(request: Request, { params }: { params: { "item-id": string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (body.voltooid !== undefined) {
    updates.voltooid = body.voltooid;
    updates.voltooid_op = body.voltooid ? new Date().toISOString() : null;
  }
  if (body.notitie !== undefined) updates.notitie = body.notitie;
  if (body.naam !== undefined) updates.naam = body.naam;
  if (body.fase !== undefined) updates.fase = body.fase;

  const { data: item, error } = await admin
    .from("onboarding_checklist_items")
    .update(updates)
    .eq("id", params["item-id"])
    .select("*, onboarding_klanten(naam, onboarding_logins(email, voornaam))")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.voltooid === true && item) {
    const klant = (item as any).onboarding_klanten;
    const login = klant?.onboarding_logins;
    if (login?.email) {
      await stuurStapVoltooidEmail(login.email, klant.naam, item.naam, login.voornaam).catch(() => {});
    }
  }

  return NextResponse.json({ item });
}

export async function DELETE(_: Request, { params }: { params: { "item-id": string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("onboarding_checklist_items")
    .delete()
    .eq("id", params["item-id"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Vervang de inhoud van `todos/[todo-id]/gedaan/route.ts`**

```ts
// src/app/api/onboarding/todos/[todo-id]/gedaan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCookieWaarde, COOKIE_NAAM } from "@/lib/onboarding/auth";
import { stuurTodoGedaanEmail } from "@/lib/onboarding/email";

export async function POST(request: NextRequest, { params }: { params: { "todo-id": string } }) {
  const admin = createAdminClient();

  const { data: todo, error: todoError } = await admin
    .from("onboarding_todos")
    .select("*, onboarding_klanten(naam, onboarding_logins(link_token))")
    .eq("id", params["todo-id"])
    .single();

  if (todoError || !todo) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const klant = (todo as any).onboarding_klanten;
  const token = klant?.onboarding_logins?.link_token;

  const cookieWaarde = request.cookies.get(COOKIE_NAAM)?.value;
  if (!cookieWaarde || !verifyCookieWaarde(cookieWaarde, token)) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const { data: bijgewerkt, error } = await admin
    .from("onboarding_todos")
    .update({ gedaan: true, gedaan_op: new Date().toISOString() })
    .eq("id", params["todo-id"])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await stuurTodoGedaanEmail(klant.naam, todo.tekst).catch(() => {});

  return NextResponse.json({ todo: bijgewerkt });
}
```

- [ ] **Step 4: Type-check en commit**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
source ~/.nvm/nvm.sh
npx tsc --noEmit -p tsconfig.json
git add src/app/api/onboarding/klanten/\[id\]/uitnodiging/route.ts src/app/api/onboarding/checklist/\[item-id\]/route.ts src/app/api/onboarding/todos/\[todo-id\]/gedaan/route.ts
git commit -m "Uitnodiging/checklist/todo-routes halen login-gegevens via geneste join op"
```

---

### Task 10: Admin-overzicht — groeperen per login

**Files:**
- Modify: `src/app/admin/onboarding/page.tsx`

- [ ] **Step 1: Vervang de volledige inhoud**

```tsx
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const ADMIN_EMAIL = "info@bnbassistant.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

type WoningRow = {
  id: string;
  naam: string;
  startdatum: string;
  onboarding_checklist_items: { id: string; voltooid: boolean }[];
  onboarding_todos: { id: string; gedaan: boolean }[];
  onboarding_logins: {
    id: string;
    voornaam: string | null;
    achternaam: string | null;
    email: string;
    link_token: string;
  };
};

export default async function OnboardingOverzichtPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();
  const { data: woningen } = await admin
    .from("onboarding_klanten")
    .select("id, naam, startdatum, onboarding_checklist_items(id, voltooid), onboarding_todos(id, gedaan), onboarding_logins(id, voornaam, achternaam, email, link_token)")
    .order("aangemaakt_op", { ascending: false });

  const groepen = new Map<string, { login: WoningRow["onboarding_logins"]; woningen: WoningRow[] }>();
  for (const woning of (woningen || []) as unknown as WoningRow[]) {
    const login = woning.onboarding_logins;
    if (!groepen.has(login.id)) groepen.set(login.id, { login, woningen: [] });
    groepen.get(login.id)!.woningen.push(woning);
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl text-primary">Onboarding</h1>
            <p className="text-text-secondary text-sm mt-1">Online Beheer — klant voortgang</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/onboarding/nieuw" className="btn-primary text-sm">+ Nieuwe woning</Link>
            <Link href="/cockpit" className="btn-secondary text-sm">← Cockpit</Link>
          </div>
        </div>

        {groepen.size === 0 && (
          <div className="card p-8 text-center text-text-secondary">
            <p className="text-lg">Nog geen onboarding klanten.</p>
            <Link href="/admin/onboarding/nieuw" className="btn-primary text-sm mt-4 inline-block">Eerste klant toevoegen</Link>
          </div>
        )}

        <div className="space-y-4">
          {Array.from(groepen.values()).map(({ login, woningen }) => (
            <div key={login.id} className="card p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-semibold text-primary text-lg">
                    {[login.voornaam, login.achternaam].filter(Boolean).join(" ") || login.email}
                  </h2>
                  <span className="text-xs text-text-secondary">{login.email}</span>
                </div>
                <a
                  href={`${BASE_URL}/onboarding/${login.link_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs"
                >
                  Klant link →
                </a>
              </div>
              <div className="space-y-2">
                {woningen.map(woning => {
                  const items = woning.onboarding_checklist_items || [];
                  const todos = woning.onboarding_todos || [];
                  const voltooid = items.filter(i => i.voltooid).length;
                  const totaal = items.length;
                  const pct = totaal > 0 ? Math.round((voltooid / totaal) * 100) : 0;
                  const openTodos = todos.filter(t => !t.gedaan).length;
                  const pctKleur = pct >= 80 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-accent";

                  return (
                    <div key={woning.id} className="bg-surface rounded-xl p-4 flex items-start gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-medium text-primary">{woning.naam}</h3>
                          {openTodos > 0 && <span className="text-xs bg-warning/15 text-warning font-semibold px-2 py-0.5 rounded-full">{openTodos} to-do{openTodos !== 1 ? "'s" : ""} open</span>}
                        </div>
                        <p className="text-xs text-text-secondary mb-2">
                          Gestart: {new Date(woning.startdatum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-border rounded-full h-2 max-w-xs">
                            <div className={`${pctKleur} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-semibold text-primary">{pct}%</span>
                          <span className="text-xs text-text-secondary">{voltooid}/{totaal} stappen</span>
                        </div>
                      </div>
                      <Link href={`/admin/onboarding/${woning.id}`} className="btn-primary text-xs shrink-0">
                        Beheren →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check en commit**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
source ~/.nvm/nvm.sh
npx tsc --noEmit -p tsconfig.json
git add src/app/admin/onboarding/page.tsx
git commit -m "Admin-overzicht groepeert woningen per login"
```

---

### Task 11: Admin "nieuwe woning" — kiezen tussen nieuwe en bestaande klant

**Files:**
- Modify: `src/app/admin/onboarding/nieuw/page.tsx`

- [ ] **Step 1: Vervang de volledige inhoud**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Login = {
  id: string;
  voornaam: string | null;
  achternaam: string | null;
  email: string;
};

export default function NieuweKlantPage() {
  const router = useRouter();
  const [modus, setModus] = useState<"nieuw" | "bestaand">("nieuw");
  const [logins, setLogins] = useState<Login[]>([]);
  const [zoek, setZoek] = useState("");
  const [gekozenLoginId, setGekozenLoginId] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [form, setForm] = useState({
    naam: "",
    email: "",
    wachtwoord: "",
    voornaam: "",
    achternaam: "",
    kpi_bezetting_nulmeting: "",
    kpi_adr_nulmeting: "",
    kpi_reviewscore_nulmeting: "",
    kpi_reviews_nulmeting: "",
    kpi_omzet_365d_nulmeting: "",
    extra_omzet_periode: "afgelopen 30 dagen",
    geen_cijfers_nulmeting: false as boolean,
    datum_nulmeting: "",
  });

  useEffect(() => {
    if (modus === "bestaand" && logins.length === 0) {
      fetch("/api/onboarding/logins")
        .then(res => res.json())
        .then(data => setLogins(data.logins || []));
    }
  }, [modus, logins.length]);

  const gefilterdeLogins = logins.filter(l => {
    const tekst = `${l.voornaam || ""} ${l.achternaam || ""} ${l.email}`.toLowerCase();
    return tekst.includes(zoek.toLowerCase());
  });

  const stuur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modus === "bestaand" && !gekozenLoginId) {
      setFout("Kies eerst een bestaande klant");
      return;
    }
    setBezig(true);
    setFout(null);
    try {
      const body: Record<string, unknown> = {
        naam: form.naam,
        kpi_bezetting_nulmeting: form.kpi_bezetting_nulmeting ? parseFloat(form.kpi_bezetting_nulmeting) : null,
        kpi_adr_nulmeting: form.kpi_adr_nulmeting ? parseFloat(form.kpi_adr_nulmeting) : null,
        kpi_reviewscore_nulmeting: form.kpi_reviewscore_nulmeting ? parseFloat(form.kpi_reviewscore_nulmeting) : null,
        kpi_reviews_nulmeting: form.kpi_reviews_nulmeting ? parseInt(form.kpi_reviews_nulmeting) : null,
        kpi_omzet_365d_nulmeting: form.kpi_omzet_365d_nulmeting ? parseFloat(form.kpi_omzet_365d_nulmeting) : null,
        geen_cijfers_nulmeting: form.geen_cijfers_nulmeting,
        extra_omzet_periode: form.extra_omzet_periode,
        datum_nulmeting: form.datum_nulmeting || null,
      };
      if (modus === "bestaand") {
        body.login_id = gekozenLoginId;
      } else {
        body.email = form.email;
        body.wachtwoord = form.wachtwoord;
        body.voornaam = form.voornaam || null;
        body.achternaam = form.achternaam || null;
      }

      const res = await fetch("/api/onboarding/klanten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
          <h1 className="font-display text-2xl text-primary">Nieuwe woning</h1>
          <Link href="/admin/onboarding" className="btn-secondary text-sm">← Terug</Link>
        </div>

        <form onSubmit={stuur} className="card p-6 space-y-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModus("nieuw")}
              className={modus === "nieuw" ? "btn-primary text-sm" : "btn-secondary text-sm"}
            >
              Nieuwe klant
            </button>
            <button
              type="button"
              onClick={() => setModus("bestaand")}
              className={modus === "bestaand" ? "btn-primary text-sm" : "btn-secondary text-sm"}
            >
              Bestaande klant
            </button>
          </div>

          {modus === "bestaand" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary">Zoek klant *</label>
              <input
                className="input w-full"
                placeholder="Naam of e-mailadres"
                value={zoek}
                onChange={e => setZoek(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-xl p-2">
                {gefilterdeLogins.length === 0 && <p className="text-xs text-text-secondary p-2">Geen klanten gevonden.</p>}
                {gefilterdeLogins.map(login => (
                  <button
                    type="button"
                    key={login.id}
                    onClick={() => setGekozenLoginId(login.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${gekozenLoginId === login.id ? "bg-accent/10 text-accent font-semibold" : "hover:bg-surface"}`}
                  >
                    {[login.voornaam, login.achternaam].filter(Boolean).join(" ") || login.email}
                    <span className="text-text-secondary ml-2">{login.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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

          {modus === "nieuw" && (
            <>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-primary">Voornaam <span className="text-text-secondary font-normal">(optioneel)</span></label>
                  <input
                    className="input w-full"
                    placeholder="bijv. Lisa"
                    value={form.voornaam}
                    onChange={e => setForm(f => ({ ...f, voornaam: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-primary">Achternaam <span className="text-text-secondary font-normal">(optioneel)</span></label>
                  <input
                    className="input w-full"
                    placeholder="bijv. de Vries"
                    value={form.achternaam}
                    onChange={e => setForm(f => ({ ...f, achternaam: e.target.value }))}
                  />
                </div>
              </div>
            </>
          )}

          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-primary mb-1">KPI nulmeting <span className="font-normal text-text-secondary">(optioneel — cijfers uit PriceLabs)</span></h3>
            <div className="space-y-1 mb-3">
              <label className="text-xs font-medium text-text-secondary">Datum nulmeting</label>
              <input
                type="date"
                className="input w-full"
                value={form.datum_nulmeting}
                onChange={e => setForm(f => ({ ...f, datum_nulmeting: e.target.value }))}
                disabled={form.geen_cijfers_nulmeting}
              />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="geen_cijfers"
                checked={form.geen_cijfers_nulmeting}
                onChange={e => setForm(f => ({ ...f, geen_cijfers_nulmeting: e.target.checked }))}
                className="w-4 h-4 accent-accent"
              />
              <label htmlFor="geen_cijfers" className="text-sm text-text-secondary cursor-pointer">
                Nieuwe woning — nog geen cijfers beschikbaar
              </label>
            </div>
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
                  disabled={form.geen_cijfers_nulmeting}
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
                  disabled={form.geen_cijfers_nulmeting}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-secondary">Reviewscore (gem.)</label>
                <input
                  type="number"
                  className="input w-full"
                  placeholder="bijv. 4.62"
                  min="1"
                  max="5"
                  step="0.01"
                  value={form.kpi_reviewscore_nulmeting}
                  onChange={e => setForm(f => ({ ...f, kpi_reviewscore_nulmeting: e.target.value }))}
                  disabled={form.geen_cijfers_nulmeting}
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
                  disabled={form.geen_cijfers_nulmeting}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-medium text-text-secondary">Omzet afgelopen 365 dagen (€)</label>
                <input
                  type="number"
                  className="input w-full"
                  placeholder="bijv. 24000"
                  min="0"
                  step="0.01"
                  value={form.kpi_omzet_365d_nulmeting}
                  onChange={e => setForm(f => ({ ...f, kpi_omzet_365d_nulmeting: e.target.value }))}
                  disabled={form.geen_cijfers_nulmeting}
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
            {bezig ? "Aanmaken..." : "Woning aanmaken"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check en commit**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
source ~/.nvm/nvm.sh
npx tsc --noEmit -p tsconfig.json
git add src/app/admin/onboarding/nieuw/page.tsx
git commit -m "Nieuwe-woning-formulier: kies tussen nieuwe en bestaande klant"
```

---

### Task 12: Admin woningbeheer — Klantgegevens splitsen in Woninggegevens + Login

**Files:**
- Modify: `src/app/admin/onboarding/[id]/page.tsx`
- Modify: `src/app/admin/onboarding/[id]/AdminOnboardingClient.tsx`

- [ ] **Step 1: Vervang de inhoud van `[id]/page.tsx`**

```tsx
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AdminOnboardingClient } from "./AdminOnboardingClient";

const ADMIN_EMAIL = "info@bnbassistant.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

export default async function AdminKlantPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();
  const [
    { data: klant },
    { data: checklist },
    { data: todos },
    { data: activiteiten },
    { data: metingen },
  ] = await Promise.all([
    admin.from("onboarding_klanten").select("*, onboarding_logins(*)").eq("id", params.id).single(),
    admin.from("onboarding_checklist_items").select("*").eq("klant_id", params.id).order("volgorde"),
    admin.from("onboarding_todos").select("*").eq("klant_id", params.id).order("aangemaakt_op"),
    admin.from("onboarding_activiteiten").select("*").eq("klant_id", params.id).order("datum", { ascending: false }),
    admin.from("onboarding_kpi_metingen").select("*").eq("klant_id", params.id).order("datum", { ascending: false }),
  ]);

  if (!klant) notFound();

  const login = (klant as any).onboarding_logins;

  const { data: andereWoningen } = await admin
    .from("onboarding_klanten")
    .select("id, naam")
    .eq("login_id", login.id)
    .neq("id", params.id);

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl text-primary">{klant.naam}</h1>
            <p className="text-text-secondary text-sm">{login.email}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a
              href={`${BASE_URL}/onboarding/${login.link_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs"
            >
              Klant link →
            </a>
            <Link href="/admin/onboarding" className="btn-secondary text-sm">← Overzicht</Link>
          </div>
        </div>

        <AdminOnboardingClient
          klant={klant}
          login={login}
          andereWoningen={andereWoningen || []}
          checklistInit={checklist || []}
          todosInit={todos || []}
          activiteitenInit={activiteiten || []}
          metingenInit={metingen || []}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vervang de imports, props en het "Klantgegevens"-blok in `AdminOnboardingClient.tsx`**

Vervang regels 1 t/m 60 (imports, types, state tot en met `bewerkForm`) door:

```tsx
"use client";

import { useState } from "react";
import type {
  OnboardingKlant,
  OnboardingLogin,
  OnboardingChecklistItem,
  OnboardingTodo,
  OnboardingActiviteit,
  OnboardingKpiMeting,
} from "@/lib/onboarding/types";

type Props = {
  klant: OnboardingKlant;
  login: OnboardingLogin;
  andereWoningen: { id: string; naam: string }[];
  checklistInit: OnboardingChecklistItem[];
  todosInit: OnboardingTodo[];
  activiteitenInit: OnboardingActiviteit[];
  metingenInit: OnboardingKpiMeting[];
};

function berekenExtraOmzet(
  klant: OnboardingKlant,
  metingen: OnboardingKpiMeting[]
): number | null {
  const laatste = metingen[0];
  if (!laatste || !klant.kpi_bezetting_nulmeting || !klant.kpi_adr_nulmeting) return null;
  if (!laatste.bezetting || !laatste.adr) return null;
  const dagOud = (klant.kpi_bezetting_nulmeting / 100) * klant.kpi_adr_nulmeting;
  const dagNieuw = (laatste.bezetting / 100) * laatste.adr;
  return Math.round((dagNieuw - dagOud) * 30);
}

export function AdminOnboardingClient({ klant, login, andereWoningen, checklistInit, todosInit, activiteitenInit, metingenInit }: Props) {
  const [klantData, setKlantData] = useState(klant);
  const [loginData, setLoginData] = useState(login);
  const [checklist, setChecklist] = useState(checklistInit);
  const [todos, setTodos] = useState(todosInit);
  const [activiteiten, setActiviteiten] = useState(activiteitenInit);
  const [metingen, setMetingen] = useState(metingenInit);

  const [woningBewerkOpen, setWoningBewerkOpen] = useState(false);
  const [woningForm, setWoningForm] = useState({
    naam: klant.naam,
    kpi_bezetting_nulmeting: klant.kpi_bezetting_nulmeting?.toString() ?? "",
    kpi_adr_nulmeting: klant.kpi_adr_nulmeting?.toString() ?? "",
    kpi_reviewscore_nulmeting: klant.kpi_reviewscore_nulmeting?.toString() ?? "",
    kpi_reviews_nulmeting: klant.kpi_reviews_nulmeting?.toString() ?? "",
    kpi_omzet_365d_nulmeting: klant.kpi_omzet_365d_nulmeting?.toString() ?? "",
    geen_cijfers_nulmeting: klant.geen_cijfers_nulmeting ?? false,
    extra_omzet_periode: klant.extra_omzet_periode ?? "afgelopen 30 dagen",
    datum_nulmeting: klant.datum_nulmeting ?? "",
  });
  const [woningBezig, setWoningBezig] = useState(false);
  const [woningFout, setWoningFout] = useState<string | null>(null);
  const [woningSucces, setWoningSucces] = useState(false);

  const [loginBewerkOpen, setLoginBewerkOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: login.email,
    wachtwoord: "",
    voornaam: login.voornaam ?? "",
    achternaam: login.achternaam ?? "",
  });
  const [loginBezig, setLoginBezig] = useState(false);
  const [loginFout, setLoginFout] = useState<string | null>(null);
  const [loginSucces, setLoginSucces] = useState(false);

  const [uitnodigingBezig, setUitnodigingBezig] = useState(false);
  const [uitnodigingSucces, setUitnodigingSucces] = useState(false);
  const [uitnodigingFout, setUitnodigingFout] = useState<string | null>(null);
```

- [ ] **Step 3: Vervang `slaKlantOp` door `slaWoningOp` en `slaLoginOp`**

Zoek de functie `slaKlantOp` (huidige regels ~85-124) en vervang die door:

```tsx
  async function slaWoningOp(e: React.FormEvent) {
    e.preventDefault();
    setWoningBezig(true);
    setWoningFout(null);
    setWoningSucces(false);

    const body: Record<string, unknown> = {
      naam: woningForm.naam,
      kpi_bezetting_nulmeting: woningForm.kpi_bezetting_nulmeting ? parseFloat(woningForm.kpi_bezetting_nulmeting) : null,
      kpi_adr_nulmeting: woningForm.kpi_adr_nulmeting ? parseFloat(woningForm.kpi_adr_nulmeting) : null,
      kpi_reviewscore_nulmeting: woningForm.kpi_reviewscore_nulmeting ? parseFloat(woningForm.kpi_reviewscore_nulmeting) : null,
      kpi_reviews_nulmeting: woningForm.kpi_reviews_nulmeting ? parseInt(woningForm.kpi_reviews_nulmeting) : null,
      kpi_omzet_365d_nulmeting: woningForm.kpi_omzet_365d_nulmeting ? parseFloat(woningForm.kpi_omzet_365d_nulmeting) : null,
      geen_cijfers_nulmeting: woningForm.geen_cijfers_nulmeting,
      extra_omzet_periode: woningForm.extra_omzet_periode,
      datum_nulmeting: woningForm.datum_nulmeting || null,
    };

    const res = await fetch(`/api/onboarding/klanten/${klant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      setKlantData(data.klant);
      setWoningSucces(true);
      setTimeout(() => setWoningSucces(false), 3000);
    } else {
      const data = await res.json();
      setWoningFout(data.error || "Opslaan mislukt");
    }
    setWoningBezig(false);
  }

  async function slaLoginOp(e: React.FormEvent) {
    e.preventDefault();
    setLoginBezig(true);
    setLoginFout(null);
    setLoginSucces(false);

    const body: Record<string, unknown> = {
      email: loginForm.email,
      voornaam: loginForm.voornaam || null,
      achternaam: loginForm.achternaam || null,
    };
    if (loginForm.wachtwoord) body.wachtwoord = loginForm.wachtwoord;

    const res = await fetch(`/api/onboarding/logins/${login.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      setLoginData(data.login);
      setLoginSucces(true);
      setLoginForm(f => ({ ...f, wachtwoord: "" }));
      setTimeout(() => setLoginSucces(false), 3000);
    } else {
      const data = await res.json();
      setLoginFout(data.error || "Opslaan mislukt");
    }
    setLoginBezig(false);
  }
```

- [ ] **Step 4: Vervang het "Klantgegevens bewerken"-blok in de render door twee kaarten**

Zoek het blok dat begint met `{/* Klantgegevens bewerken */}` en eindigt vlak vóór `{/* Voortgang + extra omzet */}` (huidige regels ~263-376), en vervang dat door:

```tsx
      {/* Woninggegevens bewerken */}
      <div className="card p-5">
        <button
          type="button"
          onClick={() => setWoningBewerkOpen(o => !o)}
          className="w-full flex items-center justify-between text-left"
        >
          <h2 className="font-semibold text-primary">Woninggegevens</h2>
          <span className="text-text-secondary text-sm">{woningBewerkOpen ? "▲ Sluiten" : "▼ Bewerken"}</span>
        </button>

        {woningBewerkOpen && (
          <form onSubmit={slaWoningOp} className="mt-4 space-y-4">
            <div>
              <label className="text-xs text-text-secondary">Naam woning</label>
              <input className="input w-full text-sm" value={woningForm.naam} onChange={e => setWoningForm(f => ({ ...f, naam: e.target.value }))} required />
            </div>

            <div>
              <label className="text-xs text-text-secondary">Meetperiode extra omzet</label>
              <input className="input w-full text-sm" value={woningForm.extra_omzet_periode} onChange={e => setWoningForm(f => ({ ...f, extra_omzet_periode: e.target.value }))} />
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">KPI nulmeting <span className="normal-case font-normal">(PriceLabs)</span></p>
              <div className="mb-3">
                <label className="text-xs text-text-secondary">Datum nulmeting</label>
                <input
                  type="date"
                  className="input w-full text-sm"
                  value={woningForm.datum_nulmeting}
                  onChange={e => setWoningForm(f => ({ ...f, datum_nulmeting: e.target.value }))}
                  disabled={woningForm.geen_cijfers_nulmeting}
                />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="woning_geen_cijfers"
                  checked={woningForm.geen_cijfers_nulmeting}
                  onChange={e => setWoningForm(f => ({ ...f, geen_cijfers_nulmeting: e.target.checked }))}
                  className="w-4 h-4 accent-accent"
                />
                <label htmlFor="woning_geen_cijfers" className="text-sm text-text-secondary cursor-pointer">Nieuwe woning — geen cijfers beschikbaar</label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-text-secondary">Bezetting (%)</label>
                  <input type="number" className="input w-full text-sm" placeholder="62" min="0" max="100" step="0.1" disabled={woningForm.geen_cijfers_nulmeting} value={woningForm.kpi_bezetting_nulmeting} onChange={e => setWoningForm(f => ({ ...f, kpi_bezetting_nulmeting: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-text-secondary">ADR (€)</label>
                  <input type="number" className="input w-full text-sm" placeholder="89" min="0" step="0.01" disabled={woningForm.geen_cijfers_nulmeting} value={woningForm.kpi_adr_nulmeting} onChange={e => setWoningForm(f => ({ ...f, kpi_adr_nulmeting: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-text-secondary">Reviewscore</label>
                  <input type="number" className="input w-full text-sm" placeholder="4.62" min="1" max="5" step="0.01" disabled={woningForm.geen_cijfers_nulmeting} value={woningForm.kpi_reviewscore_nulmeting} onChange={e => setWoningForm(f => ({ ...f, kpi_reviewscore_nulmeting: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-text-secondary">Aantal reviews</label>
                  <input type="number" className="input w-full text-sm" placeholder="24" min="0" disabled={woningForm.geen_cijfers_nulmeting} value={woningForm.kpi_reviews_nulmeting} onChange={e => setWoningForm(f => ({ ...f, kpi_reviews_nulmeting: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-text-secondary">Omzet 365d (€)</label>
                  <input type="number" className="input w-full text-sm" placeholder="24000" min="0" step="0.01" disabled={woningForm.geen_cijfers_nulmeting} value={woningForm.kpi_omzet_365d_nulmeting} onChange={e => setWoningForm(f => ({ ...f, kpi_omzet_365d_nulmeting: e.target.value }))} />
                </div>
              </div>
            </div>

            {woningFout && <p className="text-sm text-danger bg-danger/10 rounded-xl p-3">{woningFout}</p>}
            {woningSucces && <p className="text-sm text-success bg-success/10 rounded-xl p-3">Opgeslagen!</p>}

            <button type="submit" disabled={woningBezig} className="btn-primary text-sm">
              {woningBezig ? "Opslaan..." : "Wijzigingen opslaan"}
            </button>
          </form>
        )}
      </div>

      {/* Login bewerken */}
      <div className="card p-5">
        <button
          type="button"
          onClick={() => setLoginBewerkOpen(o => !o)}
          className="w-full flex items-center justify-between text-left"
        >
          <h2 className="font-semibold text-primary">Login</h2>
          <span className="text-text-secondary text-sm">{loginBewerkOpen ? "▲ Sluiten" : "▼ Bewerken"}</span>
        </button>

        {andereWoningen.length > 0 && (
          <p className="text-xs text-text-secondary bg-surface rounded-lg px-3 py-2 mt-3">
            Deze login hoort ook bij: {andereWoningen.map(w => w.naam).join(", ")}. Wijzigingen hier gelden voor al deze woningen.
          </p>
        )}

        {loginBewerkOpen && (
          <form onSubmit={slaLoginOp} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-secondary">E-mailadres klant</label>
                <input type="email" className="input w-full text-sm" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs text-text-secondary">Nieuw wachtwoord (laat leeg om ongewijzigd te laten)</label>
                <input type="password" className="input w-full text-sm" placeholder="••••••••" value={loginForm.wachtwoord} onChange={e => setLoginForm(f => ({ ...f, wachtwoord: e.target.value }))} minLength={4} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-secondary">Voornaam <span className="text-text-secondary">(optioneel)</span></label>
                <input className="input w-full text-sm" placeholder="bijv. Lisa" value={loginForm.voornaam} onChange={e => setLoginForm(f => ({ ...f, voornaam: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-text-secondary">Achternaam <span className="text-text-secondary">(optioneel)</span></label>
                <input className="input w-full text-sm" placeholder="bijv. de Vries" value={loginForm.achternaam} onChange={e => setLoginForm(f => ({ ...f, achternaam: e.target.value }))} />
              </div>
            </div>

            {loginFout && <p className="text-sm text-danger bg-danger/10 rounded-xl p-3">{loginFout}</p>}
            {loginSucces && <p className="text-sm text-success bg-success/10 rounded-xl p-3">Opgeslagen!</p>}

            <button type="submit" disabled={loginBezig} className="btn-primary text-sm">
              {loginBezig ? "Opslaan..." : "Wijzigingen opslaan"}
            </button>

            <div className="pt-3 border-t border-border">
              <p className="text-xs text-text-secondary mb-2">Stuur de klant een e-mail met hun persoonlijke link + een knop om een wachtwoord in te stellen.</p>
              <button
                type="button"
                onClick={stuurUitnodiging}
                disabled={uitnodigingBezig}
                className="btn-secondary text-sm"
              >
                {uitnodigingBezig ? "Versturen..." : "✉ Stuur uitnodigingsmail"}
              </button>
              {uitnodigingSucces && <p className="text-xs text-success mt-2">Uitnodiging verstuurd naar {loginData.email}</p>}
              {uitnodigingFout && <p className="text-xs text-danger mt-2">{uitnodigingFout}</p>}
            </div>
          </form>
        )}
      </div>
```

- [ ] **Step 5: Type-check**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
source ~/.nvm/nvm.sh
npx tsc --noEmit -p tsconfig.json
```

Expected: geen fouten meer. Als er nog een fout is over `klantData.email` of `klantData.voornaam` verderop in het bestand (buiten het zojuist vervangen blok), zoek die op en vervang door de overeenkomstige `loginData`-velden.

- [ ] **Step 6: Commit**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
git add src/app/admin/onboarding/\[id\]
git commit -m "Splits admin klantgegevens in Woninggegevens en Login kaarten"
```

---

### Task 13: Volledige build-check

**Files:** geen wijzigingen — dit is een verificatietaak.

- [ ] **Step 1: Draai de volledige Next.js build**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
source ~/.nvm/nvm.sh
npm run build 2>&1 | tail -60
```

Expected: build slaagt zonder fouten (waarschuwingen die al vóór dit plan bestonden zijn geen blokkade). Als er route- of type-fouten zijn in een van de in Taken 1–12 aangepaste bestanden, los ze op en herhaal deze stap.

- [ ] **Step 2: Deploy naar Railway**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
git remote set-url origin https://<GITHUB_TOKEN>@github.com/janwillemboon1-spec/verhuurai.git && \
git push origin main && \
git remote set-url origin https://github.com/janwillemboon1-spec/verhuurai.git
```

Wacht tot de Railway-deploy groen is voordat je aan Taak 14 begint.

---

### Task 14: Handmatige eindverificatie in productie

**Files:** geen wijzigingen — dit is een verificatietaak (zie ook de "Testen"-sectie in de spec).

- [ ] **Step 1: Nieuwe klant aanmaken**

Ga naar `https://www.hostboni.com/admin/onboarding/nieuw`, laat "Nieuwe klant" geselecteerd, vul een testwoning + testmailadres in, klik "Woning aanmaken". Expected: je komt op de woningbeheerpagina, "Login"-kaart toont het e-mailadres, geen "andere woningen"-notitie.

- [ ] **Step 2: Tweede woning aan diezelfde testklant toevoegen**

Ga terug naar `/admin/onboarding/nieuw`, kies "Bestaande klant", zoek de zojuist aangemaakte testklant op naam/e-mail, vul een tweede woningnaam in, sla op. Expected: geen wachtwoordveld nodig, nieuwe woning verschijnt, en op de woningbeheerpagina van de eerste woning zie je nu de notitie "Deze login hoort ook bij: [naam tweede woning]".

- [ ] **Step 3: Duplicaat-e-mailcheck**

Probeer via "Nieuwe klant" een derde woning aan te maken met hetzelfde testmailadres als stap 1. Expected: foutmelding "Dit e-mailadres bestaat al — voeg de woning toe via 'Bestaande klant'", geen nieuwe rij aangemaakt.

- [ ] **Step 4: Inloggen als klant met 1 woning**

Open de "Klant link" van een klant met precies 1 woning (bv. de admin-overzichtspagina toont dit per groep). Log in met het wachtwoord. Expected: directe redirect naar het dashboard van die woning, geen keuzescherm zichtbaar.

- [ ] **Step 5: Inloggen als klant met meerdere woningen**

Open de gedeelde "Klant link" van de testklant uit stap 1–2 (of van Saskia, na de migratie in Task 1). Log in. Expected: keuzescherm met beide woningen + eigen voortgangspercentage, doorklikken opent het juiste per-woning dashboard met de juiste checklist/KPI's/to-do's.

- [ ] **Step 6: Uitnodigingsmail**

Klik "Stuur uitnodigingsmail" vanaf een van de woningpagina's van de testklant met 2 woningen. Expected: mail komt aan, de link in de mail leidt (na wachtwoord instellen) naar het keuzescherm met beide woningen, niet naar één specifieke woning.

- [ ] **Step 7: Opruimen testdata**

Verwijder de tijdens deze taak aangemaakte testklant/testwoningen weer via de Supabase SQL Editor (`DELETE FROM onboarding_klanten WHERE naam LIKE 'Test%'; DELETE FROM onboarding_logins WHERE email = '<jouw testmailadres>';` — pas de filters aan op wat je daadwerkelijk hebt aangemaakt).

---

### Task 15: Opruim-migratie (pas uitvoeren nadat Task 14 volledig geslaagd is)

**Files:**
- Create: `supabase/onboarding-gedeelde-login-cleanup.sql`

- [ ] **Step 1: Schrijf de opruim-migratie**

```sql
-- supabase/onboarding-gedeelde-login-cleanup.sql
-- ALLEEN uitvoeren nadat Task 14 (handmatige eindverificatie) volledig is geslaagd op productie.
ALTER TABLE onboarding_klanten ALTER COLUMN login_id SET NOT NULL;
ALTER TABLE onboarding_klanten DROP COLUMN email;
ALTER TABLE onboarding_klanten DROP COLUMN wachtwoord_hash;
ALTER TABLE onboarding_klanten DROP COLUMN link_token;
ALTER TABLE onboarding_klanten DROP COLUMN voornaam;
ALTER TABLE onboarding_klanten DROP COLUMN achternaam;
```

- [ ] **Step 2: Voer uit in Supabase**

Open `https://supabase.com/dashboard/project/dldxmdpomagqiqrbxrtq/sql/new`, plak de inhoud, klik **Run**.

- [ ] **Step 3: Herverifieer productie**

Herhaal Task 14 Stap 4 en 5 (inloggen met 1 woning en met meerdere woningen) om te bevestigen dat alles nog werkt nu de oude kolommen weg zijn.

- [ ] **Step 4: Commit**

```bash
cd "/Users/janwillemboon/Boon Vakantieverhuur Claude/Airbnb optimizing bot"
git add supabase/onboarding-gedeelde-login-cleanup.sql
git commit -m "Verwijder overbodige login-kolommen uit onboarding_klanten na migratie"
```

---

## Self-Review

**Spec coverage:**
- Datamodel (nieuwe tabel + login_id) → Task 1, 15.
- Migratie bestaande data (generiek, oudste rij wint) → Task 1.
- Klant-ervaring (auto-redirect bij 1 woning, keuzescherm bij meerdere) → Task 7.
- Admin overzicht gegroepeerd → Task 10.
- Admin nieuwe woning (nieuw/bestaand toggle + duplicaat-check) → Task 11, 8.
- Admin woningbeheer (Woninggegevens/Login split) → Task 12.
- Uitnodigingsmail login-breed → Task 3, 9.
- Randgevallen (onbekend token, woning niet bij login, duplicaat e-mail, 0 woningen) → Task 5/6 (token), 7 (woning/0 woningen), 8 (duplicaat).
- Testen/verificatie → Task 13, 14.

**Placeholder scan:** geen TBD/TODO, elke stap bevat volledige code of een exact uitvoerbaar commando.

**Type consistency:** `OnboardingLogin` (Task 2) wordt consistent gebruikt in Task 4 (API), Task 10 (`WoningRow.onboarding_logins`), Task 12 (`AdminOnboardingClient` props). `login_id` als kolomnaam consistent in Task 1 (SQL), Task 2 (type), Task 8/11 (POST body). Functienamen `slaWoningOp`/`slaLoginOp` alleen in Task 12 gebruikt, geen naamsverschil met eerdere taken.
