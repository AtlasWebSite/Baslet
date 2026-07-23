import { z } from 'zod';

export const aiContentTypes = ['flashcards', 'mind_map'] as const;
export type AiContentType = (typeof aiContentTypes)[number];

export const aiGenerationRequestSchema = z
  .object({
    type: z.enum(aiContentTypes),
    topic: z
      .string()
      .transform((value) => value.replace(/\s+/g, ' ').trim())
      .pipe(
        z
          .string()
          .min(3, 'Digite um tema válido para continuar.')
          .max(160, 'Digite um tema mais curto para continuar.')
          .refine((value) => !/[<>]/.test(value), 'Digite um tema válido para continuar.'),
      ),
  })
  .strict();

export const aiFlashcardsSchema = z
  .object({
    type: z.literal('flashcards'),
    title: z.string().min(3).max(100),
    description: z.string().min(3).max(240),
    topic: z.string().min(3).max(160),
    cards: z
      .array(
        z
          .object({
            front: z.string().min(3).max(300),
            back: z.string().min(1).max(700),
            explanation: z.string().min(1).max(700),
            position: z.number().int().positive(),
          })
          .strict(),
      )
      .min(10)
      .max(15),
  })
  .strict();

export const aiMindMapSchema = z
  .object({
    type: z.literal('mind_map'),
    title: z.string().min(3).max(100),
    description: z.string().min(3).max(240),
    topic: z.string().min(3).max(160),
    nodes: z
      .array(
        z
          .object({
            id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
            label: z.string().min(1).max(100),
            description: z.string().min(1).max(400),
            level: z.number().int().min(0).max(3),
            order: z.number().int().min(0),
          })
          .strict(),
      )
      .min(9)
      .max(40),
    edges: z.array(
      z
        .object({
          id: z.string().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/),
          source: z.string().min(1).max(80),
          target: z.string().min(1).max(80),
        })
        .strict(),
    ),
  })
  .strict();

export const aiContentSchema = z.discriminatedUnion('type', [aiFlashcardsSchema, aiMindMapSchema]);

export type AiGenerationRequest = z.infer<typeof aiGenerationRequestSchema>;
export type AiFlashcardsContent = z.infer<typeof aiFlashcardsSchema>;
export type AiMindMapContent = z.infer<typeof aiMindMapSchema>;
export type AiGeneratedContent = z.infer<typeof aiContentSchema>;

export class AiValidationError extends Error {
  constructor(message = 'Não foi possível organizar o conteúdo. Tente novamente.') {
    super(message);
  }
}

export function parseAiJson(rawContent: string) {
  const cleaned = rawContent
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    throw new AiValidationError();
  }
}

function assertUniqueIds(values: string[], message: string) {
  if (new Set(values).size !== values.length) throw new AiValidationError(message);
}

function assertNoCycles(rootId: string, nodeIds: Set<string>, edges: AiMindMapContent['edges']) {
  const childrenBySource = new Map<string, string[]>();
  for (const edge of edges) {
    childrenBySource.set(edge.source, [...(childrenBySource.get(edge.source) ?? []), edge.target]);
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (nodeId: string) => {
    if (visiting.has(nodeId)) throw new AiValidationError('Não foi possível organizar o conteúdo. Tente novamente.');
    if (visited.has(nodeId)) return;

    visiting.add(nodeId);
    for (const childId of childrenBySource.get(nodeId) ?? []) visit(childId);
    visiting.delete(nodeId);
    visited.add(nodeId);
  };

  visit(rootId);
  if (visited.size !== nodeIds.size) throw new AiValidationError('Não foi possível organizar o conteúdo. Tente novamente.');
}

function validateMindMapGraph(content: AiMindMapContent) {
  const rootNodes = content.nodes.filter((node) => node.id === 'root' && node.level === 0);
  if (rootNodes.length !== 1) throw new AiValidationError();

  const nodeIds = new Set(content.nodes.map((node) => node.id));
  assertUniqueIds(content.nodes.map((node) => node.id), 'Não foi possível organizar o conteúdo. Tente novamente.');
  assertUniqueIds(content.edges.map((edge) => edge.id), 'Não foi possível organizar o conteúdo. Tente novamente.');

  const incomingByTarget = new Map<string, number>();
  for (const edge of content.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) throw new AiValidationError();
    if (edge.source === edge.target) throw new AiValidationError();
    incomingByTarget.set(edge.target, (incomingByTarget.get(edge.target) ?? 0) + 1);
  }

  for (const node of content.nodes) {
    if (node.id === 'root') continue;
    if (!incomingByTarget.has(node.id)) throw new AiValidationError();
  }

  assertNoCycles('root', nodeIds, content.edges);
}

export function validateAiContent(payload: unknown, expectedType: AiContentType) {
  try {
    const content = aiContentSchema.parse(payload);
    if (content.type !== expectedType) throw new AiValidationError();
    if (content.type === 'mind_map') validateMindMapGraph(content);
    if (content.type === 'flashcards') {
      const positions = content.cards.map((card) => card.position);
      assertUniqueIds(positions.map(String), 'Não foi possível organizar o conteúdo. Tente novamente.');
    }
    return content;
  } catch (error) {
    if (error instanceof AiValidationError) throw error;
    throw new AiValidationError();
  }
}
