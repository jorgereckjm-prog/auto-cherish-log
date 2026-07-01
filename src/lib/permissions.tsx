import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserPerms = {
  userId: string;
  email: string;
  nome: string;
  isAdmin: boolean;
  canEdit: boolean;
  loading: boolean;
};

const defaultPerms: UserPerms = {
  userId: "",
  email: "",
  nome: "",
  isAdmin: false,
  canEdit: false,
  loading: true,
};

const Ctx = createContext<UserPerms>(defaultPerms);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [perms, setPerms] = useState<UserPerms>(defaultPerms);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) { if (mounted) setPerms({ ...defaultPerms, loading: false }); return; }
      const [{ data: profile }, { data: perm }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("nome,email").eq("id", user.id).maybeSingle(),
        supabase.from("user_permissions").select("can_edit").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      if (!mounted) return;
      setPerms({
        userId: user.id,
        email: profile?.email ?? user.email ?? "",
        nome: profile?.nome ?? "",
        isAdmin,
        canEdit: isAdmin || !!perm?.can_edit,
        loading: false,
      });
    }
    load();
    return () => { mounted = false; };
  }, []);

  return <Ctx.Provider value={perms}>{children}</Ctx.Provider>;
}

export function usePermissions() {
  return useContext(Ctx);
}