import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export default async function CockpitLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#2b3885] text-white px-6 py-3 flex items-center gap-4 flex-wrap">
        <a href="/cockpit" className="font-bold text-lg tracking-tight hover:text-blue-200 transition-colors">Cockpit</a>
        <a href="/cockpit/berichten" className="text-sm hover:text-blue-200 transition-colors">Berichten</a>
        <a href="/cockpit/revenue" className="text-sm hover:text-blue-200 transition-colors">Revenue</a>
        <a href="/cockpit/financien" className="text-sm hover:text-blue-200 transition-colors">Financiën</a>
        <a href="/cockpit/hostboni-admin" className="text-sm hover:text-blue-200 transition-colors">HB Admin</a>
        <a href="/admin/community" className="text-sm hover:text-blue-200 transition-colors">Community</a>
        <a href="/admin/onboarding" className="text-sm hover:text-blue-200 transition-colors">Onboarding</a>
        <a href="/cockpit/instellingen" className="text-sm hover:text-blue-200 transition-colors">Instellingen</a>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
