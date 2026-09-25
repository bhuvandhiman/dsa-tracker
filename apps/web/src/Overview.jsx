import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
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
import PracticeInsights from "./PracticeInsights.jsx";
import PracticeStrength from "./PracticeStrength.jsx";
import { GoalCoverage, GoalSetup } from "./GoalCoverage.jsx";
import ArcadeIcon from "./ArcadeIcon.jsx";
import { matchesRetentionFilter } from "./retentionFilters.js";

export default function Overview({ version }) {
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState(false);
  const [goalDraft, setGoalDraft] = useState(null);
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalError, setGoalError] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
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
  const matching = visibleGroups.filter((category) => {
    const matchesQuery = (category.name + " " + category.children.map((unit) => unit.name).join(" "))
      .toLowerCase()
      .includes(query.toLowerCase().trim());
    const matchesGoal = filter !== "goal" || (category.goal?.deficit ?? 0) > 0;
    const matchesPractice = filter === "goal" || matchesRetentionFilter(category, filter, new Date(result.data.asOf).getTime());
    return matchesQuery && matchesGoal && matchesPractice;
  });
  const weakestCategory = visibleGroups.find((category) => category.priority !== null);
  const weakestUnit = weakestCategory?.summary;

  function saved() {
    setRetry((value) => value + 1);
    setNotice(true);
  }

  async function saveGoal(next) {
    if (next.preview) {
      setGoalDraft((current) => ({ ...(current || result.data.goal), profile: next.profile, target: next.target }));
      return;
    }
    setGoalSaving(true);
    setGoalError("");
    try {
      await requestJson("/goal", { method: "PUT", body: { profile: next.profile, target: next.target } });
      setGoalDraft(null);
      setEditingGoal(false);
      setRetry((value) => value + 1);
    } catch (error) {
      setGoalError(error.message);
    } finally {
      setGoalSaving(false);
    }
  }

  if (panel) {
    const focusUnit = panel.summary;
    const hasSubpatterns = panel.children.length > 1;
    const activeUnit = panel.children.find((unit) => unit.slug === selectedUnit) || panel.children[0];
    return (
      <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 3, md: 5 }, maxWidth: 1100, mx: "auto" }}>
        <Button startIcon={<ArcadeIcon name="arrow" sx={{ transform: "rotate(180deg)" }} />} onClick={() => { setSelected(null); setSelectedUnit(null); }} sx={{ mb: 3, ml: -1 }}>
          All patterns
        </Button>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, mb: 3, borderColor: "#30476f", background: "linear-gradient(110deg, #15233a 0%, #161d27 78%)" }}>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={3}>
            <PracticeStrength unit={focusUnit} ring />
            <Box sx={{ flex: 1 }}>
              <Typography variant="overline" color="primary">PATTERN DETAILS</Typography>
              <Typography ref={titleRef} tabIndex={-1} component="h1" variant="h4" sx={{ mt: 0.5 }}>{panel.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
                Each bar starts with the different problems you have solved here. Re-solving problems strengthens it, and recent practice gives it an extra boost.
              </Typography>
              {panel.goal && <Box sx={{ mt: 2, maxWidth: 620 }}><GoalCoverage goal={panel.goal} /></Box>}
            </Box>
          </Stack>
        </Paper>

        {hasSubpatterns ? (
          <Stack spacing={1.25} sx={{ mb: 3 }}>
            <Typography component="h2" variant="h6">Subpatterns</Typography>
            {panel.children.map((unit) => {
              const active = unit.slug === activeUnit.slug;
              return (
                <Paper key={unit.slug} variant="outlined" sx={{ overflow: "hidden", borderColor: active ? "primary.main" : "divider", bgcolor: active ? "#131d30" : "#111821" }}>
                  <ButtonBase onClick={() => setSelectedUnit(unit.slug)} sx={{ display: "block", width: "100%", p: { xs: 1.75, sm: 2.25 }, textAlign: "left" }}>
                    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} gap={2}>
                      <Box sx={{ minWidth: { sm: 210 } }}>
                        <Typography fontWeight={700}>{unit.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{unit.reason}</Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}><PracticeStrength unit={unit} compact /></Box>
                      <Box sx={{ minWidth: { sm: 210 } }}>
                        {unit.goal ? <GoalCoverage goal={unit.goal} compact /> : (
                          <Typography variant="caption" color="text.secondary">{unit.distinctSolved} solved</Typography>
                        )}
                      </Box>
                    </Stack>
                  </ButtonBase>
                  {active && (
                    <Box sx={{ p: { xs: 1.5, md: 2.5 }, pt: 0, borderTop: 1, borderColor: "divider", bgcolor: "#0f161f" }}>
                      <Box sx={{ py: 2 }}>
                        <PracticeInsights unit={unit} asOf={result.data.asOf} timeZone={result.data.timeZone} />
                      </Box>
                      <PatternProblems key={unit.slug} unit={unit.slug} name={unit.name + " problems"} version={retry + version} onSaved={saved} />
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Stack>
        ) : (
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, bgcolor: "#0f161f" }}>
            <Box sx={{ mb: 2 }}>
              <PracticeInsights unit={activeUnit} asOf={result.data.asOf} timeZone={result.data.timeZone} />
            </Box>
            <PatternProblems key={activeUnit.slug} unit={activeUnit.slug} name={panel.name + " problems"} version={retry + version} onSaved={saved} />
          </Paper>
        )}
        <Snackbar open={notice} autoHideDuration={3500} onClose={() => setNotice(false)} message="Primary pattern updated." />
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
            Each bar uses the problems you have solved, repeat practice, and recency when dates are available.
          </Typography>
        </Box>
        <IconButton aria-label="Refresh practice strength" onClick={() => setRetry((value) => value + 1)} sx={{ display: { xs: "none", sm: "inline-flex" }, border: 1, borderColor: "divider" }}>
          <ArcadeIcon name="refresh" />
        </IconButton>
      </Stack>

      {(!result.data.goal.configured || editingGoal) && (
        <GoalSetup
          goal={goalDraft || result.data.goal}
          onSave={saveGoal}
          onCancel={result.data.goal.configured ? () => { setEditingGoal(false); setGoalDraft(null); setGoalError(""); } : null}
          saving={goalSaving}
          error={goalError}
        />
      )}

      {result.data.goal.configured && !editingGoal && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "#0f161f" }}>
          <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ xs: "stretch", sm: "center" }}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                <Typography fontWeight={700}>{result.data.goal.profileName}</Typography>
                <Chip label={`${result.data.goal.target} problem goal`} variant="outlined" />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Goal Coverage is separate from Practice Strength. Easy surplus cannot cover Medium or Hard gaps.
              </Typography>
            </Box>
            <Box sx={{ minWidth: { sm: 280 } }}><GoalCoverage goal={result.data.goal} /></Box>
            <Button size="small" variant="outlined" onClick={() => { setGoalDraft(result.data.goal); setEditingGoal(true); }}>Edit goal</Button>
          </Stack>
        </Paper>
      )}

      {weakestUnit && (
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, mb: 4, borderColor: "#30476f", background: "linear-gradient(110deg, #15233a 0%, #161d27 78%)" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ xs: "flex-start", sm: "center" }}>
            <PracticeStrength unit={weakestUnit} ring />
            <Box sx={{ flex: 1 }}>
              <Typography variant="overline" color="primary">LOWEST PRACTICE FOUNDATION</Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>{weakestUnit.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{weakestCategory.name} · {weakestUnit.reason}</Typography>
            </Box>
            <Button endIcon={<ArcadeIcon name="arrow" />} onClick={() => { setSelected(weakestCategory.slug); setSelectedUnit(null); }}>View pattern</Button>
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
        {[
          ["all", "All patterns"],
          ["recent", "Practiced recently"],
          ["stale", "Not practiced recently"],
          ["legacy", "Mostly legacy data"],
          ["never", "Never practiced"],
          ...(result.data.goal.configured ? [["goal", "Goal gaps"]] : []),
        ].map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            variant={filter === value ? "filled" : "outlined"}
            sx={{ bgcolor: filter === value ? "#5b8cff20" : undefined, color: filter === value ? "primary.main" : "text.secondary" }}
          />
        ))}
      </Stack>

      <Stack spacing={2}>
        {matching.map((category, index) => (
          <PatternCard key={category.slug} category={category} index={index} onSelect={() => { setSelected(category.slug); setSelectedUnit(null); }} />
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
          Practice strength considers how many different problems you solved, whether you revisited them, and how recently you practiced.
          {result.data.goal.configured && " Goal Coverage compares distinct solved problems with your chosen target; exact quotas are Recall policy and difficulty buckets are counted independently."}
        </Typography>
      </Box>
    </Box>
  );
}


