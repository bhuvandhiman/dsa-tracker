import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Overview from "./Overview.jsx";
import ArcadeIcon from "./ArcadeIcon.jsx";
export default function App() {
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
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
          height: 72,
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
              display: { xs: "none", sm: "flex" },
              ml: "24px !important",
              letterSpacing: 1.5,
              color: "text.secondary",
              fontSize: 9,
            }}
          />
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, justifyContent: "flex-end" }}>
          <TextField
            inputRef={searchRef}
            size="small"
            placeholder="Search patterns…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            slotProps={{
              htmlInput: { "aria-label": "Search patterns" },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <ArcadeIcon name="search" sx={{ fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              width: { xs: 150, sm: 240, md: 320 },
              "& .MuiOutlinedInput-root": { bgcolor: "#0f161f" },
            }}
          />
          <Button
            size="small"
            startIcon={<ArcadeIcon name="refresh" fontSize="small" />}
            onClick={() => setVersion((v) => v + 1)}
          >
            Refresh
          </Button>
        </Stack>
      </Box>
      <Box component="main" sx={{ maxWidth: 1800, mx: "auto" }}>
        <Overview version={version} query={query} setQuery={setQuery} />
      </Box>
    </Box>
  );
}
