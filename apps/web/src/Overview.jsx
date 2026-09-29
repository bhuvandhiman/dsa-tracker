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

function DesktopShell({ children, patternSidebar, goalSidebar }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "minmax(0, 1fr)", xl: "220px minmax(0, 1fr) 290px" },
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Box
        component="aside"
        sx={{
          display: { xs: "none", xl: "block" },
          minHeight: "100vh",
          borderRight: 1,
          borderColor: "divider",
          bgcolor: "#0b1118",
        }}
      >
        <Box sx={{ position: "sticky", top: 0, maxHeight: "100vh", overflowY: "auto", p: 2.5 }}>
          {patternSidebar}
        </Box>
      </Box>
      <Box sx={{ minWidth: 0, px: { xs: 2, sm: 4, xl: 4 }, py: { xs: 3, md: 5 } }}>
        <Box sx={{ width: "100%", maxWidth: 1100, mx: "auto" }}>{children}</Box>
      </Box>
      <Box
        component="aside"
        sx={{
          display: { xs: "none", xl: "block" },
          minHeight: "100vh",
          borderLeft: 1,
          borderColor: "divider",
          bgcolor: "#0b1118",
        }}
      >
        <Box sx={{ position: "sticky", top: 0, maxHeight: "100vh", overflowY: "auto", p: 2.5 }}>
          {goalSidebar}
        </Box>
      </Box>
    </Box>
  );
}

