import { Database, KeyRound, ShieldCheck } from 'lucide-react';
import { Logo } from '../logo/Logo';

export function BackendSetupScreen() {
  return (
    <main className="setup-screen">
      <div className="auth-shape auth-shape--one" />
      <div className="setup-card">
        <Logo />
        <span className="setup-icon"><Database size={28} /></span>
        <span className="eyebrow">CONFIGURAÇÃO NECESSÁRIA</span>
        <h1>Conecte o backend do StudyFlow</h1>
        <p>O app está pronto para autenticação e dados reais via Vercel Serverless e Postgres.</p>
        <div className="env-list">
          <code>GOOGLE_CLIENT_ID</code>
          <code>GOOGLE_CLIENT_SECRET</code>
          <code>AUTH_SECRET</code>
          <code>POSTGRES_URL</code>
        </div>
        <div className="setup-note"><ShieldCheck size={18} /><span>Nunca coloque segredos no frontend ou com prefixo VITE_.</span></div>
        <small><KeyRound size={14} /> Copie <strong>.env.example</strong> para <strong>.env.local</strong> e rode com <strong>npx vercel dev</strong>.</small>
      </div>
    </main>
  );
}
