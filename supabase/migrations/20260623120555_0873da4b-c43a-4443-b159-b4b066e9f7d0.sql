DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill any existing auth users without a profile
INSERT INTO public.profiles (id, nome, email, cargo, status)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)),
       u.email,
       COALESCE(u.raw_user_meta_data->>'cargo',''),
       'pending'::public.account_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;

INSERT INTO public.user_permissions (user_id)
SELECT u.id
FROM auth.users u
LEFT JOIN public.user_permissions pe ON pe.user_id = u.id
WHERE pe.user_id IS NULL;