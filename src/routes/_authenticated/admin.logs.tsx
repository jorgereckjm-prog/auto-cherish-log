import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AdminMenu } from "@/components/admin-menu";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  head: () => ({ meta: [{ title: "Logs — FrotaPro" }] }),
  component: AdminLogsPage,
});

interface LogRow {
  id: string;
  actor_email: string | null;
  acao: string;
  detalhes: unknown;
  created_at: string;
}

function AdminLogsPage() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useCurrentUser();
  const [rows, setRows] = useState<LogRow[]>([]);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/" });
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => setRows((data ?? []) as LogRow[]));
  }, [isAdmin]);

  if (loading || !isAdmin) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
          </Button>
          <h1 className="text-lg font-bold flex-1">Logs do sistema</h1>
          <AdminMenu />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Card>
          <CardHeader><CardTitle>Últimas {rows.length} ações</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Quem</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-sm">{r.actor_email ?? "—"}</TableCell>
                    <TableCell className="font-medium text-sm">{r.acao}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{JSON.stringify(r.detalhes)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sem registros</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}