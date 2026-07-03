
INSERT INTO public.user_roles (user_id, role) VALUES ('e66d579b-b6fb-4b7a-9f43-0c06560ec215', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_permissions (user_id, can_view, can_create, can_edit, can_delete, can_download, can_manage_users, can_access_admin_panel)
VALUES ('e66d579b-b6fb-4b7a-9f43-0c06560ec215', true, true, true, true, true, true, true)
ON CONFLICT (user_id) DO UPDATE SET can_view=true, can_create=true, can_edit=true, can_delete=true, can_download=true, can_manage_users=true, can_access_admin_panel=true;

UPDATE public.profiles SET status='approved' WHERE id='e66d579b-b6fb-4b7a-9f43-0c06560ec215';
