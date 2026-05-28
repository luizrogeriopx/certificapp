import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Meus certificados" }] }),
  component: AdminList,
});

type Cert = {
  id: string;
  title: string;
  slug: string;
  course_name: string;
  created_at: string;
};

function AdminList() {
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("certificates")
      .select("id,title,slug,course_name,created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setCerts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Excluir este certificado?")) return;
    const { error } = await supabase.from("certificates").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Excluído");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meus certificados</h1>
        <Button asChild>
          <Link to="/admin/novo"><Plus className="mr-2 h-4 w-4" /> Novo certificado</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : certs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum certificado ainda. Clique em "Novo certificado" para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {certs.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <Link to="/_authenticated/admin/$id" params={{ id: c.id }} className="flex-1 min-w-0">
                  <p className="truncate font-medium">{c.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{c.course_name}</p>
                </Link>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/c/${c.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
