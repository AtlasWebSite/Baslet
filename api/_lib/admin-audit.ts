import { randomUUID } from 'node:crypto';
import { sql } from '@vercel/postgres';
import { ensureSchema } from './db.js';
import type { SessionUser } from './session.js';

export async function recordAdminAudit(input: {
  admin: SessionUser;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  result: 'success' | 'failure';
  metadata?: Record<string, unknown>;
}) {
  await ensureSchema();
  const safeMetadata = JSON.stringify(input.metadata ?? {});
  await sql`
    insert into admin_audit_logs (id, admin_user_id, action, target_type, target_id, result, metadata)
    values (${randomUUID()}, ${input.admin.id}, ${input.action}, ${input.targetType ?? null}, ${input.targetId ?? null}, ${input.result}, ${safeMetadata}::jsonb)
  `;
}
