import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";
export type AppRole = "admin" | "user";

export interface Profile {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  status: AccountStatus;
}

export interface Permissions {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_download: boolean;
  can_manage_users: boolean;
  can_access_admin_panel: boolean;
}

export interface CurrentUserData {
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  permissions: Permissions | null;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const defaultPerms: Permissions = {
  can_view: false,
  can_create: false,
  can_edit: false,
  can_delete: false,
  can_download: false,
  can_manage_users: false,
  can_access_admin_panel: false,
};

export function useCurrentUser(): CurrentUserData {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(u: User | null) {
    if (!u) {
      setProfile(null);
      setRoles([]);
      setPermissions(null);
      setLoading(false);
      return;
    }
    const [{ data: prof }, { data: rolesData }, { data: perms }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.id),
      supabase.from("user_permissions").select("*").eq("user_id", u.id).maybeSingle(),
    ]);
    setProfile(prof as Profile | null);
    setRoles(((rolesData ?? []) as { role: AppRole }[]).map((r) => r.role));
    setPermissions((perms as Permissions | null) ?? defaultPerms);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      void load(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data.session?.user ?? null);
      void load(data.session?.user ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function refresh() {
    await load(user);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return {
    user,
    profile,
    roles,
    permissions,
    isAdmin: roles.includes("admin"),
    loading,
    refresh,
    signOut,
  };
}