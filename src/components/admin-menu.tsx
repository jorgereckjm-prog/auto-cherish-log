import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Settings, Users, ScrollText, LogOut, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AdminMenu() {
  const navigate = useNavigate();
  const { profile, isAdmin, signOut } = useCurrentUser();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    async function load() {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingCount(count ?? 0);
    }
    void load();
    const i = setInterval(load, 30_000);
    return () => clearInterval(i);
  }, [isAdmin]);

  async function handleLogout() {
    await signOut();
    toast.success("Você saiu");
    navigate({ to: "/auth" });
  }

  async function changePassword() {
    const newPwd = window.prompt("Digite a nova senha (mín. 8 caracteres):");
    if (!newPwd) return;
    if (newPwd.length < 8) return toast.error("Mínimo 8 caracteres");
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) return toast.error(error.message);
    toast.success("Senha alterada!");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Settings className="size-5" />
          {isAdmin && pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full size-4 flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">
          <div className="font-semibold">{profile?.nome || "Usuário"}</div>
          <div className="text-muted-foreground font-normal truncate">{profile?.email}</div>
          {isAdmin && (
            <div className="text-primary flex items-center gap-1 mt-1">
              <ShieldCheck className="size-3" /> Administrador
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/admin/users" className="flex items-center gap-2 cursor-pointer">
                <Users className="size-4" />
                <span>Gerenciar usuários</span>
                {pendingCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/logs" className="flex items-center gap-2 cursor-pointer">
                <ScrollText className="size-4" />
                <span>Logs do sistema</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={changePassword} className="cursor-pointer">
          <KeyRound className="size-4 mr-2" /> Alterar minha senha
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="size-4 mr-2" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}