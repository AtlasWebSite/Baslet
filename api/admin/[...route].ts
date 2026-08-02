import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, AdminAccessError } from '../_lib/admin-auth.js';
import { recordAdminAudit } from '../_lib/admin-audit.js';
import { recordApplicationError } from '../_lib/activity.js';
import {
  buildAdminCsv,
  getAdminEngagement,
  getAdminErrors,
  getAdminFinance,
  getAdminOverview,
  getAdminResources,
  getAdminSettings,
  getAdminSubscriptions,
  getAdminUser,
  getAdminUsers,
  resolveAdminPeriod,
  updateAdminErrorStatus,
  updateAdminSettings,
} from '../_lib/admin-metrics.js';
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js';

function getSegments(request: VercelRequest) {
  const route = request.query.route;
  if (Array.isArray(route)) return route.flatMap((item) => item.split('/')).filter(Boolean);
  if (typeof route === 'string') return route.split('/').filter(Boolean);

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  return url.pathname.replace(/^\/api\/admin\/?/, '').split('/').filter(Boolean);
}

function getErrorRequestContext(request: VercelRequest) {
  const browser = typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null;
  const mobileHint = request.headers['sec-ch-ua-mobile'];
  const device = mobileHint === '?1' || (browser ? /Android|iPhone|iPad|Mobile/i.test(browser) : false) ? 'mobile' : 'desktop';
  return { browser, device };
}

function handleAccessError(response: VercelResponse, error: AdminAccessError) {
  if (error.code === 'AUTH_REQUIRED') {
    json(response, 401, { error: 'Entre novamente para acessar o painel administrativo.', code: error.code });
    return;
  }
  if (error.code === 'ADMIN_NOT_CONFIGURED') {
    json(response, 503, { error: 'O proprietário ainda não foi configurado no ambiente.', code: error.code });
    return;
  }
  json(response, 403, { error: 'Esta conta não possui acesso administrativo.', code: error.code });
}

function safeFileName(type: string) {
  const allowed = new Set(['users', 'growth', 'engagement', 'retention', 'resources', 'subscriptions', 'cancellations', 'finance', 'errors']);
  return allowed.has(type) ? type : null;
}

