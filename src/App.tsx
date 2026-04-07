import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useState,
  type SyntheticEvent,
} from 'react';
import AppBar from '@mui/material/AppBar';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import { alpha } from '@mui/material/styles';
import { patchNotes } from '../i18n/translations';
import { useI18n } from '../i18n/useI18n';
import { SewmetryLogo } from './components/Brand/SewmetryLogo';
import { Footer } from './components/Footer/Footer';
import { loadProfiles, subscribeProfiles } from './storage/profiles';

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

function LanguageFlag({ lang }: { lang: 'en' | 'sv' }) {
  if (lang === 'en') {
    return (
      <Box
        component='svg'
        viewBox='0 0 24 16'
        aria-hidden='true'
        sx={{ display: 'block', width: 24, height: 16 }}
      >
        <rect width='24' height='16' fill='#012169' />
        <path d='M0 0l24 16M24 0L0 16' stroke='#FFF' strokeWidth='4' />
        <path d='M0 0l24 16M24 0L0 16' stroke='#C8102E' strokeWidth='2' />
        <path d='M12 0v16M0 8h24' stroke='#FFF' strokeWidth='6' />
        <path d='M12 0v16M0 8h24' stroke='#C8102E' strokeWidth='4' />
      </Box>
    );
  }

  return (
    <Box
      component='svg'
      viewBox='0 0 24 16'
      aria-hidden='true'
      sx={{ display: 'block', width: 24, height: 16 }}
    >
      <rect width='24' height='16' fill='#006AA7' />
      <path d='M7 0v16M0 7h24' stroke='#FECC00' strokeWidth='4' />
    </Box>
  );
}

function getLanguageLabel(lang: 'en' | 'sv') {
  return lang === 'en' ? 'English' : 'Svenska';
}

function LanguageOptionContent({ lang }: { lang: 'en' | 'sv' }) {
  return (
    <Box
      component='span'
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <LanguageFlag lang={lang} />
      <Box
        component='span'
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          p: 0,
          m: -1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {getLanguageLabel(lang)}
      </Box>
    </Box>
  );
}

const languagePickerSx = {
  minWidth: 0,
  bgcolor: alpha('#FFFFFF', 0.7),
  border: '1px solid #D9D9D9',
  overflow: 'hidden',
  boxShadow: '0 1px 2px rgba(28,28,28,0.05)',
  transition: 'background-color 120ms ease, border-color 120ms ease',
  '& .MuiOutlinedInput-notchedOutline': {
    display: 'none',
  },
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    py: 0.75,
    px: 1.25,
    minHeight: 'unset',
  },
  '& .MuiSelect-icon': {
    color: '#6E6E6E',
    right: 8,
    top: 'calc(50% - 12px)',
  },
  '&:hover': {
    bgcolor: '#FFFFFF',
    borderColor: '#CFCFCF',
  },
  '&.Mui-focused': {
    bgcolor: '#FFFFFF',
    borderColor: '#CFCFCF',
  },
};

