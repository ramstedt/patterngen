import { useI18n } from '../../i18n/useI18n';
import { AccountInfo } from '../components/Auth/AccountInfo';
import { PageShell } from '../components/Layout/PageShell';

export function AccountPage() {
  const { t } = useI18n();

  return (
    <PageShell
      kicker={t('accountPageNav')}
      title={t('accountTitle')}
      description={t('accountPageBody')}
    >
      <AccountInfo />
    </PageShell>
  );
}
