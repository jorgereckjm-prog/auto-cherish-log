import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useCurrentUser();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Preparando sua conta…</p>
      </div>
    );
  }

  if (profile.status !== "approved") {
    const labels: Record<string, { title: string; msg: string }> = {
      pending: {
        title: "Aguardando aprovação",
        msg: "Sua conta foi criada e está aguardando aprovação do administrador. Você receberá uma notificação assim que for liberada.",
      },
      rejected: {
        title: "Solicitação não aprovada",
        msg: "Sua solicitação de acesso não foi aprovada. Entre em contato com o administrador para mais informações.",
      },
      suspended: {
        title: "Conta suspensa",
        msg: "Sua conta foi suspensa. Entre em contato com o administrador.",
      },
    };
    const info = labels[profile.status];
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>{info.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{info.msg}</p>
            <div className="text-xs text-muted-foreground border-t pt-3">
              <p><strong>Nome:</strong> {profile.nome}</p>
              <p><strong>E-mail:</strong> {profile.email}</p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
            >
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Outlet />;
}