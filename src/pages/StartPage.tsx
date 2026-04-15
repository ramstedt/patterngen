import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { patchNotes } from '../../i18n/translations';
import { useI18n } from '../../i18n/useI18n';
import { useAuthStore } from '../stores/authStore';

export function StartPage() {
  const { lang, t } = useI18n();
  const localizedPatchNotes = patchNotes[lang];
  const token = useAuthStore((s) => s.token);
  const accountUser = useAuthStore((s) => s.accountUser);
  const isLoggedIn = !!token && !!accountUser;

  return (
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
              {isLoggedIn ? (
                <>
                  <Button variant='contained' component={Link} to='/profiles'>
                    {t('goToProfiles')}
                  </Button>
                  <Button variant='outlined' component={Link} to='/patterns'>
                    {t('goToPatterns')}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant='contained' component={Link} to='/login'>
                    {t('authLogIn')}
                  </Button>
                  <Button variant='outlined' component={Link} to='/register'>
                    {t('authCreateAccount')}
                  </Button>
                </>
              )}
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
                imageSrc: '/guide/step1.png',
                imageAlt: t('startProfilesTitle'),
              },
              {
                step: '02',
                title: t('startPatternsTitle'),
                body: t('startPatternsBody'),
                imageSrc: '/guide/step2.png',
                imageAlt: t('startPatternsTitle'),
              },
              {
                step: '03',
                title: t('startDraftTitle'),
                body: t('startDraftBody'),
                imageSrc: '/guide/step3.png',
                imageAlt: t('startDraftTitle'),
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
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: { xs: 'center', sm: 'flex-start', md: 'center' },
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
                  {feature.imageSrc ? (
                    <Box
                      component='img'
                      src={feature.imageSrc}
                      alt={feature.imageAlt}
                      sx={{
                        display: 'block',
                        width: '100%',
                        maxWidth: 132,
                        height: 'auto',
                        mx: 'auto',
                        mb: 1.25,
                      }}
                    />
                  ) : null}
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

      {/* Patch notes */}
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
                  display: 'inline-block',
                  color: 'primary.main',
                  textDecoration: 'underline',
                  textUnderlineOffset: '0.18em',
                  '&:hover': { color: 'primary.dark' },
                  '&:focus-visible': {
                    outline: '2px solid #2B4F6A',
                    outlineOffset: 2,
                  },
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
  );
}
