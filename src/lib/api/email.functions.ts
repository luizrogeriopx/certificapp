import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const sendEmailSchema = z.object({
  email: z.string().email(),
  fullName: z.string(),
  courseName: z.string(),
  pdfBase64: z.string(),
});

export const sendCertificateEmail = createServerFn({ method: "POST" })
  .inputValidator(sendEmailSchema)
  .handler(async ({ data }) => {
    const { email, fullName, courseName, pdfBase64 } = data;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.warn("[Email Server Function] RESEND_API_KEY is not defined. Skipping email dispatch.");
      return { success: false, error: "Chave do Resend (RESEND_API_KEY) não configurada no servidor." };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Certificados <onboarding@resend.dev>",
          to: email,
          subject: `Seu Certificado - ${courseName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
              <h2 style="color: #1a202c; margin-bottom: 20px;">Seu certificado está pronto!</h2>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                Olá, <strong>${fullName}</strong>,
              </p>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                Parabéns pela conclusão do curso/evento <strong>"${courseName}"</strong>! Seu certificado digital foi gerado e está anexado em formato PDF a este e-mail.
              </p>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                Você também pode validá-lo ou visualizá-lo a qualquer momento através do QR Code impresso no documento.
              </p>
              <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
              <p style="color: #a0aec0; font-size: 12px; text-align: center;">
                Este é um e-mail automático enviado por CertificApp.
              </p>
            </div>
          `,
          attachments: [
            {
              content: pdfBase64,
              filename: `certificado-${fullName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.pdf`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Email Server Function] Resend API response error:", errorText);
        return { success: false, error: `Erro da API Resend: ${response.statusText}` };
      }

      const resJson = await response.json();
      return { success: true, id: resJson.id };
    } catch (err: any) {
      console.error("[Email Server Function] Unexpected catch error:", err);
      return { success: false, error: err.message ?? "Erro inesperado ao enviar o email." };
    }
  });
