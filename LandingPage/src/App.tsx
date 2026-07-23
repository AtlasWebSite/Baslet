import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  LockKeyhole,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  benefits,
  CheckIcon,
  faq,
  features,
  footerGroups,
  freePlan,
  premiumPlan,
  problems,
  quickBenefits,
  routes,
  showcaseTabs,
  steps,
  testimonials,
  useCases,
} from './data';

type AnalyticsEvent =
  | 'cta_start_free'
  | 'cta_premium'
  | 'cta_subscribe'
  | 'pricing_view'
  | 'faq_open';

function track(event: AnalyticsEvent, detail?: Record<string, string>) {
  window.dispatchEvent(new CustomEvent('studyflow:analytics', { detail: { event, ...detail } }));
}

const STUDYFLOW_URL = routes.studyFlow;
const PAYMENT_URL = routes.payment;

function redirectToUrl(
  event: MouseEvent<HTMLAnchorElement>,
  analyticsEvent: AnalyticsEvent,
  url = STUDYFLOW_URL,
) {
  event.preventDefault();
  track(analyticsEvent);
  window.location.href = url;
}

export function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState(showcaseTabs[0].id);
  const [openFaq, setOpenFaq] = useState(0);

  const selectedTab = useMemo(
    () => showcaseTabs.find((tab) => tab.id === activeTab) ?? showcaseTabs[0],
    [activeTab],
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const priceSection = document.getElementById('premium');
    if (!priceSection) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) track('pricing_view');
      },
      { threshold: 0.35 },
    );
    observer.observe(priceSection);
    return () => observer.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="site-shell">
      <Navbar isOpen={menuOpen} scrolled={scrolled} onMenu={setMenuOpen} onClose={closeMenu} />
      <main>
        <Hero />
        <BenefitStrip />
        <ProblemSection />
        <FeaturesSection />
        <ProductShowcase
          activeTab={activeTab}
          selectedTab={selectedTab}
          onSelect={(id) => setActiveTab(id)}
        />
        <HowItWorks />
        <BenefitsSection />
        <PlanComparison />
        <PremiumSection />
        <UseCasesAndTestimonials />
        <FaqSection openFaq={openFaq} onOpenFaq={setOpenFaq} />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <a className={`logo ${light ? 'logo--light' : ''}`} href="#top" aria-label="StudyFlow">
      <span className="logo__mark" aria-hidden="true">
        <BookOpen size={21} />
      </span>
      <strong>
        Study<span>Flow</span>
      </strong>
    </a>
  );
}

function Navbar({
  isOpen,
  scrolled,
  onMenu,
  onClose,
}: {
  isOpen: boolean;
  scrolled: boolean;
  onMenu: (open: boolean) => void;
  onClose: () => void;
}) {
  const links = [
    { label: 'Recursos', href: '#recursos' },
    { label: 'Como funciona', href: '#como-funciona' },
    { label: 'Premium', href: '#premium' },
    { label: 'Duvidas', href: '#duvidas' },
  ];

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">
        <Logo />
        <nav className={`navbar__links ${isOpen ? 'is-open' : ''}`} aria-label="Navegacao principal">
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={onClose}>
              {link.label}
            </a>
          ))}
          <div className="navbar__mobile-actions">
            <a
              className="btn btn--primary"
              href={STUDYFLOW_URL}
              onClick={(event) => redirectToUrl(event, 'cta_start_free')}
            >
              Comecar gratuitamente
            </a>
          </div>
        </nav>
        <div className="navbar__actions">
          <a
            className="btn btn--primary"
            href={STUDYFLOW_URL}
            onClick={(event) => redirectToUrl(event, 'cta_start_free')}
          >
            Comecar gratuitamente
          </a>
        </div>
        <button
          className="icon-btn navbar__toggle"
          type="button"
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={isOpen}
          onClick={() => onMenu(!isOpen)}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="hero section">
      <div className="hero__halo hero__halo--one" />
      <div className="hero__halo hero__halo--two" />
      <div className="container hero__grid">
        <div className="hero__copy reveal">
          <span className="badge">
            <Sparkles size={15} /> Seu novo espaco de estudos
          </span>
          <h1>
            Estude com organizacao. <span>Aprenda no seu ritmo.</span>
          </h1>
          <p>
            O StudyFlow reune flashcards, mapas mentais, testes e acompanhamento de progresso em
            um so lugar para voce estudar de forma mais simples e eficiente.
          </p>
          <div className="hero__actions">
            <a
              className="btn btn--primary btn--large"
              href={STUDYFLOW_URL}
              onClick={(event) => redirectToUrl(event, 'cta_start_free')}
            >
              Comecar gratuitamente <ArrowRight size={18} />
            </a>
            <a
              className="btn btn--secondary btn--large"
              href={STUDYFLOW_URL}
              onClick={(event) => redirectToUrl(event, 'cta_start_free')}
            >
              Acessar o StudyFlow
            </a>
          </div>
          <small>Comece gratuitamente. Atualize para o Premium quando precisar.</small>
        </div>
        <div className="hero__visual reveal reveal--delay">
          <ProductMockup variant="hero" />
          <FloatingCard className="floating-card--flash" label="Flashcards" value="24 para revisar" />
          <FloatingCard className="floating-card--quiz" label="Teste rapido" value="5 perguntas" />
        </div>
      </div>
    </section>
  );
}

