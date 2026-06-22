import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, X, Pause, Play, Trash2, ShieldCheck, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AdminMenu } from "@/components/admin-menu";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Gerenciar usuários — FrotaPro" }] }),
  component: AdminUsersPage,
});

interface Row {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  created_at: string;
  roles: string[];
  permissions: Record<string, boolean> | null;
}

const PERM_KEYS = [
  ["can_view", "Visualizar"],
  ["can_create", "Criar"],
  ["can_edit", "Editar"],
  ["can_delete", "Excluir"],
  ["can_download", "Baixar arquivos"],
  ["can_manage_users", "Gerenciar usuários"],
  ["can_access_admin_panel", "Acessar painel admin"],
] as const;

function AdminUsersPage() {
  const navigate = useNavigate();
  const { isAdmin, loading, user } = useCurrentUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/" });
  }, [loading, isAdmin, navigate]);

  const load = useCallback(async () => {
    const { data: profs, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    const ids = (profs ?? []).map((p) => p.id);
    const [{ data: rolesData }, { data: permsData }] = await Promise.all([
      supabase.from("user_roles").select("user_id, role").in("user_id", ids.length ? ids : ["_"]),
      supabase.from("user_permissions").select("*").in("user_id", ids.length ? ids : ["_"]),
    ]);
    const rolesByUser = new Map<string, string[]>();
    (rolesData ?? []).forEach((r: { user_id: string; role: string }) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });
    const permsByUser = new Map<string, Record<string, boolean>>();
    (permsData ?? []).forEach((p: Record<string, unknown>) => {
      permsByUser.set(p.user_id as string, p as Record<string, boolean>);
    });
    setRows(
      (profs ?? []).map((p) => ({
        ...(p as Omit<Row, "roles" | "permissions">),
        roles: rolesByUser.get(p.id) ?? [],
        permissions: permsByUser.get(p.id) ?? null,
      })),
    );
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  async function logAction(acao: string, detalhes: Record<string, unknown>) {
    if (!user) return;
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      actor_email: user.email,
      acao,
      detalhes,
    });
  }

  async function setStatus(row: Row, status: Row["status"]) {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", row.id);
    if (error) return toast.error(error.message);
    await logAction("status_change", { target: row.email, from: row.status, to: status });
    toast.success(`Status atualizado para ${status}`);
    await load();
  }

  async function toggleAdmin(row: Row) {
    const isAdm = row.roles.includes("admin");
    if (isAdm) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", row.id).eq("role", "admin");
      if (error) return toast.error(error.message);
      await logAction("remove_admin", { target: row.email });
      toast.success("Permissão admin removida");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: row.id, role: "admin" });
      if (error) return toast.error(error.message);
      await logAction("grant_admin", { target: row.email });
      toast.success("Promovido a admin");
    }
    await load();
  }

  async function deleteUser(row: Row) {
    if (!window.confirm(`Excluir definitivamente ${row.email}?`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    await logAction("delete_user", { target: row.email });
    toast.success("Usuário removido do sistema (acesso ao login permanece no provedor)");
    await load();
  }

  async function updatePerm(row: Row, key: string, value: boolean) {
    const existing = row.permissions ?? { user_id: row.id };
    const payload = { ...existing, [key]: value, user_id: row.id };
    const { error } = await supabase.from("user_permissions").upsert(payload, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    await logAction("permission_change", { target: row.email, key, value });
    await load();
    if (editing && editing.id === row.id) {
      setEditing({ ...row, permissions: { ...(row.permissions ?? {}), [key]: value } });
    }
  }

  if (loading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  const statusColor: Record<Row["status"], string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    suspended: "bg-gray-200 text-gray-800",
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
          </Button>
          <h1 className="text-lg font-bold flex-1">Gerenciar usuários</h1>
          <AdminMenu />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Usuários do sistema ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.cargo || "—"}</TableCell>
                    <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[r.status]}`}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.roles.includes("admin") ? (
                        <span className="inline-flex items-center gap-1 text-xs text-primary"><ShieldCheck className="size-3" /> admin</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">user</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {r.status === "pending" && (
                          <>
                            <Button size="sm" variant="default" onClick={() => setStatus(r, "approved")}>
                              <Check className="size-3 mr-1" /> Aprovar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setStatus(r, "rejected")}>
                              <X className="size-3 mr-1" /> Rejeitar
                            </Button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <Button size="sm" variant="outline" onClick={() => setStatus(r, "suspended")}>
                            <Pause className="size-3 mr-1" /> Suspender
                          </Button>
                        )}
                        {(r.status === "suspended" || r.status === "rejected") && (
                          <Button size="sm" variant="default" onClick={() => setStatus(r, "approved")}>
                            <Play className="size-3 mr-1" /> Reativar
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                          Permissões
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleAdmin(r)}>
                          <Shield className="size-3 mr-1" />
                          {r.roles.includes("admin") ? "Remover admin" : "Tornar admin"}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteUser(r)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhum usuário</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissões — {editing?.nome}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              {PERM_KEYS.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between border rounded-lg p-3">
                  <Label htmlFor={`p-${key}`}>{label}</Label>
                  <Switch
                    id={`p-${key}`}
                    checked={!!editing.permissions?.[key]}
                    onCheckedChange={(v) => updatePerm(editing, key, v)}
                  />
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}