# Painel administrativo privado do StudyFlow

## Auditoria da infraestrutura

O projeto utiliza React, Vite e TypeScript no frontend. O roteamento é realizado pelo próprio aplicativo por meio de `window.location.pathname`; não existe React Router instalado. O backend usa Vercel Functions, com um catch-all principal em `api/[...route].ts`. As rotas administrativas seguem o mesmo padrão em `api/admin/[...route].ts`, sem criar um segundo backend.

A autenticação existente usa Google OAuth e uma sessão JWT HS256 armazenada no cookie HTTP-only `studyflow_session`. O banco é PostgreSQL, acessado por `@vercel/postgres`. A integração financeira existente persiste assinaturas do Mercado Pago, mas não persiste cobranças individuais, taxas, liquidações ou reembolsos.

## Autorização

Todas as rotas `/api/admin/*` executam `requireAdmin(request)`. A função valida a sessão assinada existente e compara o usuário com `ADMIN_USER_ID` e/ou `ADMIN_EMAIL`. O frontend faz uma verificação adicional apenas para melhorar a experiência; ela não substitui a autorização do backend.

As respostas administrativas usam `Cache-Control: no-store, private` e não retornam stack traces, segredos ou payloads completos do Mercado Pago.

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

O fallback SPA está configurado em `vercel.json` sem capturar `/api/*`.

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

Busca, filtros, ordenação e paginação são executados no PostgreSQL. Parâmetros enumerados usam listas permitidas e todas as consultas usam parâmetros do cliente `sql`.

## Definições de métricas

- Fuso administrativo: `America/Sao_Paulo`.
- Usuário ativo: usuário único com pelo menos um evento válido no período.
- Sessão: evento `session_started`, limitado a no máximo um registro a cada 15 minutos por usuário.
- Retenção D1, D7 e D30: usuário da coorte que possui atividade exatamente 1, 7 ou 30 dias após o cadastro, considerando o fuso administrativo.
- MRR contratado: soma do valor mensal das assinaturas atualmente ativas. Não é receita liquidada.
- Conversão Premium atual: assinaturas ativas divididas pelo total de perfis.
- Alto engajamento: pelo menos 10 eventos nos últimos 30 dias.
- Baixo engajamento: no máximo 2 eventos nos últimos 30 dias.
- Progresso médio: média do status dos cartões (`learning` 33,33%, `almost` 66,67% e `mastered` 100%).
- Revisões acumuladas: soma de `study_progress.times_seen`.
- Revisões por período: eventos `flashcard_reviewed`, pois `study_progress` não guarda o histórico individual de cada revisão.

As métricas de atividade, sessões, revisões por período e retenção começam a acumular histórico após a implantação desta versão. Nenhum histórico retroativo é criado.

## Banco de dados

O script idempotente está em `sql/admin-panel.sql`. O backend também chama `ensureSchema()` para aplicar a estrutura ausente. Foram adicionadas as tabelas:

- `activity_events`
- `application_errors`
- `admin_audit_logs`
- `admin_settings`

Foram adicionados `last_login_at` e `account_status` à tabela `profiles`, além de índices para as consultas administrativas frequentes.

A instrumentação foi integrada aos fluxos reais de login, sessão, criação de conjuntos, revisão de flashcards, conclusão de testes, criação de mapas mentais e alterações de assinatura. Uma falha isolada ao gravar analytics é registrada no log do servidor e não desfaz a ação principal já concluída.

## Exportações

Os relatórios CSV são gerados no servidor, revalidam `requireAdmin`, neutralizam células que poderiam ser interpretadas como fórmulas e respeitam os filtros recebidos. Exportações de registros detalhados são limitadas a 50.000 linhas por solicitação para controlar memória e tempo de execução.

## Limitação financeira real

O projeto atual não recebe nem persiste eventos de pagamento individual. Por isso, receita bruta, receita líquida, taxas, pagamentos aprovados, reembolsos e ticket médio aparecem como indisponíveis. Implementar essas métricas exige persistir eventos oficiais de pagamento do Mercado Pago, sem inferi-los a partir do status da assinatura.

Também não foram criadas ações administrativas falsas para cancelar, reativar, reembolsar, aprovar pagamentos ou conceder Premium. O status de assinatura continua controlado pelo fluxo oficial existente e pelos webhooks.

## Configuração na Vercel

Em **Settings → Environment Variables**, defina ao menos uma das opções:

```env
ADMIN_EMAIL=proprietario@exemplo.com
ADMIN_USER_ID=id-google-salvo-no-banco
```

Para localizar o ID pelo e-mail no Neon/Vercel Postgres:

```sql
select id, email
from profiles
where lower(email) = lower('proprietario@exemplo.com')
limit 1;
```

Depois salve as variáveis, faça um novo deploy e acesse `/admin` autenticado com a conta do proprietário.

## Validação local

Scripts preservados:

```bash
npm run typecheck
npm run lint
npm run build
```

O script `build` mantém a verificação do frontend, do backend em `api/` e o build Vite. Não foi simplificado para ocultar erros.
