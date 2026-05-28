## Visão geral

Aplicação para gerar certificados em PDF. Você (admin) cria modelos no painel definindo título, imagem de fundo, curso, data e local. Cada modelo gera um link público; quem acessa digita o nome completo, baixa o PDF e vê a página de agradecimento. Todas as emissões ficam registradas.

## Fluxos

**Admin**
1. Login com e-mail/senha (Lovable Cloud).
2. Lista de certificados criados → botão "Novo certificado".
3. Formulário: título, upload de imagem de fundo, nome do curso, data, local.
4. Após salvar, exibe link público (`/c/:slug`) com botão de copiar.
5. Cada certificado tem tela de detalhes com lista de emissões (nome + data).

**Público**
1. Acessa `/c/:slug` → vê preview do certificado e campo "Nome completo".
2. Clica em "Gerar certificado" → PDF é montado no navegador e baixado.
3. Redirecionado para `/c/:slug/obrigado` ("Obrigado, até a próxima!").

## Estrutura de rotas (TanStack Start)

- `/` — landing simples explicando o serviço + link para login.
- `/login` — login admin.
- `/_authenticated/admin` — lista de certificados.
- `/_authenticated/admin/novo` — criar certificado.
- `/_authenticated/admin/$id` — editar + ver emissões.
- `/c/$slug` — página pública de geração.
- `/c/$slug/obrigado` — página final.

## Banco de dados (Lovable Cloud)

**certificates**
- `id` (uuid), `slug` (text único), `owner_id` (uuid → auth.users)
- `title`, `course_name`, `location`, `event_date` (date)
- `background_path` (storage path), `created_at`

**issued_certificates**
- `id`, `certificate_id` (fk), `full_name`, `issued_at`

**user_roles** (padrão Lovable) com role `admin` + função `has_role`.

**Storage**: bucket `certificate-backgrounds` (público para leitura, escrita só admin).

**RLS**
- `certificates`: SELECT público por slug (necessário para a página pública); INSERT/UPDATE/DELETE só pelo dono autenticado.
- `issued_certificates`: INSERT público (qualquer um pode emitir); SELECT só pelo dono do certificado.

## Geração do PDF

Feita no cliente com `jspdf`:
- Carrega a imagem de fundo (URL pública do storage) em tamanho A4 paisagem.
- Sobrepõe os textos (título, "Certificamos que {NOME}", curso, data, local) com tipografia serifada elegante.
- Dispara download com nome `certificado-{nome}.pdf`.
- Server function registra a emissão em `issued_certificates` antes do download.

## Validação

Zod nos formulários: nome completo (3–120 chars, regex apenas letras/espaços/acentos), título/curso/local com limites de tamanho.

## Design

Painel admin: limpo, neutro, focado em produtividade (cards, tabelas).
Página pública: centrada, sóbria, com preview do certificado acima do formulário.
Tudo via design tokens em `src/styles.css` (paleta clara com acento elegante).

## Detalhes técnicos

- Autenticação: Supabase Auth via Lovable Cloud, e-mail/senha, sem confirmação de e-mail para facilitar setup.
- Primeiro usuário cadastrado vira admin automaticamente (trigger insere em `user_roles`); cadastros subsequentes ficam sem acesso ao painel.
- Upload de imagem: `supabase.storage.from('certificate-backgrounds').upload(...)` direto do browser.
- Slug do certificado: gerado a partir do título + sufixo aleatório curto.
- Server function `recordIssuance` (admin client) registra emissão e retorna ok para o cliente liberar o download.
- Página pública usa loader público (sem auth) que busca o certificado por slug via server function com `supabaseAdmin`, retornando apenas campos seguros.
