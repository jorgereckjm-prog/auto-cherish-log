# Plano: Login, Aprovação Admin e Permissões

## Visão geral

Implementar um sistema completo de autenticação onde:
- Qualquer pessoa pode se cadastrar (e-mail/senha ou Google), mas fica como `pending`.
- Você (Jorge Miguel) é o admin que aprova/rejeita cada cadastro.
- Usuários comuns só veem o que o admin permitir.
- E-mails automáticos avisam o usuário em cada etapa.
- Engrenagem no canto superior direito abre o painel administrativo (visível só para admins).

> **Preciso confirmar:** Qual e-mail você usará como SUPER ADMIN? (será marcado como admin no primeiro login) — me responda com o e-mail ao aprovar o plano.

## Banco de dados (Lovable Cloud)

### Enums
- `app_role`: `admin`, `user`
- `account_status`: `pending`, `approved`, `rejected`, `suspended`

### Tabelas
- **`profiles`** — `id` (FK → auth.users), `nome`, `email`, `cargo`, `status`, `created_at`, `updated_at`
- **`user_roles`** — `id`, `user_id`, `role` (em tabela separada por segurança — nunca em profiles)
- **`user_permissions`** — `user_id`, `can_view`, `can_create`, `can_edit`, `can_delete`, `can_download`, `can_manage_users`, `can_access_admin_panel` (todas `false` por padrão)
- **`audit_logs`** — `id`, `user_id`, `acao`, `detalhes`, `ip`, `created_at`

### Funções de segurança (SECURITY DEFINER)
- `has_role(_user_id, _role)` — evita recursão em RLS
- `get_user_status(_user_id)` — retorna status do usuário
- Trigger `handle_new_user()` em `auth.users` → cria profile + permissions; se e-mail = `SUPER_ADMIN_EMAIL`, status=approved e role=admin; senão status=pending

### RLS
- Usuários só leem o próprio profile/permissions; admin lê tudo
- Só admin pode UPDATE/DELETE em profiles, roles, permissions
- Só admin lê audit_logs

## Frontend

### Rotas novas
- `/auth` — login + cadastro (tabs), botão "Esqueci minha senha", botão Google (via `lovable.auth.signInWithOAuth`)
- `/auth/reset-password` — define nova senha após link de recuperação
- `/auth/pending` — tela que aparece quando usuário aprovado=false ("Aguardando aprovação do administrador")
- `/admin/users` — painel admin: lista de pendentes/aprovados, ações aprovar/rejeitar/suspender/reativar, editor de permissões
- `/admin/logs` — auditoria
- `/conta/senha` — alterar senha logado

### Proteção
- Rotas existentes (Dashboard, Veículos, etc.) ficam sob `_authenticated/` e checam `status=approved`
- Menus admin só renderizam para `has_role('admin')` — usuários comuns nem veem
- Botões (criar, editar, excluir, download) renderizam apenas se permissão correspondente = true
- RLS no banco bloqueia mesmo que alguém burle o frontend

### Header
- Engrenagem (Settings icon) no canto superior direito do header global
- Dropdown com: **Usuários pendentes** (badge com contagem), **Gerenciar usuários**, **Logs do sistema**, **Configurações**, **Alterar minha senha**, **Sair**
- Itens admin ocultos para usuários comuns; apenas "Alterar senha" e "Sair" aparecem

## E-mails automáticos

Usando **Lovable Emails** (built-in):
1. **Após cadastro** → "Conta criada — aguardando aprovação"
2. **Após aprovação** → "Sua conta foi aprovada"
3. **Após rejeição** → "Sua solicitação não foi aprovada"
4. **Reset de senha** → template padrão de recuperação

Trigger: server function `notifyAccountStatusChange` chamada após mudança de status.

## Migração do app atual

O app de frota hoje não exige login. Após implementação:
- Conteúdo atual (Dashboard, Veículos, Motoristas, etc.) move para `_authenticated/`
- Dados em `localStorage` continuam funcionando (não migramos para o banco neste plano — pode ser próximo passo se quiser)
- O primeiro login do SUPER_ADMIN_EMAIL ativa o admin automaticamente

## Detalhes técnicos

- TanStack Start file-based routing; layout `_authenticated/route.tsx` já é gerenciado pela integração
- Google OAuth via `lovable.auth.signInWithOAuth('google', ...)` — sem precisar de credenciais
- Server functions com `requireSupabaseAuth` para ações admin (aprovar/rejeitar/promover)
- Service-role usado apenas em server-side para enviar e-mails e listar todos os usuários
- Engrenagem é um componente `<AdminMenu />` reutilizável no header

## Itens fora do escopo (faço depois se quiser)

- Migrar dados de localStorage para o banco (cada veículo/motorista por usuário)
- Login com SAML/SSO
- 2FA
- Compartilhamento granular por veículo

Confirme com o **e-mail do super admin** que devo configurar e eu começo a implementação.
