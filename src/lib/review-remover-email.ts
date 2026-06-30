export function buildReviewRemoverEmailHtml(input: {
  naam: string;
  verdict: string;
  onderbouwing: string;
  bezwaarbrief: string;
  stappenplan: string[];
  baseUrl: string;
}): string {
  const verdictKleur = input.verdict === "hoog" ? "#10b981" : input.verdict === "gemiddeld" ? "#f59e0b" : "#ef4444";
  const verdictLabel = input.verdict === "hoog" ? "Hoge kans" : input.verdict === "gemiddeld" ? "Gemiddelde kans" : "Lage kans";

  const stappenHtml = input.stappenplan
    .map((stap, i) => `<li style="margin-bottom:8px;color:#374151;font-size:14px;">${i + 1}. ${stap}</li>`)
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#1B2B4B;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="color:white;margin:0;font-size:22px;">🏠 Host Boni</h1>
        <p style="color:#a5b4fc;margin:8px 0 0;">Review Remover — jouw beoordeling</p>
      </div>
      <p style="color:#374151;">Hey ${input.naam}! Hier is de beoordeling van jouw recensie:</p>
      <div style="display:inline-block;background:${verdictKleur}1a;border:1px solid ${verdictKleur}55;color:${verdictKleur};padding:8px 16px;border-radius:8px;font-weight:bold;font-size:14px;margin:12px 0;">
        ${verdictLabel} op verwijdering
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;font-size:14px;color:#1B2B4B;">${input.onderbouwing}</p>
      </div>
      <h2 style="font-size:16px;color:#1B2B4B;">Jouw bezwaarbrief</h2>
      <div style="background:#eef7fe;border-radius:8px;padding:16px;margin-bottom:16px;white-space:pre-wrap;font-size:14px;color:#1B2B4B;">${input.bezwaarbrief}</div>
      <h2 style="font-size:16px;color:#1B2B4B;">Stappenplan</h2>
      <ol style="padding-left:20px;">${stappenHtml}</ol>
      <div style="text-align:center;margin:32px 0;">
        <a href="${input.baseUrl}/review-remover" style="background:#FF6B6B;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;">
          Nog een recensie checken →
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
        Host Boni · <a href="${input.baseUrl}" style="color:#9ca3af;">hostboni.com</a>
      </p>
    </div>`;
}
