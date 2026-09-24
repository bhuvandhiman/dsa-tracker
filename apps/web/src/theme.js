import { createTheme } from "@mui/material";
export default createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#5ee6a8", contrastText: "#09251b" },
    secondary: { main: "#f3b562" },
    background: { default: "#0d1117", paper: "#161d27" },
    text: { primary: "#edf3f7", secondary: "#9aa9ba" },
    divider: "#293442",
    success: { main: "#5ee6a8" },
    warning: { main: "#f3b562" },
    info: { main: "#70cde3" },
  },
  typography: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    h4: { fontWeight: 750, letterSpacing: "-1.2px" },
    h5: { fontWeight: 700, letterSpacing: "-.5px" },
    h6: { fontWeight: 650, fontSize: "1.05rem" },
    button: { textTransform: "none", fontWeight: 600 },
    body2: { lineHeight: 1.65 },
    overline: { letterSpacing: "1.8px", fontSize: ".65rem", fontWeight: 700 },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 9 } },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          "&.Mui-focusVisible": {
            outline: "2px solid #5ee6a8",
            outlineOffset: 3,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontSize: ".7rem", height: 25 },
      },
    },
    MuiDialog: { styleOverrides: { paper: { border: "1px solid #354254" } } },
    MuiCssBaseline: {
      styleOverrides: {
        body: { scrollbarColor: "#354254 #0d1117" },
        "*": { boxSizing: "border-box" },
        "::selection": { background: "#5ee6a840" },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animation: "none !important",
            transition: "none !important",
            scrollBehavior: "auto !important",
          },
        },
      },
    },
  },
});
