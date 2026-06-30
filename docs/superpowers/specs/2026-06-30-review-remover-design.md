# Review Remover — Design

## Doel

Nieuwe gratis tool op Host Boni waarmee verhuurders een Airbnb-recensie plakken (+ optionele context en bewijs-screenshots) en een AI-beoordeling krijgen of de recensie kans maakt om verwijderd te worden, op basis van Airbnb's recensie-, content- en anti-discriminatiebeleid. Bij een kansrijke beoordeling levert de tool direct een kant-en-klare bezwaarbrief en een stappenplan om de recensie aan te vechten.

**Verdienmodel:** gratis (lead-generatie, zoals `/gratis` titelanalyse) — naam + e-mail verplicht vóór het resultaat zichtbaar wordt.

**URL:** `/review-remover` — zichtbaar in navbar, Engelse naam (consistent met "Listing Optimizer", "Foto Optimizer").

## Flow & architectuur

Gekozen aanpak: aansluiten op het bestaande patroon van Foto Optimizer / HP Audit (pagina + API-route + Supabase-tabel + admin-overzicht). Geen multi-step sessieflow zoals Listing Optimizer nodig, omdat de analyse één synchrone AI-call is (geen lang scrapeproces).

```
/review-remover
  └─ Stap 1: Lead-gate (naam + e-mail) — net als /gratis
  └─ Stap 2: Formulier
       - Review-tekst (verplicht, textarea, geen minimumlengte — alleen niet-leeg)
       - Sterrenbeoordeling van de gast (verplicht, 1-5, sterren-selector)
       - Context van de host (optioneel, textarea)
       - Screenshots/bewijs (optioneel, max 5 afbeeldingen, drag&drop upload)
  └─ Submit → POST /api/review-remover/analyseer
       - Slaat lead + input op in Supabase (tabel: review_remover_rapporten)
       - Screenshots → Supabase Storage bucket (review-remover-bewijs)
       - Claude API call (vision) met:
         - Review-tekst + sterren + context
         - Screenshots als image content blocks
         - Systeemprompt: kennisbank (recensiebeleid + contentbeleid + anti-discriminatiebeleid,
           gestructureerd als verwijdergronden + uitzonderingen)
       - Claude retourneert gestructureerd JSON: verdict (laag/gemiddeld/hoog), onderbouwing,
         toegepaste regel(s), bezwaarbrief (NL/EN), stappenplan om in te dienen
       - Resultaat opgeslagen in Supabase row
  └─ Stap 3: Resultaat (zelfde pagina, na response)
       - Verdict-badge (laag/gemiddeld/hoog) + onderbouwing
       - Bezwaarbrief in tekstveld met "kopieer" knop
       - Stappenplan (hoe in te dienen bij Airbnb)
       - Knop "Stuur naar mijn e-mail" → /api/review-remover/email (Resend)
```

Taal: NL + EN, consistent met Listing Optimizer en HP Audit. Bezwaarbrief en UI-teksten in de gekozen taal; de AI-beoordeling werkt ongeacht de taal van de review-tekst zelf.

## Datamodel

**Supabase tabel `review_remover_rapporten`:**

```sql
CREATE TABLE review_remover_rapporten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aangemaakt_op TIMESTAMPTZ DEFAULT now(),
  naam TEXT NOT NULL,
  email TEXT NOT NULL,
  taal TEXT DEFAULT 'nl',
  review_tekst TEXT NOT NULL,
  sterren INTEGER NOT NULL,        -- 1-5
  context TEXT,
  screenshot_urls TEXT[],
  verdict TEXT,                    -- 'laag' | 'gemiddeld' | 'hoog'
  onderbouwing TEXT,
  toegepaste_regels TEXT,
  bezwaarbrief TEXT,
  stappenplan TEXT,
  email_verzonden BOOLEAN DEFAULT FALSE
);
```

**Supabase Storage bucket** `review-remover-bewijs`: max 5 bestanden per inzending, 5MB per bestand, alleen JPG/PNG/WebP.

Geen aparte sessie-tabel nodig — alles wordt synchroon in één request afgehandeld.

## AI-beoordelingslogica (kennisbank + prompt)

De drie beleidsdocumenten worden samengevoegd tot één statische kennisbank (markdown, ingebakken in de systeemprompt — geen losse fetch per request, geen vector-DB nodig gezien de beperkte, vaste regelset):

**Bronnen:**
- Recensiebeleid: https://www.airbnb.nl/help/article/2673
- Contentbeleid: https://www.airbnb.nl/help/article/546
- Anti-discriminatiebeleid: https://www.airbnb.nl/help/article/2867
- Bezwaar maken tegen een recensie (proces): https://www.airbnb.nl/help/article/3582
- Bezwaarformulier: https://www.airbnb.nl/resolution/review_dispute/intro

**Verwijdergronden — exact de 5 categorieën van het officiële Airbnb-bezwaarformulier** (zo sluit de bezwaarbrief 1-op-1 aan op wat de host straks in het formulier selecteert):

