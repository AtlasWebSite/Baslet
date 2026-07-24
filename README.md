# StudyFlow

Aplicativo de estudos com login Google, dados privados por usuário e backend preparado para Vercel Serverless + Vercel Postgres/Neon.

## Visão geral

- O frontend não usa Supabase.
- O login Google passa por rotas `/api/auth/*` na Vercel.
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
MERCADO_PAGO_ACCESS_TOKEN=TEST-ou-APP_USR-token
MERCADO_PAGO_WEBHOOK_SECRET=segredo-do-webhook
MERCADO_PAGO_TEST_PAYER_USER=
MERCADO_PAGO_TEST_PAYER_EMAIL=
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

## Assinatura Mercado Pago

O pagamento usa Mercado Pago Assinaturas pelo endpoint `/preapproval`. O frontend nunca recebe o Access Token.

O fluxo atual:

1. O usuário logado clica em assinar.
2. O backend cria uma assinatura mensal de R$ 11,90 com status `pending`.
3. O usuário abre o link de assinatura do Mercado Pago.
4. Após a confirmação, o webhook `subscription_preapproval` ou a sincronização da assinatura atualiza o status para `active`.
5. O StudyFlow libera o Premium apenas quando a assinatura real estiver ativa.

## Pix em assinaturas

O StudyFlow cria a assinatura pelo endpoint `/preapproval`. O Pix aparece no checkout hospedado do Mercado Pago quando a conta vendedora tem Pix habilitado/chave Pix cadastrada e o método está disponível para assinaturas.

Não existe chave secreta de Pix no frontend e o app não força método de pagamento no payload. A escolha do método acontece dentro do checkout seguro do Mercado Pago.

Para testar:

```env
MERCADO_PAGO_ACCESS_TOKEN=TEST-seu-token-da-aba-testes
MERCADO_PAGO_TEST_PAYER_USER=
MERCADO_PAGO_TEST_PAYER_EMAIL=
```

Com token `TEST-`, não configure `TESTUSER` no backend. O StudyFlow envia o e-mail da conta Google logada como `payer_email`, e o pagamento deve ser feito no checkout com cartão de teste.

Se a Vercel ainda tiver `MERCADO_PAGO_TEST_PAYER_USER` ou `MERCADO_PAGO_TEST_PAYER_EMAIL` preenchidos, apague os valores, salve e faça redeploy.

Para produção:

```env
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-seu-token-real
MERCADO_PAGO_TEST_PAYER_USER=
MERCADO_PAGO_TEST_PAYER_EMAIL=
```

Configure o webhook no Mercado Pago para o tópico `subscription_preapproval`:

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
