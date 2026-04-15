import { Suspense, lazy } from 'react';
import Alert from '@mui/material/Alert';
import { useI18n } from '../../i18n/useI18n';
import { useProfiles } from '../hooks/useProfiles';
import { PageLoader } from '../components/Layout/PageLoader';
import { PageShell } from '../components/Layout/PageShell';

const PatternSection = lazy(() =>
  import('../components/PatternSection/PatternSection').then((module) => ({
    default: module.PatternSection,
  })),
);

export function PatternsPage() {
  const { t } = useI18n();
  const { profiles } = useProfiles();

  return (
    <PageShell
      kicker={t('patternPageNav')}
      title={t('startPatternsTitle')}
      description={t('startPatternsBody')}
    >
      <Suspense fallback={<PageLoader />}>
        {profiles.length > 0 ? (
          <PatternSection showHeader={false} />
        ) : (
          <Alert severity='info'>{t('noProfilesAvailable')}</Alert>
        )}
      </Suspense>
    </PageShell>
  );
}
