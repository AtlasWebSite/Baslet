import { Crown, Sparkles } from 'lucide-react';
import type { AiUsageSnapshot } from '../../types/ai';

export function AiUsageIndicator({ usage }: { usage?: AiUsageSnapshot }) {
  if (!usage) {
    return (
      <div className="ai-usage-indicator">
        <Sparkles size={15} />
        <span>Gere conteúdo por tema e revise antes de salvar.</span>
      </div>
    );
  }

  if (usage.limit === null) {
    return (
      <div className="ai-usage-indicator">
        <Crown size={15} />
        <span>Administrador: gerações ilimitadas neste mês.</span>
      </div>
    );
  }

  return (
    <div className="ai-usage-indicator">
      <Sparkles size={15} />
      <span>{usage.remaining} de {usage.limit} gerações disponíveis neste mês.</span>
    </div>
  );
}
