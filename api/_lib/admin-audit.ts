import { randomUUID } from 'node:crypto';
import { sql } from '@vercel/postgres';
import { ensureSchema } from './db.js';
import type { SessionUser } from './session.js';

function safeAuditMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata).slice(0, 20).map(([key, value]) => {
      const normalized = key.toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
      if (['password', 'token', 'secret', 'cookie', 'authorization', 'accesstoken', 'refreshtoken'].includes(normalized)) return [key, '[redacted]'];
      if (value === null || typeof value === 'number' || typeof value === 'boolean') return [key, value];
      return [key, String(value).slice(0, 300)];
    }),
  );
}

export async function recordAdminAudit(input: {
  admin: SessionUser;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  result: 'success' | 'failure';
  metadata?: Record<string, unknown>;
}) {
  await ensureSchema();
  const safeMetadata = JSON.stringify(safeAuditMetadata(input.metadata ?? {}));
  await sql`
    insert into admin_audit_logs (id, admin_user_id, action, target_type, target_id, result, metadata)
    values (${randomUUID()}, ${input.admin.id}, ${input.action}, ${input.targetType ?? null}, ${input.targetId ?? null}, ${input.result}, ${safeMetadata}::jsonb)
  `;
}
