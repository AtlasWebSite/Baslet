import { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, BookOpenText, Sparkles, WandSparkles } from 'lucide-react';
import { generateStudyContentWithAi } from '../../services/aiService';
import type { AiContentType, AiFlashcardsContent, AiGeneratedContent, AiMindMapContent, AiUsageSnapshot } from '../../types/ai';
import type { MindMapEdge, MindMapMode, MindMapNode } from '../../types/mentalMap';
import { layoutAiMindMap } from '../../utils/aiMindMapLayout';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AiContentTypeCard } from './AiContentTypeCard';
import { AiFlashcardsPreview } from './AiFlashcardsPreview';
import { AiGeneratingState } from './AiGeneratingState';
import { AiMindMapPreview } from './AiMindMapPreview';
import { AiUsageIndicator } from './AiUsageIndicator';

interface AiCreationModalProps {
  open: boolean;
  initialType?: AiContentType;
  saving: boolean;
  onClose: () => void;
  onSaveFlashcards: (content: AiFlashcardsContent, generationId: string) => Promise<void>;
  onSaveMindMap: (content: AiMindMapContent, generationId: string, nodes: MindMapNode[], edges: MindMapEdge[], mode: MindMapMode) => Promise<void>;
}

function isFlashcardsContent(content: AiGeneratedContent): content is AiFlashcardsContent {
  return content.type === 'flashcards';
}

function isMindMapContent(content: AiGeneratedContent): content is AiMindMapContent {
  return content.type === 'mind_map';
}

function getDefaultType(initialType?: AiContentType) {
  return initialType ?? 'flashcards';
}

