import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Ação restrita a administradores");
}

export const listUsersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles }, { data: perms }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, nome, created_at").order("created_at"),
      supabaseAdmin.from("user_permissions").select("user_id, can_edit"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    const permMap = new Map((perms ?? []).map((p) => [p.user_id, p.can_edit]));
    const adminSet = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    return (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email ?? "",
      nome: p.nome ?? "",
      createdAt: p.created_at,
      canEdit: adminSet.has(p.id) ? true : !!permMap.get(p.id),
      isAdmin: adminSet.has(p.id),
    }));
  });

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nome: z.string().min(1),
  canEdit: z.boolean(),
});

export const createUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error) throw new Error(error.message);
    const newId = created.user!.id;
    await supabaseAdmin.from("profiles").upsert({ id: newId, email: data.email, nome: data.nome });
    await supabaseAdmin.from("user_permissions").upsert({ user_id: newId, can_edit: data.canEdit });
    if (!(await supabaseAdmin.from("user_roles").select("user_id").eq("user_id", newId).maybeSingle()).data) {
      await supabaseAdmin.from("user_roles").insert({ user_id: newId, role: "user" });
    }
    return { id: newId };
  });

const permSchema = z.object({ userId: z.string().uuid(), canEdit: z.boolean() });

export const setUserPermissionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => permSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_permissions")
      .upsert({ user_id: data.userId, can_edit: data.canEdit }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode remover a si mesmo");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });