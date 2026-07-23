import test from 'node:test';
import assert from 'node:assert/strict';
import { aiGenerationRequestSchema, validateAiContent } from '../api/_lib/aiSchemas.ts';
import { layoutAiMindMap } from '../src/utils/aiMindMapLayout.ts';
import type { AiMindMapContent } from '../src/types/ai.ts';

function makeFlashcardsPayload(cardCount = 10) {
  return {
    type: 'flashcards',
    title: 'Leis de Newton',
    description: 'Revisão introdutória sobre as leis de Newton.',
    topic: 'Leis de Newton',
    cards: Array.from({ length: cardCount }, (_, index) => ({
      front: `O que representa o conceito ${index + 1}?`,
      back: `Resposta direta ${index + 1}.`,
      explanation: `Explicação curta ${index + 1}.`,
      position: index + 1,
    })),
  };
}

function makeMindMapPayload(): AiMindMapContent {
  const nodes: AiMindMapContent['nodes'] = [
    { id: 'root', label: 'Revolução Francesa', description: 'Processo revolucionário na França.', level: 0, order: 0 },
  ];
  const edges: AiMindMapContent['edges'] = [];

  for (let branchIndex = 1; branchIndex <= 4; branchIndex += 1) {
    const branchId = `node-${branchIndex}`;
    nodes.push({
      id: branchId,
      label: `Ramo ${branchIndex}`,
      description: `Descrição do ramo ${branchIndex}.`,
      level: 1,
      order: branchIndex,
    });
    edges.push({ id: `edge-root-${branchId}`, source: 'root', target: branchId });

    for (let childIndex = 1; childIndex <= 2; childIndex += 1) {
      const childId = `${branchId}-${childIndex}`;
      nodes.push({
        id: childId,
        label: `Subtema ${branchIndex}.${childIndex}`,
        description: `Descrição do subtema ${branchIndex}.${childIndex}.`,
        level: 2,
        order: childIndex,
      });
      edges.push({ id: `edge-${branchId}-${childId}`, source: branchId, target: childId });
    }
  }

  return {
    type: 'mind_map',
    title: 'Revolução Francesa',
    description: 'Mapa mental introdutório sobre a Revolução Francesa.',
    topic: 'Revolução Francesa',
    nodes,
    edges,
  };
}

test('valida e normaliza a requisição de IA', () => {
  const parsed = aiGenerationRequestSchema.parse({ type: 'flashcards', topic: '  Leis   de   Newton  ' });
  assert.equal(parsed.topic, 'Leis de Newton');
});

test('rejeita tipo desconhecido, HTML e campos extras', () => {
  assert.throws(() => aiGenerationRequestSchema.parse({ type: 'video', topic: 'Mitose' }));
  assert.throws(() => aiGenerationRequestSchema.parse({ type: 'flashcards', topic: '<script>alert(1)</script>' }));
  assert.throws(() => aiGenerationRequestSchema.parse({ type: 'flashcards', topic: 'Mitose', amount: 20 }));
});

test('aceita uma resposta válida de flashcards', () => {
  const content = validateAiContent(makeFlashcardsPayload(), 'flashcards');
  assert.equal(content.type, 'flashcards');
  assert.equal(content.cards.length, 10);
});

test('rejeita flashcards insuficientes', () => {
  assert.throws(() => validateAiContent(makeFlashcardsPayload(4), 'flashcards'));
});

test('aceita um mapa mental válido e calcula layout sem coordenadas da IA', () => {
  const payload = makeMindMapPayload();
  const content = validateAiContent(payload, 'mind_map');
  const layout = layoutAiMindMap(content);

  assert.equal(content.type, 'mind_map');
  assert.ok(layout.nodes.some((node) => node.id === 'central'));
  assert.ok(layout.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y)));
  assert.ok(layout.edges.length > 0);
});

test('rejeita mapa com IDs duplicados', () => {
  const payload = makeMindMapPayload();
  payload.nodes[1].id = 'root';
  assert.throws(() => validateAiContent(payload, 'mind_map'));
});

test('rejeita mapa com edge apontando para nó inexistente', () => {
  const payload = makeMindMapPayload();
  payload.edges.push({ id: 'edge-missing', source: 'root', target: 'missing-node' });
  assert.throws(() => validateAiContent(payload, 'mind_map'));
});

test('rejeita mapa com ciclo', () => {
  const payload = makeMindMapPayload();
  payload.edges.push({ id: 'edge-cycle', source: 'node-1-1', target: 'node-1' });
  assert.throws(() => validateAiContent(payload, 'mind_map'));
});
