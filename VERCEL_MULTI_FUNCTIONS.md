# Arquitetura com múltiplas Vercel Functions

Esta versão não concentra toda a API em uma única Function.

## Functions públicas

1. `api/auth.ts` — Google OAuth e sessão.
2. `api/profile.ts` — perfil e onboarding.
3. `api/study-sets.ts` — conjuntos e conteúdo inicial.
4. `api/learning.ts` — progresso, testes e mapas mentais.
5. `api/payments.ts` — assinatura, checkout e webhook Mercado Pago.
6. `api/account.ts` — exclusão da conta.
7. `api/health.ts` — verificação da API.
8. `api/admin/[...route].ts` — painel administrativo.

Os módulos privados ficam em `server/` e não são endpoints públicos.

## Instalação correta

Não extraia por cima de uma pasta antiga. Substitua a pasta `api/` inteira para remover endpoints duplicados.

Depois execute:

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```