1. **Vergelding** — de recensie is geschreven als wraak voor het handhaven van een beleid of regel
2. **Niet relevant** — geen informatie over de boeking, of de gast is nooit aangekomen/heeft geannuleerd (absorbeert ook "neprecensie")
3. **Druk of dwang** — de recensie komt van iemand die geïntimideerd, afgeperst of aangemoedigd werd (afpersing/manipulatie)
4. **Concurrent** — geplaatst door iemand verbonden aan de accommodatie of een concurrent
5. **Schending van Contentbeleid** — discriminerend, bevat privégegevens, of anderszins in strijd met het Contentbeleid (spam, illegaal, expliciet, gewelddadig/beledigend, impersonatie)

**Expliciete uitzondering** (belangrijk, voorkomt valse hoop bij gebruiker): subjectieve meningen, beoordelingsverschillen en factoren buiten controle van de host worden NIET automatisch verwijderd. De AI moet dit eerlijk meewegen, ook als dat een "laag"-verdict betekent.

**Output-structuur (JSON, door Claude geretourneerd):**

```json
{
  "verdict": "laag | gemiddeld | hoog",
  "onderbouwing": "...",
  "toegepaste_regels": ["Vergelding", "Niet relevant", "Druk of dwang", "Concurrent", "Schending van Contentbeleid"],
  "bezwaarbrief": "...",
  "stappenplan": ["Stap 1: ...", "Stap 2: ..."]
}
```

`toegepaste_regels` is een subset van bovenstaande 5 officiële categorieën (kan meerdere bevatten). Screenshots worden als image-blocks meegegeven aan Claude (vision) zodat bewijs (bv. foto's die een valse klacht weerleggen) meeweegt in de onderbouwing en de brief. De sterrenbeoordeling wordt als extra context meegegeven (bv. een 1-ster review met expliciet beleidsschendende taal weegt anders dan een 3-ster review die puur subjectief is).

## Indienen van het bezwaar (officieel proces)

- Bezwaar wordt ingediend via https://www.airbnb.nl/resolution/review_dispute/intro
- Stappen in dat formulier: recensie selecteren → reden kiezen (één van de 5 hierboven) → toelichting toevoegen ("Informatie toevoegen" — hier plakt de host de gegenereerde bezwaarbrief) → eventueel bewijs uploaden → verzenden
- **Max. 2 bezwaarpogingen per recensie**
- **Responstijd: meestal binnen 48 uur** per e-mail
- **Wie mag indienen:** advertentie-eigenaar, co-hosts met volledige toegang, professionele verhuurders met uitgebreide rechten, teamleden met juiste rechten, of de gast zelf
- **Let op:** geen gevoelige persoonsgegevens (ID's, gezondheidsdata) uploaden in het formulier

Het gegenereerde `stappenplan` in de tool verwijst expliciet naar dit formulier en instrueert de host om de bezwaarbrief in het veld "Informatie toevoegen" te plakken, en wijst op de limiet van 2 pogingen en de 48-uurs responstijd.

## E-mail

- Knop "Stuur naar mijn e-mail" (optioneel, na resultaat) → `/api/review-remover/email`
- Verzonden via Resend, afzender `boni@verhuurai.nl` (hostboni.com nog niet geverifieerd in Resend — bestaand open punt, zie projectmemory)
- Bevat: verdict, onderbouwing, volledige bezwaarbrief, stappenplan
- Zet `email_verzonden = true` in de tabel

## Admin-pagina

`/admin/review-remover` (alleen `info@bnbassistant.com`, consistent met overige admin-pagina's):
- Lijst van alle ingediende rapporten (naam, e-mail, datum, sterren, verdict-badge)
- Detailweergave: review-tekst, context, screenshots, volledige AI-output

## Error handling & edge cases

- **Lege review-tekst** → clientside validatie (geen minimumlengte, alleen niet-leeg verplicht)
- **Sterrenbeoordeling niet ingevuld** → clientside validatie, verplicht veld
- **Screenshot te groot/verkeerd formaat** → clientside check vóór upload (max 5MB, JPG/PNG/WebP), nette foutmelding
- **Claude API faalt of geeft geen geldige JSON terug** → server retry (1x), bij blijvend falen: foutmelding op pagina, formulier-invoer blijft behouden
- **Misbruik/spam** → eenvoudige rate-limit per IP/e-mail (bv. max 5 per uur)
- **Review in andere taal dan UI-taal** → geen probleem; Claude beoordeelt de review-tekst ongeacht taal, bezwaarbrief wordt gegenereerd in de gekozen UI-taal

## Testen

Geen geautomatiseerde testsuite in dit project — handmatige test-checklist na implementatie:
- Duidelijk valse/nep review (gast nooit aangekomen) → hoog verdict, "Niet relevant"
- Subjectieve negatieve maar geldige review → laag verdict (uitzondering correct toegepast)
- Discriminerende taal of privégegevens in review → hoog verdict, "Schending van Contentbeleid"
- Review die duidelijk wraak lijkt voor een huisregel-handhaving → "Vergelding"
- Review + screenshot-bewijs dat klacht weerlegt → AI verwerkt bewijs in onderbouwing
- Stappenplan verwijst correct naar het bezwaarformulier + vermeldt max. 2 pogingen en 48-uurs responstijd
- E-mail verzendknop → mail komt aan
- Admin-pagina toont nieuw rapport correct
- NL en EN flow beide doorlopen
