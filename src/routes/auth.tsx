import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Patrimonial Telecom" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup-first">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasAnyUser, setHasAnyUser] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.from("profiles").select("id", { count: "exact", head: true }).then(({ count }) => {
      setHasAnyUser((count ?? 0) > 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup-first") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { nome },
          },
        });
        if (error) throw error;
        toast.success("Administrador criado! Faça login.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo!");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 size-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Truck className="size-6" />
          </div>
          <CardTitle>Patrimonial Telecom</CardTitle>
          <CardDescription>
            {mode === "login" ? "Controle de Frotas" : "Cadastro do administrador inicial"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup-first" && (
              <div>
                <Label>Nome completo</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Jorge Miguel" />
              </div>
            )}
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar administrador"}
            </Button>
          </form>
          {hasAnyUser === false && mode === "login" && (
            <p className="text-xs text-center mt-4 text-muted-foreground">
              Primeiro acesso?{" "}
              <button type="button" className="text-primary underline" onClick={() => setMode("signup-first")}>
                Cadastrar administrador
              </button>
            </p>
          )}
          {mode === "signup-first" && (
            <p className="text-xs text-center mt-4 text-muted-foreground">
              <button type="button" className="text-primary underline" onClick={() => setMode("login")}>
                Voltar para login
              </button>
            </p>
          )}
          {hasAnyUser === true && mode === "login" && (
            <p className="text-xs text-center mt-4 text-muted-foreground">
              Não tem conta? Peça ao administrador para criar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}