import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { generateCertificatePdf } from "@/lib/pdf";

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
};

const nameSchema = z
  .string()
  .trim()
  .min(3, "Digite seu nome completo")
  .max(120, "Nome muito longo")
  .regex(/^[\p{L}\s'.-]+$/u, "Use apenas letras");

function PublicCert() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState<Cert | null>(null);
  const [bgUrl, setBgUrl] = useState<string>("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("certificates")
        .select("id,title,course_name,location,event_date,background_path")
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
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setGenerating(true);
    try {
      await generateCertificatePdf({
        title: cert.title,
        fullName: parsed.data,
        courseName: cert.course_name,
        location: cert.location,
        eventDate: cert.event_date,
        backgroundUrl: bgUrl,
      });
      await supabase.from("issued_certificates").insert({
        certificate_id: cert.id,
        full_name: parsed.data,
      });
      navigate({ to: "/c/$slug/obrigado", params: { slug } });
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
            <Button type="submit" className="w-full" disabled={generating}>
              {generating ? "Gerando..." : "Gerar certificado"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
