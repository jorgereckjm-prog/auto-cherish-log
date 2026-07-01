import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/lib/permissions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes/")({
  head: () => ({ meta: [{ title: "Configurações" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const perms = usePermissions();

  async function logout() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/" })}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight">Configurações</h1>
            <p className="text-xs text-muted-foreground">Logado como {perms.nome || perms.email} {perms.isAdmin && "(Administrador)"}</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="gap-2">
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contas e permissões</CardTitle>
            <CardDescription>
              {perms.isAdmin
                ? "Gerencie contas de usuários e defina quem pode editar."
                : "Veja sua permissão atual no sistema."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/configuracoes/permissoes">
              <Button className="gap-2"><ShieldCheck className="size-4" /> Abrir permissões</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sua permissão</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {perms.isAdmin
              ? "Administrador — acesso total (criação, edição, exclusão e gestão de contas)."
              : perms.canEdit
              ? "Usuário com permissão de edição."
              : "Usuário com permissão de apenas visualização."}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}