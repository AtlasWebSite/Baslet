import type { Flashcard, StudySet } from '../types';
import type { MindMapEdge, MindMapMode, MindMapNode, MindMapNodeType } from '../types/mentalMap';

export const MIND_MAP_WIDTH = 1800;
export const MIND_MAP_HEIGHT = 1500;
const CENTER_X = MIND_MAP_WIDTH / 2;
const CENTER_Y = MIND_MAP_HEIGHT / 2;

const nodeSizes: Record<MindMapNodeType, readonly [number, number]> = {
  central: [230, 86], category: [190, 70], term: [210, 92], definition: [230, 84],
  example: [210, 70], question: [220, 76], keyword: [150, 44]
};
const stopWords = new Set(['a','o','as','os','de','da','do','das','dos','e','em','um','uma','para','por','que','como','com','na','no','nas','nos','se','ser','foi','são','usada','usado','forma','operação','estrutura','período','processo','responsável','grande','onde','teve','tem','dos','pela','pelo']);
const examples: Record<string, string> = {
  soma: '2 + 3 = 5', subtracao: '8 − 3 = 5', multiplicacao: '4 × 3 = 12', divisao: '12 ÷ 3 = 4', fracao: '1/2 representa metade', porcentagem: '50% representa metade',
  hello: 'Hello, my friend!', 'good morning': 'Good morning, teacher!', 'thank you': 'Thank you for your help.', please: 'Water, please.'
};

const normalize = (value: string) => value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const slug = (value: string) => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const containsAny = (text: string, words: string[]) => words.some((word) => text.includes(normalize(word)));

