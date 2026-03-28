import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useI18n } from '../../../i18n/useI18n';

export function Footer() {
  const { t } = useI18n();

  return (
    <Box
      component='footer'
      sx={{
        mt: 6,
        borderTop: 1,
        borderColor: alpha('#8a4e33', 0.18),
        backgroundColor: alpha('#f7f1e7', 0.72),
      }}
    >
      <Container maxWidth='lg' sx={{ py: { xs: 3, md: 3.5 } }}>
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)',
              },
              alignItems: 'start',
            }}
          >
            <Stack spacing={0.75}>
              <Typography variant='overline' color='secondary.main'>
                {t('footerKicker')}
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>
                {t('footerTitle')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ maxWidth: '62ch', lineHeight: 1.8 }}
              >
                {t('footerBody')}
              </Typography>
            </Stack>

            <Stack spacing={1.5}>
              <Box>
                <Typography
                  variant='caption'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    color: 'text.primary',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {t('footerLicenseLabel')}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.8 }}>
                  {t('footerLicenseBody')}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant='caption'
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    color: 'text.primary',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {t('footerContactLabel')}
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={{ xs: 0.75, sm: 2 }}
                >
                  <Link
                    href='https://github.com/ramstedt/patterngen'
                    target='_blank'
                    rel='noreferrer'
                    underline='hover'
                    color='primary.main'
                  >
                    {t('footerGithubLink')}
                  </Link>
                  <Link
                    href='mailto:emma.ramstedt@gmail.com'
                    underline='hover'
                    color='primary.main'
                  >
                    {t('footerEmailLink')}
                  </Link>
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Divider />

          <Typography variant='caption' color='text.secondary'>
            {t('footerTitle')} • emma.ramstedt@gmail.com
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
