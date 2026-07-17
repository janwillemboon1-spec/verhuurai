import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "Boni van Host Boni <boni@verhuurai.nl>";
const ADMIN_EMAIL = "info@bnbassistant.com";

function aanspreking(klantNaam: string, voornaam?: string | null): string {
  return voornaam || klantNaam;
}

export async function stuurStapVoltooidEmail(
  klantEmail: string,
  klantNaam: string,
  stapNaam: string,
  voornaam?: string | null
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: klantEmail,
    subject: `Update voor ${klantNaam}: "${stapNaam}" is afgerond`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #2b3885; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Host Boni — Onboarding Update</h1>
        </div>
        <p style="font-size: 16px; color: #111827;">Hoi ${aanspreking(klantNaam, voornaam)},</p>
        <p style="color: #374151;">We hebben zojuist de volgende stap voor jou afgerond:</p>
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
          <p style="margin: 0; font-weight: bold; color: #166534;">✓ ${stapNaam}</p>
        </div>
        <p style="color: #374151;">Bekijk jouw volledige voortgang via jouw persoonlijke dashboard.</p>
        <p style="color: #6b7280; font-size: 13px; margin-top: 32px;">Met vriendelijke groet,<br>Jan-Willem van Host Boni</p>
      </div>
    `,
  });
}

export async function stuurWachtwoordResetEmail(
  klantEmail: string,
  resetUrl: string,
  voornaam?: string | null
): Promise<void> {
  await resend.emails.send({
    from: "Host Boni <boni@verhuurai.nl>",
    to: klantEmail,
    subject: "Nieuw wachtwoord instellen — Host Boni Onboarding",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #2b3885; margin-bottom: 8px;">Wachtwoord opnieuw instellen</h2>
        <p style="color: #555; margin-bottom: 24px;">Hallo ${aanspreking("daar", voornaam)},<br>Klik op de knop om een nieuw wachtwoord in te stellen. Deze link is 1 uur geldig.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #2b3885; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Wachtwoord instellen</a>
        <p style="color: #aaa; font-size: 12px; margin-top: 24px;">Als je dit niet hebt aangevraagd, kun je deze mail negeren.</p>
      </div>
    `,
  });
}

export async function stuurUitnodigingsEmail(
  klantEmail: string,
  dashboardUrl: string,
  resetUrl: string,
  voornaam?: string | null
): Promise<void> {
  const naam = aanspreking("daar", voornaam);
  await resend.emails.send({
    from: "Host Boni <boni@verhuurai.nl>",
    to: klantEmail,
    subject: "Jouw onboarding dashboard is klaar — Host Boni",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #2b3885; margin-bottom: 8px;">Welkom bij Host Boni, ${naam}!</h2>
        <p style="color: #555; margin-bottom: 8px;">Je persoonlijke onboarding dashboard is aangemaakt. Hier kun je de voortgang van jouw woning(en) volgen en to-do's afvinken.</p>
        <p style="color: #555; margin-bottom: 24px;">Klik op de knop hieronder om eerst een wachtwoord in te stellen, daarna kom je direct op je dashboard.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #2b3885; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 16px;">Wachtwoord instellen & inloggen</a>
        <p style="color: #aaa; font-size: 12px; margin-top: 8px;">Of ga direct naar je dashboard: <a href="${dashboardUrl}" style="color: #2b3885;">${dashboardUrl}</a></p>
        <p style="color: #aaa; font-size: 12px; margin-top: 24px;">Deze link is 1 uur geldig. Daarna kun je een nieuwe aanvragen via de loginpagina.</p>
      </div>
    `,
  });
}

export async function stuurTodoGedaanEmail(klantNaam: string, todoTekst: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `${klantNaam} heeft een taak afgerond`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #2b3885;">To-do afgerond</h2>
        <p><strong>${klantNaam}</strong> heeft de volgende taak als gedaan gemarkeerd:</p>
        <div style="background: #eef7fe; border-left: 4px solid #2b3885; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
          <p style="margin: 0; color: #1e3a8a;">☑ ${todoTekst}</p>
        </div>
        <p style="color: #6b7280; font-size: 13px;">Bekijk de volledige status in het admin dashboard: <a href="https://www.hostboni.com/admin/onboarding">Admin → Onboarding</a></p>
      </div>
    `,
  });
}