export function AiCreationModal({ open, initialType, saving, onClose, onSaveFlashcards, onSaveMindMap }: AiCreationModalProps) {
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<AiContentType>(getDefaultType(initialType));
  const [content, setContent] = useState<AiGeneratedContent>();
  const [generationId, setGenerationId] = useState('');
  const [usage, setUsage] = useState<AiUsageSnapshot>();
  const [mapNodes, setMapNodes] = useState<MindMapNode[]>([]);
  const [mapEdges, setMapEdges] = useState<MindMapEdge[]>([]);
  const [mapMode, setMapMode] = useState<MindMapMode>('summary');
  const [errorMessage, setErrorMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dirtyPreview, setDirtyPreview] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(getDefaultType(initialType));
    setTopic('');
    setContent(undefined);
    setGenerationId('');
    setUsage(undefined);
    setMapNodes([]);
    setMapEdges([]);
    setMapMode('summary');
    setErrorMessage('');
    setIsGenerating(false);
    setDirtyPreview(false);
  }, [initialType, open]);

  const canGenerate = useMemo(() => {
    return topic.trim().length >= 3 && Boolean(type) && !isGenerating && !saving;
  }, [isGenerating, saving, topic, type]);

  const setGeneratedContent = (generatedContent: AiGeneratedContent) => {
    setContent(generatedContent);
    setDirtyPreview(false);

    if (!isMindMapContent(generatedContent)) {
      setMapNodes([]);
      setMapEdges([]);
      setMapMode('summary');
      return;
    }

    const layout = layoutAiMindMap(generatedContent);
    setMapNodes(layout.nodes);
    setMapEdges(layout.edges);
    setMapMode(layout.mode);
  };

  const generate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setErrorMessage('');

    try {
      const result = await generateStudyContentWithAi(type, topic);
      setGenerationId(result.generationId);
      setUsage(result.usage);
      setGeneratedContent(result.content);
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : 'A geração com IA está temporariamente indisponível.');
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerate = () => {
    if (dirtyPreview && !window.confirm('Gerar novamente vai substituir as alterações feitas nesta prévia. Continuar?')) return;
    setContent(undefined);
    void generate();
  };

  const closeSafely = () => {
    if (dirtyPreview && !window.confirm('Descartar a prévia gerada com IA?')) return;
    onClose();
  };

  const updateFlashcards = (nextContent: AiFlashcardsContent) => {
    setContent(nextContent);
    setDirtyPreview(true);
  };

  const updateMindMapContent = (nextContent: AiMindMapContent) => {
    setContent(nextContent);
    setDirtyPreview(true);
  };

  const updateMapNodes = (nodes: MindMapNode[]) => {
    setMapNodes(nodes);
    setDirtyPreview(true);
  };

  const updateMapEdges = (edges: MindMapEdge[]) => {
    setMapEdges(edges);
    setDirtyPreview(true);
  };

  const submitFlashcards = async () => {
    if (!content || !isFlashcardsContent(content) || !generationId) return;
    await onSaveFlashcards(content, generationId);
  };

  const submitMindMap = async () => {
    if (!content || !isMindMapContent(content) || !generationId) return;
    await onSaveMindMap(content, generationId, mapNodes, mapEdges, mapMode);
  };

  return (
    <Modal
      open={open}
      onClose={closeSafely}
      title={content ? 'Revise seu material' : 'O que você quer estudar?'}
      description={content ? 'Faça ajustes antes de salvar no StudyFlow.' : 'Digite um tema e a inteligência artificial criará o conteúdo para você.'}
      eyebrow="Criar com IA"
      className="modal--ai"
    >
      {isGenerating && <AiGeneratingState />}

      {!isGenerating && !content && (
        <form className="ai-create-form" onSubmit={(event) => { event.preventDefault(); void generate(); }}>
          <label className="ai-topic-field">
            Tema de estudo
            <input
              value={topic}
              minLength={3}
              maxLength={160}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Ex.: Revolução Francesa"
              aria-describedby={errorMessage ? 'ai-generation-error' : undefined}
              autoFocus
            />
          </label>

          <fieldset className="ai-type-grid">
            <legend>Tipo de conteúdo</legend>
            <AiContentTypeCard
              title="Flashcards"
              description="Crie perguntas e respostas para revisar o conteúdo."
              icon={<BookOpenText size={21} />}
              selected={type === 'flashcards'}
              onSelect={() => setType('flashcards')}
            />
            <AiContentTypeCard
              title="Mapa mental"
              description="Organize o tema em conceitos, ramificações e conexões."
              icon={<BrainCircuit size={21} />}
              selected={type === 'mind_map'}
              onSelect={() => setType('mind_map')}
            />
          </fieldset>

          <AiUsageIndicator usage={usage} />
          {errorMessage && <div className="ai-error" id="ai-generation-error" role="alert">{errorMessage}</div>}

          <footer className="ai-create-form__actions">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!canGenerate} loading={isGenerating} icon={<WandSparkles size={18} />}>Gerar com IA</Button>
          </footer>
        </form>
      )}

      {!isGenerating && content && isFlashcardsContent(content) && (
        <AiFlashcardsPreview
          content={content}
          saving={saving}
          onChange={updateFlashcards}
          onSave={() => void submitFlashcards()}
          onRegenerate={regenerate}
          onCancel={closeSafely}
        />
      )}

      {!isGenerating && content && isMindMapContent(content) && (
        <AiMindMapPreview
          content={content}
          nodes={mapNodes}
          edges={mapEdges}
          mode={mapMode}
          saving={saving}
          onContentChange={updateMindMapContent}
          onNodesChange={updateMapNodes}
          onEdgesChange={updateMapEdges}
          onModeChange={(nextMode) => {
            setMapMode(nextMode);
            setDirtyPreview(true);
          }}
          onSave={() => void submitMindMap()}
          onRegenerate={regenerate}
          onCancel={closeSafely}
        />
      )}

      {!isGenerating && content && (
        <div className="ai-preview-note">
          <Sparkles size={14} />
          <span>Conteúdo gerado por IA. Revise informações importantes antes de estudar.</span>
        </div>
      )}
    </Modal>
  );
}
