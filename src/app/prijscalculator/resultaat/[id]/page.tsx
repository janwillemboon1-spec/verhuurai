import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import PrijsResultaat from "../../PrijsResultaat";

export default async function PrijsResultaatPagina({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("prijscalculator_rapporten")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!data) notFound();

  return (
    <PrijsResultaat
      analyse={data.resultaat_json}
      basis={data.basisprijs}
      minN={data.min_nachten || 1}
      jaar={data.jaar}
      opgeslagenId={data.id}
    />
  );
}
