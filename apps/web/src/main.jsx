import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App.jsx';

const theme = createTheme({
  palette: { primary: { main: '#175f55' }, background: { default: '#f5f6f3', paper: '#ffffff' }, text: { primary: '#20332f', secondary: '#64736f' } },
  typography: { fontFamily: 'Inter, system-ui, -apple-system, sans-serif', h4: { fontWeight: 700 }, h6: { fontWeight: 650 }, button: { textTransform: 'none' } },
  shape: { borderRadius: 12 },
  components: { MuiPaper: { defaultProps: { elevation: 0 } }, MuiButton: { defaultProps: { disableElevation: true } } },
});

createRoot(document.getElementById('root')).render(
  <StrictMode><ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider></StrictMode>,
);
