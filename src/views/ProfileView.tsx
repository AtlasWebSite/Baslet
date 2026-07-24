import {
  AlertTriangle,
  Bell,
  BookOpenCheck,
  Crown,
  LogOut,
  Palette,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import type { Profile, StudySet } from '../types';
import { getOverallProgress } from '../utils/study';

interface ProfileViewProps {
  profile: Profile;
  studySets: StudySet[];
  isPremium: boolean;
  onBilling: () => void;
  onClear: () => Promise<void>;
  onReplayTutorial: () => void;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

const DELETE_CONFIRMATION = 'APAGAR';

export function ProfileView({
  profile,
  studySets,
  isPremium,
  onBilling,
  onClear,
  onReplayTutorial,
  onSignOut,
  onDeleteAccount,
}: ProfileViewProps) {
  const [notifications, setNotifications] = useState(true);
  const [compact, setCompact] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const allCards = studySets.flatMap((studySet) => studySet.cards);
  const canConfirmDelete = deletePhrase.trim().toUpperCase() === DELETE_CONFIRMATION;

  const perform = async (action: () => Promise<void>) => {
    setBusy(true);

    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;

    setDeleteOpen(false);
    setDeletePhrase('');
    setDeleteError('');
  };

  const confirmAccountDeletion = async () => {
    if (!canConfirmDelete || isDeleting) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      await onDeleteAccount();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Não foi possível apagar sua conta agora.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="view profile-view">
      <section className="profile-card">
        <div className="profile-cover" />

        <div className="profile-main">
          {profile.avatar_url ? (
            <img
              className="avatar avatar--image"
              src={profile.avatar_url}
              alt={`Avatar de ${profile.full_name}`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="avatar">{profile.full_name.slice(0, 2).toUpperCase()}</div>
          )}

          <div>
            <h2>{profile.full_name}</h2>
            <p>{profile.email}</p>
            <span className={`level-badge ${isPremium ? 'level-badge--premium' : ''}`}>
              {isPremium ? <Crown size={15} /> : <ShieldCheck size={15} />}
              {isPremium ? 'Premium ativo' : 'Assinatura inativa'}
            </span>
          </div>

          <Button variant="secondary" icon={<Crown size={17} />} onClick={onBilling}>
            Ver assinatura
          </Button>

          {isPremium && (
            <Button variant="ghost" icon={<PlayCircle size={17} />} onClick={onReplayTutorial}>
              Ver tutorial
            </Button>
          )}
        </div>

        <div className="profile-stats">
          <div>
            <strong>{studySets.length}</strong>
            <span>Conjuntos</span>
          </div>
          <div>
            <strong>{allCards.length}</strong>
            <span>Flashcards</span>
          </div>
          <div>
            <strong>{getOverallProgress(studySets)}%</strong>
            <span>Domínio</span>
          </div>
          <div>
            <strong>{allCards.filter((card) => card.mastery > 0).length}</strong>
            <span>Praticados</span>
          </div>
        </div>
      </section>

      <div className="profile-grid">
        <section className="settings-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">PERSONALIZAÇÃO</span>
              <h2>Preferências</h2>
            </div>
          </div>

          <div className="setting-row">
            <span><Bell size={20} /></span>
            <div>
              <strong>Lembretes de estudo</strong>
              <small>Preferência salva apenas neste navegador</small>
            </div>
            <button
              className={`toggle ${notifications ? 'active' : ''}`}
              onClick={() => setNotifications((value) => !value)}
              aria-label="Alternar lembretes"
            >
              <span />
            </button>
          </div>

          <div className="setting-row">
            <span><Palette size={20} /></span>
            <div>
              <strong>Interface compacta</strong>
              <small>Preferência visual local</small>
            </div>
            <button
              className={`toggle ${compact ? 'active' : ''}`}
              onClick={() => setCompact((value) => !value)}
              aria-label="Alternar interface compacta"
            >
              <span />
            </button>
          </div>
        </section>

        <section className="settings-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CONTA E DADOS</span>
              <h2>Privacidade</h2>
            </div>
          </div>

          <div className="privacy-note">
            <ShieldCheck size={24} />
            <p>Seus estudos são vinculados à sua conta e protegidos no banco de dados.</p>
          </div>

          <div className="data-actions">
            {isPremium && (
              <Button
                variant="danger"
                icon={<Trash2 size={17} />}
                disabled={busy || !studySets.length}
                onClick={() => void perform(onClear)}
              >
                Limpar meus estudos
              </Button>
            )}

            <Button
              variant="danger"
              icon={<ShieldAlert size={17} />}
              disabled={busy}
              onClick={() => setDeleteOpen(true)}
            >
              Apagar conta
            </Button>

            <Button
              variant="secondary"
              icon={<LogOut size={17} />}
              disabled={busy}
              onClick={() => void perform(onSignOut)}
            >
              Sair da conta
            </Button>
          </div>
        </section>
      </div>

      <div className="profile-footer-note">
        <BookOpenCheck size={18} />
        StudyFlow · Seus dados, seu ritmo.
      </div>

      <Modal
        open={deleteOpen}
        onClose={closeDeleteDialog}
        title="Apagar conta"
        eyebrow="Ação permanente"
        description="Essa ação remove sua conta e seus dados do StudyFlow."
        className="modal--delete-account"
      >
        <div className="delete-account-dialog">
          <div className="delete-account-warning">
            <AlertTriangle size={22} />
            <div>
              <strong>Essa ação não pode ser desfeita.</strong>
              <p>
                Seus conjuntos, flashcards, progresso, mapas mentais e dados de perfil serão apagados.
                Se houver assinatura vinculada, tentaremos cancelar a renovação no Mercado Pago antes da exclusão.
              </p>
            </div>
          </div>

          <label>
            Digite <strong>{DELETE_CONFIRMATION}</strong> para confirmar
            <input
              value={deletePhrase}
              onChange={(event) => setDeletePhrase(event.target.value)}
              autoComplete="off"
              disabled={isDeleting}
              aria-describedby={deleteError ? 'delete-account-error' : undefined}
            />
          </label>

          {deleteError && (
            <p className="delete-account-error" id="delete-account-error">
              {deleteError}
            </p>
          )}

          <div className="delete-account-actions">
            <Button variant="ghost" disabled={isDeleting} onClick={closeDeleteDialog}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={isDeleting}
              disabled={!canConfirmDelete}
              icon={<Trash2 size={17} />}
              onClick={() => void confirmAccountDeletion()}
            >
              Apagar minha conta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
