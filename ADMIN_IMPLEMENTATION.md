# Painel administrativo privado do StudyFlow

## Auditoria da infraestrutura

O projeto utiliza React, Vite e TypeScript no frontend. O roteamento é realizado pelo próprio aplicativo por meio de `window.location.pathname`; não existe React Router instalado. O backend foi dividido em oito Vercel Functions por domínio: autenticação, perfil, conjuntos, aprendizado, pagamentos, conta, saúde da API e administração. O código compartilhado fica em `server/`, fora de `api/`, sem criar um segundo backend.

A autenticação existente usa Google OAuth e uma sessão JWT HS256 armazenada no cookie HTTP-only `studyflow_session`. O banco é PostgreSQL, acessado por `@vercel/postgres`. A integração financeira existente persiste assinaturas do Mercado Pago, mas não persiste cobranças individuais, taxas, liquidações ou reembolsos.

## Autorização

Todas as rotas `/api/admin/*` executam `requireAdmin(request)`. A função valida a sessão assinada existente e compara o usuário com `ADMIN_USER_ID` e/ou `ADMIN_EMAIL`. O frontend faz uma verificação adicional apenas para melhorar a experiência; ela não substitui a autorização do backend.

## Rotas de interface

- `/admin`
- `/admin/usuarios`
- `/admin/usuarios/:id`
- `/admin/assinaturas`
- `/admin/pagamentos`
- `/admin/engajamento`
- `/admin/recursos`
- `/admin/financeiro`
- `/admin/erros`
- `/admin/relatorios`
- `/admin/configuracoes`

## Endpoints

- `GET /api/admin/session`
- `GET /api/admin/overview`
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `GET /api/admin/subscriptions`
- `GET /api/admin/payments`
- `GET /api/admin/engagement`
- `GET /api/admin/resources`
- `GET /api/admin/finance`
- `GET /api/admin/errors`
- `PUT /api/admin/errors/:id`
- `GET /api/admin/reports`
- `GET /api/admin/report`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

## Definições de métricas

- Usuário ativo: usuário único com pelo menos um evento válido no período.
- Sessão: evento `session_started`, limitado a no máximo um registro a cada 15 minutos por usuário.
- Retenção D1, D7 e D30: usuário da coorte que possui atividade exatamente 1, 7 ou 30 dias após o cadastro.
- MRR contratado: soma do valor mensal das assinaturas atualmente ativas. Não é receita liquidada.
- Conversão Premium atual: assinaturas ativas divididas pelo total de perfis.
- Alto engajamento: pelo menos 10 eventos nos últimos 30 dias.
- Baixo engajamento: no máximo 2 eventos nos últimos 30 dias.
- Progresso médio: média ponderada do status dos cartões (`learning` 33,33%, `almost` 66,67% e `mastered` 100%).

As métricas de atividade e retenção começam a acumular histórico após a implantação desta versão. Nenhum histórico retroativo é criado.

## Banco de dados

O script idempotente está em `sql/admin-panel.sql`. O backend também chama `ensureSchema()` para aplicar a estrutura ausente. Foram adicionadas as tabelas:

- `activity_events`
- `application_errors`
- `admin_audit_logs`
- `admin_settings`

Foram adicionados `last_login_at` e `account_status` à tabela `profiles`, além de índices para as consultas administrativas frequentes.

## Limitação financeira real

O projeto atual não recebe nem persiste eventos de pagamento individual. Por isso, receita bruta, receita líquida, taxas, pagamentos aprovados, reembolsos e ticket médio aparecem como indisponíveis. Implementar essas métricas exige persistir eventos oficiais de pagamento do Mercado Pago, sem inferi-los a partir do status da assinatura.

## Configuração na Vercel

Em **Settings → Environment Variables**, defina `ADMIN_EMAIL` com o e-mail exato da conta Google do proprietário e/ou `ADMIN_USER_ID` com o ID Google salvo em `profiles.id`. Depois faça um novo deploy e acesse `/admin`.

## Compatibilidade de roteamento da Vercel

O arquivo `vercel.json` preserva todas as URLs públicas existentes e as direciona para as Functions responsáveis por cada domínio. A administração continua em `api/admin/[...route].ts`. Use `/api/health` para confirmar que as Vercel Functions foram publicadas.
