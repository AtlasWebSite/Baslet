# Correção para o limite de funções da Vercel Hobby

Este projeto utiliza somente três Vercel Functions públicas:

- `api/[...route].ts` — API principal do StudyFlow;
- `api/admin/[...route].ts` — API administrativa protegida;
- `api/health.ts` — verificação simples do backend.

Os arquivos dentro de `api/_lib/` começam com `_` e são utilitários privados. A Vercel não os transforma em Functions independentes.

Não recrie arquivos individuais como `api/auth/session.ts`, `api/profile.ts` ou `api/admin/overview.ts`, pois cada arquivo desse tipo conta como uma Function separada.
