# Mariners Supply — app MVP

Loja de conveniência com **entrega na prancha de embarque** para tripulações em escala
no **Porto de Santos**. Este repositório agora contém a **aplicação completa do MVP**
(mobile-first), evoluída a partir dos protótipos de `prototype/`.

A tese, pesquisa e features estão em [`docs/TESE.md`](docs/TESE.md).

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript — sem framework de CSS: o design
  system "Hull & Chart" do protótipo foi portado direto para `app/globals.css`.
- **Supabase** — Postgres + Auth (Google OAuth, email com confirmação, esqueci a senha)
  com RLS em todas as tabelas. Migrações versionadas em `supabase/migrations/`.
- Pensado para deploy na **Vercel**.

## Por que o protótipo abria com faixa branca no celular?

O protótipo era uma página de demonstração dentro do **viewer de Artifacts do claude.ai**,
que embute a página num frame que não ocupa a última faixa da tela no Safari (barras
dinâmicas do iOS). Como o protótipo se travava em `height: 100svh` num "frame de celular",
tudo que sobrasse fora do frame aparecia com o fundo claro do site hospedeiro.

No app real isso não existe: a página é dona do viewport. Mesmo assim, o layout aplica as
defesas certas — fundo escuro em `html/body` (nunca só num container), `min-height: 100dvh`,
`viewport-fit=cover` + `theme-color` escuro e barras fixas com `env(safe-area-inset-bottom)`.

## Rotas

| Rota | Quem | O que |
|---|---|---|
| `/` | público | Seleção de navio (line-up com ETA, berço e janela de pedido) |
| `/shop` | público | Catálogo por categoria, carrinho persistente no aparelho |
| `/cart` | público | Resumo com depósito de 30% e saldo na prancha |
| `/checkout` | logado | Confirmação do pedido (preços validados no servidor) |
| `/orders` · `/orders/[code]` | logado | Meus pedidos + tracking em 4 etapas |
| `/login` · `/signup` · `/forgot-password` · `/reset-password` | público | Acesso do cliente: Google **ou** email+senha com confirmação e recuperação |
| `/account` | logado | Conta, pedidos, sair — e atalho pro painel staff |
| `/admin` | staff | Board de pedidos com KPIs e avanço de status |
| `/admin/ships` · `/admin/products` | staff | CRUD do line-up e do catálogo |
| `/admin/shopping-list` | staff | Lista de compras consolidada (pedidos com depósito pago) |

Fluxo de status do pedido:
`awaiting_deposit → deposit_paid → preparing → at_gangway → delivered`
(+ `credited` quando o navio desvia — o depósito vira crédito — e `cancelled`).

**Acesso admin:** quem consta em `admin_emails` (seed já inclui `ghcastellano@gmail.com`)
vira `admin` automaticamente ao criar a conta. Para promover alguém depois:
`update public.profiles set role = 'admin' where email = 'pessoa@email.com';`

## Rodando local

```bash
npm install
cp .env.example .env.local   # preencha com URL + anon key do Supabase
npm run dev
```

Sem as variáveis o app builda e abre normalmente, mostrando um aviso de
"backend not configured" — útil para validar o front isolado.

## Provisionando o Supabase (1x)

1. Crie um projeto (região `sa-east-1`) em [supabase.com](https://supabase.com) —
   ou peça para o Claude criar via MCP quando houver vaga no plano.
2. Aplique as migrações na ordem, via SQL Editor ou CLI
   (`supabase db push`): `supabase/migrations/20260822000001_init.sql` e
   `..._seed.sql`.
3. Copie **Project URL** e **anon/publishable key** para `.env.local` (e para as
   env vars da Vercel).

### Auth — configuração no Dashboard

Em **Authentication → URL Configuration**:

- **Site URL:** a URL de produção (ex.: `https://mariners-supply.vercel.app`)
- **Redirect URLs:**
  - `http://localhost:3000/**`
  - `https://SEU-DOMINIO/**`

Em **Authentication → Providers**:

- **Email:** já vem com confirmação obrigatória ligada (o app usa `/auth/confirm`).
  O SMTP padrão do Supabase é limitado (±2 emails/h) — para produção configure um
  SMTP próprio em *Authentication → Emails → SMTP*.
- **Google:** crie um OAuth Client (Web) no
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials) com
  redirect URI `https://SEU-PROJETO.supabase.co/auth/v1/callback`, e cole
  Client ID/Secret no provider Google do Supabase. Sem isso o botão
  "Continue with Google" avisa que o método ainda não está habilitado (email continua
  funcionando).

## Deploy na Vercel

1. Importe o repositório na Vercel (framework: Next.js, sem config extra).
2. Defina `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (e opcionalmente `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_USD_BRL_RATE`).
3. Atualize a Site URL/Redirect URLs no Supabase com o domínio final.

## O que fica para depois do MVP (roadmap curto)

- **Pagamento online real** do depósito (Stripe international / Pix) — hoje o pedido
  nasce `awaiting_deposit` e o staff confirma o depósito no board (link de pagamento
  manual), que é como a fase 0 opera na prática.
- Programa **Captain** (indicação por QR, crédito 5–7%) — telas já desenhadas no protótipo.
- Pedido nativo via WhatsApp, tracking por AIS, i18n (EN primeiro já é o padrão do app).

## Protótipos

Os HTMLs originais (app, ops, brand system, estratégia, catálogo A4 e planilha fase 0)
foram movidos para [`prototype/`](prototype/) e continuam abrindo direto no navegador.
