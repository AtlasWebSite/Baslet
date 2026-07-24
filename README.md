# StudyFlow

Aplicativo de estudos com login Google, dados privados por usuário e backend preparado para Vercel Serverless + Vercel Postgres/Neon.

## O que mudou

- O frontend não usa mais Supabase.
- O login Google agora passa por rotas `/api/auth/*` na Vercel.
- A sessão é salva em cookie HttpOnly.
- Flashcards, progresso, mapas mentais, perfil e assinatura usam rotas `/api`.
- O banco esperado é Postgres conectado à Vercel, normalmente Neon/Vercel Postgres.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` no desenvolvimento e configure também essas variáveis na Vercel:

```env
GOOGLE_CLIENT_ID=seu-client-id-google
GOOGLE_CLIENT_SECRET=seu-client-secret-google
AUTH_SECRET=uma-string-grande-aleatoria
APP_URL=http://localhost:3000
POSTGRES_URL=postgres://usuario:senha@host/database
MERCADO_PAGO_ACCESS_TOKEN=TEST-ou-APP_USR-token-de-teste
MERCADO_PAGO_WEBHOOK_SECRET=segredo-do-webhook
MERCADO_PAGO_TEST_PAYER_EMAIL=email-comprador-de-teste
MERCADO_PAGO_TEST_PAYER_USER=TESTUSER-comprador-de-teste
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

## Assinatura

O pagamento usa Mercado Pago pelo backend da Vercel. O frontend nunca recebe o Access Token.

Em credenciais de teste, use `MERCADO_PAGO_TEST_PAYER_EMAIL` com um comprador de teste diferente da conta vendedora/collector. O Mercado Pago não permite que pagador e recebedor sejam o mesmo usuário.

Existem dois modos de teste no Mercado Pago:

1. Sandbox simples: use em `MERCADO_PAGO_ACCESS_TOKEN` o token que comeÃ§a com `TEST-` da aba `Testes > Credenciais de teste`. Nesse modo, deixe `MERCADO_PAGO_TEST_PAYER_USER` vazio.
2. Teste com contas `TESTUSER`: entre no Mercado Pago com uma conta `TESTUSER` vendedora, crie uma aplicaÃ§Ã£o nessa conta e use o token `APP_USR...` dessa aplicaÃ§Ã£o. Depois configure `MERCADO_PAGO_TEST_PAYER_USER=TESTUSER...` com uma conta `TESTUSER` compradora diferente.

NÃ£o misture token `TEST-` com comprador `TESTUSER`, porque o Mercado Pago pode entender que uma parte Ã© real e a outra Ã© teste. Se o Mercado Pago mostrar apenas o usuÃ¡rio comprador no formato `TESTUSER...`, o backend converte automaticamente para `test_user_...@testuser.com`.

Configure o webhook no Mercado Pago:

```text
https://app-usestudyflow.vercel.app/api/mercado-pago/webhook
```

A tela pública de pagamento fica em:

```text
https://app-usestudyflow.vercel.app/pagamento
```

## Segurança

- O token secreto do Google fica apenas no backend.
- A sessão usa cookie HttpOnly.
- Todas as consultas filtram pelo usuário autenticado no backend.
- O frontend não escolhe `user_id` para acessar dados de outro usuário.
- Nenhum token privado deve ser prefixado com `VITE_`.
