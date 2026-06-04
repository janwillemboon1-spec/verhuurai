import { Resend } from "resend";
import { NextResponse } from "next/server";

declare global {
  var rapporten: Map<string, any>;
  var sessies: Map<string, any>;
}
if (!global.rapporten) global.rapporten = new Map();
if (!global.sessies) global.sessies = new Map();

function renderVeldSectie(titel: string, veld: any): string {
  if (!veld) return "";

  const scoreKleur = veld.score >= 8 ? "#22c55e" : veld.score >= 5 ? "#f59e0b" : "#ef4444";

  let html = `
    <div style="margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background: #eef7fe; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; color: #2b3885; font-size: 16px;">${titel}</h3>
        ${veld.score !== undefined ? `<span style="background: ${scoreKleur}; color: white; padding: 2px 10px; border-radius: 999px; font-weight: bold;">${veld.score}/10</span>` : ""}
      </div>
      <div style="padding: 16px;">
  `;

  if (veld.analyse) {
    html += `<p style="margin: 0 0 12px;">${veld.analyse}</p>`;
  }

  if (veld.verbeterpunten?.length) {
    html += `<p style="font-weight: bold; margin: 0 0 6px;">Verbeterpunten:</p><ul style="margin: 0 0 12px; padding-left: 20px;">`;
    for (const punt of veld.verbeterpunten) {
      html += `<li>${punt}</li>`;
    }
    html += `</ul>`;
  }

  if (veld.herschreven_versie) {
    html += `<div style="background: #f0fdf4; border-left: 3px solid #22c55e; padding: 10px 14px; border-radius: 4px; margin-top: 8px;"><p style="margin: 0; font-weight: bold; font-size: 13px; color: #166534;">Herschreven versie:</p><p style="margin: 6px 0 0;">${veld.herschreven_versie}</p></div>`;
  }

  if (veld.herschreven_versies?.length) {
    html += `<p style="font-weight: bold; margin: 12px 0 6px;">Herschreven versies:</p>`;
    for (const v of veld.herschreven_versies) {
      html += `<div style="background: #f0fdf4; border-left: 3px solid #22c55e; padding: 10px 14px; border-radius: 4px; margin-bottom: 8px;"><p style="margin: 0; font-style: italic;">"${v.versie}"</p><p style="margin: 6px 0 0; font-size: 13px; color: #6b7280;">${v.uitleg}</p></div>`;
    }
  }

  if (veld.aanbeveling) {
    html += `<p><strong>Aanbeveling:</strong> ${veld.aanbeveling}</p>`;
  }

  if (veld.uitleg) {
    html += `<p>${veld.uitleg}</p>`;
  }

  html += `</div></div>`;
  return html;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessieId, emailOverride } = body;

    if (!sessieId || typeof sessieId !== "string") {
      return NextResponse.json({ error: "sessieId is verplicht" }, { status: 400 });
    }

    const rapport = global.rapporten.get(sessieId);
    if (!rapport) {
      return NextResponse.json({ error: "Rapport niet gevonden" }, { status: 404 });
    }

    const sessie = global.sessies.get(sessieId);
    const email = emailOverride || sessie?.email || "";
    const naam = rapport.hostNaam || sessie?.naam || "Host";

    if (!email) {
      return NextResponse.json({ error: "Geen e-mailadres gevonden" }, { status: 400 });
    }

    console.log(`[Email] Versturen naar: ${email}, van sessie: ${sessieId}`);
    const datum = rapport.datum
      ? new Date(rapport.datum).toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

    const scoreKleur =
      rapport.totaalscore >= 70 ? "#22c55e" : rapport.totaalscore >= 50 ? "#f59e0b" : "#ef4444";

    const velden = rapport.velden || {};

    const html = `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827;">
  <div style="max-width: 680px; margin: 0 auto; padding: 24px 16px;">

    <div style="background: #2b3885; padding: 32px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
      <h1 style="color: white; margin: 0 0 8px; font-size: 28px;">VerhuurAI Rapport</h1>
      <p style="color: #a5b4fc; margin: 0; font-size: 14px;">${datum}</p>
    </div>

    <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
      <p style="font-size: 18px; color: #2b3885; margin: 0 0 16px;">${rapport.openingszin || ""}</p>
      <div style="text-align: center; margin: 20px 0;">
        <div style="display: inline-block; background: ${scoreKleur}; color: white; font-size: 48px; font-weight: bold; width: 100px; height: 100px; border-radius: 50%; line-height: 100px; margin: 0 auto;">${rapport.totaalscore || 0}</div>
        <p style="color: #6b7280; margin: 8px 0 0;">Totaalscore</p>
      </div>
      <p style="color: #374151;">${rapport.totaalSamenvatting || rapport.totaal_samenvatting || ""}</p>
    </div>

    ${
      (rapport.top3SterkstePunten || rapport.top3_sterkste_punten)?.length
        ? `<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <h2 style="color: #166534; margin: 0 0 12px; font-size: 18px;">Top 3 sterkste punten</h2>
        <ul style="margin: 0; padding-left: 20px;">
          ${(rapport.top3SterkstePunten || rapport.top3_sterkste_punten).map((p: string) => `<li style="margin-bottom: 6px;">${p}</li>`).join("")}
        </ul>
      </div>`
        : ""
    }

    ${
      (rapport.top3Prioriteiten || rapport.top3_prioriteiten)?.length
        ? `<div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h2 style="color: #9a3412; margin: 0 0 12px; font-size: 18px;">Top 3 prioriteiten</h2>
        <ul style="margin: 0; padding-left: 20px;">
          ${(rapport.top3Prioriteiten || rapport.top3_prioriteiten).map((p: string) => `<li style="margin-bottom: 6px;">${p}</li>`).join("")}
        </ul>
      </div>`
        : ""
    }

    <h2 style="color: #2b3885; margin: 0 0 16px;">Gedetailleerde analyse</h2>

    ${renderVeldSectie("Titel", velden.titel)}
    ${renderVeldSectie("Beschrijving", velden.beschrijving)}
    ${renderVeldSectie("Accommodatie", velden.accommodatie)}
    ${renderVeldSectie("Toegang", velden.toegang)}
    ${renderVeldSectie("Interactie", velden.interactie)}
    ${renderVeldSectie("Andere info", velden.andere_info || velden.andereInfo)}
    ${renderVeldSectie("Voorzieningen", velden.voorzieningen)}
    ${renderVeldSectie("Buurt", velden.buurt)}
    ${renderVeldSectie("Vervoer", velden.vervoer)}
    ${velden.fotos ? renderVeldSectie("Foto's", velden.fotos) : ""}
    ${renderVeldSectie("Recensies", velden.recensies)}
    ${renderVeldSectie("Host profiel", velden.host_profiel || velden.hostProfiel)}
    ${renderVeldSectie("Huisregels", velden.huisregels)}
    ${renderVeldSectie("Direct boeken", velden.direct_boeken || velden.directBoeken)}
    ${renderVeldSectie("Annuleringsbeleid", velden.annuleringsbeleid)}

    ${
      rapport.actieplan
        ? `<div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #2b3885; margin: 0 0 16px;">Actieplan</h2>
        ${
          (rapport.actieplan.vandaag || rapport.actieplan.today)?.length
            ? `<h3 style="color: #ef4444; margin: 0 0 8px;">Vandaag</h3><ul style="margin: 0 0 16px; padding-left: 20px;">${(rapport.actieplan.vandaag || rapport.actieplan.today).map((a: string) => `<li style="margin-bottom: 4px;">${a}</li>`).join("")}</ul>`
            : ""
        }
        ${
          (rapport.actieplan.dezeWeek || rapport.actieplan.deze_week)?.length
            ? `<h3 style="color: #f59e0b; margin: 0 0 8px;">Deze week</h3><ul style="margin: 0 0 16px; padding-left: 20px;">${(rapport.actieplan.dezeWeek || rapport.actieplan.deze_week).map((a: string) => `<li style="margin-bottom: 4px;">${a}</li>`).join("")}</ul>`
            : ""
        }
        ${
          (rapport.actieplan.dezeMaand || rapport.actieplan.deze_maand)?.length
            ? `<h3 style="color: #22c55e; margin: 0 0 8px;">Deze maand</h3><ul style="margin: 0; padding-left: 20px;">${(rapport.actieplan.dezeMaand || rapport.actieplan.deze_maand).map((a: string) => `<li style="margin-bottom: 4px;">${a}</li>`).join("")}</ul>`
            : ""
        }
      </div>`
        : ""
    }

    ${
      (rapport.bonusTips || rapport.bonus_tips)?.length
        ? `<div style="background: #eef7fe; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h2 style="color: #2b3885; margin: 0 0 12px;">Bonus tips</h2>
        <ul style="margin: 0; padding-left: 20px;">
          ${(rapport.bonusTips || rapport.bonus_tips).map((t: string) => `<li style="margin-bottom: 6px;">${t}</li>`).join("")}
        </ul>
      </div>`
        : ""
    }

    <div style="background: #2b3885; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="color: white; margin: 0; font-size: 16px;">${rapport.afsluiting || ""}</p>
    </div>

    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Dit rapport is gegenereerd door VerhuurAI voor ${naam} op ${datum}.
    </p>
  </div>
</body>
</html>
    `.trim();

    const fromAdres = process.env.RESEND_FROM_EMAIL || "Boni van VerhuurAI <boni@verhuurai.nl>";
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: fromAdres,
      to: email,
      subject: "Jouw VerhuurAI rapport is klaar! 📊",
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Email sturen fout:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het versturen van de email" },
      { status: 500 }
    );
  }
}
