import Link from "next/link";
import Image from "next/image";

export default function CockpitPage() {
  return (
    <div>
      <div className="flex items-center gap-5 mb-8">
        <Image
          src="/boni-cockpit.png"
          alt="Boni"
          width={80}
          height={80}
          className="rounded-full object-cover flex-shrink-0"
        />
        <div>
          <h1 className="text-2xl font-bold text-[#2b3885]">Boni&apos;s Cockpit</h1>
          <p className="text-gray-500 mt-0.5">Jouw persoonlijk dashboard voor Boon Vakantieverhuur.</p>
        </div>
      </div>

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
          href="/cockpit/revenue"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[#2b3885] hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">📊</div>
          <h2 className="font-semibold text-gray-900 mb-1">Revenue Management</h2>
          <p className="text-sm text-gray-500">Pacing, marktbezetting, prijzen en overrides voor alle woningen.</p>
        </Link>

        <Link
          href="/cockpit/financien"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[#2b3885] hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">💶</div>
          <h2 className="font-semibold text-gray-900 mb-1">Financiën</h2>
          <p className="text-sm text-gray-500">Inkomsten, kosten en resultaat van Boon Vakantieverhuur.</p>
        </Link>

        <Link
          href="/cockpit/hostboni-admin"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[#2b3885] hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">🛠️</div>
          <h2 className="font-semibold text-gray-900 mb-1">Host Boni Admin</h2>
          <p className="text-sm text-gray-500">Listing Optimizer, HP Audit, Prijscalculator, Foto Optimizer en meer.</p>
        </Link>

        <Link
          href="/admin/community"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[#2b3885] hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">🏘️</div>
          <h2 className="font-semibold text-gray-900 mb-1">Superhost Community</h2>
          <p className="text-sm text-gray-500">Beheer de community van Airbnb superhosts.</p>
        </Link>

        <Link
          href="/admin/onboarding"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[#2b3885] hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">📋</div>
          <h2 className="font-semibold text-gray-900 mb-1">Onboarding</h2>
          <p className="text-sm text-gray-500">Volg de onboarding voortgang van nieuwe Online Beheer klanten.</p>
        </Link>

        <Link
          href="/cockpit/instellingen"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[#2b3885] hover:shadow-sm transition-all sm:col-span-2"
        >
          <div className="text-2xl mb-2">⚙️</div>
          <h2 className="font-semibold text-gray-900 mb-1">Instellingen</h2>
          <p className="text-sm text-gray-500">Kies per woning of berichten gesynchroniseerd worden.</p>
        </Link>
      </div>
    </div>
  );
}
