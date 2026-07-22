import type { StudySet } from '../types';

type StarterStudySet = Omit<StudySet, 'id' | 'updatedAt'>;

const flashcard = (id: string, term: string, definition: string): StudySet['cards'][number] => ({ id, term, definition, mastery: 0 });

export const starterStudySets: StarterStudySet[] = [
  {
    title: 'Inglês básico', subject: 'Idiomas', description: 'Palavras simples para começar a revisar inglês.', color: '#6758e8', icon: 'language',
    cards: [flashcard('starter-en-1', 'Hello', 'Olá'), flashcard('starter-en-2', 'Good morning', 'Bom dia'), flashcard('starter-en-3', 'Thank you', 'Obrigado'), flashcard('starter-en-4', 'Please', 'Por favor'), flashcard('starter-en-5', 'Water', 'Água'), flashcard('starter-en-6', 'School', 'Escola'), flashcard('starter-en-7', 'Book', 'Livro'), flashcard('starter-en-8', 'Friend', 'Amigo')],
  },
  {
    title: 'Biologia celular', subject: 'Biologia', description: 'Conceitos básicos sobre células.', color: '#17a99a', icon: 'biology',
    cards: [flashcard('starter-bio-1', 'Célula', 'Unidade básica dos seres vivos.'), flashcard('starter-bio-2', 'Núcleo', 'Estrutura que guarda o material genético da célula.'), flashcard('starter-bio-3', 'Mitocôndria', 'Organela responsável pela produção de energia.'), flashcard('starter-bio-4', 'Membrana plasmática', 'Camada que controla a entrada e saída de substâncias.'), flashcard('starter-bio-5', 'Citoplasma', 'Região interna da célula onde ficam as organelas.'), flashcard('starter-bio-6', 'DNA', 'Molécula que armazena informações genéticas.')],
  },
  {
    title: 'História do Brasil', subject: 'História', description: 'Revisão rápida de temas importantes da história brasileira.', color: '#ef8d55', icon: 'history',
    cards: [flashcard('starter-history-1', 'Brasil Colônia', 'Período em que o Brasil foi administrado por Portugal.'), flashcard('starter-history-2', 'Independência do Brasil', 'Processo que tornou o Brasil independente de Portugal em 1822.'), flashcard('starter-history-3', 'República', 'Forma de governo em que representantes são escolhidos para governar.'), flashcard('starter-history-4', 'Abolição da escravidão', 'Fim legal da escravidão no Brasil em 1888.'), flashcard('starter-history-5', 'Era Vargas', 'Período em que Getúlio Vargas teve grande influência política no Brasil.')],
  },
  {
    title: 'Matemática essencial', subject: 'Matemática', description: 'Conceitos básicos para revisar matemática.', color: '#3d8fe8', icon: 'math',
    cards: [flashcard('starter-math-1', 'Soma', 'Operação usada para juntar valores.'), flashcard('starter-math-2', 'Subtração', 'Operação usada para retirar um valor de outro.'), flashcard('starter-math-3', 'Multiplicação', 'Soma repetida de um mesmo número.'), flashcard('starter-math-4', 'Divisão', 'Operação usada para repartir uma quantidade.'), flashcard('starter-math-5', 'Porcentagem', 'Forma de representar uma parte de 100.'), flashcard('starter-math-6', 'Fração', 'Representação de uma parte de um todo.')],
  },
];
