import PatternCard from "./PatternCard.jsx";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { requestJson } from "./api.js";
import PatternProblems from "./PatternProblems.jsx";
import PracticeStrength from "./PracticeStrength.jsx";
import ArcadeIcon from "./ArcadeIcon.jsx";

export default function Overview({ version }) {
  const [result, setResult] = useState(null),
    [retry, setRetry] = useState(0),
    [selected, setSelected] = useState(null);
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [expanded, setExpanded] = useState(true);
  const desktop = useMediaQuery("(min-width:1200px)");
  const searchRef = useRef(null),
    detailRef = useRef(null);
  const [notice, setNotice] = useState(false);
  useEffect(() => {
    if (desktop && selected) detailRef.current?.focus({ preventScroll: true });
  }, [desktop, selected]);
  useEffect(() => {
    const controller = new AbortController();
    requestJson("/retention", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ error: error.message });
      });
    return () => controller.abort();
  }, [version, retry]);
  useEffect(() => {
    const timer = setInterval(() => setRetry((v) => v + 1), 60000);
    return () => clearInterval(timer);
  }, []);
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
  const groups = result?.data?.categories || [];
  const visibleGroups = groups.filter((c) => c.slug !== "other" || c.count > 0);
  const panel = groups.find((c) => c.slug === selected);
  const units = groups.flatMap((c) =>
    c.children.map((u) => ({ ...u, name: c.name + " · " + u.name })),
  );
  const matching = visibleGroups.filter(
    (c) =>
      (c.name + " " + c.children.map((u) => u.name).join(" "))
        .toLowerCase()
        .includes(query.toLowerCase().trim()) &&
      (filter === "all" ||
        (filter === "experienced"
          ? c.children.some((u) => u.experienced)
          : !c.children.some((u) => u.experienced))),
  );
  const spotlight = panel || visibleGroups.find((c) => c.attention);
  const spotlightUnit = spotlight?.children.find(
    (u) => u.slug === spotlight.attention,
  );
  const details = panel && (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="start">
        <Box>
          <Typography variant="overline" color="primary">
            PATTERN EXPLORER
          </Typography>
          <Typography component="h2" variant="h5">
            {panel.name}
          </Typography>
        </Box>
        <IconButton
          aria-label="Close pattern details"
          onClick={() => setSelected(null)}
        >
          <ArcadeIcon name="close" />
        </IconButton>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Each approach builds its own foundation. Open a subpattern to explore
        problems, notes, and practice history.
      </Typography>
      {panel.children.map((unit, i) => (
        <Paper
          variant="outlined"
          key={unit.slug}
          sx={{ p: 2, bgcolor: "#111821" }}
        >
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" gap={1}>
              <Typography component="h3" fontWeight={650}>
                {unit.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontFamily: "monospace" }}
              >
                {String(i + 1).padStart(2, "0")}
              </Typography>
            </Stack>
            <PracticeStrength unit={unit} />
            <PatternProblems
              unit={unit.slug}
              units={units}
              version={retry + version}
              onSaved={() => {
                setRetry((v) => v + 1);
                setNotice(true);
              }}
            />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
  return (
    <Box sx={{ display: "flex", alignItems: "stretch" }}>
      <Box
        component="nav"
        aria-label="Pattern navigation"
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          width: expanded ? 210 : 72,
          flexShrink: 0,
          borderRight: 1,
          borderColor: "divider",
          p: expanded ? 2 : 1,
          transition: "width 200ms ease",
          minHeight: "calc(100vh - 72px)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={expanded ? "space-between" : "center"}
          sx={{ mb: 2 }}
        >
          {expanded && (
            <Typography variant="overline" color="text.secondary">
              WORKSPACE
            </Typography>
          )}
          <IconButton
            size="small"
            aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
            onClick={() => setExpanded((v) => !v)}
          >
            <ArcadeIcon name="menu" fontSize="small" />
          </IconButton>
        </Stack>
        <Tooltip title={expanded ? "" : "All patterns"} placement="right">
          <Button
            startIcon={
              expanded ? <ArcadeIcon name="grid" fontSize="small" /> : undefined
            }
            onClick={() => {
              setSelected(null);
              setQuery("");
              setFilter("all");
            }}
            sx={{
              justifyContent: expanded ? "flex-start" : "center",
              minWidth: 0,
              bgcolor: "#5ee6a810",
              mb: 3,
            }}
          >
            {expanded ? "Pattern overview" : <ArcadeIcon name="grid" />}
          </Button>
        </Tooltip>
        {expanded && (
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ px: 1, mb: 1 }}
          >
            YOUR PATTERNS
          </Typography>
        )}
        <Stack spacing={0.5}>
          {visibleGroups.map((c) => (
            <Tooltip
              key={c.slug}
              title={expanded ? "" : c.name}
              placement="right"
            >
              <Button
                onClick={() => setSelected(c.slug)}
                aria-pressed={selected === c.slug}
                sx={{
                  color:
                    selected === c.slug ? "primary.main" : "text.secondary",
                  bgcolor: selected === c.slug ? "#5ee6a80d" : "transparent",
                  justifyContent: expanded ? "flex-start" : "center",
                  fontSize: 12,
                  minWidth: 0,
                  px: 1,
                  py: 1,
                }}
              >
                {expanded ? (
                  c.name
                ) : (
                  <ArcadeIcon
                    name={/graph|tree/i.test(c.name) ? "branch" : "code"}
                    fontSize="small"
                  />
                )}
              </Button>
            </Tooltip>
          ))}
        </Stack>
        {expanded && (
          <Box sx={{ mt: "auto", pt: 5, px: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  bgcolor: "primary.main",
                  borderRadius: "50%",
                }}
              />
              <Typography variant="caption">Local workspace</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Your pace. Your next move.
            </Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ p: { xs: 2, sm: 3, lg: 4 }, flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="overline" color="primary">
              BUILD. PRACTICE. RECALL.
            </Typography>
            <Typography
              component="h1"
              variant="h4"
              sx={{ fontSize: { xs: 28, md: 34 }, mt: 0.5 }}
            >
              Your practice arena
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              A clearer view of your foundation. You choose the next move.
            </Typography>
          </Box>
          <Box
            sx={{
              display: { xs: "none", sm: "grid" },
              placeItems: "center",
              width: 48,
              height: 48,
              border: "1px solid #3e4738",
              borderRadius: 3,
              color: "secondary.main",
              transform: "rotate(-6deg)",
            }}
          >
            <ArcadeIcon name="bolt" />
          </Box>
        </Stack>
        {result?.error ? (
          <Alert
            severity="error"
            action={
              <Button onClick={() => setRetry((v) => v + 1)}>Retry</Button>
            }
          >
            {result.error}
          </Alert>
        ) : !result?.data ? (
          <Stack spacing={2} role="status" aria-label="Loading patterns">
            <Skeleton variant="rounded" height={160} />
            <Skeleton variant="rounded" height={240} />
          </Stack>
        ) : (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns:
                  desktop && panel
                    ? "minmax(0,1fr) minmax(350px,420px)"
                    : "minmax(0,1fr)",
                gap: 3,
                alignItems: "start",
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 2, sm: 3 },
                    mb: 3,
                    position: "relative",
                    overflow: "hidden",
                    borderColor: "#35483f",
                    background:
                      "linear-gradient(110deg, #1b302a 0%, #161d27 78%)",
                  }}
                >
                  <Stack direction="row" spacing={2.5} alignItems="center">
                    {spotlightUnit && (
                      <Box sx={{ display: { xs: "none", sm: "block" } }}>
                        <PracticeStrength unit={spotlightUnit} ring />
                      </Box>
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="overline" color="primary">
                        {panel ? "IN FOCUS" : "LOWEST PRACTICE FOUNDATION"}
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 0.5 }}>
                        {spotlightUnit
                          ? spotlightUnit.name
                          : "Every pattern starts somewhere."}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {spotlightUnit
                          ? spotlight.name + " · " + spotlightUnit.reason
                          : "Record practice on LeetCode or import your existing experience."}
                      </Typography>
                      {spotlight && (
                        <Button
                          size="small"
                          endIcon={<ArcadeIcon name="arrow" fontSize="small" />}
                          onClick={() => setSelected(spotlight.slug)}
                          sx={{ mt: 1, ml: -1 }}
                        >
                          Explore pattern
                        </Button>
                      )}
                    </Box>
                  </Stack>
                </Paper>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  gap={1.5}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", sm: "center" }}
                  sx={{ mb: 2 }}
                >
                  <Typography component="h2" variant="h6">
                    Pattern map
                  </Typography>
                  <TextField
                    inputRef={searchRef}
                    size="small"
                    placeholder="Search patterns…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
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
                    sx={{ width: { xs: "100%", sm: 240 } }}
                  />
                </Stack>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mb: 2.5, flexWrap: "wrap", gap: 0.5 }}
                >
                  {[
                    ["all", "All patterns"],
                    ["experienced", "Experienced"],
                    ["gaps", "Coverage gaps"],
                  ].map(([value, label]) => (
                    <Chip
                      key={value}
                      label={label}
                      onClick={() => setFilter(value)}
                      aria-pressed={filter === value}
                      variant={filter === value ? "filled" : "outlined"}
                      sx={{
                        bgcolor: filter === value ? "#5ee6a820" : undefined,
                        color:
                          filter === value ? "primary.main" : "text.secondary",
                      }}
                    />
                  ))}
                </Stack>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2,minmax(0,1fr))",
                      xl: panel
                        ? "repeat(2,minmax(0,1fr))"
                        : "repeat(3,minmax(0,1fr))",
                    },
                    gap: 2,
                  }}
                >
                  {matching.map((c, i) => (
                    <PatternCard
                      key={c.slug}
                      category={c}
                      index={i}
                      selected={selected === c.slug}
                      onSelect={() => setSelected(c.slug)}
                    />
                  ))}
                </Box>
                {!matching.length && (
                  <Paper variant="outlined" sx={{ textAlign: "center", p: 5 }}>
                    <ArcadeIcon
                      name="search"
                      sx={{ color: "text.secondary", mb: 1 }}
                    />
                    <Typography>No matching patterns</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Try another name or show all patterns.
                    </Typography>
                    <Button
                      onClick={() => {
                        setQuery("");
                        setFilter("all");
                      }}
                      sx={{ mt: 1 }}
                    >
                      Clear filters
                    </Button>
                  </Paper>
                )}
              </Box>
              {desktop && panel && (
                <Paper
                  component="aside"
                  key={panel.slug}
                  ref={detailRef}
                  tabIndex={-1}
                  aria-label={panel.name + " details"}
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    position: "sticky",
                    top: 20,
                    maxHeight: "calc(100vh - 40px)",
                    overflow: "auto",
                  }}
                >
                  {details}
                </Paper>
              )}
            </Box>
            <Drawer
              anchor="right"
              open={!desktop && Boolean(panel)}
              onClose={() => setSelected(null)}
              slotProps={{
                paper: {
                  sx: {
                    width: { xs: "100%", sm: 500 },
                    p: 2.5,
                    boxSizing: "border-box",
                  },
                },
              }}
            >
              {details}
            </Drawer>
          </>
        )}
        <Box
          component="footer"
          sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: "divider" }}
        >
          <Typography variant="caption" color="text.secondary">
            Practice strength estimates experience and recency, not mastery.
            Recency fades; your experience stays.
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            Record on LeetCode. Import and retry options live in extension
            Settings.
          </Typography>
        </Box>
        <Snackbar
          open={notice}
          autoHideDuration={3500}
          onClose={() => setNotice(false)}
          message="History updated. Practice strength refreshed."
        />
      </Box>
    </Box>
  );
}
