import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/c/$slug/obrigado")({
  head: () => ({ meta: [{ title: "Obrigado!" }] }),
  component: ThankYou,
});

function ThankYou() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <CheckCircle2 className="mb-6 h-16 w-16 text-primary" />
      <h1 className="text-3xl font-semibold sm:text-4xl">Obrigado!</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Seu certificado foi baixado. Até a próxima!
      </p>
    </main>
  );
}
