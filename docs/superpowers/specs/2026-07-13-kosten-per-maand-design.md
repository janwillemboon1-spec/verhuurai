# Kosten per maand aanpasbaar

## Probleem

`cockpit_fin_kosten` (financiën-module, Boni's Cockpit) slaat een maandelijkse kostenpost (bv. Hostaway, Pricelabs) op als één `bedrag` dat wordt uitgesmeerd over `van_maand`–`tot_maand`. Verhoogt de gebruiker het bedrag (bv. omdat een leverancier duurder wordt bij meer klanten), dan verandert dat met terugwerkende kracht álle maanden in dat bereik — ook maanden die al zijn afgesloten in de administratie. De toekomst moet het nieuwe bedrag krijgen, het verleden moet het oude bedrag behouden.

Dit speelt alleen bij kostenposten met `frequentie = 'maandelijks'`. Posten met `jaarlijks`, `kwartaal` of `eenmalig` betalen toch al maar op één vast moment per jaar (`betaalmaand`), dus een bedragswijziging daar raakt nooit meerdere al-afgesloten maanden.

## Aanpak

Kolommen per maand toevoegen aan `cockpit_fin_kosten`, naar het patroon dat al bestaat in `cockpit_fin_overig` (overige inkomsten) — die tabel heeft al aparte `jan`...`dec`-kolommen die per maand los instelbaar zijn via een grid in de UI.

### Datamodel

Migratie op `cockpit_fin_kosten`:

```sql
ALTER TABLE cockpit_fin_kosten
  ADD COLUMN jan NUMERIC, ADD COLUMN feb NUMERIC, ADD COLUMN mrt NUMERIC, ADD COLUMN apr NUMERIC,
  ADD COLUMN mei NUMERIC, ADD COLUMN jun NUMERIC, ADD COLUMN jul NUMERIC, ADD COLUMN aug NUMERIC,
  ADD COLUMN sep NUMERIC, ADD COLUMN okt NUMERIC, ADD COLUMN nov NUMERIC, ADD COLUMN dec NUMERIC;
```

Backfill: voor elke bestaande rij met `frequentie = 'maandelijks'`, vul `jan`...`dec` met het huidige `bedrag` voor maanden binnen `[van_maand, tot_maand]`, en `0` daarbuiten. Rijen met andere frequenties krijgen geen backfill — hun `jan`...`dec` blijven `NULL` en worden niet gebruikt.

`bedrag`, `van_maand`, `tot_maand` blijven bestaan als kolommen (geen breaking change, geen destructieve migratie) maar worden voor `maandelijks`-posten na de migratie niet meer gebruikt voor de berekening — alleen nog als hulpwaarden bij het aanmaken van een nieuwe post.

### Berekeningslogica

Twee plekken berekenen kosten per maand uit dezelfde brontabel en moeten identiek worden aangepast:
- `berekenKostenPerMaand` in `src/app/api/cockpit/financien/overzicht/route.ts`
- `berekenKostenMaanden` in `src/app/cockpit/financien/page.tsx`

Voor `frequentie === 'maandelijks'`: som per maand-index de waarde uit de bijbehorende kolom (`jan`...`dec`), met `?? 0` als fallback. Voor `jaarlijks`, `kwartaal`, `eenmalig`: ongewijzigd, blijft rekenen via `bedrag` + `betaalmaand`.

### API

`POST /api/cockpit/financien/kosten` en `PUT /api/cockpit/financien/kosten/[id]`:
- Accepteren de 12 maandvelden (`jan`...`dec`) in de request body en slaan ze op.
- Bij aanmaken (`POST`) van een `maandelijks`-post: als de 12 maandvelden niet expliciet zijn meegegeven, vult de backend ze automatisch met `bedrag` voor maanden binnen `[van_maand, tot_maand]` en `0` daarbuiten — zodat het aanmaken van een nieuwe post net zo simpel blijft als nu (één bedrag + periode invullen).

### UI (`KostenModal` in `page.tsx`)

Wanneer `frequentie === 'maandelijks'`:
- De velden "Vanaf maand" / "Tot en met maand" verdwijnen uit het formulier.
- Er verschijnt een grid van 12 invoervelden (jan...dec), qua opbouw gelijk aan het bestaande grid in `OverigModal`, voorgevuld met de huidige waarden per maand (of met `bedrag` herhaald over 12 maanden bij een nieuwe post).
- Een knop "Toepassen op alle maanden" naast het `bedrag`-veld vult alle 12 grid-velden in één klik met die waarde — handig bij het aanmaken van een nieuwe post of het resetten van een heel jaar.

Voor `jaarlijks`, `kwartaal`, `eenmalig`: formulier blijft ongewijzigd (single `bedrag` + `betaalmaand`).

De bestaande weergave (kosten-tab, P&L-tab) hoeft niet te veranderen — die leest al via `berekenKostenMaanden`/`overzicht`, en toont automatisch de juiste waarde per maand zodra de berekeningslogica is aangepast.

## Scope

- Alleen `frequentie = 'maandelijks'`-posten krijgen per-maand-bedragen. `jaarlijks`/`kwartaal`/`eenmalig` blijven zoals ze zijn — daar is geen probleem gerapporteerd en het voegt geen waarde toe.
- Geen wijziging aan `cockpit_fin_overig`, `cockpit_fin_commissies` of `cockpit_commissie_config` — dit raakt alleen de kostenposten-tabel en de bijbehorende API/UI.
- Geen audit-log of wijzigingsgeschiedenis van bedragen; de grid toont alleen de huidige stand per maand, niet wie/wanneer een maand is aangepast.

## Testplan

- Na migratie: steekproef dat Hostaway (590) en Pricelabs (283) voor alle 12 maanden hun huidige bedrag hebben.
- Bewerk een bestaande `maandelijks`-post: pas alleen jul–dec aan naar een nieuw bedrag, sla op, en controleer in de kosten-tab en P&L-tab dat jan–jun het oude bedrag tonen en jul–dec het nieuwe.
- Maak een nieuwe `maandelijks`-kostenpost aan via bedrag + periode, controleer dat alle 12 maanden correct gevuld zijn.
- Maak/bewerk een `jaarlijks`/`kwartaal`/`eenmalig`-post, controleer dat gedrag ongewijzigd is.