function isValidIdentifier(value: string | undefined) {
  return Boolean(value && value.length <= 200 && /^[A-Za-z0-9._:@-]+$/.test(value));
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const [resource, id] = getSegments(request);
  let admin;

  try {
    admin = await requireAdmin(request);
  } catch (error) {
    if (error instanceof AdminAccessError) {
      handleAccessError(response, error);
      return;
    }
    json(response, 500, { error: 'Não foi possível validar o acesso administrativo.' });
    return;
  }

  response.setHeader('Cache-Control', 'no-store, private');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    if ((!resource || resource === 'session') && request.method === 'GET') {
      json(response, 200, { admin: { id: admin.id, email: admin.email, name: admin.fullName, avatarUrl: admin.avatarUrl } });
      return;
    }

    if (resource === 'overview' && request.method === 'GET') {
      json(response, 200, { overview: await getAdminOverview(resolveAdminPeriod(request.query)) });
      return;
    }

    if (resource === 'users' && !id && request.method === 'GET') {
      json(response, 200, { result: await getAdminUsers(request.query) });
      return;
    }

    if (resource === 'users' && id && request.method === 'GET') {
      if (!isValidIdentifier(id)) {
        json(response, 400, { error: 'ID de usuário inválido.' });
        return;
      }
      const user = await getAdminUser(id);
      if (!user) {
        json(response, 404, { error: 'Usuário não encontrado.' });
        return;
      }
      json(response, 200, { user });
      return;
    }

    if (resource === 'subscriptions' && request.method === 'GET') {
      json(response, 200, { result: await getAdminSubscriptions(request.query) });
      return;
    }

    if (resource === 'payments' && request.method === 'GET') {
      json(response, 200, {
        payments: {
          available: false,
          reason: 'A integração atual salva assinaturas, mas não registra cobranças individuais, taxas, liquidações ou reembolsos.',
          implementationRequired: 'Adicionar webhooks e persistência dos eventos de pagamento do Mercado Pago antes de calcular receita realizada.',
        },
      });
      return;
    }

    if (resource === 'engagement' && request.method === 'GET') {
      json(response, 200, { engagement: await getAdminEngagement(resolveAdminPeriod(request.query)) });
      return;
    }

    if (resource === 'resources' && request.method === 'GET') {
      json(response, 200, { resources: await getAdminResources(resolveAdminPeriod(request.query)) });
      return;
    }

    if (resource === 'finance' && request.method === 'GET') {
      json(response, 200, { finance: await getAdminFinance() });
      return;
    }

    if (resource === 'errors' && request.method === 'GET') {
      json(response, 200, { result: await getAdminErrors(request.query) });
      return;
    }

    if (resource === 'errors' && id && request.method === 'PUT') {
      if (!isValidIdentifier(id)) {
        json(response, 400, { error: 'ID de erro inválido.' });
        return;
      }
      const body = await readJsonBody<Record<string, unknown>>(request);
      const updated = await updateAdminErrorStatus(id, String(body.status ?? ''));
      await recordAdminAudit({ admin, action: 'update_error_status', targetType: 'application_error', targetId: id, result: 'success', metadata: { status: updated.status } });
      json(response, 200, { error: updated });
      return;
    }

    if (resource === 'reports' && request.method === 'GET') {
      json(response, 200, {
        reports: [
          { type: 'users', label: 'Usuários', available: true },
          { type: 'growth', label: 'Crescimento de usuários', available: true },
          { type: 'engagement', label: 'Engajamento', available: true },
          { type: 'retention', label: 'Retenção', available: true },
          { type: 'resources', label: 'Uso dos recursos', available: true },
          { type: 'subscriptions', label: 'Assinaturas', available: true },
          { type: 'cancellations', label: 'Cancelamentos', available: true },
          { type: 'finance', label: 'Financeiro contratado', available: true },
          { type: 'errors', label: 'Erros', available: true },
          { type: 'payments', label: 'Pagamentos e receita realizada', available: false, reason: 'Pagamentos individuais, taxas e liquidações não são registrados.' },
          { type: 'ai-costs', label: 'Custos de inteligência artificial', available: false, reason: 'Nenhuma integração de IA foi encontrada.' },
        ],
      });
      return;
    }

    if (resource === 'report' && request.method === 'GET') {
      const rawType = Array.isArray(request.query.type) ? request.query.type[0] : request.query.type;
      const type = safeFileName(rawType ?? '');
      if (!type) {
        json(response, 400, { error: 'Tipo de relatório inválido ou indisponível.' });
        return;
      }
      const csv = await buildAdminCsv(type, request.query);
      await recordAdminAudit({ admin, action: 'export_csv', targetType: type, result: 'success' });
      response.setHeader('Content-Type', 'text/csv; charset=utf-8');
      response.setHeader('X-Export-Row-Limit', '50000');
      response.setHeader('Content-Disposition', `attachment; filename="studyflow-${type}-${new Date().toISOString().slice(0, 10)}.csv"`);
      response.status(200).send(`\uFEFF${csv}`);
      return;
    }

    if (resource === 'settings' && request.method === 'GET') {
      json(response, 200, { settings: await getAdminSettings() });
      return;
    }

    if (resource === 'settings' && request.method === 'PUT') {
      const body = await readJsonBody<Record<string, unknown>>(request);
      const settings = await updateAdminSettings(admin.id, body);
      await recordAdminAudit({ admin, action: 'update_admin_settings', targetType: 'settings', result: 'success', metadata: { keys: Object.keys(body) } });
      json(response, 200, { settings });
      return;
    }

    if (resource && !['overview', 'users', 'subscriptions', 'payments', 'engagement', 'resources', 'finance', 'errors', 'reports', 'report', 'settings', 'session'].includes(resource)) {
      json(response, 404, { error: 'Rota administrativa não encontrada.' });
      return;
    }

    methodNotAllowed(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro administrativo desconhecido.';
    await recordApplicationError({ category: 'admin', message, page: `/api/admin/${resource ?? ''}`, userId: admin.id, ...getErrorRequestContext(request) }).catch(() => undefined);
    if (request.method !== 'GET' || resource === 'report') {
      await recordAdminAudit({ admin, action: `admin_${resource ?? 'unknown'}_${(request.method ?? 'GET').toLowerCase()}`, targetType: resource ?? null, targetId: id ?? null, result: 'failure' }).catch(() => undefined);
    }
    json(response, 500, { error: 'Não foi possível carregar os dados administrativos.' });
  }
}
