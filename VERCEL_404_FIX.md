# Correção do erro 404 da API

Esta versão não depende de rewrites para as rotas essenciais de autenticação, perfil e conjuntos.

## Functions públicas (11)

- `api/auth/[action].ts`
- `api/profile.ts`
- `api/profile/[action].ts`
- `api/study-sets.ts`
- `api/study-sets/[action].ts`
- `api/learning.ts`
- `api/payments.ts`
- `api/mercado-pago/[action].ts`
- `api/account.ts`
- `api/health.ts`
- `api/admin/[...route].ts`

Antes de copiar esta versão, apague completamente a pasta `api/` antiga para não manter Functions duplicadas.
