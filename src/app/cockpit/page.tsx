import Link from "next/link";

export default function CockpitPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#2b3885] mb-2">Cockpit</h1>
      <p className="text-gray-500 mb-8">Jouw persoonlijk dashboard voor Boon Vakantieverhuur.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/cockpit/berichten"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[#2b3885] hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">💬</div>
          <h2 className="font-semibold text-gray-900 mb-1">Gastenberichten</h2>
          <p className="text-sm text-gray-500">Bekijk en beantwoord openstaande berichten met AI-hulp.</p>
        </Link>

        <Link
          href="/cockpit/instellingen"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[#2b3885] hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">⚙️</div>
          <h2 className="font-semibold text-gray-900 mb-1">Instellingen</h2>
          <p className="text-sm text-gray-500">Kies per woning of berichten gesynchroniseerd worden.</p>
        </Link>
      </div>
    </div>
  );
}