export default function App() {
  const { lang, setLang, t } = useI18n();
  const localizedPatchNotes = patchNotes[lang];
  const [currentPage, setCurrentPage] = useState<AppPage>('start');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileCount, setProfileCount] = useState(0);

  useEffect(() => {
    const syncProfiles = () => {
      setProfileCount(loadProfiles().length);
    };

    syncProfiles();
    return subscribeProfiles(syncProfiles);
  }, []);

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

  function handleMobilePageSelect(page: AppPage) {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
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
          bgcolor: alpha('#FCFCFC', 0.9),
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
              py: { xs: 0.25, md: 1 },
              gap: { xs: 1, md: 2 },
              minHeight: { xs: 56, md: 64 },
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'nowrap',
            }}
          >
            <Stack
              direction='row'
              spacing={{ xs: 1, md: 1.5 }}
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
                  width: { xs: 40, md: 52 },
                  height: { xs: 40, md: 52 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SewmetryLogo
                  role='img'
                  aria-label={t('appName')}
                  backFill='#727787'
                  bodyFill='#bdc5e0'
                  accentFill='#a6a4a4'
                  lineColor='#120309'
                  sx={{
                    width: '100%',
                    height: '100%',
                  }}
                />
              </Box>
              <Box>
                <Typography
                  variant='h6'
                  component='div'
                  sx={{
                    fontSize: { xs: '1rem', md: '1.25rem' },
                    lineHeight: 1.2,
                  }}
                >
                  {t('appName')}
                </Typography>
                <Typography
                  variant='overline'
                  color='secondary.main'
                  sx={{
                    display: 'block',
                    lineHeight: 1.2,
                    fontSize: { xs: '0.58rem', sm: '0.72rem' },
                    letterSpacing: { xs: '0.12em', sm: '0.18em' },
                  }}
                >
                  {t('appTagline')}
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction='row'
              spacing={1}
              alignItems='center'
              sx={{ ml: 'auto', minWidth: 0 }}
            >
              <IconButton
                aria-label={t('primaryNavigation')}
                onClick={() => setMobileMenuOpen(true)}
                sx={{ display: { xs: 'inline-flex', md: 'none' } }}
              >
                <MenuIcon />
              </IconButton>

              <Tabs
                value={currentPage === 'start' ? false : currentPage}
                onChange={handlePageChange}
                aria-label={t('primaryNavigation')}
                variant='scrollable'
                allowScrollButtonsMobile
                textColor='primary'
                indicatorColor='secondary'
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  minHeight: 48,
                  minWidth: 0,
                  '& .MuiTab-root': {
                    minHeight: 48,
                    minWidth: 90,
                    px: 2,
                    fontSize: '0.875rem',
                  },
                }}
              >
                {pageLinks.map((link) => (
                  <Tab key={link.id} value={link.id} label={link.label} />
                ))}
              </Tabs>

              <Stack
                sx={{ display: { xs: 'none', md: 'block' }, flexShrink: 0 }}
              >
                <FormControl size='small' sx={{ minWidth: 0 }}>
                  <Select
                    value={lang}
                    aria-label={`${t('language')}: ${getLanguageLabel(lang)}`}
                    onChange={(event) =>
                      setLang(event.target.value as 'en' | 'sv')
                    }
                    renderValue={(value) => (
                      <LanguageOptionContent lang={value as 'en' | 'sv'} />
                    )}
                    sx={languagePickerSx}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          mt: 1,
                          border: '1px solid #D9D9D9',
                          boxShadow: '0 10px 24px rgba(28,28,28,0.08)',
                        },
                      },
                    }}
                  >
                    <MenuItem
                      value='en'
                      aria-label='English'
                      sx={{ justifyContent: 'center', minWidth: 56 }}
                    >
                      <LanguageOptionContent lang='en' />
                    </MenuItem>
                    <MenuItem
                      value='sv'
                      aria-label='Svenska'
                      sx={{ justifyContent: 'center', minWidth: 56 }}
                    >
                      <LanguageOptionContent lang='sv' />
                    </MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        anchor='right'
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
      >
        <Box sx={{ p: 2.5 }}>
          <Typography variant='h6'>{t('appName')}</Typography>
        </Box>

        <Divider />

        <List disablePadding>
          {pageLinks.map((link) => (
            <ListItemButton
              key={link.id}
              selected={currentPage === link.id}
              onClick={() => handleMobilePageSelect(link.id)}
            >
              <ListItemText primary={link.label} />
            </ListItemButton>
          ))}
        </List>

        <Divider />

        <Box sx={{ p: 2 }}>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
            {t('language')}
          </Typography>
          <Stack direction='row' spacing={1}>
            {(['en', 'sv'] as const).map((language) => {
              const isActive = lang === language;

              return (
                <Box
                  key={language}
                  component='button'
                  type='button'
                  aria-label={getLanguageLabel(language)}
                  aria-pressed={isActive}
                  onClick={() => setLang(language)}
                  sx={{
                    appearance: 'none',
                    border: isActive ? '1px solid #D9D9D9' : '1px solid transparent',
                    bgcolor: 'transparent',
                    px: 1,
                    py: 0.75,
                    minWidth: 52,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: 'none',
                    transition: 'border-color 120ms ease, background-color 120ms ease',
                    '&:hover': {
                      bgcolor: alpha('#FFFFFF', 0.45),
                    },
                  }}
                >
                  <LanguageOptionContent lang={language} />
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Drawer>

      <Container
        maxWidth='lg'
        sx={{ py: 4, px: { xs: 0, sm: 3 }, flexGrow: 1 }}
      >
        {currentPage === 'start' && (
          <Stack spacing={3}>
            <Paper
              variant='outlined'
              sx={{
                p: { xs: 3, md: 5 },
                borderColor: 'divider',
                backgroundColor: alpha('#FCFCFC', 0.94),
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
                    <Typography
                      variant='h1'
                      sx={{
                        mt: 1,
                        maxWidth: { xs: '12ch', sm: '10ch' },
                        fontSize: {
                          xs: 'clamp(1.85rem, 8.2vw, 2.5rem)',
                          sm: 'clamp(3rem, 7vw, 5.4rem)',
                        },
                        lineHeight: { xs: 1.02, sm: 0.98 },
                        textWrap: 'balance',
                        wordBreak: 'normal',
                        overflowWrap: 'normal',
                      }}
                    >
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
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(3, 1fr)',
                      md: '1fr',
                    },
                    alignContent: 'start',
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
                      sx={{
                        bgcolor: alpha('#ffffff', 0.72),
                        borderColor: 'divider',
                      }}
                    >
                      <CardContent
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          textAlign: { xs: 'center', md: 'left' },
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: { xs: 'center', md: 'flex-start' },
                          justifyContent: 'center',
                          minHeight: { xs: 'auto', sm: 180, md: 140 },
                          height: '100%',
                        }}
                      >
                        <Typography
                          variant='overline'
                          color='secondary.main'
                          sx={{ display: 'block', mb: 0.75 }}
                        >
                          {feature.step}
                        </Typography>
                        <Typography
                          variant='h6'
                          gutterBottom
                          sx={{
                            fontSize: { xs: '0.92rem', sm: '1.15rem' },
                            lineHeight: 1.15,
                            textWrap: 'balance',
                            overflowWrap: 'anywhere',
                            hyphens: 'auto',
                          }}
                        >
                          {feature.title}
                        </Typography>
                        <Typography
                          color='text.secondary'
                          sx={{ lineHeight: 1.8 }}
                        >
                          {feature.body}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            </Paper>

            <Paper
              variant='outlined'
              sx={{
                p: { xs: 3, md: 4 },
                borderColor: 'divider',
                backgroundColor: alpha('#FCFCFC', 0.94),
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gap: 3,
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'minmax(180px, 220px) minmax(0, 1fr)',
                  },
                  alignItems: 'start',
                }}
              >
                <Stack spacing={0.75}>
                  <Typography variant='overline' color='secondary.main'>
                    {t('patchNotesKicker')}
                  </Typography>
                  <Typography variant='h5'>{t('patchNotesTitle')}</Typography>
                </Stack>

                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 0.5, sm: 2 }}
                    sx={{ color: 'text.secondary' }}
                  >
                    <Typography variant='body2'>
                      {localizedPatchNotes.latest.version}
                    </Typography>
                    <Typography variant='body2'>
                      {localizedPatchNotes.latest.dateLabel}
                    </Typography>
                  </Stack>

                  <Stack component='ul' spacing={1.25} sx={{ m: 0, pl: 2.5 }}>
                    {localizedPatchNotes.latest.items.map((item) => (
                      <Typography
                        key={item}
                        component='li'
                        color='text.secondary'
                        sx={{ lineHeight: 1.8 }}
                      >
                        {item}
                      </Typography>
                    ))}
                  </Stack>

                  <Box
                    component='details'
                    sx={{
                      color: 'text.secondary',
                      '& > summary': {
                        cursor: 'pointer',
                        userSelect: 'none',
                      },
                    }}
                  >
                    <Box component='summary'>{t('olderPatchNotesSummary')}</Box>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      {localizedPatchNotes.previous.map((entry) => (
                        <Stack
                          key={`${entry.version}-${entry.dateLabel}`}
                          spacing={2}
                        >
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={{ xs: 0.5, sm: 2 }}
                          >
                            <Typography variant='body2'>
                              {entry.version}
                            </Typography>
                            <Typography variant='body2'>
                              {entry.dateLabel}
                            </Typography>
                          </Stack>

                          <Stack
                            component='ul'
                            spacing={1.25}
                            sx={{ m: 0, pl: 2.5 }}
                          >
                            {entry.items.map((item) => (
                              <Typography
                                key={item}
                                component='li'
                                color='text.secondary'
                                sx={{ lineHeight: 1.8 }}
                              >
                                {item}
                              </Typography>
                            ))}
                          </Stack>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            </Paper>
          </Stack>
        )}

        {currentPage !== 'start' && (
          <Stack spacing={3}>
            {currentPage === 'profiles' ? (
              <Paper
                variant='outlined'
                sx={{
                  p: { xs: 0, md: 3 },
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: '#D9D9D9',
                  boxShadow: 'none',
                }}
              >
                <Box
                  sx={{
                    px: { xs: 2, sm: 0 },
                    display: 'grid',
                    gap: { xs: 2.5, md: 4 },
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'minmax(220px, 320px) minmax(0, 1fr)',
                    },
                    alignItems: 'start',
                  }}
                >
                  <Box>
                    <Typography variant='overline' color='secondary.main'>
                      {t('profilePageNav')}
                    </Typography>
                    <Typography variant='h6' sx={{ mt: 0.75 }}>
                      {t('startProfilesTitle')}
                    </Typography>
                    <Typography
                      color='text.secondary'
                      sx={{ mt: 1, lineHeight: 1.8 }}
                    >
                      {t('startProfilesBody')}
                    </Typography>
                  </Box>

                  <Suspense fallback={<PageLoader />}>
                    <ProfileManagerPage showHeader={false} />
                  </Suspense>
                </Box>
              </Paper>
            ) : (
              <Paper
                variant='outlined'
                sx={{
                  p: { xs: 0, md: 3 },
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: '#D9D9D9',
                  boxShadow: 'none',
                }}
              >
                <Stack spacing={2.5} sx={{ px: { xs: 2, sm: 0 } }}>
                  <Box>
                    <Typography variant='overline' color='secondary.main'>
                      {t('patternPageNav')}
                    </Typography>
                    <Typography variant='h6' sx={{ mt: 0.75 }}>
                      {t('startPatternsTitle')}
                    </Typography>
                    <Typography
                      color='text.secondary'
                      sx={{ mt: 1, lineHeight: 1.8 }}
                    >
                      {t('startPatternsBody')}
                    </Typography>
                  </Box>

                  <Suspense fallback={<PageLoader />}>
                    {profileCount > 0 ? (
                      <PatternPage showHeader={false} />
                    ) : (
                      <Alert severity='info'>{t('noProfilesAvailable')}</Alert>
                    )}
                  </Suspense>
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
      </Container>

      <Footer />
    </Box>
  );
}
