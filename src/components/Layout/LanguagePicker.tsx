import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import { useI18n } from '../../../i18n/useI18n';

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

export function getLanguageLabel(lang: 'en' | 'sv') {
  return lang === 'en' ? 'English' : 'Svenska';
}

export function LanguageOptionContent({ lang }: { lang: 'en' | 'sv' }) {
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
    borderColor: '#2B4F6A',
    boxShadow: '0 0 0 2px rgba(43,79,106,0.14)',
  },
  '&:focus-visible': {
    outline: '2px solid #2B4F6A',
    outlineOffset: 2,
  },
};

/** Desktop language picker (Select dropdown). */
export function DesktopLanguagePicker() {
  const { lang, setLang, t } = useI18n();

  return (
    <Stack sx={{ display: { xs: 'none', md: 'block' }, flexShrink: 0 }}>
      <FormControl size='small' sx={{ minWidth: 0 }}>
        <Select
          value={lang}
          aria-label={`${t('language')}: ${getLanguageLabel(lang)}`}
          onChange={(event) => setLang(event.target.value as 'en' | 'sv')}
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
  );
}

/** Mobile language picker (simple button row). */
export function MobileLanguagePicker() {
  const { lang, setLang, t } = useI18n();

  return (
    <Box sx={{ p: 2 }}>
      <Box
        component='span'
        sx={{ display: 'block', mb: 1, fontSize: '0.875rem', color: 'text.secondary' }}
      >
        {t('language')}
      </Box>
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
                border: isActive
                  ? '1px solid #D9D9D9'
                  : '1px solid transparent',
                bgcolor: 'transparent',
                px: 1,
                py: 0.75,
                minWidth: 52,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: 'none',
                transition:
                  'border-color 120ms ease, background-color 120ms ease',
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
  );
}
