import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
const Overview=lazy(()=>import('./Overview.jsx'));
const WorkspaceSettings=lazy(()=>import('./WorkspaceSettings.jsx'));
import ArcadeIcon from "./ArcadeIcon.jsx";
export default function App() {
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q')?.slice(0,200)||'');
  const [settings,setSettings]=useState(false),[refreshing,setRefreshing]=useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    function focusSearch(event) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box
        component="header"
        sx={{
          px: { xs: 2, md: 4 },
          minHeight: 72,
          py: { xs: 2, sm: 0 },
          flexWrap: { xs: "wrap", sm: "nowrap" },
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          bgcolor: "background.default",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              width: 34,
              height: 34,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              borderRadius: "9px",
            }}
          >
            <ArcadeIcon name="code" fontSize="small" />
          </Box>
          <Typography
            sx={{ fontSize: 23, fontWeight: 800, letterSpacing: "-1px" }}
          >
            recall<span style={{ color: "#5b8cff" }}>.</span>
          </Typography>
          <Chip
            label="DEVELOPER ARCADE"
            variant="outlined"
            sx={{
              display: { xs: "none", md: "flex" },
              ml: "24px !important",
              letterSpacing: 1.5,
              color: "text.secondary",
              fontSize: 9,
            }}
          />
          <Button size="small" onClick={()=>setSettings(true)}>Settings</Button>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: { xs: "1 1 100%", sm: 1 }, minWidth: 0, justifyContent: "flex-end" }}>
          <TextField
            inputRef={searchRef}
            size="small"
            placeholder="Search patterns…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            slotProps={{
              htmlInput: { "aria-label": "Search patterns", maxLength:200 },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <ArcadeIcon name="search" sx={{ fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              width: { xs: "100%", sm: 200, md: 320 },
              minWidth: 0,
              "& .MuiOutlinedInput-root": { bgcolor: "#0f161f" },
            }}
          />
          <Button
            size="small"
            startIcon={<ArcadeIcon name="refresh" fontSize="small" />}
            onClick={() => setVersion((v) => v + 1)}
            disabled={refreshing}
            sx={{ flexShrink: 0 }}
          >
            {refreshing?'Refreshing…':'Refresh'}
          </Button>
        </Stack>
      </Box>
      <Box component="main" sx={{ maxWidth: 1800, mx: "auto" }}>
        <Suspense fallback={<Box role="status" sx={{p:3}}>Loading workspace…</Box>}><Overview version={version} query={query} setQuery={setQuery} onLoadingChange={setRefreshing} /></Suspense>
        {settings&&<Suspense fallback={<Box role="status" sx={{p:3}}>Loading settings…</Box>}><WorkspaceSettings onClose={()=>setSettings(false)} onChanged={()=>setVersion(v=>v+1)}/></Suspense>}
      </Box>
    </Box>
  );
}
