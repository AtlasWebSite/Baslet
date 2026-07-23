import type { AiMindMapContent, AiMindMapNode } from '../types/ai';
import type { MindMapEdge, MindMapMode, MindMapNode, MindMapNodeType } from '../types/mentalMap';
import { MIND_MAP_HEIGHT, MIND_MAP_WIDTH, resolveNodeOverlaps, summarizeDefinition } from './mindMapGenerator';

const CENTER_X = MIND_MAP_WIDTH / 2;
const CENTER_Y = MIND_MAP_HEIGHT / 2;

const nodeSizes: Record<MindMapNodeType, readonly [number, number]> = {
  central: [230, 86],
  category: [190, 70],
  term: [210, 92],
  definition: [230, 84],
  example: [210, 70],
  question: [220, 76],
  keyword: [150, 44],
};

function slug(value: string) {
  const normalized = value
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return normalized || 'node';
}

function nodeTypeFromLevel(level: AiMindMapNode['level']): MindMapNodeType {
  if (level === 0) return 'central';
  if (level === 1) return 'category';
  if (level === 2) return 'term';
  return 'definition';
}

function clampNodeCenter(cx: number, cy: number, type: MindMapNodeType) {
  const [width, height] = nodeSizes[type];
  return {
    x: Math.max(26, Math.min(MIND_MAP_WIDTH - width - 26, cx - width / 2)),
    y: Math.max(26, Math.min(MIND_MAP_HEIGHT - height - 26, cy - height / 2)),
  };
}

function makeSafeId(originalId: string, usedIds: Set<string>) {
  if (originalId === 'root') return 'central';

  const baseId = `ai-${slug(originalId)}`.slice(0, 78);
  let candidate = baseId;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function getChildrenBySource(content: AiMindMapContent) {
  const childrenBySource = new Map<string, AiMindMapNode[]>();
  const nodesById = new Map(content.nodes.map((node) => [node.id, node]));

  for (const edge of content.edges) {
    const targetNode = nodesById.get(edge.target);
    if (!targetNode) continue;
    childrenBySource.set(edge.source, [...(childrenBySource.get(edge.source) ?? []), targetNode]);
  }

  for (const [source, children] of childrenBySource) {
    childrenBySource.set(source, [...children].sort((first, second) => first.order - second.order));
  }

  return childrenBySource;
}

function getParentByTarget(content: AiMindMapContent) {
  return new Map(content.edges.map((edge) => [edge.target, edge.source]));
}

function getCategoryForNode(node: AiMindMapNode, parentByTarget: Map<string, string>, nodesById: Map<string, AiMindMapNode>, idMap: Map<string, string>) {
  if (node.level === 1) return idMap.get(node.id);

  let parentId = parentByTarget.get(node.id);
  while (parentId) {
    const parentNode = nodesById.get(parentId);
    if (!parentNode) return undefined;
    if (parentNode.level === 1) return idMap.get(parentNode.id);
    parentId = parentByTarget.get(parentNode.id);
  }

  return undefined;
}

function getTermForNode(node: AiMindMapNode, parentByTarget: Map<string, string>, nodesById: Map<string, AiMindMapNode>, idMap: Map<string, string>) {
  if (node.level === 2) return idMap.get(node.id);

  let parentId = parentByTarget.get(node.id);
  while (parentId) {
    const parentNode = nodesById.get(parentId);
    if (!parentNode) return undefined;
    if (parentNode.level === 2) return idMap.get(parentNode.id);
    parentId = parentByTarget.get(parentNode.id);
  }

  return undefined;
}

function getCategoryOriginalId(node: AiMindMapNode, parentByTarget: Map<string, string>, nodesById: Map<string, AiMindMapNode>) {
  if (node.level === 1) return node.id;

  let parentId = parentByTarget.get(node.id);
  while (parentId) {
    const parentNode = nodesById.get(parentId);
    if (!parentNode) return undefined;
    if (parentNode.level === 1) return parentNode.id;
    parentId = parentByTarget.get(parentNode.id);
  }

  return undefined;
}

function branchAngle(index: number, total: number) {
  if (total <= 1) return -Math.PI / 2;
  return (Math.PI * 2 * index) / total - Math.PI / 2;
}

export function layoutAiMindMap(content: AiMindMapContent): { nodes: MindMapNode[]; edges: MindMapEdge[]; mode: MindMapMode } {
  const childrenBySource = getChildrenBySource(content);
  const parentByTarget = getParentByTarget(content);
  const nodesById = new Map(content.nodes.map((node) => [node.id, node]));
  const rootChildren = childrenBySource.get('root') ?? [];
  const usedIds = new Set(['central']);
  const idMap = new Map<string, string>([['root', 'central']]);

  for (const node of content.nodes) {
    if (node.id === 'root') continue;
    idMap.set(node.id, makeSafeId(node.id, usedIds));
  }

  const categoryIndexById = new Map(rootChildren.map((node, index) => [node.id, index]));
  const convertedNodes: MindMapNode[] = content.nodes.map((node) => {
    const id = idMap.get(node.id) ?? makeSafeId(node.id, usedIds);
    const type = nodeTypeFromLevel(node.level);
    const categoryId = getCategoryForNode(node, parentByTarget, nodesById, idMap);
    const termId = getTermForNode(node, parentByTarget, nodesById, idMap);
    const rootCategoryId = getCategoryOriginalId(node, parentByTarget, nodesById);
    const categoryIndex = categoryIndexById.get(rootCategoryId ?? '') ?? 0;
    const angle = branchAngle(categoryIndex, Math.max(rootChildren.length, 1));
    const childSiblings = node.id === 'root' ? rootChildren : childrenBySource.get(parentByTarget.get(node.id) ?? '') ?? [];
    const siblingIndex = childSiblings.findIndex((child) => child.id === node.id);
    const offset = siblingIndex - (childSiblings.length - 1) / 2;
    const perpendicularX = -Math.sin(angle);
    const perpendicularY = Math.cos(angle);

    if (node.level === 0) {
      return {
        id,
        type,
        label: node.label,
        subtitle: content.topic,
        fullText: node.description,
        ...clampNodeCenter(CENTER_X, CENTER_Y, type),
      };
    }

    const radiusByLevel = node.level === 1 ? 265 : node.level === 2 ? 525 : 745;
    const arcSpacing = node.level === 1 ? 0 : node.level === 2 ? 118 : 88;
    const cx = CENTER_X + Math.cos(angle) * radiusByLevel + perpendicularX * offset * arcSpacing;
    const cy = CENTER_Y + Math.sin(angle) * (node.level === 1 ? 215 : node.level === 2 ? 420 : 610) + perpendicularY * offset * arcSpacing;
    const subtitle = type === 'term' ? summarizeDefinition(node.description, 88) : type === 'definition' ? 'Explicação' : undefined;

    return {
      id,
      type,
      label: node.label,
      subtitle,
      fullText: node.description,
      categoryId,
      flashcardId: termId ? `card-${termId}` : undefined,
      ...clampNodeCenter(cx, cy, type),
    };
  });

  const convertedEdges = content.edges
    .map((edge) => {
      const source = idMap.get(edge.source);
      const target = idMap.get(edge.target);
      if (!source || !target) return undefined;
      return { id: `edge-${source}-${target}`.slice(0, 150), source, target };
    })
    .filter((edge): edge is MindMapEdge => Boolean(edge));

  return {
    nodes: resolveNodeOverlaps(convertedNodes),
    edges: convertedEdges,
    mode: 'summary',
  };
}
