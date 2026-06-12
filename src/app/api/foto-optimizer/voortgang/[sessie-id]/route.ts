import { createAdminClient } from "@/lib/supabase/admin";
import type { FotoVoortgang } from "@/types/foto-optimizer";

export async function GET(
  request: Request,
  { params }: { params: { "sessie-id": string } }
) {
  const sessieId = params["sessie-id"];
  const encoder = new TextEncoder();

  const haalVanDb = async (): Promise<FotoVoortgang | null> => {
    try {
      const admin = createAdminClient();
      const { data: sessie } = await admin
        .from("foto_sessies")
        .select("status, aantal_fotos")
        .eq("id", sessieId)
        .single();
      if (!sessie) return null;

      const { data: bewerkingen } = await admin
        .from("foto_bewerkingen")
        .select("status")
        .eq("sessie_id", sessieId);

      const klaar = bewerkingen?.filter(b => b.status === "klaar").length || 0;
      const overgeslagen = bewerkingen?.filter(b => b.status === "overgeslagen").length || 0;
      const fout = bewerkingen?.filter(b => b.status === "fout").length || 0;
      const totaal = sessie.aantal_fotos || 0;

      // Als alle foto's verwerkt zijn maar sessie nog niet op klaar staat:
      // fix dit in de DB en stuur klaar terug zodat de client kan doorverwijzen
      const alleKlaar = totaal > 0 && (klaar + overgeslagen + fout) >= totaal;
      let status = sessie.status as FotoVoortgang["status"];

      if (alleKlaar && status === "verwerking") {
        status = "klaar";
        // Fix de sessie-status in de DB
        await admin
          .from("foto_sessies")
          .update({ status: "klaar", klaar_op: new Date().toISOString() })
          .eq("id", sessieId);
      }

      return { sessieId, totaal, klaar, overgeslagen, fout, huidigeFoto: null, status };
    } catch {
      return null;
    }
  };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: FotoVoortgang) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      let ticks = 0;

      const interval = setInterval(async () => {
        ticks++;
        const voortgang = await haalVanDb();

        if (voortgang) {
          send(voortgang);
          if (voortgang.status === "klaar" || voortgang.status === "fout") {
            clearInterval(interval);
            try { controller.close(); } catch {}
            return;
          }
        }

        if (ticks > 900) {
          clearInterval(interval);
          try { controller.close(); } catch {}
        }
      }, 2000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
