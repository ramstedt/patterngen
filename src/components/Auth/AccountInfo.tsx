import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useI18n } from '../../../i18n/useI18n';
import { useAuthStore } from '../../stores/authStore';

export function AccountInfo() {
  const { t } = useI18n();
  const accountUser = useAuthStore((s) => s.accountUser);
  const logout = useAuthStore((s) => s.logout);
  const refreshAccount = useAuthStore((s) => s.refreshAccount);

  useEffect(() => {
    refreshAccount();
  }, [refreshAccount]);

  if (!accountUser) return null;

  return (
    <Box>
      <Stack spacing={1}>
        <Typography>
          <strong>{t('accountEmail')}:</strong> {accountUser.email}
        </Typography>
        <Typography>
          <strong>{t('accountLogins')}:</strong> {accountUser.loginCount}
        </Typography>
        <Typography>
          <strong>{t('accountLastLogin')}:</strong>{' '}
          {accountUser.lastLoginAt
            ? new Date(accountUser.lastLoginAt).toLocaleString()
            : '—'}
        </Typography>
        <Typography>
          <strong>{t('accountSavedProfiles')}:</strong> {accountUser.measurementProfileCount}
        </Typography>
      </Stack>
      <Button
        variant="outlined"
        color="primary"
        onClick={logout}
        sx={{ mt: 3 }}
      >
        {t('authLogOut')}
      </Button>
    </Box>
  );
}
