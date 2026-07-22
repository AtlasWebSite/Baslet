import { Bell, BookOpenCheck, Crown, LogOut, Palette, PlayCircle, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Profile, StudySet } from '../types';
import { getOverallProgress } from '../utils/study';
import { Button } from '../components/ui/Button';

interface ProfileViewProps {
  profile: Profile;
  studySets: StudySet[];
  isPremium: boolean;
  onBilling: () => void;
  onClear: () => Promise<void>;
  onReplayTutorial: () => void;
  onSignOut: () => Promise<void>;
}

export function ProfileView({ profile, studySets, isPremium, onBilling, onClear, onReplayTutorial, onSignOut }: ProfileViewProps) {
  const [notifications, setNotifications] = useState(true); const [compact, setCompact] = useState(false); const [busy, setBusy] = useState(false);
  const perform = async (action: () => Promise<void>) => { setBusy(true); try { await action(); } finally { setBusy(false); } };
  return <div className="view profile-view"><section className="profile-card"><div className="profile-cover"/><div className="profile-main">{profile.avatar_url ? <img className="avatar avatar--image" src={profile.avatar_url} alt={`Avatar de ${profile.full_name}`} referrerPolicy="no-referrer"/> : <div className="avatar">{profile.full_name.slice(0,2).toUpperCase()}</div>}<div><h2>{profile.full_name}</h2><p>{profile.email}</p><span className={`level-badge ${isPremium ? 'level-badge--premium' : ''}`}>{isPremium ? <Crown size={15}/> : <ShieldCheck size={15}/>} {isPremium ? 'Premium ativo' : 'Assinatura inativa'}</span></div><Button variant="secondary" icon={<Crown size={17}/>} onClick={onBilling}>Ver assinatura</Button>{isPremium && <Button variant="ghost" icon={<PlayCircle size={17}/>} onClick={onReplayTutorial}>Ver tutorial</Button>}</div><div className="profile-stats"><div><strong>{studySets.length}</strong><span>Conjuntos</span></div><div><strong>{studySets.flatMap((set) => set.cards).length}</strong><span>Flashcards</span></div><div><strong>{getOverallProgress(studySets)}%</strong><span>Domínio</span></div><div><strong>{studySets.flatMap((set) => set.cards).filter((card) => card.mastery > 0).length}</strong><span>Praticados</span></div></div></section><div className="profile-grid"><section className="settings-card"><div className="section-heading"><div><span className="eyebrow">PERSONALIZAÇÃO</span><h2>Preferências</h2></div></div><div className="setting-row"><span><Bell size={20}/></span><div><strong>Lembretes de estudo</strong><small>Preferência salva apenas neste navegador</small></div><button className={`toggle ${notifications?'active':''}`} onClick={() => setNotifications((value)=>!value)} aria-label="Alternar lembretes"><span/></button></div><div className="setting-row"><span><Palette size={20}/></span><div><strong>Interface compacta</strong><small>Preferência visual local</small></div><button className={`toggle ${compact?'active':''}`} onClick={() => setCompact((value)=>!value)} aria-label="Alternar interface compacta"><span/></button></div></section><section className="settings-card"><div className="section-heading"><div><span className="eyebrow">CONTA E DADOS</span><h2>Privacidade</h2></div></div><div className="privacy-note"><ShieldCheck size={24}/><p>Seus estudos são vinculados à sua conta e protegidos por políticas de acesso no banco.</p></div><div className="data-actions">{isPremium && <Button variant="danger" icon={<Trash2 size={17}/>} disabled={busy||!studySets.length} onClick={() => void perform(onClear)}>Limpar meus estudos</Button>}<Button variant="secondary" icon={<LogOut size={17}/>} disabled={busy} onClick={() => void perform(onSignOut)}>Sair da conta</Button></div></section></div><div className="profile-footer-note"><BookOpenCheck size={18}/> StudyFlow · Seus dados, seu ritmo.</div></div>;
}
