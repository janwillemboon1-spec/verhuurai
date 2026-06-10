import Link from "next/link";

const MODULES = [
  {
    href: "/cockpit/revenue/bezetting",
    icon: "📈",
    titel: "Bezetting",
    beschrijving: "Eigen bezetting vs markt voor 15/30/60/90 dagen. Prijzen aanpassen en overrides instellen.",
    kleur: "hover:border-blue-300",
  },
  {
    href: "/cockpit/revenue/omzet",
    icon: "💶",
    titel: "Omzet",
    beschrijving: "Omzetoverzicht per woning, periode en kanaal.",
    kleur: "hover:border-green-300",
    binnenkort: true,
  },
  {
    href: "/cockpit/revenue/compsets",
    icon: "🔍",
    titel: "Compsets",
    beschrijving: "Stel vergelijkbare accommodaties in en monitor hun bezetting en prijzen.",
    kleur: "hover:border-purple-300",
    binnenkort: true,
  },
  {
    href: "/cockpit/revenue/marktanalyses",
    icon: "🗺️",
    titel: "Marktanalyses",
    beschrijving: "Losse marktonderzoeksrapporten voor eigen gebruik of externe klanten.",
    kleur: "hover:border-orange-300",
    binnenkort: true,
  },
  {
    href: "/cockpit/revenue/rapporten",
    icon: "📋",
    titel: "Rapporten",
    beschrijving: "Automatische eigenaarrapportages en historische overzichten.",
    kleur: "hover:border-red-300",
    binnenkort: true,
  },
];

export default function RevenueHubPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#2b3885] mb-1">Revenue Management</h1>
      <p className="text-gray-500 mb-8 text-sm">Kies een module.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => (
          <div key={m.href} className="relative">
            {m.binnenkort ? (
              <div className={`block p-6 bg-white rounded-xl border border-gray-200 opacity-50 cursor-not-allowed`}>
                <div className="text-2xl mb-2">{m.icon}</div>
                <h2 className="font-semibold text-gray-900 mb-1">{m.titel}</h2>
                <p className="text-sm text-gray-500">{m.beschrijving}</p>
                <span className="absolute top-3 right-3 text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                  Binnenkort
                </span>
              </div>
            ) : (
              <Link
                href={m.href}
                className={`block p-6 bg-white rounded-xl border border-gray-200 ${m.kleur} hover:shadow-sm transition-all`}
              >
                <div className="text-2xl mb-2">{m.icon}</div>
                <h2 className="font-semibold text-gray-900 mb-1">{m.titel}</h2>
                <p className="text-sm text-gray-500">{m.beschrijving}</p>
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
