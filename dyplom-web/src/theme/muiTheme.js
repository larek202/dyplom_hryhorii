import { alpha, createTheme } from '@mui/material/styles';
import { plPL } from '@mui/material/locale';

const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: {
        main: '#2563eb',
        light: '#3b82f6',
        dark: '#1d4ed8',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#64748b',
        light: '#94a3b8',
        dark: '#475569',
      },
      text: {
        primary: '#0f172a',
        secondary: '#475569',
        disabled: '#94a3b8',
      },
      divider: alpha('#0f172a', 0.08),
      background: {
        default: '#f1f5f9',
        paper: '#ffffff',
      },
      action: {
        hover: alpha('#0f172a', 0.04),
        selected: alpha('#2563eb', 0.08),
      },
    },
    shape: { borderRadius: 12 },
    shadows: [
      'none',
      '0 1px 2px rgba(15, 23, 42, 0.04)',
      '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
      '0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
      '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
      '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
      ...Array(19).fill('0 25px 50px -12px rgba(15, 23, 42, 0.15)'),
    ],
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontWeightRegular: 450,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      h1: {
        fontWeight: 700,
        letterSpacing: '-0.035em',
        lineHeight: 1.2,
      },
      h2: {
        fontWeight: 700,
        letterSpacing: '-0.03em',
        lineHeight: 1.25,
      },
      h3: {
        fontWeight: 600,
        letterSpacing: '-0.028em',
        lineHeight: 1.3,
      },
      h4: {
        fontWeight: 600,
        letterSpacing: '-0.025em',
        lineHeight: 1.35,
      },
      h5: {
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      h6: {
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      subtitle1: {
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      subtitle2: {
        fontWeight: 600,
        letterSpacing: '-0.015em',
      },
      body1: {
        letterSpacing: '-0.015em',
        lineHeight: 1.6,
      },
      body2: {
        letterSpacing: '-0.01em',
        lineHeight: 1.55,
      },
      button: {
        fontWeight: 600,
        letterSpacing: '-0.02em',
        textTransform: 'none',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            overflowX: 'hidden',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 10,
            padding: '10px 18px',
            transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
            [theme.breakpoints.down('sm')]: {
              minHeight: 44,
              padding: '10px 20px',
            },
          }),
          containedPrimary: {
            boxShadow: `0 1px 2px ${alpha('#2563eb', 0.2)}`,
            '&:hover': {
              boxShadow: `0 4px 12px ${alpha('#2563eb', 0.35)}`,
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            transition: 'background-color 0.2s ease, transform 0.15s ease',
            [theme.breakpoints.down('sm')]: {
              minWidth: 44,
              minHeight: 44,
            },
            '&:hover': {
              transform: 'scale(1.04)',
            },
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          outlined: {
            borderColor: alpha('#0f172a', 0.08),
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${alpha('#0f172a', 0.07)}`,
            boxShadow: `0 1px 2px ${alpha('#0f172a', 0.04)}, 0 4px 12px ${alpha('#0f172a', 0.04)}`,
            transition: 'box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease',
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${alpha('#0f172a', 0.08)}`,
            boxShadow: `0 1px 3px ${alpha('#0f172a', 0.04)}`,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#64748b',
              borderBottom: `1px solid ${alpha('#0f172a', 0.08)}`,
              bgcolor: alpha('#f8fafc', 0.98),
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.15s ease',
            '&:hover': {
              bgcolor: alpha('#f1f5f9', 0.65),
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
          },
        },
      },
    },
  },
  plPL,
);

export default theme;
