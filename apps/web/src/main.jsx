import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import App from "./App.jsx";
import theme from "./theme.js";
import ErrorBoundary from './ErrorBoundary.jsx';
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary><App /></ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);
