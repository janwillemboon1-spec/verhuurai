# Onboarding: gedeelde login voor klanten met meerdere woningen

**Datum:** 2026-07-17
**Status:** Goedgekeurd, klaar voor implementatieplan

## Probleem

In de onboarding-tool is elke rij in `onboarding_klanten` zowel een login (e-mail, wachtwoord, `link_token`) als een woning (naam, KPI-nulmeting, checklist, to-do's, activiteiten, KPI-metingen). Een huiseigenaar met meerdere woningen krijgt daardoor per woning een aparte inloglink en apart wachtwoord, ook al is het dezelfde persoon. Doel: één login per klant, met daaronder meerdere woningen, elk met hun eigen voortgang.

Praktijkcheck in Supabase (2026-07-17): 2 rijen in `onboarding_klanten`, beide voor `saskiaglobal@gmail.com` ("Villa Vreeland" en "Rumah Rama - Villa Bali") — dit is nu al een duplicaat-geval dat samengevoegd moet worden.

## Gekozen aanpak

Login en woning worden gescheiden in twee tabellen. `onboarding_klanten` blijft qua rol de woning-tabel (checklist/to-do's/activiteiten/KPI's blijven ongewijzigd aan `klant_id` hangen); een nieuwe tabel `onboarding_logins` bevat alleen de auth-velden. Dit vermijdt een grote hernoeming van bestaande routes, URL's en admin-schermen (die "klant" blijven heten), en lost het probleem toch echt op door de login te ontkoppelen van de woning.

Overwogen alternatieven:
- **Volledige rename naar `onboarding_gebruikers` / `onboarding_woningen`** — meest zuivere model, maar raakt vrijwel elk bestand (routes, URL's, admin-schermen). Afgewezen: te grote blast radius voor wat een login-wijziging is.
- **Zelfverwijzende `login_klant_id` kolom binnen `onboarding_klanten`** — kleinste patch, maar een tabel die soms login is en soms woning is, is verwarrend en breekbaar. Afgewezen.

## Datamodel

Nieuwe tabel:

```sql
CREATE TABLE onboarding_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voornaam TEXT,
  achternaam TEXT,
  email TEXT UNIQUE NOT NULL,
  wachtwoord_hash TEXT NOT NULL,
  link_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);
```

Wijziging aan bestaande tabel:

```sql
ALTER TABLE onboarding_klanten ADD COLUMN login_id UUID REFERENCES onboarding_logins(id);
-- na migratie (zie hieronder) NOT NULL maken en email/wachtwoord_hash/link_token/voornaam/achternaam droppen
```

`onboarding_checklist_items`, `onboarding_todos`, `onboarding_activiteiten`, `onboarding_kpi_metingen` blijven ongewijzigd — ze verwijzen naar `klant_id` (= woning), niet naar de login.

## Migratie bestaande data

Generiek, eenmalig script (geen hardcoded klantnamen):

1. Groepeer alle huidige `onboarding_klanten`-rijen op `lower(email)`.
2. Per groep: de rij met de oudste `aangemaakt_op` wordt de bron voor een nieuwe `onboarding_logins`-rij (email, wachtwoord_hash, link_token, voornaam, achternaam overnemen).
3. Alle woningen in die groep krijgen `login_id` naar die nieuwe login-rij.
4. Na verificatie: kolommen `email`, `wachtwoord_hash`, `link_token`, `voornaam`, `achternaam` verwijderen uit `onboarding_klanten`, en `login_id` op `NOT NULL` zetten.

Voor het huidige databestand betekent dit concreet dat Villa Vreeland (oudste rij) de login wordt voor Saskia, en Rumah Rama - Villa Bali daaraan koppelt. Haar bestaande inloglink (van Villa Vreeland) blijft geldig.

## Klant-ervaring (frontend)

- `/onboarding/[token]` — inlogscherm, zelfde opzet, zoekt nu op `onboarding_logins.link_token`.
- `/onboarding/[token]/dashboard` — haalt login op via token, daarna alle woningen met dat `login_id`.
  - **1 woning:** direct doorredirecten naar `/onboarding/[token]/dashboard/[woningId]` (geen extra klik, bestaande verstuurde links blijven werken voor de meerderheid met 1 woning).
  - **>1 woning:** toont keuzescherm (naam woning + voortgangspercentage per woning), doorklikken naar `/onboarding/[token]/dashboard/[woningId]`.
  - **0 woningen:** `notFound()` (zou niet moeten voorkomen, maar defensief).
- `/onboarding/[token]/dashboard/[woningId]` — huidige dashboardpagina (checklist, to-do's, activiteiten, KPI's), met autorisatiecheck dat de woning bij de ingelogde login hoort (anders `notFound()`).
- `/onboarding/[token]/reset/...` — reset-flow ongewijzigd van opzet, werkt nu tegen `onboarding_logins`.

## Admin-kant

- **Overzicht (`/admin/onboarding`)**: kaarten gegroepeerd per login. Eén blok per klant (naam, e-mail, gezamenlijke "Klant link →") met de woningen (elk met eigen voortgangsbalk en eigen "Beheren →") genest eronder.
- **Nieuwe woning (`/admin/onboarding/nieuw`)**: keuze bovenaan "Nieuwe klant" of "Bestaande klant".
  - *Nieuwe klant*: huidige velden (naam woning, e-mail, wachtwoord, voornaam/achternaam, KPI's) — maakt nieuwe `onboarding_logins`-rij + nieuwe woning.
  - *Bestaande klant*: doorzoekbare lijst van bestaande logins (op naam/e-mail, client-side filter volstaat gezien de huidige schaal) — na selectie alleen naam woning + KPI-nulmeting invullen; koppelt aan gekozen `login_id`, geen nieuwe login-rij.
  - Als bij "Nieuwe klant" het ingevoerde e-mailadres al bestaat in `onboarding_logins`: blokkeren met foutmelding die verwijst naar de "Bestaande klant"-flow (voorkomt nieuwe duplicaten).
- **Woningbeheer (`/admin/onboarding/[id]`)**: het huidige "Klantgegevens"-blok splitst in twee kaarten:
  - **Woninggegevens** — naam woning + KPI-nulmeting, ongewijzigd gedrag, PATCH naar `onboarding_klanten`.
  - **Login** — e-mail, voornaam/achternaam, wachtwoord-reset, PATCH naar nieuwe endpoint voor `onboarding_logins`. Toont een notitie met de andere woningen die aan dezelfde login hangen (indien van toepassing), zodat duidelijk is dat een wijziging hier alle woningen van deze klant raakt.
- **Uitnodigingsmail**: ongewijzigd gedrag, maar de link in de mail is nu altijd de gedeelde `/onboarding/[token]/dashboard`-link (leidt naar keuzescherm of automatisch door naar de ene woning), ongeacht vanaf welke woningpagina de mail verstuurd wordt.

## API-wijzigingen

- Nieuw: `GET/PATCH /api/onboarding/logins/[id]` — login-gegevens ophalen/bewerken (e-mail, wachtwoord, voornaam, achternaam).
- Nieuw: `GET /api/onboarding/logins` — lijst van logins t.b.v. "Bestaande klant"-selectie en gegroepeerd overzicht.
- Gewijzigd: `POST /api/onboarding/klanten` — accepteert of (a) nieuwe-login-velden (huidig gedrag, plus duplicaat-e-mailcheck) of (b) een `login_id` om een woning aan een bestaande login te koppelen.
- Gewijzigd: `PATCH /api/onboarding/klanten/[id]` — verliest e-mail/wachtwoord/voornaam/achternaam-afhandeling (verplaatst naar `/logins/[id]`), behoudt woning-specifieke velden.
- Gewijzigd: `/api/onboarding/klanten/[id]/uitnodiging` — haalt login via join op i.p.v. rechtstreeks van de klantrij.
- Gewijzigd: `/api/onboarding/auth/[token]/*` (login, reset-aanvragen, reset-uitvoeren) — werken tegen `onboarding_logins` i.p.v. `onboarding_klanten`.

## Randgevallen

- Onbekend token → zelfde foutmelding als nu ("Onbekende onboarding link").
- Woning-ID die niet bij de ingelogde login hoort → `notFound()` (voorkomt raden van andermans woning-URL).
- Duplicaat e-mail bij "Nieuwe klant" aanmaken → geblokkeerd, verwijzing naar "Bestaande klant".
- Klant met 0 woningen onder een login (zou niet moeten voorkomen na migratie) → `notFound()` op dashboard-route.

## Testen

Geen geautomatiseerde testsuite voor deze tool. Handmatige verificatie:
1. Nieuwe klant aanmaken via "Nieuwe klant" — login + woning + standaardchecklist ontstaan correct.
2. Tweede woning toevoegen aan bestaande klant via "Bestaande klant" — geen nieuwe login, woning hangt aan bestaand `login_id`.
3. Dubbele e-mail proberen bij "Nieuwe klant" — wordt geblokkeerd met duidelijke melding.
4. Inloggen als klant met 1 woning — automatische doorredirect naar dashboard, geen keuzescherm zichtbaar.
5. Inloggen als klant met 2 woningen — keuzescherm zichtbaar, doorklikken werkt, elke woning toont eigen checklist/KPI's/to-do's.
6. Migratiescript op productiedata draaien, Saskia's bestaande link (Villa Vreeland) testen — moet nog steeds werken en nu naar het keuzescherm met beide woningen leiden.
7. Uitnodigingsmail versturen vanaf een woningpagina van een klant met meerdere woningen — link in mail leidt tot het keuzescherm, niet naar één specifieke woning.
