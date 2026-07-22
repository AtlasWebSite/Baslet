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
APP_URL=http://localhost:5173
POSTGRES_URL=postgres://usuario:senha@host/database
```

Na produção, `APP_URL` deve ser o domínio final:

```env
APP_URL=https://seu-app.vercel.app
```

## Google Cloud

No cliente OAuth Web do Google Cloud, cadastre:

```text
http://localhost:5173/api/auth/callback
https://seu-app.vercel.app/api/auth/callback
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

O pagamento Mercado Pago foi deixado temporariamente em bypass local, conforme solicitado. Ao clicar em “Assinar agora”, o app libera Premium no navegador para continuar os testes.

Antes de produção, reative uma integração real de pagamento via rota serverless e webhook.

## Segurança

- O token secreto do Google fica apenas no backend.
- A sessão usa cookie HttpOnly.
- Todas as consultas filtram pelo usuário autenticado no backend.
- O frontend não escolhe `user_id` para acessar dados de outro usuário.
- Nenhum token privado deve ser prefixado com `VITE_`.
