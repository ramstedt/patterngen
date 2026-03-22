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
      default: '#f3ede3',
      paper: '#fbf8f2',
    },
    text: {
      primary: '#1e1914',
      secondary: '#564d45',
    },
    divider: '#e2d8ca',
  },
  shape: {
    borderRadius: 0,
  },
  typography: {
    fontFamily: '"Avenir Next", "Segoe UI", Arial, sans-serif',
    h1: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 700,
      lineHeight: 0.96,
      letterSpacing: '-0.04em',
      fontSize: 'clamp(3rem, 7vw, 5.4rem)',
    },
    h2: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 700,
      lineHeight: 1,
      letterSpacing: '-0.03em',
      fontSize: 'clamp(2rem, 4vw, 3rem)',
    },
    h4: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 700,
      lineHeight: 1.05,
    },
    h5: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 700,
      lineHeight: 1.1,
    },
    h6: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 700,
    },
    overline: {
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f3ede3',
          backgroundImage:
            'linear-gradient(180deg, rgba(255,255,255,0.58), rgba(243,237,227,0.92))',
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
          borderColor: '#e2d8ca',
          '&:hover': {
            borderColor: '#d4c8b8',
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
          borderColor: '#e2d8ca',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderColor: '#e2d8ca',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          borderColor: '#e2d8ca',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#e2d8ca',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#d4c8b8',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#8a4e33',
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
          borderBottom: '1px solid #e2d8ca',
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
