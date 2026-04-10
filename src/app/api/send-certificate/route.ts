import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { to, recipientName, courseName, pdfUrl, certId } = await req.json();

  if (!to || !recipientName || !courseName || !pdfUrl || !certId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return NextResponse.json(
      { error: "Email not configured. Add SMTP_HOST, SMTP_USER and SMTP_PASS to .env.local" },
      { status: 503 }
    );
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const verificationUrl = `${req.nextUrl.origin}/verificar/${certId}`;
  const fromAddress = SMTP_FROM ?? `Certifica Magistral <${SMTP_USER}>`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#02367B;padding:32px 40px;text-align:center;">
            <p style="margin:0;color:#93c5fd;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Magistral</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">Tu Certificado Oficial</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Estimado/a,</p>
            <h2 style="margin:0 0 24px;color:#0f172a;font-size:22px;font-weight:700;">${recipientName}</h2>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
              Nos complace informarte que has completado exitosamente el programa:
            </p>
            <div style="background:#f1f5f9;border-left:4px solid #02367B;border-radius:0 12px 12px 0;padding:16px 20px;margin:0 0 28px;">
              <p style="margin:0;color:#02367B;font-weight:700;font-size:16px;">${courseName}</p>
            </div>
            <p style="margin:0 0 32px;color:#475569;font-size:15px;line-height:1.7;">
              Tu certificado oficial está adjunto a este mensaje y también puedes descargarlo haciendo clic en el botón a continuación.
            </p>

            <!-- Buttons -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td style="padding-right:12px;">
                  <a href="${pdfUrl}" style="display:inline-block;background:#02367B;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 24px;border-radius:10px;">
                    ⬇ Descargar Certificado
                  </a>
                </td>
                <td>
                  <a href="${verificationUrl}" style="display:inline-block;background:#f1f5f9;color:#02367B;text-decoration:none;font-size:14px;font-weight:600;padding:14px 24px;border-radius:10px;border:1px solid #e2e8f0;">
                    ✓ Verificar Autenticidad
                  </a>
                </td>
              </tr>
            </table>

            <div style="border-top:1px solid #f1f5f9;padding-top:24px;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                El certificado puede ser verificado en cualquier momento en:<br />
                <a href="${verificationUrl}" style="color:#02367B;">${verificationUrl}</a>
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #f1f5f9;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} Magistral · Certificación Profesional</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `Tu certificado: ${courseName} | Magistral`,
      html,
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Email send error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
