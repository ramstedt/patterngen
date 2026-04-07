import React from 'react';
import ReactDOM from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from './App.tsx';
import { I18nProvider } from '../i18n/i18n.tsx';
import './index.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1f3641',
      dark: '#15262f',
      light: '#3b5561',
      contrastText: '#f7f1e7',
    },
    secondary: {
      main: '#8a4e33',
      dark: '#683a25',
      light: '#b37356',
    },
    background: {
      default: '#DDE7F8',
      paper: '#FCFCFC',
    },
    text: {
      primary: '#1C1C1C',
      secondary: '#564d45',
    },
    divider: '#D9D9D9',
  },
  shape: {
    borderRadius: 0,
  },
  typography: {
    fontFamily: '"Source Sans 3", "Segoe UI", Arial, sans-serif',
    h1: {
      fontFamily: '"Questrial", "Source Sans 3", sans-serif',
      fontWeight: 400,
      lineHeight: 0.98,
      letterSpacing: '-0.03em',
      fontSize: 'clamp(3rem, 7vw, 5.4rem)',
    },
    h2: {
      fontFamily: '"Questrial", "Source Sans 3", sans-serif',
      fontWeight: 400,
      lineHeight: 1,
      letterSpacing: '-0.02em',
      fontSize: 'clamp(2rem, 4vw, 3rem)',
    },
    h4: {
      fontFamily: '"Questrial", "Source Sans 3", sans-serif',
      fontWeight: 400,
      lineHeight: 1.05,
    },
    h5: {
      fontFamily: '"Questrial", "Source Sans 3", sans-serif',
      fontWeight: 400,
      lineHeight: 1.1,
    },
    h6: {
      fontFamily: '"Questrial", "Source Sans 3", sans-serif',
      fontWeight: 400,
    },
    overline: {
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
    },
    button: {
      textTransform: 'none',
      fontFamily: '"Questrial", "Source Sans 3", sans-serif',
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#DDE7F8',
          backgroundImage:
            'linear-gradient(180deg, rgba(255,255,255,0.58), rgba(221,231,248,0.92))',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 0,
          paddingInline: '1rem',
          paddingBlock: '0.7rem',
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#15262f',
          },
        },
        outlinedPrimary: {
          borderColor: '#D9D9D9',
          '&:hover': {
            borderColor: '#CFCFCF',
            backgroundColor: 'rgba(31,54,65,0.06)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
        outlined: {
          borderColor: '#D9D9D9',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderColor: '#D9D9D9',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          borderColor: '#D9D9D9',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#D9D9D9',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#CFCFCF',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#CFCFCF',
            borderWidth: 1,
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          minHeight: 44,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #D9D9D9',
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
