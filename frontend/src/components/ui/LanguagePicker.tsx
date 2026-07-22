import { Check } from 'lucide-react';
import { Modal } from './Modal';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'ru', labelKey: 'profile.languages.ru' },
  { code: 'en', labelKey: 'profile.languages.en' },
];

interface LanguagePickerProps {
  open: boolean;
  onClose: () => void;
  current: string;
  onSelect: (code: string) => void;
}

export function LanguagePicker({ open, onClose, current, onSelect }: LanguagePickerProps) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onClose={onClose} title={t('profile.selectLanguage')}>
      <div className="flex flex-col gap-1">
        {LANGUAGES.map((lang) => {
          const selected = current === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => { onSelect(lang.code); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm transition-all ${
                selected
                  ? 'bg-gradient-to-r from-[var(--gold)]/10 to-transparent text-[var(--gold)]'
                  : 'hover:bg-[var(--surface)] text-[var(--text)]'
              }`}
            >
              <span className="flex-1 text-left">{t(lang.labelKey)}</span>
              {selected && <Check size={16} style={{ color: 'var(--gold)' }} />}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
