# StudyFlow

Aplicativo de estudos com login Google, dados privados por usuário e backend preparado para Vercel Serverless + Vercel Postgres/Neon.

## Visão geral

- O frontend não usa Supabase.
- O login Google passa por rotas `/api/auth/*` na Vercel.
- A sessão é salva em cookie HttpOnly.
- Flashcards, progresso, mapas mentais, perfil e pagamento usam rotas `/api`.
- O banco esperado é Postgres conectado à Vercel, normalmente Neon/Vercel Postgres.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` no desenvolvimento e configure também essas variáveis na Vercel:

```env
GOOGLE_CLIENT_ID=seu-client-id-google
GOOGLE_CLIENT_SECRET=seu-client-secret-google
AUTH_SECRET=uma-string-grande-aleatoria
APP_URL=http://localhost:3000
POSTGRES_URL=postgres://usuario:senha@host/database
MERCADO_PAGO_ACCESS_TOKEN=TEST-ou-APP_USR-token
MERCADO_PAGO_WEBHOOK_SECRET=segredo-do-webhook-opcional
```

Na produção, `APP_URL` deve ser o domínio final:

```env
APP_URL=https://app-usestudyflow.vercel.app
```

## Google Cloud

No cliente OAuth Web do Google Cloud, cadastre:

```text
http://localhost:3000/api/auth/callback
https://app-usestudyflow.vercel.app/api/auth/callback
```

Use o mesmo `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` nas variáveis da Vercel.

## Desenvolvimento local

Para testar as rotas `/api` localmente, use Vercel Dev:

```bash
npm install
npx vercel dev
```

O app normalmente abre em:

```text
http://localhost:3000
```

Se quiser apenas testar o frontend sem backend, `npm run dev` ainda sobe o Vite, mas as rotas `/api` não estarão disponíveis.

## Build

```bash
npm run build
```

## Pagamento Mercado Pago

O pagamento usa Mercado Pago Checkout Pro pelo backend da Vercel. O frontend nunca recebe o Access Token.

O fluxo atual cria uma preferência de pagamento de R$ 11,90. Depois que o webhook confirma um pagamento aprovado, o StudyFlow libera Premium por 30 dias para a conta Google vinculada.

Para testar, use `MERCADO_PAGO_ACCESS_TOKEN` da aba `Testes > Credenciais de teste` da aplicação no Mercado Pago. Não é necessário configurar comprador `TESTUSER` no backend.

Configure o webhook no Mercado Pago para eventos de pagamento:

```text
https://app-usestudyflow.vercel.app/api/mercado-pago/webhook
```

A tela pública de pagamento fica em:

```text
https://app-usestudyflow.vercel.app/pagamento
```

## Segurança

- O token secreto do Google fica apenas no backend.
- O Access Token do Mercado Pago fica apenas no backend.
- A sessão usa cookie HttpOnly.
- Todas as consultas filtram pelo usuário autenticado no backend.
- O frontend não escolhe `user_id` para acessar dados de outro usuário.
- Nenhum token privado deve ser prefixado com `VITE_`.
