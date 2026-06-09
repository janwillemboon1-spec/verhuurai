export default function AlgemeneVoorwaardenPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        <div>
          <h1 className="font-display text-4xl font-bold text-primary mb-2">Algemene Voorwaarden</h1>
          <p className="text-text-secondary text-sm">HostBoni — Boon Vakantieverhuur · Laatst bijgewerkt: 9 juni 2026</p>
        </div>

        {[
          {
            titel: "Artikel 1 — Definities",
            inhoud: (
              <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm leading-relaxed">
                <li><strong className="text-primary">HostBoni</strong>: de online dienst en het platform dat bereikbaar is via hostboni.com (en hostboni.nl), een handelsnaam en activiteit van de eenmanszaak Boon Vakantieverhuur.</li>
                <li><strong className="text-primary">Boon Vakantieverhuur / wij / ons</strong>: de eenmanszaak Boon Vakantieverhuur, gevestigd te Amstelveenseweg 14 te Amsterdam, ingeschreven bij de Kamer van Koophandel onder nummer 73846384, btw-identificatienummer NL004777254B37, e-mail info@boonvakantieverhuur.nl.</li>
                <li><strong className="text-primary">Gebruiker / je / jij</strong>: iedere natuurlijke persoon of rechtspersoon die gebruikmaakt van HostBoni, ongeacht of dit gratis of betaald gebeurt.</li>
                <li><strong className="text-primary">Consument</strong>: een Gebruiker die niet handelt in de uitoefening van een beroep of bedrijf.</li>
                <li><strong className="text-primary">Zakelijke gebruiker</strong>: een Gebruiker die wel handelt in de uitoefening van een beroep of bedrijf.</li>
                <li><strong className="text-primary">Tools</strong>: de via HostBoni aangeboden softwarediensten, waaronder de Listing Optimizer, de Host Performance Audit en de Prijscalculator.</li>
                <li><strong className="text-primary">Output</strong>: alle resultaten, adviezen, rapporten, scores, teksten en andere informatie die door de Tools worden gegenereerd, mede op basis van kunstmatige intelligentie (AI).</li>
                <li><strong className="text-primary">Overeenkomst</strong>: iedere overeenkomst tussen Boon Vakantieverhuur en de Gebruiker over het gebruik van (een onderdeel van) HostBoni.</li>
              </ol>
            ),
          },
          {
            titel: "Artikel 2 — Toepasselijkheid",
            inhoud: (
              <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm leading-relaxed">
                <li>Deze algemene voorwaarden zijn van toepassing op ieder gebruik van HostBoni en op alle Overeenkomsten tussen Boon Vakantieverhuur en de Gebruiker.</li>
                <li>Door HostBoni te gebruiken, een account aan te maken of een betaalde dienst af te nemen, aanvaard je deze voorwaarden.</li>
                <li>Afwijkingen van deze voorwaarden gelden alleen als wij die schriftelijk hebben bevestigd.</li>
                <li>Eventuele inkoop- of andere voorwaarden van een Zakelijke gebruiker worden uitdrukkelijk van de hand gewezen.</li>
                <li>Wij mogen deze voorwaarden wijzigen. De gewijzigde voorwaarden gelden vanaf het moment dat ze op hostboni.com zijn gepubliceerd. Voor lopende abonnementen geldt artikel 7.</li>
              </ol>
            ),
          },
          {
            titel: "Artikel 3 — De dienst en de Tools",
            inhoud: (
              <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm leading-relaxed">
                <li>HostBoni biedt online Tools waarmee verhuurders van accommodaties hun advertenties en verhuuractiviteiten kunnen analyseren en verbeteren:
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li><strong className="text-primary">Listing Optimizer</strong> — Gebruiker levert informatie aan in de vorm van tekst of screenshots en ontvangt een rapport.</li>
                    <li><strong className="text-primary">Host Performance Audit</strong> — Gebruiker voert een url in van de te analyseren Airbnb advertentie en ontvangt een rapport met daarin een samenvatting van de reviews, sentimenttrend, terugkerende punten, concrete verbeterpunten, voorbeeldreacties en superhost score tracker.</li>
                    <li><strong className="text-primary">Prijscalculator</strong> — Gebruiker vult zelf de basisprijs en locatie in en ontvangt op basis van de basisprijs prijzen per periode. Alle prijzen zijn richtlijnen.</li>
                  </ul>
                </li>
                <li>Een deel van de Tools is gratis te gebruiken; voor bepaalde (uitgebreidere) functies of rapporten is een betaling of abonnement vereist.</li>
                <li>Wij spannen ons in om de Tools beschikbaar en goed werkend te houden, maar geven geen garantie op ononderbroken beschikbaarheid.</li>
                <li>Wij mogen de inhoud, functies en samenstelling van de Tools op elk moment aanpassen, uitbreiden of beëindigen.</li>
              </ol>
            ),
          },
          {
            titel: "Artikel 4 — Aard van de Output, AI en geen garantie",
            inhoud: (
              <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm leading-relaxed">
                <li>De Output van de Tools wordt mede gegenereerd met behulp van kunstmatige intelligentie en geautomatiseerde analyses, en is uitsluitend bedoeld als <strong className="text-primary">algemene, indicatieve ondersteuning</strong>.</li>
                <li>De Output vormt <strong className="text-primary">geen</strong> professioneel, juridisch, fiscaal of financieel advies en is geen garantie voor enig resultaat.</li>
                <li>Prijsindicaties uit de Prijscalculator zijn schattingen op basis van de door jou ingevoerde gegevens en algemene aannames.</li>
                <li>AI kan fouten maken, onvolledig zijn of verouderde informatie gebruiken. Je blijft zelf verantwoordelijk voor het beoordelen, controleren en toepassen van de Output.</li>
                <li>Wij zijn niet verbonden aan, of goedgekeurd door, Airbnb of enig ander verhuurplatform.</li>
              </ol>
            ),
          },
          {
            titel: "Artikel 5 — Gebruik, invoer en verantwoordelijkheden van de Gebruiker",
            inhoud: (
              <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm leading-relaxed">
                <li>Je staat ervoor in dat je gerechtigd bent de gegevens, links en teksten die je in de Tools invoert te gebruiken en te laten verwerken.</li>
                <li>Je voert geen gegevens in die onrechtmatig, misleidend of in strijd met de wet zijn, en geen bijzondere persoonsgegevens van derden zonder geldige grondslag.</li>
                <li>Je gebruikt HostBoni niet voor doeleinden die de werking ervan kunnen verstoren, zoals geautomatiseerd op grote schaal bevragen (scraping) of het overbelasten van de systemen.</li>
                <li>Als je een account aanmaakt, ben je verantwoordelijk voor het geheimhouden van je inloggegevens en voor al het gebruik dat via jouw account plaatsvindt.</li>
                <li>Bij misbruik of overtreding van deze voorwaarden mogen wij je toegang tot HostBoni (tijdelijk) beperken of beëindigen, zonder dat dit recht geeft op terugbetaling.</li>
              </ol>
            ),
          },
          {
            titel: "Artikel 6 — Prijzen en betaling",
            inhoud: (
              <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm leading-relaxed">
                <li>De geldende prijzen staan vermeld op hostboni.com op het moment van bestelling. Prijzen zijn in euro's.</li>
                <li>Voor Consumenten worden prijzen inclusief btw vermeld. Voor Zakelijke gebruikers kunnen prijzen exclusief btw worden vermeld.</li>
                <li>Betalingen verlopen via onze betaaldienstverlener Stripe.</li>
                <li>Betaalde Tools worden aangeboden als <strong className="text-primary">eenmalige aankoop</strong> of als <strong className="text-primary">abonnement</strong>, naar keuze van de Gebruiker bij de bestelling.</li>
                <li>Bij een abonnement geef je toestemming voor automatische, periodieke incasso via Stripe voor de duur van het abonnement, totdat het wordt opgezegd conform artikel 7.</li>
                <li>Als een betaling niet slaagt of wordt teruggeboekt, mogen wij de toegang tot de betaalde dienst opschorten totdat de betaling alsnog is voldaan.</li>
              </ol>
            ),
          },
          {
            titel: "Artikel 7 — Duur, verlenging en opzegging van abonnementen",
            inhoud: (
              <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm leading-relaxed">
                <li>Een abonnement wordt aangegaan voor de bij de bestelling vermelde periode en wordt daarna telkens stilzwijgend verlengd voor eenzelfde periode, tenzij het tijdig wordt opgezegd.</li>
                <li><strong className="text-primary">Consumenten</strong> kunnen een abonnement na de eerste periode op ieder moment opzeggen met een opzegtermijn van maximaal één maand, conform de wettelijke regels voor stilzwijgende verlenging.</li>
                <li><strong className="text-primary">Zakelijke gebruikers</strong> kunnen opzeggen tegen het einde van de lopende periode, met inachtneming van de bij de bestelling vermelde opzegtermijn.</li>
                <li>Opzeggen kan eenvoudig via je eigen dashboard of door een e-mail te sturen naar info@boonvakantieverhuur.nl.</li>
                <li>Bij opzegging behoud je toegang tot het einde van de reeds betaalde periode. Reeds betaalde bedragen voor de lopende periode worden niet terugbetaald, tenzij dwingend recht anders bepaalt.</li>
              </ol>
            ),
          },
          {
            titel: "Artikel 8 — Herroepingsrecht (consumenten)",
            inhoud: (
              <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm leading-relaxed">
                <li>Dit artikel geldt alleen voor Consumenten. Zakelijke gebruikers hebben geen wettelijk herroepingsrecht.</li>
                <li>Bij de aankoop van een digitale dienst heeft een Consument in beginsel 14 dagen bedenktijd waarin hij de Overeenkomst zonder opgaaf van reden kan herroepen.</li>
                <li>HostBoni levert de betaalde dienst direct na betaling. Daarom vragen wij de Consument bij de bestelling om uitdrukkelijk in te stemmen met onmiddellijke levering en afstand te doen van het herroepingsrecht zodra de dienst volledig is geleverd.</li>
                <li>Heeft de Consument deze instemming gegeven en is de dienst volledig geleverd, dan vervalt het herroepingsrecht en is geen terugbetaling meer mogelijk.</li>
                <li>Heeft de Consument deze instemming <strong className="text-primary">niet</strong> gegeven, dan behoudt hij gedurende 14 dagen het recht de Overeenkomst te herroepen.</li>
              </ol>
            ),
          },
          {
            titel: "Artikel 9 — Intellectuele eigendom",
            inhoud: (
              <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm leading-relaxed">
                <li>Alle intellectuele eigendomsrechten op HostBoni, de Tools, de software, de vormgeving, teksten, de figuur &quot;Boni&quot; en de overige onderdelen berusten bij Boon Vakantieverhuur of haar licentiegevers.</li>
                <li>Je krijgt een niet-exclusief, niet-overdraagbaar recht om HostBoni en de Tools te gebruiken voor je eigen verhuuractiviteiten, gedurende de looptijd van de Overeenkomst.</li>
                <li>De Output die de Tools specifiek voor jou genereren mag je vrij gebruiken voor je eigen accommodatie(s). Je mag de Tools of de Output niet doorverkopen, herdistribueren of als eigen dienst aanbieden zonder onze schriftelijke toestemming.</li>
                <li>De gegevens die jij zelf invoert blijven van jou. Je geeft ons het recht die gegevens te verwerken voor zover dat nodig is om de dienst te leveren en te verbeteren, conform de privacyverklaring.</li>
              </ol>
            ),
          },
          {
            titel: "Artikel 10 — Aansprakelijkheid",
            inhoud: (
              <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm leading-relaxed">
                <li>Wij zijn niet aansprakelijk voor schade die voortvloeit uit het gebruik van of het vertrouwen op de Output, behalve voor zover die schade het gevolg is van opzet of bewuste roekeloosheid van onze kant.</li>
                <li>Wij zijn niet aansprakelijk voor indirecte schade, waaronder gederfde inkomsten, gemiste boekingen, gevolgschade en reputatieschade.</li>
                <li>Voor zover wij ondanks het voorgaande aansprakelijk zijn, is onze aansprakelijkheid beperkt tot het bedrag dat je in de twaalf maanden voorafgaand aan de schadeveroorzakende gebeurtenis aan ons hebt betaald, of, als de dienst gratis was, tot maximaal € 100.</li>
                <li>De beperkingen in dit artikel gelden niet voor zover dwingend recht zich daartegen verzet.</li>
                <li>Voorwaarde voor enig recht op schadevergoeding is dat je de schade uiterlijk binnen 14 dagen na ontdekking schriftelijk bij ons meldt.</li>
              </ol>
            ),
          },
          {
            titel: "Artikel 11 — Privacy en gegevensverwerking",
            inhoud: (
              <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm leading-relaxed">
                <li>Bij het gebruik van HostBoni verwerken wij persoonsgegevens conform onze privacyverklaring.</li>
                <li>Wij verwerken persoonsgegevens in overeenstemming met de Algemene Verordening Gegevensbescherming (AVG).</li>
                <li>Voor de levering van de dienst maken wij gebruik van derde partijen (zoals Stripe voor betalingen en de leverancier van de AI-functionaliteit). Met deze partijen zijn waar nodig verwerkersovereenkomsten gesloten.</li>
              </ol>
            ),
          },
          {
            titel: "Artikel 12 — Klachten en geschillen",
            inhoud: (
              <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm leading-relaxed">
                <li>Heb je een klacht over HostBoni of de Output, neem dan contact op via info@boonvakantieverhuur.nl. Wij reageren in beginsel binnen 14 dagen.</li>
                <li>Op deze voorwaarden en alle Overeenkomsten is Nederlands recht van toepassing.</li>
                <li>Geschillen worden voorgelegd aan de bevoegde rechter in het arrondissement waar Boon Vakantieverhuur is gevestigd, tenzij dwingend recht een andere rechter aanwijst.</li>
                <li>Een Consument kan een geschil ook voorleggen via het ODR-platform van de Europese Commissie: <a href="https://ec.europa.eu/consumers/odr" className="text-accent underline" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.</li>
              </ol>
            ),
          },
          {
            titel: "Artikel 13 — Slotbepalingen",
            inhoud: (
              <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm leading-relaxed">
                <li>Is een bepaling van deze voorwaarden nietig of vernietigbaar, dan blijven de overige bepalingen van kracht.</li>
                <li>Wij mogen onze rechten en verplichtingen uit de Overeenkomst overdragen aan een derde, bijvoorbeeld bij overdracht van (een deel van) de onderneming. Je wordt daarover geïnformeerd.</li>
              </ol>
            ),
          },
        ].map(({ titel, inhoud }) => (
          <div key={titel} className="card p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-primary">{titel}</h2>
            {inhoud}
          </div>
        ))}

        <div className="card p-6 bg-surface text-center space-y-1">
          <p className="text-sm font-semibold text-primary">Boon Vakantieverhuur — HostBoni</p>
          <p className="text-xs text-text-secondary">Amstelveenseweg 14 te Amsterdam · KvK 73846384 · btw NL004777254B37</p>
          <p className="text-xs text-text-secondary">info@boonvakantieverhuur.nl</p>
        </div>

      </div>
    </div>
  );
}
