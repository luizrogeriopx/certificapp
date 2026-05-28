import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/$id")({
  head: () => ({ meta: [{ title: "Detalhes do certificado" }] }),
  component: CertDetails,
});

type Cert = {
  id: string;
  title: string;
  slug: string;
  course_name: string;
  location: string;
  event_date: string;
  background_path: string;
};

type Issuance = { id: string; full_name: string; issued_at: string };

function CertDetails() {
  const { id } = Route.useParams();
  const [cert, setCert] = useState<Cert | null>(null);
  const [issued, setIssued] = useState<Issuance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: i }] = await Promise.all([
        supabase.from("certificates").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("issued_certificates")
          .select("id,full_name,issued_at")
          .eq("certificate_id", id)
          .order("issued_at", { ascending: false }),
      ]);
      setCert(c as Cert | null);
      setIssued(i ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!cert) return <p>Certificado não encontrado.</p>;

  const publicUrl = `${window.location.origin}/c/${cert.slug}`;

  return (
    <div className="space-y-6">
      <Link to="/admin" className="text-sm text-muted-foreground hover:underline">
        ← Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">{cert.title}</h1>
        <p className="text-muted-foreground">{cert.course_name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Link público</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm">{publicUrl}</code>
          <Button variant="outline" size="sm" onClick={() => {
            navigator.clipboard.writeText(publicUrl);
            toast.success("Link copiado!");
          }}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Emissões ({issued.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {issued.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda ninguém gerou este certificado.</p>
          ) : (
            <ul className="divide-y">
              {issued.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{i.full_name}</span>
                  <span className="text-muted-foreground">
                    {new Date(i.issued_at).toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