function ProductMockup({
  variant = 'hero',
  tab,
}: {
  variant?: 'hero' | 'showcase' | 'mini';
  tab?: (typeof showcaseTabs)[number];
}) {
  const cards = tab?.cards ?? ['Biologia celular', 'Historia do Brasil', 'Matematica basica'];
  const metric = tab?.metric ?? '67%';

  return (
    <div className={`mockup mockup--${variant}`} role="img" aria-label="Previa visual do painel StudyFlow">
      <div className="mockup__bar">
        <span />
        <span />
        <span />
        <strong>StudyFlow</strong>
      </div>
      <div className="mockup__body">
        <aside className="mockup__sidebar">
          <Logo />
          {['Inicio', 'Meus estudos', 'Flashcards', 'Mapas', 'Progresso'].map((item, index) => (
            <span key={item} className={index === 0 ? 'active' : ''}>
              {item}
            </span>
          ))}
        </aside>
        <section className="mockup__content">
          <div className="mockup__hero">
            <div>
              <small>Meta de hoje</small>
              <strong>Mais perto do que voce quer aprender.</strong>
              <p>Uma sessao curta ja mantem seu ritmo vivo.</p>
            </div>
            <div className="mockup__ring">
              <strong>{metric}</strong>
              <span>dominio</span>
            </div>
          </div>
          <div className="mockup__quick">
            <span>Estudar agora</span>
            <span>Teste rapido</span>
            <span>Revisar</span>
          </div>
          <div className="mockup__sets">
            {cards.map((card, index) => (
              <article key={card} style={{ '--accent': ['#6554E8', '#2EC4B6', '#F4935C'][index % 3] } as React.CSSProperties}>
                <small>{index + 1 < 10 ? `0${index + 1}` : index + 1}</small>
                <strong>{card}</strong>
                <span>
                  <i />
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function FloatingCard({ className, label, value }: { className: string; label: string; value: string }) {
  return (
    <div className={`floating-card ${className}`}>
      <span />
      <div>
        <strong>{label}</strong>
        <small>{value}</small>
      </div>
    </div>
  );
}

function BenefitStrip() {
  return (
    <section className="section section--tight">
      <div className="container benefit-strip reveal">
        {quickBenefits.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title}>
              <span>
                <Icon size={21} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="section problem">
      <div className="container two-col">
        <div className="section-copy reveal">
          <span className="eyebrow">O problema</span>
          <h2>Estudar nao precisa ser desorganizado.</h2>
          <p>
            Anotacoes espalhadas, materias acumuladas e revisoes sem planejamento tornam o
            aprendizado mais dificil. O StudyFlow transforma todo esse conteudo em uma rotina clara.
          </p>
          <div className="problem__list">
            {problems.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title}>
                  <Icon size={20} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        <div className="compare-card reveal reveal--delay">
          <div>
            <small>Antes do StudyFlow</small>
            <span className="messy-line messy-line--long" />
            <span className="messy-line" />
            <span className="messy-line messy-line--short" />
            <p>Arquivos, cadernos e links sem uma ordem clara.</p>
          </div>
          <ArrowRight size={24} aria-hidden="true" />
          <div className="is-better">
            <small>Com o StudyFlow</small>
            <strong>Rotina organizada</strong>
            <span className="clean-progress"><i /></span>
            <p>Conteudos, revisoes e progresso no mesmo fluxo.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="recursos" className="section features">
      <div className="container">
        <div className="section-heading reveal">
          <span className="eyebrow">Recursos</span>
          <h2>Tudo o que voce precisa para aprender melhor.</h2>
          <p>Organize, pratique, revise e acompanhe sua evolucao sem sair do mesmo aplicativo.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                className="feature-card reveal"
                key={feature.title}
                style={{ '--accent': feature.accent, '--delay': `${index * 50}ms` } as React.CSSProperties}
              >
                <span className="feature-card__icon">
                  <Icon size={24} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <div className="feature-card__demo">
                  <span>{feature.demo}</span>
                  <i />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProductShowcase({
  activeTab,
  selectedTab,
  onSelect,
}: {
  activeTab: string;
  selectedTab: (typeof showcaseTabs)[number];
  onSelect: (id: string) => void;
}) {
  return (
    <section className="section showcase">
      <div className="container">
        <div className="section-heading reveal">
          <span className="eyebrow">Produto</span>
          <h2>Uma experiencia simples do inicio ao fim.</h2>
          <p>Explore como o StudyFlow organiza a jornada entre estudar, revisar e evoluir.</p>
        </div>
        <div className="showcase__shell reveal">
          <div className="showcase__tabs" role="tablist" aria-label="Telas do StudyFlow">
            {showcaseTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => onSelect(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="showcase__grid">
            <div className="showcase__copy">
              <span className="badge badge--soft">Tela em foco</span>
              <h3>{selectedTab.title}</h3>
              <p>{selectedTab.text}</p>
              <a
                className="text-link"
                href={STUDYFLOW_URL}
                onClick={(event) => redirectToUrl(event, 'cta_start_free')}
              >
                Criar meu primeiro conjunto <ArrowRight size={17} />
              </a>
            </div>
            <ProductMockup variant="showcase" tab={selectedTab} />
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="section">
      <div className="container">
        <div className="section-heading reveal">
          <span className="eyebrow">Como funciona</span>
          <h2>Comece a estudar em poucos passos.</h2>
        </div>
        <div className="steps reveal">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title}>
                <span className="steps__number">0{index + 1}</span>
                <span className="steps__icon">
                  <Icon size={23} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            );
          })}
        </div>
        <div className="center-action reveal">
          <a
            className="btn btn--primary btn--large"
            href={STUDYFLOW_URL}
            onClick={(event) => redirectToUrl(event, 'cta_start_free')}
          >
            Criar meu primeiro conjunto
          </a>
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section className="section benefits">
      <div className="container two-col">
        <div className="section-copy reveal">
          <span className="eyebrow">Beneficios</span>
          <h2>Mais clareza para estudar. Mais confianca para aprender.</h2>
          <p>
            O StudyFlow foi pensado para reduzir atrito, organizar a rotina e deixar cada revisao
            mais objetiva.
          </p>
        </div>
        <div className="benefits__grid reveal reveal--delay">
          {benefits.map((benefit) => (
            <article key={benefit}>
              <Check size={19} />
              <span>{benefit}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanComparison() {
  return (
    <section className="section plan-compare">
      <div className="container">
        <div className="section-heading reveal">
          <span className="eyebrow">Planos</span>
          <h2>Escolha o ritmo que combina com seus estudos.</h2>
          <p>Comece gratuito e desbloqueie o plano completo quando quiser evoluir a rotina.</p>
        </div>
        <div className="plan-grid">
          <PlanCard title="Plano gratuito" items={freePlan} cta="Comecar gratuitamente" />
          <PlanCard
            title="StudyFlow Premium"
            items={premiumPlan}
            cta="Assinar o Premium"
            premium
          />
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  title,
  items,
  cta,
  premium = false,
}: {
  title: string;
  items: string[];
  cta: string;
  premium?: boolean;
}) {
  return (
    <article className={`plan-card ${premium ? 'plan-card--premium' : ''} reveal`}>
      {premium && <span className="plan-card__badge">Plano completo</span>}
      <h3>{title}</h3>
      {premium ? (
        <div className="price">
          <strong>R$ 11,90</strong>
          <span>por mes</span>
        </div>
      ) : (
        <p className="plan-card__note">Ideal para conhecer o StudyFlow e organizar os primeiros estudos.</p>
      )}
      <ul>
        {items.map((item) => (
          <li key={item}>
            <CheckIcon size={18} /> {item}
          </li>
        ))}
      </ul>
      <a
        className={`btn ${premium ? 'btn--primary' : 'btn--secondary'}`}
        href={premium ? PAYMENT_URL : STUDYFLOW_URL}
        onClick={(event) => redirectToUrl(event, premium ? 'cta_premium' : 'cta_start_free', premium ? PAYMENT_URL : STUDYFLOW_URL)}
      >
        {cta}
      </a>
    </article>
  );
}

function PremiumSection() {
  return (
    <section id="premium" className="section premium-section">
      <div className="container premium__grid">
        <div className="premium__copy reveal">
          <span className="badge badge--light">
            <LockKeyhole size={15} /> StudyFlow Premium
          </span>
          <h2>Desbloqueie todo o potencial dos seus estudos.</h2>
          <p>Tenha acesso completo aos recursos do StudyFlow e transforme sua rotina de aprendizado.</p>
        </div>
        <article className="premium-card reveal reveal--delay">
          <span className="premium-card__glow" />
          <small>StudyFlow Premium</small>
          <div className="price">
            <strong>R$ 11,90</strong>
            <span>por mes</span>
          </div>
          <ul>
            {premiumPlan.map((item) => (
              <li key={item}>
                <CheckIcon size={18} /> {item}
              </li>
            ))}
          </ul>
          <a
            className="btn btn--primary btn--large"
            href={PAYMENT_URL}
            onClick={(event) => redirectToUrl(event, 'cta_subscribe', PAYMENT_URL)}
          >
            Assinar agora
          </a>
          <footer>
            <ShieldCheck size={16} /> Pagamento seguro pelo Mercado Pago.
          </footer>
        </article>
      </div>
    </section>
  );
}

function UseCasesAndTestimonials() {
  return (
    <section className="section use-cases">
      <div className="container">
        <div className="section-heading reveal">
          <span className="eyebrow">Para quem e</span>
          <h2>O StudyFlow acompanha diferentes formas de aprender.</h2>
        </div>
        <div className="use-grid">
          {useCases.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="reveal">
                <Icon size={22} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
        <div className="testimonial-block reveal">
          <div className="section-heading section-heading--left">
            <span className="eyebrow">Depoimentos</span>
            <h2>Uma rotina de estudos mais simples.</h2>
            <p>Estudantes usando organizacao, revisao e progresso para estudar com mais clareza.</p>
          </div>
          <div className="testimonial-grid">
            {testimonials.map((item, index) => (
              <article className={`testimonial-card testimonial-card--${item.tone}`} key={item.name}>
                <TestimonialAvatar tone={item.tone} variant={index} />
                <strong>{item.name}</strong>
                <small>{item.profile}</small>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialAvatar({ tone, variant }: { tone: string; variant: number }) {
  return (
    <span className={`avatar avatar--${tone} avatar--variant-${variant + 1}`} aria-hidden="true">
      <span className="avatar__shape avatar__shape--one" />
      <span className="avatar__shape avatar__shape--two" />
      <span className="avatar__person">
        <span className="avatar__hair" />
        <span className="avatar__head">
          <i />
          <i />
          <b />
          <em />
        </span>
        <span className="avatar__neck" />
        <span className="avatar__body" />
      </span>
    </span>
  );
}

function FaqSection({ openFaq, onOpenFaq }: { openFaq: number; onOpenFaq: (index: number) => void }) {
  return (
    <section id="duvidas" className="section faq-section">
      <div className="container">
        <div className="section-heading reveal">
          <span className="eyebrow">FAQ</span>
          <h2>Perguntas frequentes.</h2>
          <p>Respostas curtas para ajudar o visitante a decidir com seguranca.</p>
        </div>
        <div className="faq-list reveal">
          {faq.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <article key={item.question} className={isOpen ? 'is-open' : ''}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${index}`}
                  onClick={() => {
                    onOpenFaq(isOpen ? -1 : index);
                    if (!isOpen) track('faq_open', { question: item.question });
                  }}
                >
                  <span>{item.question}</span>
                  <ChevronDown size={20} />
                </button>
                <div id={`faq-${index}`} hidden={!isOpen}>
                  <p>{item.answer}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="section final-cta">
      <div className="container final-cta__inner reveal">
        <div>
          <span className="badge badge--light">Comece hoje</span>
          <h2>Seu proximo estudo pode comecar agora.</h2>
          <p>Organize seus conteudos, revise no seu ritmo e acompanhe sua evolucao com o StudyFlow.</p>
          <div className="hero__actions">
            <a
              className="btn btn--primary btn--large"
              href={STUDYFLOW_URL}
              onClick={(event) => redirectToUrl(event, 'cta_start_free')}
            >
              Comecar gratuitamente
            </a>
            <a
              className="btn btn--light btn--large"
              href={PAYMENT_URL}
              onClick={(event) => redirectToUrl(event, 'cta_premium', PAYMENT_URL)}
            >
              Conhecer o Premium
            </a>
          </div>
        </div>
        <ProductMockup variant="mini" />
      </div>
    </section>
  );
}

function Footer() {
  const linkMap: Record<string, string> = {
    Recursos: '#recursos',
    'Como funciona': '#como-funciona',
    Premium: '#premium',
    'Central de ajuda': STUDYFLOW_URL,
    Contato: STUDYFLOW_URL,
    'Perguntas frequentes': '#duvidas',
    'Termos de uso': STUDYFLOW_URL,
    'Politica de privacidade': STUDYFLOW_URL,
    'Politica de cookies': STUDYFLOW_URL,
  };

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Logo />
          <p>Seus dados, seu ritmo.</p>
        </div>
        {footerGroups.map((group) => (
          <div key={group.title}>
            <strong>{group.title}</strong>
            {group.links.map((link) => (
              <a key={link} href={linkMap[link]}>
                {link}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div className="container footer__bottom">
        <span>© 2026 StudyFlow. Todos os direitos reservados.</span>
        <span>Desenvolvido por AtlasWeb</span>
      </div>
    </footer>
  );
}
