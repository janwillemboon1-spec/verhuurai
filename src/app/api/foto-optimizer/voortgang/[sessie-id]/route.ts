import { createAdminClient } from "@/lib/supabase/admin";
import type { FotoVoortgang } from "@/types/foto-optimizer";

declare global {
  var fotoVoortgang: Map<string, FotoVoortgang>;
}

export async function GET(
  request: Request,
  { params }: { params: { "sessie-id": string } }
) {
  const sessieId = params["sessie-id"];
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: FotoVoortgang) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      // Haal voortgang op uit DB als memory leeg is (bijv. na server restart)
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

          return {
            sessieId,
            totaal: sessie.aantal_fotos || 0,
            klaar: bewerkingen?.filter(b => b.status === "klaar").length || 0,
            overgeslagen: bewerkingen?.filter(b => b.status === "overgeslagen").length || 0,
            fout: bewerkingen?.filter(b => b.status === "fout").length || 0,
            huidigeFoto: null,
            status: sessie.status as FotoVoortgang["status"],
          };
        } catch {
          return null;
        }
      };

      let ticks = 0;

      const interval = setInterval(async () => {
        ticks++;

        let voortgang = global.fotoVoortgang?.get(sessieId);

        // DB-fallback elke 5 seconden of als memory leeg is
        if (!voortgang || ticks % 5 === 0) {
          const vanDb = await haalVanDb();
          if (!voortgang && vanDb) voortgang = vanDb;
          // Sync memory vanuit DB als status klaar/fout
          if (vanDb && (vanDb.status === "klaar" || vanDb.status === "fout")) {
            voortgang = vanDb;
          }
        }

        if (voortgang) {
          send(voortgang);
          if (voortgang.status === "klaar" || voortgang.status === "fout") {
            clearInterval(interval);
            try { controller.close(); } catch {}
            return;
          }
        }

        // Stop na 15 minuten
        if (ticks > 900) {
          clearInterval(interval);
          try { controller.close(); } catch {}
        }
      }, 1000);

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
