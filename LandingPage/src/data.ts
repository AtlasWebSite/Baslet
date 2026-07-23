import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  Compass,
  GraduationCap,
  Layers3,
  Lightbulb,
  NotebookTabs,
  PanelsTopLeft,
  Rocket,
  School,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import type { ComponentType } from 'react';

export const routes = {
  studyFlow: 'https://baslet.vercel.app/',
  payment: 'https://baslet.vercel.app/pagamento',
};

export type IconComponent = ComponentType<{ size?: number; strokeWidth?: number }>;

export const quickBenefits = [
  { icon: PanelsTopLeft, title: 'Tudo em um so lugar', text: 'Conjuntos, revisoes e progresso conectados.' },
  { icon: Target, title: 'Estude no seu ritmo', text: 'Retome exatamente de onde parou.' },
  { icon: BarChart3, title: 'Acompanhe sua evolucao', text: 'Veja o que ja dominou e o que revisar.' },
  { icon: Cloud, title: 'Acesse em qualquer dispositivo', text: 'Seu estudo acompanha sua rotina.' },
];

export const problems = [
  {
    icon: NotebookTabs,
    title: 'Conteudos espalhados',
    text: 'Materiais em diferentes lugares dificultam a revisao.',
  },
  {
    icon: Compass,
    title: 'Falta de constancia',
    text: 'Sem uma rotina visual, fica mais facil perder o ritmo.',
  },
  {
    icon: Lightbulb,
    title: 'Revisoes pouco eficientes',
    text: 'Apenas reler o conteudo nem sempre ajuda na memorizacao.',
  },
];

export const features = [
  {
    icon: Layers3,
    title: 'Conjuntos de estudos',
    text: 'Separe seus conteudos por materia, assunto ou objetivo e encontre tudo rapidamente.',
    accent: '#F4935C',
    demo: '3 materias organizadas',
  },
  {
    icon: BookOpen,
    title: 'Flashcards',
    text: 'Revise os principais conceitos em poucos minutos com cards rapidos e organizados.',
    accent: '#6554E8',
    demo: 'Cards ilimitados no Premium',
  },
  {
    icon: BrainCircuit,
    title: 'Mapas mentais',
    text: 'Visualize ideias, conceitos e conexoes de forma organizada e facil de entender.',
    accent: '#725EEB',
    demo: 'Conexoes automaticas',
  },
  {
    icon: ClipboardCheck,
    title: 'Testes rapidos',
    text: 'Pratique com perguntas de revisao e descubra quais assuntos pedem mais atencao.',
    accent: '#2EC4B6',
    demo: 'Perguntas para praticar',
  },
  {
    icon: BarChart3,
    title: 'Progresso',
    text: 'Acompanhe sua evolucao e mantenha uma visao clara do que ja foi estudado.',
    accent: '#5A9DEB',
    demo: 'Evolucao por materia',
  },
  {
    icon: Cloud,
    title: 'Sincronizacao',
    text: 'Continue seus estudos em diferentes dispositivos sem perder seu progresso.',
    accent: '#6554E8',
    demo: 'Conta sempre atualizada',
  },
];

export const showcaseTabs = [
  {
    id: 'overview',
    label: 'Visao geral',
    title: 'Tudo importante aparece primeiro.',
    text: 'A tela inicial mostra estudos recentes, progresso geral e atalhos para continuar sua revisao sem procurar pelo caminho.',
    metric: '67%',
    cards: ['Biologia celular', 'Historia do Brasil', 'Matematica basica'],
  },
  {
    id: 'organization',
    label: 'Organizacao',
    title: 'Conjuntos claros para cada objetivo.',
    text: 'Agrupe materias, temas e flashcards em espacos separados para estudar com mais foco.',
    metric: '12',
    cards: ['Vestibular', 'Curso tecnico', 'Faculdade'],
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    title: 'Revisoes curtas que cabem na rotina.',
    text: 'Transforme conteudos importantes em perguntas e respostas para reforcar a memoria aos poucos.',
    metric: '248',
    cards: ['Frente', 'Verso', 'Dominado'],
  },
  {
    id: 'mindmaps',
    label: 'Mapas mentais',
    title: 'Ideias conectadas visualmente.',
    text: 'Veja conceitos, relacoes e detalhes em um mapa limpo para entender o assunto como um todo.',
    metric: '5',
    cards: ['Conceito central', 'Causas', 'Exemplos'],
  },
  {
    id: 'progress',
    label: 'Progresso',
    title: 'Saiba o que revisar agora.',
    text: 'Acompanhe materias, dominio dos cards e continuidade para ajustar seus estudos com mais clareza.',
    metric: '8',
    cards: ['Cards fracos', 'Em evolucao', 'Dominados'],
  },
];

export const steps = [
  { title: 'Crie sua conta', text: 'Cadastre-se e tenha seu espaco de estudos.', icon: Rocket },
  { title: 'Crie um conjunto', text: 'Organize uma materia, tema ou conteudo.', icon: Layers3 },
  { title: 'Transforme em atividades', text: 'Use flashcards, mapas mentais e testes.', icon: Sparkles },
  { title: 'Acompanhe seu progresso', text: 'Veja sua evolucao e continue de onde parou.', icon: Trophy },
];

