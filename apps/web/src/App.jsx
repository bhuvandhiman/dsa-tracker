import { useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import Overview from "./Overview.jsx";
import ArcadeIcon from "./ArcadeIcon.jsx";
export default function App() {
  const [version, setVersion] = useState(0);
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
            recall<span style={{ color: "#5ee6a8" }}>.</span>
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
        <Button
          size="small"
          startIcon={<ArcadeIcon name="refresh" fontSize="small" />}
          onClick={() => setVersion((v) => v + 1)}
        >
          Refresh
        </Button>
      </Box>
      <Box component="main" sx={{ maxWidth: 1800, mx: "auto" }}>
        <Overview version={version} />
      </Box>
    </Box>
  );
}
