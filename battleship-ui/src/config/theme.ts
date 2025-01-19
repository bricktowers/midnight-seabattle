import { createTheme, alpha } from '@mui/material';

const greenColor = '#4DB378';

export const theme = createTheme({
  typography: {
    fontFamily: 'Noka, sans-serif',
    allVariants: {
      color: '#fefefe',
    },
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 300,
    },
  },
  palette: {
    primary: {
      main: greenColor,
      light: alpha(greenColor, 0.5),
      dark: alpha(greenColor, 0.9),
    },
    secondary: {
      main: '#0f2730',
      light: alpha('#0f2730', 0.5),
      dark: alpha('#0f2730', 0.9),
    },
    error: {
      main: '#d32f2f',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          '&.Mui-disabled': {
            backgroundColor: alpha('#ffffff', 0.12), // Adjust contrast for disabled background
            color: alpha('#ffffff', 0.5), // Adjust contrast for disabled text
          },
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          backgroundColor: 'cornsilk',
          color: greenColor,
          borderRadius: '8px',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          backgroundColor: 'cornsilk',
        },
      },
    },
  },
});