export const benefits = [
  'Menos tempo procurando materiais.',
  'Mais organizacao entre materias.',
  'Revisoes mais rapidas.',
  'Melhor visualizacao do progresso.',
  'Rotina de estudos mais consistente.',
  'Conteudos disponiveis em diferentes dispositivos.',
];

export const freePlan = [
  'Criar conta',
  'Organizar conjuntos',
  'Visualizar o painel',
  'Conhecer os recursos',
  'Acesso limitado as ferramentas de estudo',
];

export const premiumPlan = [
  'Flashcards ilimitados',
  'Mapas mentais automaticos',
  'Testes de revisao',
  'Progresso salvo',
  'Acesso em qualquer dispositivo',
  'Organizacao completa por materias',
];

export const useCases = [
  { icon: School, title: 'Ensino fundamental', text: 'Organize temas da escola em cards simples de revisar.' },
  { icon: GraduationCap, title: 'Ensino medio', text: 'Mantenha materias acumuladas em uma rotina visual.' },
  { icon: BookOpen, title: 'Faculdade', text: 'Separe disciplinas, conceitos e leituras em conjuntos.' },
  { icon: Target, title: 'Vestibulares', text: 'Revise assuntos recorrentes e acompanhe sua evolucao.' },
  { icon: ShieldCheck, title: 'Concursos', text: 'Transforme conteudos extensos em revisoes praticas.' },
  { icon: BrainCircuit, title: 'Aprendizado pessoal', text: 'Memorize conceitos de cursos, idiomas e novos temas.' },
];

export const testimonials = [
  {
    name: 'Ana Luiza',
    profile: 'Estudante do ensino medio',
    text: 'Eu tinha dificuldade para manter uma rotina de revisao. Com o StudyFlow, consegui organizar melhor minhas materias e revisar com muito mais facilidade antes das provas.',
    tone: 'lilac',
  },
  {
    name: 'Lucas Martins',
    profile: 'Vestibulando',
    text: 'O que mais gostei foi conseguir separar os conteudos e acompanhar meu progresso. Isso me ajudou a estudar com mais clareza e sem aquela sensacao de estar perdido.',
    tone: 'blue',
  },
  {
    name: 'Beatriz Costa',
    profile: 'Universitaria',
    text: 'Os flashcards e os mapas mentais deixaram meus estudos muito mais praticos. Hoje eu consigo revisar os pontos principais em menos tempo e com mais organizacao.',
    tone: 'aqua',
  },
];

export const faq = [
  {
    question: 'O que e o StudyFlow?',
    answer:
      'E uma plataforma de estudos para organizar conteudos, revisar com flashcards, criar mapas mentais, praticar com testes e acompanhar seu progresso.',
  },
  {
    question: 'Posso criar uma conta gratuitamente?',
    answer:
      'Sim. A pagina esta preparada para levar novos usuarios ao cadastro gratuito. Os limites do plano gratuito podem ser ajustados na integracao final.',
  },
  {
    question: 'Quais recursos estao disponiveis no Premium?',
    answer:
      'O Premium libera flashcards ilimitados, mapas mentais automaticos, testes de revisao, progresso salvo, acesso em dispositivos diferentes e organizacao completa por materias.',
  },
  {
    question: 'Quanto custa o StudyFlow Premium?',
    answer: 'O plano Premium custa R$ 11,90 por mes.',
  },
  {
    question: 'Posso acessar em mais de um dispositivo?',
    answer:
      'Sim. A proposta do StudyFlow e permitir acesso em diferentes dispositivos com o progresso conectado a conta.',
  },
  {
    question: 'Meu progresso fica salvo?',
    answer:
      'No Premium, o progresso fica salvo na conta. Detalhes tecnicos de armazenamento podem ser adicionados na politica do produto.',
  },
  {
    question: 'Como funcionam os flashcards?',
    answer:
      'Voce transforma conceitos importantes em perguntas e respostas curtas para revisar em sessoes rapidas.',
  },
  {
    question: 'Como os mapas mentais sao criados?',
    answer:
      'Eles organizam ideias e conexoes a partir dos conteudos de estudo. A regra final de geracao pode ser ajustada conforme a implementacao do app.',
  },
  {
    question: 'Posso cancelar a assinatura?',
    answer:
      'A secao esta preparada para incluir a politica de cancelamento oficial assim que ela estiver definida.',
  },
  {
    question: 'O pagamento e seguro?',
    answer:
      'A landing informa pagamento seguro pelo Mercado Pago. Detalhes de processamento devem seguir a configuracao oficial da conta.',
  },
];

export const footerGroups = [
  { title: 'Produto', links: ['Recursos', 'Como funciona', 'Premium'] },
  { title: 'Suporte', links: ['Central de ajuda', 'Contato', 'Perguntas frequentes'] },
  { title: 'Legal', links: ['Termos de uso', 'Politica de privacidade', 'Politica de cookies'] },
];

export const CheckIcon = CheckCircle2;