export default function Overview({ version }) {
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [query, setQuery] = useState("");
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
  const priorityHighlights = visibleGroups.slice(0, 2);
  const highlightedSlugs = new Set(priorityHighlights.map((category) => category.slug));
  const panel = groups.find((category) => category.slug === selected);
  const matching = visibleGroups.filter((category) => {
    if (highlightedSlugs.has(category.slug)) return false;
    const matchesQuery = (category.name + " " + category.children.map((unit) => unit.name).join(" "))
      .toLowerCase()
      .includes(query.toLowerCase().trim());
    return matchesQuery;
  });

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

  function selectPattern(slug) {
    setSelected(slug);
    setSelectedUnit(null);
  }

  const patternSidebar = (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ px: 0.75, display: "block", mb: 1 }}>
        PATTERNS
      </Typography>
      <Stack spacing={0.25}>
        {visibleGroups.map((category) => {
          const active = category.slug === selected;
          return (
            <ButtonBase
              key={category.slug}
              onClick={() => selectPattern(category.slug)}
              sx={{
                width: "100%",
                justifyContent: "flex-start",
                textAlign: "left",
                px: 1,
                py: 0.85,
                borderRadius: 1.5,
                color: active ? "primary.main" : "text.secondary",
                bgcolor: active ? "#15233a" : "transparent",
                "&:hover": { bgcolor: active ? "#15233a" : "#141c27", color: "text.primary" },
              }}
            >
              <Typography variant="body2" fontWeight={active ? 700 : 500} noWrap>
                {category.name}
              </Typography>
            </ButtonBase>
          );
        })}
      </Stack>
    </Box>
  );

  const goalSidebar = (!result.data.goal.configured || editingGoal) ? (
    <GoalSetup
      goal={goalDraft || result.data.goal}
      onSave={saveGoal}
      onCancel={result.data.goal.configured ? () => { setEditingGoal(false); setGoalDraft(null); setGoalError(""); } : null}
      saving={goalSaving}
      error={goalError}
      compact
    />
  ) : (
    <Box>
      <Typography variant="overline" color="primary">YOUR GOAL</Typography>
      <Typography fontWeight={700} sx={{ mt: 0.5 }}>{result.data.goal.profileName}</Typography>
      <Chip label={`${result.data.goal.target} problem goal`} variant="outlined" size="small" sx={{ mt: 1, mb: 2 }} />
      <GoalCoverage goal={result.data.goal} compact />
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
        Goal Coverage stays separate from Practice Strength. Easy surplus cannot cover Medium or Hard gaps.
      </Typography>
      <Button size="small" variant="outlined" fullWidth onClick={() => { setGoalDraft(result.data.goal); setEditingGoal(true); }} sx={{ mt: 2 }}>
        Edit goal
      </Button>
    </Box>
  );

  if (panel) {
    const focusUnit = panel.summary;
    const hasSubpatterns = panel.children.length > 1;
    const activeUnit = selectedUnit ? panel.children.find((unit) => unit.slug === selectedUnit) : null;
    return (
      <DesktopShell patternSidebar={patternSidebar} goalSidebar={goalSidebar}>
      <Box>
        <Button startIcon={<ArcadeIcon name="arrow" sx={{ transform: "rotate(180deg)" }} />} onClick={() => { setSelected(null); setSelectedUnit(null); }} sx={{ mb: 3, ml: -1 }}>
          All patterns
        </Button>
        <Box sx={{ display: { xs: "block", xl: "none" }, mb: 3 }}>{goalSidebar}</Box>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, mb: 3, borderColor: "#30476f", background: "linear-gradient(110deg, #15233a 0%, #161d27 78%)" }}>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="overline" color="primary">PATTERN DETAILS</Typography>
              <Typography ref={titleRef} tabIndex={-1} component="h1" variant="h4" sx={{ mt: 0.5 }}>{panel.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
                Each bar starts with the different problems you have solved here. Re-solving problems strengthens it, and recent practice gives it an extra boost.
              </Typography>
              <Box sx={{ mt: 2, maxWidth: 620 }}><PracticeStrength unit={focusUnit} /></Box>
            </Box>
            {panel.goal && <GoalCoverage goal={panel.goal} />}
          </Stack>
        </Paper>

        {hasSubpatterns ? (
          <Stack spacing={1.25} sx={{ mb: 3 }}>
            <Box>
              <Typography component="h2" variant="h6">Subpatterns</Typography>
              {result.data.goal.configured && (
                <Typography variant="caption" color="text.secondary">
                  Ordered by remaining {result.data.goal.profileName} goal gaps; weaker Practice Strength breaks ties.
                </Typography>
              )}
            </Box>
            {panel.children.map((unit) => {
              const active = unit.slug === activeUnit?.slug;
              return (
                <Paper key={unit.slug} variant="outlined" sx={{ overflow: "hidden", borderColor: active ? "primary.main" : "divider", bgcolor: active ? "#131d30" : "#111821" }}>
                  <ButtonBase onClick={() => setSelectedUnit((current) => current === unit.slug ? null : unit.slug)} sx={{ display: "block", width: "100%", p: { xs: 1.75, sm: 2.25 }, textAlign: "left" }}>
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
              <PracticeInsights unit={panel.children[0]} asOf={result.data.asOf} timeZone={result.data.timeZone} />
            </Box>
            <PatternProblems key={panel.children[0].slug} unit={panel.children[0].slug} name={panel.name + " problems"} version={retry + version} onSaved={saved} />
          </Paper>
        )}
        <Snackbar open={notice} autoHideDuration={3500} onClose={() => setNotice(false)} message="Primary pattern updated." />
      </Box>
      </DesktopShell>
    );
  }

  return (
    <DesktopShell patternSidebar={patternSidebar} goalSidebar={goalSidebar}>
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="overline" color="primary">BUILD. PRACTICE. RECALL.</Typography>
          <Typography component="h1" variant="h4" sx={{ fontSize: { xs: 28, md: 36 }, mt: 0.5 }}>Your practice arena</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Each bar uses the problems you have solved, repeat practice, and recency when dates are available.
          </Typography>
          {result.data.excluded?.database > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
              {result.data.excluded.database} SQL {result.data.excluded.database === 1 ? "problem is" : "problems are"} stored from LeetCode and excluded from DSA tracking.
            </Typography>
          )}
        </Box>
        <IconButton aria-label="Refresh practice strength" onClick={() => setRetry((value) => value + 1)} sx={{ display: { xs: "none", sm: "inline-flex" }, border: 1, borderColor: "divider" }}>
          <ArcadeIcon name="refresh" />
        </IconButton>
      </Stack>

      <Box sx={{ display: { xs: "block", xl: "none" }, mb: 3 }}>{goalSidebar}</Box>

      {priorityHighlights.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="overline" color="primary" sx={{ display: "block", mb: 1.25 }}>
            TOP PRIORITIES
          </Typography>
          <Stack spacing={1.75} sx={{ mx: { xs: 0, md: -2 } }}>
            {priorityHighlights.map((category, index) => (
              <PatternCard
                key={category.slug}
                category={category}
                index={index}
                featured
                onSelect={() => selectPattern(category.slug)}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} gap={2} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 2 }}>
        <Box>
          <Typography component="h2" variant="h6">Pattern map</Typography>
          <Typography variant="caption" color="text.secondary">
            {result.data.goal.configured
              ? `Ordered by ${result.data.goal.profileName} goal need, adjusted by Practice Strength.`
              : "Ordered from weakest foundation upward."}
          </Typography>
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

      <Stack spacing={2}>
        {matching.map((category, index) => (
          <PatternCard key={category.slug} category={category} index={index} onSelect={() => selectPattern(category.slug)} />
        ))}
      </Stack>
      {!matching.length && (
        <Paper variant="outlined" sx={{ textAlign: "center", p: 5 }}>
          <ArcadeIcon name="search" sx={{ color: "text.secondary", mb: 1 }} />
          <Typography>No matching patterns</Typography>
          <Typography variant="body2" color="text.secondary">Try another pattern name.</Typography>
          <Button onClick={() => setQuery("")} sx={{ mt: 1 }}>Clear search</Button>
        </Paper>
      )}

      <Box component="footer" sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary">
          Practice strength considers how many different problems you solved, whether you revisited them, and how recently you practiced.
          {result.data.goal.configured && " Goal Coverage compares distinct solved problems with your chosen target; exact quotas are Recall policy and difficulty buckets are counted independently."}
        </Typography>
      </Box>
      </Box>
      </DesktopShell>
  );
}


