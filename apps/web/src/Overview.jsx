import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { requestJson } from "./api.js";
import PatternCard from "./PatternCard.jsx";
import PatternProblems from "./PatternProblems.jsx";
import PracticeStrength from "./PracticeStrength.jsx";
import ArcadeIcon from "./ArcadeIcon.jsx";

export default function Overview({ version }) {
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState(false);
  const searchRef = useRef(null);
  const titleRef = useRef(null);

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
    const timer = setInterval(() => setRetry((value) => value + 1), 60000);
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

  useEffect(() => {
    if (selected) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      titleRef.current?.focus({ preventScroll: true });
    }
  }, [selected]);

  if (result?.error) {
    return (
      <Box sx={{ p: { xs: 2, sm: 4 } }}>
        <Alert severity="error" action={<Button onClick={() => setRetry((value) => value + 1)}>Retry</Button>}>
          {result.error}
        </Alert>
      </Box>
    );
  }

  if (!result?.data) {
    return (
      <Stack spacing={2} sx={{ p: { xs: 2, sm: 4 }, maxWidth: 1100, mx: "auto" }} role="status" aria-label="Loading patterns">
        <Skeleton variant="rounded" height={150} />
        <Skeleton variant="rounded" height={140} />
        <Skeleton variant="rounded" height={140} />
      </Stack>
    );
  }

  const groups = result.data.categories;
  const visibleGroups = groups.filter((category) => category.slug !== "other" || category.count > 0);
  const panel = groups.find((category) => category.slug === selected);
  const units = groups.flatMap((category) =>
    category.children.map((unit) => ({ ...unit, name: category.name + " · " + unit.name })),
  );
  const matching = visibleGroups.filter((category) => {
    const matchesQuery = (category.name + " " + category.children.map((unit) => unit.name).join(" "))
      .toLowerCase()
      .includes(query.toLowerCase().trim());
    const hasExperience = category.children.some((unit) => unit.experienced);
    return matchesQuery && (filter === "all" || (filter === "experienced" ? hasExperience : !hasExperience));
  });
  const weakestCategory = visibleGroups.find((category) => category.priority !== null);
  const weakestUnit = weakestCategory?.summary;

  function saved() {
    setRetry((value) => value + 1);
    setNotice(true);
  }

  if (panel) {
    const focusUnit = panel.summary;
    return (
      <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 3, md: 5 }, maxWidth: 1100, mx: "auto" }}>
        <Button startIcon={<ArcadeIcon name="arrow" sx={{ transform: "rotate(180deg)" }} />} onClick={() => setSelected(null)} sx={{ mb: 3, ml: -1 }}>
          All patterns
        </Button>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, mb: 3, borderColor: "#35483f", background: "linear-gradient(110deg, #1b302a 0%, #161d27 78%)" }}>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={3}>
            <PracticeStrength unit={focusUnit} ring />
            <Box sx={{ flex: 1 }}>
              <Typography variant="overline" color="primary">PATTERN DETAILS</Typography>
              <Typography ref={titleRef} tabIndex={-1} component="h1" variant="h4" sx={{ mt: 0.5 }}>{panel.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
                Each approach has its own strength. Prior solves establish experience even when their dates are unknown; dated practice adds recency.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Stack spacing={2}>
          {panel.children.map((unit, index) => (
            <Paper variant="outlined" key={unit.slug} sx={{ p: { xs: 2, md: 3 }, bgcolor: "#111821" }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="start" gap={2}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">SUBPATTERN {String(index + 1).padStart(2, "0")}</Typography>
                    <Typography component="h2" variant="h6">{unit.name}</Typography>
                  </Box>
                  <Chip label={unit.reason} variant="outlined" sx={{ color: unit.assessed ? "secondary.main" : "text.secondary" }} />
                </Stack>
                <PracticeStrength unit={unit} />
                <PatternProblems unit={unit.slug} units={units} version={retry + version} onSaved={saved} />
              </Stack>
            </Paper>
          ))}
        </Stack>
        <Snackbar open={notice} autoHideDuration={3500} onClose={() => setNotice(false)} message="History updated. Practice strength refreshed." />
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 3, md: 5 }, maxWidth: 1100, mx: "auto" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="overline" color="primary">BUILD. PRACTICE. RECALL.</Typography>
          <Typography component="h1" variant="h4" sx={{ fontSize: { xs: 28, md: 36 }, mt: 0.5 }}>Your practice arena</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Every bar reflects your foundation. Dates improve the estimate; previous solves still count.
          </Typography>
        </Box>
        <IconButton aria-label="Refresh practice strength" onClick={() => setRetry((value) => value + 1)} sx={{ display: { xs: "none", sm: "inline-flex" }, border: 1, borderColor: "divider" }}>
          <ArcadeIcon name="refresh" />
        </IconButton>
      </Stack>

      {weakestUnit && (
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, mb: 4, borderColor: "#35483f", background: "linear-gradient(110deg, #1b302a 0%, #161d27 78%)" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ xs: "flex-start", sm: "center" }}>
            <PracticeStrength unit={weakestUnit} ring />
            <Box sx={{ flex: 1 }}>
              <Typography variant="overline" color="primary">LOWEST PRACTICE FOUNDATION</Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>{weakestUnit.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{weakestCategory.name} · {weakestUnit.reason}</Typography>
            </Box>
            <Button endIcon={<ArcadeIcon name="arrow" />} onClick={() => setSelected(weakestCategory.slug)}>View pattern</Button>
          </Stack>
        </Paper>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} gap={2} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 2 }}>
        <Box>
          <Typography component="h2" variant="h6">Pattern map</Typography>
          <Typography variant="caption" color="text.secondary">Ordered from weakest foundation upward.</Typography>
        </Box>
        <TextField
          inputRef={searchRef}
          size="small"
          placeholder="Search patterns…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          slotProps={{ htmlInput: { "aria-label": "Search patterns" }, input: { startAdornment: <InputAdornment position="start"><ArcadeIcon name="search" sx={{ fontSize: 18 }} /></InputAdornment> } }}
          sx={{ width: { xs: "100%", sm: 280 } }}
        />
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: "wrap", gap: 0.5 }}>
        {[["all", "All patterns"], ["experienced", "With solved problems"], ["gaps", "No solved problems"]].map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            variant={filter === value ? "filled" : "outlined"}
            sx={{ bgcolor: filter === value ? "#5ee6a820" : undefined, color: filter === value ? "primary.main" : "text.secondary" }}
          />
        ))}
      </Stack>

      <Stack spacing={2}>
        {matching.map((category, index) => (
          <PatternCard key={category.slug} category={category} index={index} onSelect={() => setSelected(category.slug)} />
        ))}
      </Stack>
      {!matching.length && (
        <Paper variant="outlined" sx={{ textAlign: "center", p: 5 }}>
          <ArcadeIcon name="search" sx={{ color: "text.secondary", mb: 1 }} />
          <Typography>No matching patterns</Typography>
          <Typography variant="body2" color="text.secondary">Try another name or show all patterns.</Typography>
          <Button onClick={() => { setQuery(""); setFilter("all"); }} sx={{ mt: 1 }}>Clear filters</Button>
        </Paper>
      )}

      <Box component="footer" sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary">
          Practice strength uses pattern-normalized problem coverage and reinforcement. When dates exist, recent practice also contributes and gradually fades.
        </Typography>
      </Box>
    </Box>
  );
}
