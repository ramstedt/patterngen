import { Suspense, lazy } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { PageLoader } from '../components/Layout/PageLoader';
import { PageShell } from '../components/Layout/PageShell';

const ProfileManagerPage = lazy(() =>
  import('../components/ProfileManager/ProfileManager').then((module) => ({
    default: module.ProfileManager,
  })),
);

export function ProfilesPage() {
  const { t } = useI18n();

  return (
    <PageShell
      kicker={t('profilePageNav')}
      title={t('startProfilesTitle')}
      description={t('startProfilesBody')}
    >
      <Suspense fallback={<PageLoader />}>
        <ProfileManagerPage showHeader={false} />
      </Suspense>
    </PageShell>
  );
}
