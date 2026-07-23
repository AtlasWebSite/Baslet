import { useEffect, useState } from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { getCurrentSession } from '../../services/authService';
import { Logo } from '../logo/Logo';
import { Button } from '../ui/Button';

function getSafeRedirectPath(value: string | null) {
  if (!value) return '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return '/';

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
}

export function AuthCallbackPage() {
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function handleCallback() {
      const urlParams = new URLSearchParams(window.location.search);
      const urlError = urlParams.get('error_description') ?? urlParams.get('error');
      const redirectPath = getSafeRedirectPath(urlParams.get('next'));

      if (urlError) {
        window.history.replaceState({}, document.title, '/auth/callback');
        setErrorMessage(urlError);
        return;
      }

      const session = await getCurrentSession();
      if (!session) {
        setErrorMessage('Sessão não encontrada após o login.');
        return;
      }

      window.location.replace(redirectPath);
    }

    void handleCallback();
  }, []);

  if (errorMessage) {
    return (
      <main className="callback-screen">
        <section className="callback-card" role="alert">
          <Logo />
          <span className="callback-icon callback-icon--error"><AlertCircle size={28} /></span>
          <h1>Não foi possível concluir o login</h1>
          <p>{errorMessage}</p>
          <Button onClick={() => window.location.replace('/')}>Voltar para o login</Button>
        </section>
      </main>
    );
  }

  return (
    <main className="callback-screen">
      <section className="callback-card" aria-live="polite">
        <Logo />
        <span className="callback-icon"><LoaderCircle className="spin" size={28} /></span>
        <h1>Concluindo seu login</h1>
        <p>Aguarde enquanto a Vercel confirma sua sessão.</p>
      </section>
    </main>
  );
}
