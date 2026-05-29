import { createFileRoute, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { generateCertificatePdf } from "@/lib/pdf";
import { sendCertificateEmail } from "@/lib/api/email.functions";

export const Route = createFileRoute("/c/$slug")({
  head: () => ({ meta: [{ title: "Gerar certificado" }] }),
  component: PublicCert,
});

type Cert = {
  id: string;
  title: string;
  course_name: string;
  location: string;
  event_date: string;
  background_path: string;
  phrase: string;
};

// Standard Brazilian CPF validation algorithm
function isValidCPF(value: string): boolean {
  const clean = value.replace(/[^\d]+/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false;
  let sum = 0;
  let remainder;
  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(clean.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(clean.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(10, 11))) return false;
  return true;
}

// CPF input masking: 000.000.000-00
function formatCPF(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
}

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Digite seu nome completo")
    .max(120, "Nome muito longo")
    .regex(/^[\p{L}\s'.-]+$/u, "Use apenas letras no nome"),
  cpf: z
    .string()
    .trim()
    .min(14, "CPF incompleto")
    .refine((val) => isValidCPF(val), { message: "CPF inválido" }),
  email: z.string().email("E-mail inválido"),
});

function PublicCert() {
  const routerState = useRouterState();
  const isObrigado = routerState.location.pathname.endsWith("/obrigado");

  if (isObrigado) {
    return <Outlet />;
  }

  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState<Cert | null>(null);
  const [bgUrl, setBgUrl] = useState<string>("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("certificates")
        .select("id,title,course_name,location,event_date,background_path,phrase")
        .eq("slug", slug)
        .maybeSingle();
      if (data) {
        setCert(data as Cert);
        const { data: pub } = supabase.storage
          .from("certificate-backgrounds")
          .getPublicUrl(data.background_path);
        setBgUrl(pub.publicUrl);
      }
      setLoading(false);
    })();
  }, [slug]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cert) return;

    const parsed = formSchema.safeParse({ name, cpf, email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setGenerating(true);
    try {
      // 1. Record the issuance in the database to get a unique verification ID
      const { data: issuedData, error: dbError } = await supabase
        .from("issued_certificates")
        .insert({
          certificate_id: cert.id,
          full_name: parsed.data.name,
          cpf: parsed.data.cpf.replace(/\D/g, ""), // Save cleaned digits
          email: parsed.data.email,
        })
        .select("id")
        .single();

      if (dbError) throw dbError;

      // 2. Build the unique validation URL using the generated ID
      const validationUrl = `${window.location.origin}/c/${slug}/obrigado?id=${issuedData.id}`;

      // 3. Generate the PDF certificate (which embeds the validation QR Code)
      const pdfInstance = await generateCertificatePdf({
        title: cert.title,
        fullName: parsed.data.name,
        courseName: cert.course_name,
        location: cert.location,
        eventDate: cert.event_date,
        backgroundUrl: bgUrl,
        phrase: cert.phrase,
        validationUrl: validationUrl,
      });

      // 4. Extract base64 representation of the generated PDF
      const pdfBase64 = pdfInstance.output("datauristring").split(",")[1];

      // 5. Send PDF via email server function
      const emailResult = await sendCertificateEmail({
        data: {
          email: parsed.data.email,
          fullName: parsed.data.name,
          courseName: cert.course_name,
          pdfBase64,
        },
      });

      if (!emailResult.success) {
        toast.warning("Certificado gerado, mas o envio por e-mail falhou: " + emailResult.error);
      } else {
        toast.success("Certificado enviado para o seu e-mail!");
      }

      // 6. Navigate to thank-you/verification page
      navigate({
        to: "/c/$slug/obrigado",
        params: { slug },
        search: { id: issuedData.id },
      });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao gerar PDF");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Certificado não encontrado</h1>
          <p className="mt-2 text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{cert.title}</CardTitle>
          <CardDescription>{cert.course_name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como deve aparecer no certificado"
                maxLength={120}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  maxLength={150}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={generating}>
              {generating ? "Gerando..." : "Gerar certificado"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
