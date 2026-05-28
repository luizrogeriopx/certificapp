import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/_authenticated/admin/novo")({
  head: () => ({ meta: [{ title: "Novo certificado" }] }),
  component: NewCertificate,
});

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  course_name: z.string().trim().min(2).max(160),
  location: z.string().trim().min(2).max(120),
  event_date: z.string().min(1),
  phrase: z.string().trim().min(2).max(120),
});

function NewCertificate() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("Certificado de Conclusão");
  const [course, setCourse] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [phrase, setPhrase] = useState("concluiu com êxito o curso");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ title, course_name: course, location, event_date: date, phrase });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!file) {
      toast.error("Envie uma imagem de fundo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("certificate-backgrounds")
        .upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;

      const slug = slugify(title);
      const { data, error } = await supabase
        .from("certificates")
        .insert({
          owner_id: user.id,
          slug,
          title: parsed.data.title,
          course_name: parsed.data.course_name,
          location: parsed.data.location,
          event_date: parsed.data.event_date,
          background_path: path,
          phrase: parsed.data.phrase,
        })
        .select("id")
        .single();
      if (error) throw error;

      toast.success("Certificado criado!");
      navigate({ to: "/admin/$id", params: { id: data.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/admin" className="text-sm text-muted-foreground hover:underline">
        ← Voltar
      </Link>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Novo certificado</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do certificado</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phrase">Texto de conclusão (ex: "concluiu com êxito o curso")</Label>
              <Input id="phrase" value={phrase} onChange={(e) => setPhrase(e.target.value)} maxLength={120} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course">Nome do curso</Label>
              <Input id="course" value={course} onChange={(e) => setCourse(e.target.value)} maxLength={160} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Local</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bg">Imagem de fundo (PNG/JPG, máx 5MB)</Label>
              <Input id="bg" type="file" accept="image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
              <p className="text-xs text-muted-foreground">Recomendado: 1920×1080 (paisagem).</p>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Salvando..." : "Criar certificado"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
