import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/lib/permissions";
import { listUsersFn, createUserFn, setUserPermissionFn, deleteUserFn } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/configuracoes/permissoes")({
  head: () => ({ meta: [{ title: "Permissões" }] }),
  component: PermissionsPage,
});

type Row = {
  id: string; email: string; nome: string; createdAt: string;
  canEdit: boolean; isAdmin: boolean;
};

function PermissionsPage() {
  const navigate = useNavigate();
  const perms = usePermissions();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nome: "", canEdit: false });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listUsersFn();
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!perms.loading) {
      if (!perms.isAdmin) {
        // Non-admin: show only their own row
        setRows([{ id: perms.userId, email: perms.email, nome: perms.nome, createdAt: "", canEdit: perms.canEdit, isAdmin: false }]);
        setLoading(false);
      } else {
        refresh();
      }
    }
  }, [perms.loading, perms.isAdmin]);

  async function togglePerm(userId: string, canEdit: boolean) {
    try {
      await setUserPermissionFn({ data: { userId, canEdit } });
      setRows((r) => r.map((x) => (x.id === userId ? { ...x, canEdit } : x)));
      toast.success("Permissão atualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  async function createUser() {
    if (!form.email || !form.password || !form.nome) return toast.error("Preencha todos os campos");
    setSaving(true);
    try {
      await createUserFn({ data: form });
      toast.success("Conta criada");
      setOpenNew(false);
      setForm({ email: "", password: "", nome: "", canEdit: false });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(userId: string) {
    try {
      await deleteUserFn({ data: { userId } });
      toast.success("Conta removida");
      setRows((r) => r.filter((x) => x.id !== userId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/configuracoes" })}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="size-5" /> Permissões
            </h1>
            <p className="text-xs text-muted-foreground">Contas e níveis de acesso</p>
          </div>
          {perms.isAdmin && (
            <Button size="sm" className="gap-2" onClick={() => setOpenNew(true)}>
              <Plus className="size-4" /> Nova conta
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contas cadastradas</CardTitle>
            <CardDescription>
              {perms.isAdmin
                ? "Alterne a permissão de edição de cada conta. Administradores sempre podem editar."
                : "Visualização da sua própria conta."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Permissão de edição</TableHead>
                    {perms.isAdmin && <TableHead className="w-16" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nome || "—"}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell>
                        {u.isAdmin ? (
                          <Badge>Administrador</Badge>
                        ) : (
                          <Badge variant="secondary">Usuário</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={u.canEdit}
                            disabled={!perms.isAdmin || u.isAdmin}
                            onCheckedChange={(v) => togglePerm(u.id, v)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {u.canEdit ? "Edição" : "Somente visualização"}
                          </span>
                        </div>
                      </TableCell>
                      {perms.isAdmin && (
                        <TableCell>
                          {!u.isAdmin && u.id !== perms.userId && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <Trash2 className="size-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover conta?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    A conta de {u.nome || u.email} será excluída permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => removeUser(u.id)}>Remover</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova conta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Senha inicial</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.canEdit} onCheckedChange={(v) => setForm({ ...form, canEdit: v })} />
              Permitir edição (senão só visualiza)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button onClick={createUser} disabled={saving}>{saving ? "Criando..." : "Criar conta"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}