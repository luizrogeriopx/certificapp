import { createFileRoute, Link } from "@tanstack/react-router";
import { Award } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gerador de Certificados" },
      { name: "description", content: "Crie e distribua certificados em PDF com um link." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <Award className="mb-6 h-16 w-16 text-primary" />
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Gerador de Certificados
      </h1>
      <p className="mt-4 max-w-xl text-base text-muted-foreground">
        Configure modelos no painel administrativo, compartilhe um link e seus
        participantes geram o próprio certificado em PDF.
      </p>
      <div className="mt-8">
        <Button asChild size="lg">
          <a href="https://wa.me/5562996897483" target="_blank" rel="noreferrer">
            Fale conosco
          </a>
        </Button>
      </div>
    </main>
  );
}
