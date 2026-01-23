import { useI18n } from '../i18n/i18n';

export default function App() {
  const { lang, setLang, t } = useI18n();

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>{t('appName')}</h1>

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

      <h2>{t('measurements')}</h2>
      <button>{t('generate')}</button>
    </div>
  );
}
