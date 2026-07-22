import { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import type { Flashcard, StudySet } from '../../types';
import { newId } from '../../utils/study';
import { Button } from '../ui/Button';

interface DraftCard { id: string; term: string; definition: string }

export function CreateStudySetForm({ onSave, onCancel }: { onSave: (studySet: Omit<StudySet, 'id' | 'updatedAt'>) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [cards, setCards] = useState<DraftCard[]>([{ id: newId('draft'), term: '', definition: '' }, { id: newId('draft'), term: '', definition: '' }]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const updateCard = (id: string, field: 'term' | 'definition', value: string) => setCards((current) => current.map((currentCard) => currentCard.id === id ? { ...currentCard, [field]: value } : currentCard));
  const addCard = () => setCards((current) => [...current, { id: newId('draft'), term: '', definition: '' }]);
  const removeCard = (id: string) => setCards((current) => current.length === 1 ? current : current.filter((currentCard) => currentCard.id !== id));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors: string[] = [];
    if (!title.trim()) validationErrors.push('Dê um nome ao conjunto.');
    if (!subject.trim()) validationErrors.push('Informe uma matéria ou categoria.');
    if (cards.some((currentCard) => !currentCard.term.trim() || !currentCard.definition.trim())) validationErrors.push('Preencha termo e definição em todos os cards.');
    if (validationErrors.length) { setErrors(validationErrors); return; }

    setErrors([]);
    setSaving(true);
    const normalizedCards: Flashcard[] = cards.map((currentCard) => ({ id: newId('card'), term: currentCard.term.trim(), definition: currentCard.definition.trim(), mastery: 0 }));
    void onSave({ title: title.trim(), subject: subject.trim(), description: description.trim() || undefined, color: '#6758e8', icon: 'general', cards: normalizedCards }).catch((reason: Error) => { setErrors([reason.message]); setSaving(false); });
  };

  return (
    <form className="create-form" onSubmit={submit} noValidate>
      {errors.length > 0 && <div className="form-errors" role="alert">{errors.map((error) => <span key={error}>{error}</span>)}</div>}
      <div className="form-grid">
        <label>Nome do conjunto<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Fundamentos de design" autoFocus /></label>
        <label>Matéria ou categoria<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ex.: Design" /></label>
      </div>
      <label className="description-field">Descrição opcional<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Uma breve descrição do conteúdo" /></label>
      <div className="term-section"><div><h3>Termos e definições</h3><span>{cards.length} cards</span></div>
        {cards.map((currentCard, index) => (
          <div className="term-row" key={currentCard.id}>
            <span className="term-index">{String(index + 1).padStart(2, '0')}</span>
            <label>Termo<input value={currentCard.term} onChange={(event) => updateCard(currentCard.id, 'term', event.target.value)} placeholder="Digite o termo" /></label>
            <label>Definição<input value={currentCard.definition} onChange={(event) => updateCard(currentCard.id, 'definition', event.target.value)} placeholder="Explique com suas palavras" /></label>
            <button type="button" className="icon-button" onClick={() => removeCard(currentCard.id)} aria-label={`Remover card ${index + 1}`} disabled={cards.length === 1}><Trash2 size={18} /></button>
          </div>
        ))}
        <Button type="button" variant="secondary" icon={<Plus size={18} />} onClick={addCard}>Adicionar card</Button>
      </div>
      <footer className="form-actions"><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button><Button type="submit" loading={saving} icon={<Save size={18} />}>Salvar conjunto</Button></footer>
    </form>
  );
}
