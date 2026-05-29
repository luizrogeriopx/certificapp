import { jsPDF } from "jspdf";

export interface CertificateData {
  title: string;
  fullName: string;
  courseName: string;
  location: string;
  eventDate: string; // ISO date
  backgroundUrl: string;
  phrase: string;
  validationUrl?: string;
  cpf?: string;
  issuedAt?: string; // ISO date-time
  issuanceId?: string;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function maskCPF(value: string | undefined): string {
  if (!value) return "";
  const clean = value.replace(/\D/g, "");
  if (clean.length !== 11) return value;
  return `${clean.substring(0, 3)}.***.***-${clean.substring(9, 11)}`;
}

function formatDateLong(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export async function generateCertificatePdf(data: CertificateData): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Background
  try {
    const img = await loadImage(data.backgroundUrl);
    pdf.addImage(img, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
  } catch {
    pdf.setFillColor(250, 248, 240);
    pdf.rect(0, 0, pageW, pageH, "F");
  }

  // Title
  pdf.setTextColor(30, 30, 30);
  pdf.setFont("times", "bold");
  pdf.setFontSize(38);
  pdf.text(data.title, pageW / 2, pageH * 0.3, { align: "center" });

  // "Certificamos que"
  pdf.setFont("times", "normal");
  pdf.setFontSize(16);
  pdf.text("Certificamos que", pageW / 2, pageH * 0.42, { align: "center" });

  // Name
  pdf.setFont("times", "bolditalic");
  pdf.setFontSize(32);
  pdf.text(data.fullName, pageW / 2, pageH * 0.52, { align: "center" });

  // Course line
  pdf.setFont("times", "normal");
  pdf.setFontSize(14);
  const body = `${data.phrase} "${data.courseName}".`;
  const lines = pdf.splitTextToSize(body, pageW * 0.7);
  pdf.text(lines, pageW / 2, pageH * 0.62, { align: "center" });

  // Footer
  pdf.setFontSize(12);
  pdf.text(
    `${data.location} — ${formatDate(data.eventDate)}`,
    pageW / 2,
    pageH * 0.76,
    { align: "center" },
  );

  // QR Code Verification
  if (data.validationUrl) {
    try {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.validationUrl)}`;
      const qrImg = await loadImage(qrCodeUrl);
      pdf.addImage(qrImg, "PNG", pageW - 110, pageH - 110, 70, 70);
      
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text("Valide este certificado", pageW - 75, pageH - 30, { align: "center" });
    } catch (e) {
      console.error("Failed to add QR Code to PDF:", e);
    }
  }

  // --- PAGE 2 (VERSO) ---
  pdf.addPage();

  // Background color
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, 0, pageW, pageH, "F");

  // Card layout
  const cardW = 500;
  const cardH = 500;
  const cardX = pageW / 2 - cardW / 2;
  const cardY = pageH / 2 - cardH / 2;
  
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(1);
  pdf.roundedRect(cardX, cardY, cardW, cardH, 12, 12, "FD");

  // Emerald checkmark circle
  pdf.setFillColor(16, 185, 129);
  pdf.ellipse(pageW / 2, cardY + 50, 24, 24, "F");

  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(3);
  pdf.line(pageW / 2 - 8, cardY + 50, pageW / 2 - 2, cardY + 56);
  pdf.line(pageW / 2 - 2, cardY + 56, pageW / 2 + 8, cardY + 45);

  // Validation Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(5, 150, 105);
  pdf.text("✓ Certificado Autêntico", pageW / 2, cardY + 95, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Este certificado eletrônico foi validado com sucesso e é autêntico.", pageW / 2, cardY + 115, { align: "center" });

  // Divider
  pdf.setDrawColor(241, 245, 249);
  pdf.setLineWidth(1);
  pdf.line(cardX, cardY + 135, cardX + cardW, cardY + 135);

  const boxX = cardX + 30;
  const boxW = cardW - 60;

  // Box 1: CURSO / EVENTO
  pdf.setDrawColor(226, 232, 240);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(boxX, cardY + 155, boxW, 55, 8, 8, "D");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text("CURSO / EVENTO", boxX + 15, cardY + 170);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text(data.courseName, boxX + 15, cardY + 192);

  // Grid Row 1 (Aluno & CPF)
  const gridY1 = cardY + 225;
  const colW = (boxW - 15) / 2;

  pdf.roundedRect(boxX, gridY1, colW, 50, 8, 8, "D");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text("ALUNO", boxX + 15, gridY1 + 18);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  const truncatedName = data.fullName.length > 28 ? data.fullName.substring(0, 25) + "..." : data.fullName;
  pdf.text(truncatedName, boxX + 15, gridY1 + 38);

  pdf.roundedRect(boxX + colW + 15, gridY1, colW, 50, 8, 8, "D");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text("CPF", boxX + colW + 30, gridY1 + 18);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text(maskCPF(data.cpf), boxX + colW + 30, gridY1 + 38);

  // Grid Row 2 (Conclusão & Emissão)
  const gridY2 = cardY + 290;

  pdf.roundedRect(boxX, gridY2, colW, 50, 8, 8, "D");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text("DATA DE CONCLUSÃO", boxX + 15, gridY2 + 18);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text(formatDateLong(data.eventDate), boxX + 15, gridY2 + 38);

  pdf.roundedRect(boxX + colW + 15, gridY2, colW, 50, 8, 8, "D");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text("DATA DE EMISSÃO", boxX + colW + 30, gridY2 + 18);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text(formatDateLong(data.issuedAt), boxX + colW + 30, gridY2 + 38);

  // Box 6: CÓDIGO DE AUTENTICAÇÃO
  const box6Y = cardY + 355;
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(boxX, box6Y, boxW, 50, 8, 8, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text("CÓDIGO DE AUTENTICAÇÃO", pageW / 2, box6Y + 18, { align: "center" });
  pdf.setFont("courier", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);
  pdf.text(data.issuanceId || "", pageW / 2, box6Y + 36, { align: "center" });

  // QR Code inside the card
  if (data.validationUrl) {
    try {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.validationUrl)}`;
      const qrImg = await loadImage(qrCodeUrl);
      pdf.addImage(qrImg, "PNG", pageW / 2 - 30, cardY + 415, 60, 60);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184);
      pdf.text("Aponte a câmera para validar", pageW / 2, cardY + 485, { align: "center" });
    } catch (e) {
      console.error(e);
    }
  }

  pdf.save(`certificado-${data.fullName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
  return pdf;
}
