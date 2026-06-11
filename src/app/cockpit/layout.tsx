import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export default async function CockpitLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#2b3885] text-white px-6 py-3 flex items-center gap-6">
        <a href="/cockpit" className="font-bold text-lg tracking-tight hover:text-blue-200 transition-colors">Cockpit</a>
        <a href="/cockpit/berichten" className="text-sm hover:text-blue-200 transition-colors">
          Berichten
        </a>
        <a href="/cockpit/revenue" className="text-sm hover:text-blue-200 transition-colors">
          Revenue
        </a>
        <a href="/cockpit/instellingen" className="text-sm hover:text-blue-200 transition-colors">
          Instellingen
        </a>
        <a href="/admin" className="text-sm hover:text-blue-200 transition-colors ml-auto">
          ← Admin
        </a>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
