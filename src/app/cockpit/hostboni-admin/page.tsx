import Link from "next/link";

export default function HostBoniAdminPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2b3885]">Host Boni Admin</h1>
        <p className="text-gray-500 mt-1">Overzicht van alle Host Boni tools en rapportages.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="/admin/listing-optimizer"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[#2b3885] hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">📝</div>
          <h2 className="font-semibold text-gray-900 mb-1">Listing Optimizer</h2>
          <p className="text-sm text-gray-500">Bekijk en beheer alle LO-sessies en rapporten.</p>
        </a>

        <a
          href="/admin/host-performance"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[#2b3885] hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">⭐</div>
          <h2 className="font-semibold text-gray-900 mb-1">Host Performance Audit</h2>
          <p className="text-sm text-gray-500">Bekijk en beheer alle HP Audit abonnementen en rapporten.</p>
        </a>

        <a
          href="/admin/prijscalculator"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[#2b3885] hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">💰</div>
          <h2 className="font-semibold text-gray-900 mb-1">Prijscalculator</h2>
          <p className="text-sm text-gray-500">Bekijk alle Prijscalculator-sessies.</p>
        </a>

        <a
          href="/admin/foto-optimizer"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[#2b3885] hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">📷</div>
          <h2 className="font-semibold text-gray-900 mb-1">Foto Optimizer</h2>
          <p className="text-sm text-gray-500">Bekijk en beheer alle foto-optimalisatie sessies.</p>
        </a>

        <a
          href="/admin/review-remover"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[#2b3885] hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">🗑️</div>
          <h2 className="font-semibold text-gray-900 mb-1">Review Remover</h2>
          <p className="text-sm text-gray-500">Bekijk alle bezwaaranalyses en verwijderverzoeken.</p>
        </a>

        <a
          href="/admin/contacten"
          className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-[#2b3885] hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">📊</div>
          <h2 className="font-semibold text-gray-900 mb-1">Titelanalyse & Contacten</h2>
          <p className="text-sm text-gray-500">Bekijk alle gratis titelanalyses en leads.</p>
        </a>
      </div>

      <div className="mt-6">
        <Link href="/cockpit" className="text-sm text-gray-500 hover:text-[#2b3885]">← Terug naar cockpit</Link>
      </div>
    </div>
  );
}
