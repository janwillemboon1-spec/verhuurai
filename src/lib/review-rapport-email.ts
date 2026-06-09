export function buildReviewRapportEmail(
  naam: string,
  listingNaam: string,
  periode: string,
  rapport: any,
  rapportUrl: string
): string {
  const r = rapport;
  const sentimentKleur = r.sentiment?.positief >= 70 ? "#22c55e" : r.sentiment?.positief >= 50 ? "#f59e0b" : "#ef4444";

  const verbeterpuntenHtml = r.verbeterpunten?.length
    ? r.verbeterpunten.map((p: string, i: number) => `
        <tr>
          <td style="padding: 8px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">
            <strong style="color: #FF6B6B;">${i + 1}.</strong> ${p}
          </td>
        </tr>`).join("")
    : "";

  const reactiesHtml = r.voorbeeldReacties?.slice(0, 2).map((vr: any) => `
    <div style="background: #f9fafb; border-left: 3px solid #e5e7eb; padding: 12px 16px; margin-bottom: 12px; border-radius: 4px;">
      <p style="font-size: 12px; color: #9ca3af; font-style: italic; margin: 0 0 8px;">"${vr.origineelReview}"</p>
      <p style="font-size: 13px; color: #374151; margin: 0;">${vr.aanbevolenReactie}</p>
    </div>`).join("") ?? "";

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <div style="background:#1B2B4B;padding:32px;border-radius:12px;text-align:center;margin-bottom:24px;">
    <h1 style="color:white;margin:0 0 4px;font-size:24px;">🏠 VerhuurAI</h1>
    <p style="color:#a5b4fc;margin:0;font-size:14px;">Host Performance Audit Rapport</p>
    <p style="color:#e0e7ff;margin:8px 0 0;font-size:13px;">${listingNaam} · ${periode}</p>
  </div>

  <!-- Sentiment -->
  <div style="background:white;border-radius:12px;padding:24px;margin-bottom:16px;border:1px solid #e5e7eb;">
    <h2 style="color:#1B2B4B;margin:0 0 16px;font-size:18px;">Sentimentoverzicht</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="text-align:center;padding:12px;background:#f0fdf4;border-radius:8px;width:33%;">
          <div style="font-size:28px;font-weight:bold;color:#22c55e;">${r.sentiment?.positief ?? 0}%</div>
          <div style="font-size:12px;color:#6b7280;">Positief</div>
        </td>
        <td style="width:8px;"></td>
        <td style="text-align:center;padding:12px;background:#fffbeb;border-radius:8px;width:33%;">
          <div style="font-size:28px;font-weight:bold;color:#f59e0b;">${r.sentiment?.neutraal ?? 0}%</div>
          <div style="font-size:12px;color:#6b7280;">Neutraal</div>
        </td>
        <td style="width:8px;"></td>
        <td style="text-align:center;padding:12px;background:#fef2f2;border-radius:8px;width:33%;">
          <div style="font-size:28px;font-weight:bold;color:#ef4444;">${r.sentiment?.negatief ?? 0}%</div>
          <div style="font-size:12px;color:#6b7280;">Negatief</div>
        </td>
      </tr>
    </table>
    ${r.sentiment?.trendOmschrijving ? `<p style="font-size:13px;color:#6b7280;margin:12px 0 0;">↑ ${r.sentiment.trendOmschrijving}</p>` : ""}
  </div>

  <!-- Samenvatting -->
  ${r.samenvatting ? `
  <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e5e7eb;">
    <p style="font-size:15px;color:#1B2B4B;font-style:italic;margin:0;">"${r.samenvatting}"</p>
  </div>` : ""}

  <!-- Complimenten -->
  ${r.terugkerendeComplimenten?.length ? `
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:16px;">
    <h3 style="color:#166534;margin:0 0 12px;font-size:16px;">✅ Wat gasten waarderen</h3>
    <ul style="margin:0;padding-left:20px;">
      ${r.terugkerendeComplimenten.map((c: string) => `<li style="font-size:14px;color:#374151;margin-bottom:6px;">${c}</li>`).join("")}
    </ul>
  </div>` : ""}

  <!-- Klachten -->
  ${r.terugkerendeKlachten?.length ? `
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin-bottom:16px;">
    <h3 style="color:#92400e;margin:0 0 12px;font-size:16px;">⚠️ Terugkerende klachten</h3>
    <ul style="margin:0;padding-left:20px;">
      ${r.terugkerendeKlachten.map((c: string) => `<li style="font-size:14px;color:#374151;margin-bottom:6px;">${c}</li>`).join("")}
    </ul>
  </div>` : ""}

  <!-- Verbeterpunten -->
  ${verbeterpuntenHtml ? `
  <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:16px;">
    <div style="background:#1B2B4B;padding:12px 16px;">
      <h3 style="color:white;margin:0;font-size:16px;">🎯 Jouw verbeterpunten</h3>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">${verbeterpuntenHtml}</table>
  </div>` : ""}

  <!-- Voorbeeldreacties -->
  ${reactiesHtml ? `
  <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px;">
    <h3 style="color:#1B2B4B;margin:0 0 12px;font-size:16px;">💬 Voorbeeldreacties</h3>
    ${reactiesHtml}
  </div>` : ""}

  <!-- CTA -->
  <div style="text-align:center;margin-bottom:24px;">
    <a href="${rapportUrl}" style="background:#FF6B6B;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
      Volledig rapport bekijken →
    </a>
  </div>

  <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
    Dit rapport is gegenereerd door VerhuurAI voor ${naam} · <a href="https://verhuurai.nl/dashboard" style="color:#9ca3af;">Abonnement beheren</a>
  </p>

</div>
</body>
</html>`;
}
