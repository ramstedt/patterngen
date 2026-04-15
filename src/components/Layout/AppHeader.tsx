import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import { alpha } from '@mui/material/styles';
import { useI18n } from '../../../i18n/useI18n';
import { useAuthStore } from '../../stores/authStore';
import { SewmetryLogo } from '../Brand/SewmetryLogo';
import {
  DesktopLanguagePicker,
  MobileLanguagePicker,
} from './LanguagePicker';

export function AppHeader() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const token = useAuthStore((s) => s.token);
  const accountUser = useAuthStore((s) => s.accountUser);
  const logout = useAuthStore((s) => s.logout);
  const isLoggedIn = !!token && !!accountUser;

  const pageLinks = useMemo(
    () =>
      isLoggedIn
        ? [
            { to: '/profiles', label: t('profilePageNav') },
            { to: '/patterns', label: t('patternPageNav') },
          ]
        : [],
    [t, isLoggedIn],
  );

  function closeMobile() {
    setMobileMenuOpen(false);
  }

  return (
    <>
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
            {/* Logo / Brand */}
            <Stack
              direction='row'
              spacing={{ xs: 1, md: 1.5 }}
              alignItems='center'
              component={Link}
              to='/'
              sx={{
                textDecoration: 'none',
                color: 'inherit',
                '&:focus-visible': {
                  outline: '2px solid #2B4F6A',
                  outlineOffset: 2,
                },
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
                  sx={{ width: '100%', height: '100%' }}
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

            {/* Right side */}
            <Stack
              direction='row'
              spacing={1}
              alignItems='center'
              sx={{ ml: 'auto', minWidth: 0 }}
            >
              {/* Mobile hamburger */}
              <IconButton
                aria-label={t('primaryNavigation')}
                onClick={() => setMobileMenuOpen(true)}
                sx={{
                  display: { xs: 'inline-flex', md: 'none' },
                  '&:focus-visible': {
                    outline: '2px solid #2B4F6A',
                    outlineOffset: 2,
                  },
                }}
              >
                <MenuIcon />
              </IconButton>

              {/* Desktop nav links */}
              <Stack
                direction='row'
                spacing={0.5}
                aria-label={t('primaryNavigation')}
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  minWidth: 0,
                  alignItems: 'center',
                }}
              >
                {pageLinks.map((link) => {
                  const isActive = location.pathname === link.to;
                  return (
                    <Button
                      key={link.to}
                      variant='text'
                      color='primary'
                      component={Link}
                      to={link.to}
                      aria-current={isActive ? 'page' : undefined}
                      sx={{
                        minHeight: 48,
                        minWidth: 90,
                        px: 2,
                        fontSize: '0.875rem',
                        fontFamily:
                          '"Questrial", "Source Sans 3", sans-serif',
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        color: isActive ? 'primary.main' : 'text.primary',
                        borderBottom: isActive
                          ? '2px solid #8a4e33'
                          : '2px solid transparent',
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'transparent' },
                      }}
                    >
                      {link.label}
                    </Button>
                  );
                })}
              </Stack>

              {/* Auth button */}
              {isLoggedIn ? (
                <>
                  <Button
                    variant='text'
                    color='primary'
                    component={Link}
                    to='/account'
                    sx={{
                      display: { xs: 'none', md: 'inline-flex' },
                      minHeight: 48,
                      px: 2,
                      fontSize: '0.875rem',
                      fontFamily: '"Questrial", "Source Sans 3", sans-serif',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      color:
                        location.pathname === '/account'
                          ? 'primary.main'
                          : 'text.primary',
                      borderBottom:
                        location.pathname === '/account'
                          ? '2px solid #8a4e33'
                          : '2px solid transparent',
                    }}
                  >
                    {t('accountTitle')}
                  </Button>
                  <Button
                    variant='text'
                    size='small'
                    color='secondary'
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    sx={{
                      display: { xs: 'none', md: 'inline-flex' },
                      minHeight: 48,
                      px: 1.5,
                      fontSize: '0.8rem',
                      fontFamily: '"Questrial", "Source Sans 3", sans-serif',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {t('authLogOut')}
                  </Button>
                </>
              ) : (
                <Button
                  variant='outlined'
                  size='small'
                  component={Link}
                  to='/login'
                  sx={{ display: { xs: 'none', md: 'inline-flex' } }}
                >
                  {t('authLogIn')}
                </Button>
              )}

              <DesktopLanguagePicker />
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor='right'
        open={mobileMenuOpen}
        onClose={closeMobile}
        PaperProps={{ sx: { width: 280 } }}
      >
        <Box sx={{ p: 2.5 }}>
          <Typography variant='h6'>{t('appName')}</Typography>
        </Box>

        <Divider />

        <List disablePadding>
          {pageLinks.map((link) => (
            <ListItemButton
              key={link.to}
              component={Link}
              to={link.to}
              selected={location.pathname === link.to}
              onClick={closeMobile}
            >
              <ListItemText primary={link.label} />
            </ListItemButton>
          ))}
        </List>

        <Divider />

        {isLoggedIn ? (
          <Box sx={{ p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 1 }}
            >
              {accountUser ? `${t('accountLoggedInAs')} ${accountUser.email}` : ''}
            </Typography>
            <Stack direction='row' spacing={1}>
              <Button
                size='small'
                variant='text'
                component={Link}
                to='/account'
                onClick={closeMobile}
              >
                {t('accountTitle')}
              </Button>
              <Button
                size='small'
                variant='text'
                color='secondary'
                component={Link}
                to='/'
                onClick={() => {
                  logout();
                  closeMobile();
                }}
              >
                {t('authLogOut')}
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            <Button
              variant='outlined'
              size='small'
              fullWidth
              component={Link}
              to='/login'
              onClick={closeMobile}
            >
              {t('authLogIn')}
            </Button>
          </Box>
        )}

        <Divider />

        <MobileLanguagePicker />
      </Drawer>
    </>
  );
}
