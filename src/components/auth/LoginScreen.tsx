import { useRef, useState } from 'react';
import { BarChart3, BookOpen, BrainCircuit, CheckCircle2, Layers3, LockKeyhole, Sparkles } from 'lucide-react';
import { signInWithGoogle } from '../../services/authService';
import { Button } from '../ui/Button';
import { Logo } from '../logo/Logo';

function GoogleMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-4V7.4H3.1A10 10 0 0 0 3.1 16.6L6.4 14Z" />
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 5.9 12 5.9Z" />
    </svg>
  );
}

function getOAuthError() {
  const params = new URLSearchParams(window.location.search);
  const errorDescription = params.get('error_description') ?? params.get('error');
  if (!errorDescription) return '';

  return `O Google não conseguiu concluir o login: ${errorDescription}`;
}

export function LoginScreen() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState(getOAuthError);
  const signInLock = useRef(false);

  const handleGoogleLogin = async () => {
    if (isSigningIn || signInLock.current) return;

    signInLock.current = true;
    setIsSigningIn(true);
    setErrorMessage('');
    window.history.replaceState({}, document.title, window.location.pathname);

    try {
      await signInWithGoogle();
    } catch (reason) {
      console.error('Erro inesperado no login:', reason);
      setErrorMessage('Não foi possível iniciar o login com Google. Verifique as variáveis da Vercel e as credenciais do Google Cloud.');
      signInLock.current = false;
      setIsSigningIn(false);
    }
  };

  return (
    <main className="login-screen">
      <section className="login-showcase hero-content" aria-labelledby="login-showcase-title">
        <div className="login-showcase__orb login-showcase__orb--one" />
        <div className="login-showcase__orb login-showcase__orb--two" />

        <div className="login-showcase__copy">
          <span className="eyebrow"><Sparkles size={14} /> StudyFlow</span>
          <h1 id="login-showcase-title" className="hero-title">Estude melhor.<br />Organize seu progresso.</h1>
          <p>Crie flashcards, pratique com testes e acompanhe sua evolução em um só lugar.</p>

          <div className="login-feature-row" aria-label="Recursos do StudyFlow">
            <span><Layers3 size={16} /> Flashcards inteligentes</span>
            <span><BrainCircuit size={16} /> Testes personalizados</span>
            <span><BarChart3 size={16} /> Progresso organizado</span>
          </div>
        </div>

        <div className="study-illustration study-visual" aria-hidden="true">
          <div className="study-illustration__line study-illustration__line--one" />
          <div className="study-illustration__line study-illustration__line--two" />
          <div className="study-book-stack"><i /><i /><i /></div>
          <div className="floating-dot floating-dot--one" />
          <div className="floating-dot floating-dot--two" />
          <div className="floating-dot floating-dot--three" />
          <div className="floating-star floating-star--one"><Sparkles size={18} /></div>
          <div className="floating-star floating-star--two"><CheckCircle2 size={17} /></div>

          <article className="study-float-card study-float-card--main">
            <span><BookOpen size={18} /> Flashcard</span>
            <strong>Conceito</strong>
            <p>Definição resumida para revisar.</p>
            <div><i /><i /><i /></div>
          </article>

          <article className="study-float-card study-float-card--quiz">
            <span><BrainCircuit size={18} /> Teste rápido</span>
            <strong>Revisão guiada</strong>
            <p>Perguntas para praticar melhor.</p>
          </article>

          <article className="study-float-card study-float-card--progress">
            <span><BarChart3 size={18} /> Progresso</span>
            <strong>Evolução</strong>
            <div className="study-progress-bars"><i /><i /><i /><i /></div>
          </article>
        </div>
      </section>

      <aside className="login-panel">
        <section className="login-card login-panel-content" aria-labelledby="login-title">
          <Logo />
          <span className="eyebrow">SEU ESPAÇO DE APRENDIZADO</span>
          <h1 id="login-title">Bem-vindo ao StudyFlow</h1>
          <p>Entre para acessar seus estudos, flashcards, testes e progresso.</p>
          {errorMessage && <div className="login-error" role="alert">{errorMessage}</div>}
          <Button
            type="button"
            className="google-button"
            variant="secondary"
            icon={<GoogleMark />}
            loading={isSigningIn}
            disabled={isSigningIn}
            onClick={handleGoogleLogin}
          >
            {isSigningIn ? 'Abrindo Google...' : 'Entrar com Google'}
          </Button>
          <div className="secure-copy"><LockKeyhole size={15} /><span>Seus estudos ficam protegidos e vinculados somente à sua conta.</span></div>
        </section>
      </aside>
    </main>
  );
}
