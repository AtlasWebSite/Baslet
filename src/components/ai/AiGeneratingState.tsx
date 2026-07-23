import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

const messages = [
  'Analisando o tema',
  'Selecionando os conceitos principais',
  'Organizando o conteúdo',
  'Preparando seu material de estudo',
];

export function AiGeneratingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, 1400);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="ai-generating" role="status" aria-live="polite">
      <span className="ai-generating__orb"><Sparkles size={25} /></span>
      <h3>{messages[messageIndex]}...</h3>
      <p>Estamos montando uma prévia para você revisar antes de salvar.</p>
      <div className="ai-generating__bar"><span /></div>
    </div>
  );
}
