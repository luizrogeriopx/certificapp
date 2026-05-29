import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CheckCircle2, XCircle, Loader2, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/c/$slug/obrigado")({
  validateSearch: z.object({
    id: z.string().uuid().optional(),
  }),
  head: () => ({ meta: [{ title: "Validação de Certificado — CertificApp" }] }),
  component: ThankYou,
});

function maskCPF(value: string | null): string {
  if (!value) return "";
  // Value is clean digits (e.g. 12345678901)
  const clean = value.replace(/\D/g, "");
  if (clean.length !== 11) return value; // Return as is if unexpected
  return `${clean.substring(0, 3)}.***.***-${clean.substring(9, 11)}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function ThankYou() {
  const { id } = Route.useSearch();
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const [issuedCert, setIssuedCert] = useState<any | null>(null);

  useEffect(() => {
    if (!id) return;
    const verify = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("issued_certificates")
          .select(`
            id,
            full_name,
            cpf,
            email,
            issued_at,
            certificates (
              title,
              course_name,
              location,
              event_date
            )
          `)
          .eq("id", id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!data) {
          setError("Certificado não encontrado. O código identificador é inválido ou foi removido.");
        } else {
          setIssuedCert(data);
        }
      } catch (err: any) {
        console.error(err);
        setError("Ocorreu um erro ao consultar os detalhes de autenticação do certificado.");
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [id]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-6 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verificando autenticidade do certificado...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-12">
        <Card className="w-full max-w-md border-destructive/20 shadow-lg">
          <CardHeader className="text-center">
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <CardTitle className="mt-4 text-xl font-bold text-destructive">Falha na Validação</CardTitle>
            <CardDescription>O certificado consultado não pôde ser autenticado.</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      </main>
    );
  }

  if (issuedCert) {
    const certDetails = issuedCert.certificates;
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-12">
        <Card className="w-full max-w-xl border-emerald-500/20 shadow-lg bg-background">
          <CardHeader className="text-center border-b pb-6">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
            <CardTitle className="mt-4 text-2xl font-bold text-emerald-600">✓ Certificado Autêntico</CardTitle>
            <CardDescription>
              Este certificado eletrônico foi validado com sucesso e é autêntico.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-6 space-y-4">
            <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-lg border">
              <Award className="h-6 w-6 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Curso / Evento</p>
                <p className="font-semibold text-foreground text-sm sm:text-base">
                  {certDetails?.course_name || "N/A"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Aluno</p>
                <p className="font-medium text-foreground text-sm mt-0.5">{issuedCert.full_name}</p>
              </div>
              <div className="border p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-semibold">CPF</p>
                <p className="font-medium text-foreground text-sm mt-0.5">{maskCPF(issuedCert.cpf)}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Data de Conclusão</p>
                <p className="font-medium text-foreground text-sm mt-0.5">
                  {certDetails?.event_date ? formatDate(certDetails.event_date) : "N/A"}
                </p>
              </div>
              <div className="border p-3 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Data de Emissão</p>
                <p className="font-medium text-foreground text-sm mt-0.5">{formatDate(issuedCert.issued_at)}</p>
              </div>
            </div>

            <div className="border border-dashed p-3 rounded-lg bg-muted/10 text-center">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Código de Autenticação</p>
              <code className="text-xs font-mono text-primary select-all break-all">{issuedCert.id}</code>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Fallback: Standard thank you screen (when visited without ?id=xxx)
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <CheckCircle2 className="mb-6 h-16 w-16 text-primary" />
      <h1 className="text-3xl font-semibold sm:text-4xl">Obrigado!</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Seu certificado foi gerado e enviado para o seu e-mail. Até a próxima!
      </p>
    </main>
  );
}
