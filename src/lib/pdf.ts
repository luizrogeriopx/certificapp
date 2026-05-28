import { jsPDF } from "jspdf";

export interface CertificateData {
  title: string;
  fullName: string;
  courseName: string;
  location: string;
  eventDate: string; // ISO date
  backgroundUrl: string;
  phrase: string;
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

export async function generateCertificatePdf(data: CertificateData): Promise<void> {
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

  pdf.save(`certificado-${data.fullName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
