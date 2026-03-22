import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useState,
  type SyntheticEvent,
} from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useI18n } from '../i18n/useI18n';
import { PATTERN_OPTIONS } from './lib/patterns';
import { loadProfiles, subscribeProfiles } from './storage/profiles';
import type { Profile } from './types/measurements';

const ProfileManagerPage = lazy(() =>
  import('./components/ProfileManager/ProfileManager').then((module) => ({
    default: module.ProfileManager,
  })),
);

const PatternPage = lazy(() =>
  import('./components/PatternSection/PatternSection').then((module) => ({
    default: module.PatternSection,
  })),
);

type AppPage = 'start' | 'profiles' | 'patterns';

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress size={28} />
    </Box>
  );
}

export default function App() {
  const { lang, setLang, t } = useI18n();
  const [currentPage, setCurrentPage] = useState<AppPage>('start');
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const syncProfiles = () => {
      setProfiles(loadProfiles());
    };

    syncProfiles();
    return subscribeProfiles(syncProfiles);
  }, []);

  const stats = useMemo(
    () => [
      { value: profiles.length, label: t('savedProfiles') },
      { value: PATTERN_OPTIONS.length, label: t('availablePatterns') },
    ],
    [profiles.length, t],
  );

  const pageLinks = useMemo(
    () => [
      { id: 'profiles' as const, label: t('profilePageNav') },
      { id: 'patterns' as const, label: t('patternPageNav') },
    ],
    [t],
  );

  function handlePageChange(_event: SyntheticEvent, value: AppPage) {
    setCurrentPage(value);
  }

  function handleLanguageChange(event: SelectChangeEvent<'en' | 'sv'>) {
    setLang(event.target.value as 'en' | 'sv');
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(${alpha('#8a4e33', 0.06)} 1px, transparent 1px),
            linear-gradient(90deg, ${alpha('#8a4e33', 0.06)} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage:
            'linear-gradient(180deg, rgba(0,0,0,0.28), rgba(0,0,0,0.06) 38%, rgba(0,0,0,0))',
        }}
      />

      <AppBar
        position='sticky'
        color='transparent'
        sx={{
          bgcolor: alpha('#f7f1e7', 0.9),
          backdropFilter: 'blur(10px)',
          borderBottom: 1,
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Container maxWidth='lg'>
          <Toolbar
            disableGutters
            sx={{
              py: { xs: 0.5, md: 1 },
              gap: 2,
              flexDirection: { xs: 'row', md: 'row' },
              alignItems: { xs: 'center', md: 'center' },
              justifyContent: 'space-between',
              flexWrap: { xs: 'wrap', md: 'nowrap' },
            }}
          >
            <Stack
              direction='row'
              spacing={1.5}
              alignItems='center'
              component='button'
              type='button'
              onClick={() => setCurrentPage('start')}
              sx={{
                appearance: 'none',
                border: 0,
                background: 'transparent',
                p: 0,
                m: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  border: 2,
                  borderColor: 'primary.main',
                  display: 'grid',
                  placeItems: 'center',
                  typography: 'subtitle1',
                  fontWeight: 700,
                  color: 'primary.main',
                  bgcolor: alpha('#ffffff', 0.72),
                }}
              >
                PG
              </Box>
              <Box>
                <Typography variant='overline' color='secondary.main'>
                  {t('appTagline')}
                </Typography>
                <Typography variant='h6' component='div'>
                  {t('appName')}
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction={{ xs: 'row', md: 'column' }}
              spacing={1}
              alignItems={{ xs: 'center', md: 'flex-end' }}
              sx={{ ml: 'auto' }}
            >
              <Tabs
                value={currentPage === 'start' ? false : currentPage}
                onChange={handlePageChange}
                aria-label={t('primaryNavigation')}
                variant='scrollable'
                allowScrollButtonsMobile
                textColor='primary'
                indicatorColor='secondary'
                sx={{
                  minHeight: { xs: 40, md: 48 },
                  '& .MuiTab-root': {
                    minHeight: { xs: 40, md: 48 },
                    px: { xs: 1.25, md: 2 },
                  },
                }}
              >
                {pageLinks.map((link) => (
                  <Tab key={link.id} value={link.id} label={link.label} />
                ))}
              </Tabs>

              <FormControl
                size='small'
                sx={{ minWidth: { xs: 110, md: 140 }, flexShrink: 0 }}
              >
                <Select value={lang} onChange={handleLanguageChange}>
                  <MenuItem value='en'>English</MenuItem>
                  <MenuItem value='sv'>Svenska</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth='lg' sx={{ py: 4 }}>
        {currentPage === 'start' && (
          <Stack spacing={3}>
            <Paper
              variant='outlined'
              sx={{
                p: { xs: 3, md: 5 },
                borderColor: 'divider',
                backgroundColor: alpha('#fbf8f2', 0.94),
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gap: 3,
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'minmax(0, 1.4fr) minmax(280px, 0.9fr)',
                  },
                }}
              >
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant='overline' color='secondary.main'>
                      {t('startPageKicker')}
                    </Typography>
                    <Typography variant='h1' sx={{ mt: 1, maxWidth: '10ch' }}>
                      {t('startPageTitle')}
                    </Typography>
                    <Typography
                      color='text.secondary'
                      sx={{ mt: 2, maxWidth: '58ch', lineHeight: 1.8 }}
                    >
                      {t('startPageDescription')}
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                    <Button
                      variant='contained'
                      onClick={() => setCurrentPage('profiles')}
                    >
                      {t('goToProfiles')}
                    </Button>
                    <Button
                      variant='outlined'
                      onClick={() => setCurrentPage('patterns')}
                    >
                      {t('goToPatterns')}
                    </Button>
                  </Stack>
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gap: 1.5,
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)', md: '1fr' },
                  }}
                >
                  {stats.map((stat) => (
                    <Card
                      key={stat.label}
                      variant='outlined'
                      sx={{
                        bgcolor: alpha('#ffffff', 0.72),
                        borderColor: 'divider',
                      }}
                    >
                      <CardContent
                        sx={{
                          p: 2.5,
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 140,
                          height: '100%',
                        }}
                      >
                        <Typography
                          variant='h4'
                          sx={{ color: 'primary.main', mb: 0.5 }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography color='text.secondary'>
                          {stat.label}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            </Paper>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(3, minmax(0, 1fr))',
                },
              }}
            >
              {[
                {
                  step: '01',
                  title: t('startProfilesTitle'),
                  body: t('startProfilesBody'),
                },
                {
                  step: '02',
                  title: t('startPatternsTitle'),
                  body: t('startPatternsBody'),
                },
                {
                  step: '03',
                  title: t('startDraftTitle'),
                  body: t('startDraftBody'),
                },
              ].map((feature) => (
                <Card
                  key={feature.title}
                  variant='outlined'
                  sx={{ bgcolor: alpha('#fbf8f2', 0.88) }}
                >
                  <CardContent
                    sx={{
                      p: 2.5,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      variant='overline'
                      color='secondary.main'
                      sx={{ display: 'block', mb: 0.75 }}
                    >
                      {feature.step}
                    </Typography>
                    <Typography variant='h6' gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography color='text.secondary' sx={{ lineHeight: 1.8 }}>
                      {feature.body}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Stack>
        )}

        {currentPage !== 'start' && (
          <Stack spacing={3}>
            <Paper
              variant='outlined'
              sx={{
                p: { xs: 3, md: 4 },
                bgcolor: alpha('#fbf8f2', 0.94),
              }}
            >
              <Stack
                spacing={2}
                direction={{ xs: 'column', md: 'row' }}
                justifyContent='space-between'
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Box sx={{ maxWidth: '62ch' }}>
                  <Typography variant='overline' color='secondary.main'>
                    {t('startPageKicker')}
                  </Typography>
                  <Typography variant='h2' sx={{ mt: 1 }}>
                    {t(
                      currentPage === 'profiles'
                        ? 'profilePageTitle'
                        : 'patternPageTitle',
                    )}
                  </Typography>
                  <Typography
                    color='text.secondary'
                    sx={{ mt: 1.25, lineHeight: 1.8 }}
                  >
                    {t(
                      currentPage === 'profiles'
                        ? 'profilePageDescription'
                        : 'patternPageDescription',
                    )}
                  </Typography>
                </Box>

                <Button
                  variant='outlined'
                  onClick={() =>
                    setCurrentPage(
                      currentPage === 'profiles' ? 'patterns' : 'profiles',
                    )
                  }
                >
                  {t(
                    currentPage === 'profiles'
                      ? 'goToPatterns'
                      : 'goToProfiles',
                  )}
                </Button>
              </Stack>
            </Paper>

            {currentPage === 'profiles' ? (
              <Paper
                variant='outlined'
                sx={{
                  p: { xs: 2.5, md: 3 },
                  bgcolor: 'background.paper',
                }}
              >
                <Stack spacing={2.5} sx={{ alignItems: 'center' }}>
                  <Box>
                    <Typography variant='overline' color='secondary.main'>
                      {t('profilePageNav')}
                    </Typography>
                    <Typography variant='h6' sx={{ mt: 0.75 }}>
                      {t('startProfilesTitle')}
                    </Typography>
                    <Typography color='text.secondary' sx={{ mt: 1, lineHeight: 1.8 }}>
                      {t('startProfilesBody')}
                    </Typography>
                  </Box>

                  <Suspense fallback={<PageLoader />}>
                    <ProfileManagerPage showHeader={false} />
                  </Suspense>
                </Stack>
              </Paper>
            ) : (
              <Paper
                variant='outlined'
                sx={{
                  p: { xs: 2.5, md: 3 },
                  bgcolor: 'background.paper',
                }}
              >
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant='overline' color='secondary.main'>
                      {t('patternPageNav')}
                    </Typography>
                    <Typography variant='h6' sx={{ mt: 0.75 }}>
                      {t('startPatternsTitle')}
                    </Typography>
                    <Typography color='text.secondary' sx={{ mt: 1, lineHeight: 1.8 }}>
                      {t('startPatternsBody')}
                    </Typography>
                  </Box>

                  <Suspense fallback={<PageLoader />}>
                    <PatternPage showHeader={false} />
                  </Suspense>
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