export function summarizeDefinition(definition: string, maxLength = 112) {
  const normalized = definition.replace(/\s+/g, ' ').trim();
  const firstSentence = normalized.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? normalized;
  if (firstSentence.length <= maxLength) return firstSentence;
  const shortened = firstSentence.slice(0, maxLength - 1);
  const lastSpace = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, lastSpace > maxLength * .65 ? lastSpace : undefined).trimEnd()}…`;
}

export function extractKeyword(definition: string) {
  const year = definition.match(/\b(?:1[5-9]\d{2}|20\d{2})\b/)?.[0];
  if (year) return year;
  const properName = definition.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}-]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}-]+)+/u)?.[0];
  if (properName) return properName;
  const words = definition.toLocaleLowerCase('pt-BR').match(/[\p{L}\d]+/gu) ?? [];
  const meaningful = words.filter((word) => word.length > 3 && !stopWords.has(word));
  const frequencies = new Map<string, number>();
  meaningful.forEach((word) => frequencies.set(word, (frequencies.get(word) ?? 0) + 1));
  return [...frequencies].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, 2).map(([word]) => word).join(' · ') || 'revisar';
}

export function generateSimpleExample(card: Flashcard) {
  const explicitExample = card.definition.match(/(?:exemplo|ex\.):\s*([^.!?]+[.!?]?)/i)?.[1]?.trim();
  return explicitExample || examples[normalize(card.term)];
}

export function generateReviewQuestion(card: Flashcard, studySet: StudySet) {
  const context = normalize(`${studySet.subject} ${studySet.title} ${card.term} ${card.definition}`);
  const properName = extractKeyword(card.definition);
  if (containsAny(context, ['era vargas']) && properName !== 'revisar') return `Quem foi o principal nome da ${card.term}?`;
  if (containsAny(context, ['biologia', 'organela', 'celula', 'estrutura'])) return `Qual é a função de ${card.term}?`;
  if (containsAny(context, ['historia', 'periodo', 'brasil', 'governo'])) return `O que marcou ${card.term}?`;
  if (containsAny(context, ['matematica', 'operacao', 'numero'])) return `Quando usamos ${card.term}?`;
  if (containsAny(context, ['idioma', 'ingles', 'english'])) return `Como usar “${card.term}” em uma frase?`;
  return `Como você explicaria ${card.term}?`;
}

function categoryForCard(card: Flashcard, studySet: StudySet) {
  const text = normalize(`${card.term} ${card.definition}`);
  const subject = normalize(`${studySet.subject} ${studySet.title}`);
  if (containsAny(subject, ['matematica'])) {
    if (containsAny(text, ['soma','subtracao','multiplicacao','divisao'])) return 'Operações básicas';
    if (containsAny(text, ['fracao','porcentagem','decimal','parte de 100'])) return 'Representações numéricas';
  }
  if (containsAny(subject, ['biologia'])) {
    if (containsAny(text, ['dna','genetic','gene','material genetico'])) return 'Genética';
    if (containsAny(text, ['membrana','controle','protecao'])) return 'Controle e proteção';
    if (containsAny(text, ['celula','nucleo','mitocondria','citoplasma','organela'])) return 'Estruturas celulares';
  }
  if (containsAny(subject, ['historia'])) {
    if (containsAny(text, ['republica','era vargas','governo','politic','sociedade'])) return 'Política e sociedade';
    if (containsAny(text, ['getulio vargas','dom pedro','tiradentes','princesa isabel'])) return 'Personagens e lideranças';
    return 'Eventos históricos';
  }
  if (containsAny(subject, ['idioma','ingles'])) {
    if (containsAny(text, ['hello','good morning','ola','bom dia'])) return 'Cumprimentos';
    if (containsAny(text, ['thank you','please','obrigado','por favor'])) return 'Expressões do dia a dia';
    return 'Vocabulário';
  }
  return 'Conceitos principais';
}

export function groupFlashcardsByCategory(studySet: StudySet) {
  const groups = new Map<string, Flashcard[]>();
  studySet.cards.forEach((card) => {
    const category = categoryForCard(card, studySet);
    groups.set(category, [...(groups.get(category) ?? []), card]);
  });
  return groups;
}

function clampPosition(cx: number, cy: number, type: MindMapNodeType) {
  const [width, height] = nodeSizes[type];
  return { x: Math.max(24, Math.min(MIND_MAP_WIDTH - width - 24, cx - width / 2)), y: Math.max(24, Math.min(MIND_MAP_HEIGHT - height - 24, cy - height / 2)) };
}

function createNode(id: string, type: MindMapNodeType, label: string, fullText: string, cx: number, cy: number, options: { subtitle?: string; flashcardId?: string; categoryId?: string } = {}): MindMapNode {
  return { id, type, label, fullText, ...clampPosition(cx, cy, type), ...options };
}

function keepNodeInsideCanvas(node: MindMapNode) {
  const [width, height] = nodeSizes[node.type];
  node.x = Math.max(24, Math.min(MIND_MAP_WIDTH - width - 24, node.x));
  node.y = Math.max(24, Math.min(MIND_MAP_HEIGHT - height - 24, node.y));
}

export function resolveNodeOverlaps(nodes: MindMapNode[], gap = 18) {
  const resolved = nodes.map((item) => ({ ...item }));
  for (let iteration = 0; iteration < 90; iteration += 1) {
    let moved = false;
    for (let firstIndex = 0; firstIndex < resolved.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < resolved.length; secondIndex += 1) {
        const first = resolved[firstIndex]; const second = resolved[secondIndex];
        const [firstWidth, firstHeight] = nodeSizes[first.type]; const [secondWidth, secondHeight] = nodeSizes[second.type];
        const firstCenterX = first.x + firstWidth / 2; const firstCenterY = first.y + firstHeight / 2;
        const secondCenterX = second.x + secondWidth / 2; const secondCenterY = second.y + secondHeight / 2;
        const deltaX = secondCenterX - firstCenterX; const deltaY = secondCenterY - firstCenterY;
        const overlapX = (firstWidth + secondWidth) / 2 + gap - Math.abs(deltaX);
        const overlapY = (firstHeight + secondHeight) / 2 + gap - Math.abs(deltaY);
        if (overlapX <= 0 || overlapY <= 0) continue;
        moved = true;
        const firstFixed = first.type === 'central'; const secondFixed = second.type === 'central';
        const firstShare = firstFixed ? 0 : secondFixed ? 1 : .5; const secondShare = secondFixed ? 0 : firstFixed ? 1 : .5;
        if (overlapX < overlapY) {
          const direction = deltaX >= 0 ? 1 : -1;
          first.x -= direction * overlapX * firstShare;
          second.x += direction * overlapX * secondShare;
        } else {
          const direction = deltaY >= 0 ? 1 : -1;
          first.y -= direction * overlapY * firstShare;
          second.y += direction * overlapY * secondShare;
        }
        keepNodeInsideCanvas(first); keepNodeInsideCanvas(second);
      }
    }
    if (!moved) break;
  }
  return resolved;
}

export const createCategoryNode = (category: string, count: number, cx: number, cy: number) => {
  const categoryId = `category-${slug(category)}`;
  return createNode(categoryId, 'category', category, `${count} conceito${count === 1 ? '' : 's'} neste tema`, cx, cy, { subtitle: `${count} conceito${count === 1 ? '' : 's'}`, categoryId });
};
export const createTermNode = (card: Flashcard, categoryId: string, cx: number, cy: number) => createNode(`term-${card.id}`, 'term', card.term, card.definition, cx, cy, { subtitle: summarizeDefinition(card.definition, 104), flashcardId: card.id, categoryId });
export const createExplanationNode = (card: Flashcard, categoryId: string, cx: number, cy: number) => createNode(`definition-${card.id}`, 'definition', summarizeDefinition(card.definition), card.definition, cx, cy, { subtitle: 'Explicação', flashcardId: card.id, categoryId });
export const createKeywordNode = (card: Flashcard, categoryId: string, cx: number, cy: number) => {
  const keyword = extractKeyword(card.definition);
  return createNode(`keyword-${card.id}`, 'keyword', keyword, `Ideia central de ${card.term}: ${keyword}.`, cx, cy, { flashcardId: card.id, categoryId });
};
export const createReviewNode = (card: Flashcard, studySet: StudySet, categoryId: string, cx: number, cy: number) => {
  const question = generateReviewQuestion(card, studySet);
  return createNode(`question-${card.id}`, 'question', question, question, cx, cy, { subtitle: 'Revisão', flashcardId: card.id, categoryId });
};

function branchAngle(categoryIndex: number, categoryCount: number) {
  if (categoryCount === 1) return -Math.PI / 2;
  return (Math.PI * 2 * categoryIndex) / categoryCount - Math.PI / 2;
}

export function createMindMapNodes(studySet: StudySet) {
  const groups = [...groupFlashcardsByCategory(studySet)];
  const nodes: MindMapNode[] = [createNode('central', 'central', studySet.title, studySet.description || studySet.title, CENTER_X, CENTER_Y, { subtitle: studySet.subject })];
  groups.forEach(([category, cards], categoryIndex) => {
    const baseAngle = branchAngle(categoryIndex, groups.length);
    const categoryId = `category-${slug(category)}`;
    nodes.push(createCategoryNode(category, cards.length, CENTER_X + Math.cos(baseAngle) * 230, CENTER_Y + Math.sin(baseAngle) * 185));
    const availableArc = groups.length === 1 ? 1.8 : Math.min(1.25, (Math.PI * 2 / groups.length) * .58);
    const step = cards.length > 1 ? Math.min(.38, availableArc / (cards.length - 1)) : 0;
    cards.forEach((card, cardIndex) => {
      const termAngle = baseAngle + (cardIndex - (cards.length - 1) / 2) * step;
      const cos = Math.cos(termAngle); const sin = Math.sin(termAngle);
      const perpendicularX = -sin; const perpendicularY = cos;
      const termX = CENTER_X + cos * 445; const termY = CENTER_Y + sin * 355;
      nodes.push(createTermNode(card, categoryId, termX, termY));
      nodes.push(createExplanationNode(card, categoryId, CENTER_X + cos * 650 + perpendicularX * -64, CENTER_Y + sin * 505 + perpendicularY * -64));
      nodes.push(createKeywordNode(card, categoryId, CENTER_X + cos * 635 + perpendicularX * 82, CENTER_Y + sin * 490 + perpendicularY * 82));
      const example = generateSimpleExample(card);
      if (example) nodes.push(createNode(`example-${card.id}`, 'example', example, example, CENTER_X + cos * 820 + perpendicularX * -70, CENTER_Y + sin * 650 + perpendicularY * -70, { subtitle: 'Exemplo', flashcardId: card.id, categoryId }));
      nodes.push(createReviewNode(card, studySet, categoryId, CENTER_X + cos * 805 + perpendicularX * 76, CENTER_Y + sin * 635 + perpendicularY * 76));
    });
  });
  return resolveNodeOverlaps(nodes);
}

export function createMindMapEdges(nodes: MindMapNode[]) {
  const edges: MindMapEdge[] = [];
  nodes.filter((item) => item.type === 'category').forEach((category) => edges.push({ id: `edge-central-${category.id}`, source: 'central', target: category.id }));
  nodes.filter((item) => item.type === 'term').forEach((term) => {
    if (term.categoryId) edges.push({ id: `edge-${term.categoryId}-${term.id}`, source: term.categoryId, target: term.id });
    nodes.filter((child) => child.flashcardId === term.flashcardId && !['term','category','central'].includes(child.type)).forEach((child) => edges.push({ id: `edge-${term.id}-${child.id}`, source: term.id, target: child.id }));
  });
  return edges;
}

export function generateAdvancedMindMapFromFlashcards(studySet: StudySet) {
  if (!studySet.cards.length) throw new Error('Este conjunto ainda não possui flashcards.');
  const nodes = createMindMapNodes(studySet);
  return { nodes, edges: createMindMapEdges(nodes), mode: 'summary' as MindMapMode };
}

export const generateMindMapFromFlashcards = generateAdvancedMindMapFromFlashcards;

export function filterMindMapByMode(nodes: MindMapNode[], edges: MindMapEdge[], expandedTermIds: ReadonlySet<string>) {
  const visibleNodes = nodes.filter((item) => ['central','category','term'].includes(item.type) || Boolean(item.flashcardId && expandedTermIds.has(`term-${item.flashcardId}`)));
  const visibleIds = new Set(visibleNodes.map((item) => item.id));
  return { nodes: visibleNodes, edges: edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)) };
}

export function isMindMapLayoutValid(nodes: MindMapNode[], edges: MindMapEdge[]) {
  if (!nodes.some((item) => item.id === 'central') || !nodes.some((item) => item.type === 'category')) return false;
  const terms = nodes.filter((item) => item.type === 'term');
  if (!terms.length || terms.some((term) => !term.subtitle || !nodes.some((item) => item.type === 'definition' && item.flashcardId === term.flashcardId))) return false;
  if (nodes.some((item) => !Number.isFinite(item.x) || !Number.isFinite(item.y) || item.x < 0 || item.y < 0 || item.x > MIND_MAP_WIDTH || item.y > MIND_MAP_HEIGHT)) return false;
  const nodeIds = new Set(nodes.map((item) => item.id)); const edgeIds = new Set(edges.map((edge) => edge.id));
  if (edgeIds.size !== edges.length) return false;
  return edges.every((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
}
