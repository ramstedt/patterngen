import { ProfileManager } from './components/ProfileManager/ProfileManager';
import { useI18n } from '../i18n/i18n';

export default function App() {
  const { lang, setLang, t } = useI18n();

  return (
    <>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: 16,
          fontFamily: 'system-ui',
        }}
      >
        <strong>{t('appName')}</strong>
        <label>
          {t('language')}{' '}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as 'en' | 'sv')}
          >
            <option value='en'>English</option>
            <option value='sv'>Svenska</option>
          </select>
        </label>
      </header>

      <ProfileManager />
    </>
  );
}
