import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Collapse,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { requestJson } from "./api.js";
import PatternCard from "./PatternCard.jsx";
const PatternProblems=lazy(()=>import('./PatternProblems.jsx'));
const PracticeInsights=lazy(()=>import('./PracticeInsights.jsx'));
import PracticeStrength from "./PracticeStrength.jsx";
import { GoalCoverage, GoalSetup } from "./GoalCoverage.jsx";
import ArcadeIcon from "./ArcadeIcon.jsx";
import DashboardView from "./DashboardView.jsx";
import { dashboardSections, highlightReason, orderPatterns, readDashboardView, VIEW_STORAGE_KEY } from "./dashboard-view.js";

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
        <Box sx={{ position: "sticky", top: 16, maxHeight: "calc(100vh - 32px)", overflowY: "auto", p: 2.5 }}>
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
        <Box sx={{ position: "sticky", top: 16, maxHeight: "calc(100vh - 32px)", overflowY: "auto", p: 2.5 }}>
          {goalSidebar}
        </Box>
      </Box>
    </Box>
  );
}

export default function Overview({ version, query, setQuery, onLoadingChange }) {
  const [view, setView] = useState(() => {
    try { return readDashboardView(window.localStorage); } catch { return "coverage"; }
  });
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(() => new URLSearchParams(window.location.search).get('pattern'));
  const [selectedUnit, setSelectedUnit] = useState(() => new URLSearchParams(window.location.search).get('unit'));
  const [onboardingDismissed,setOnboardingDismissed]=useState(()=>{try{return localStorage.getItem('recall-onboarding-dismissed')==='true';}catch{return false;}});
  const [notice, setNotice] = useState(false);
  const [goalDraft, setGoalDraft] = useState(null);
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalError, setGoalError] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const titleRef = useRef(null);
  const returnPosition=useRef({top:0,slug:null});
  const hasData=Boolean(result?.data);

  function navigate(pattern,unit=null) {
    const params=new URLSearchParams(window.location.search);
    if(pattern)params.set('pattern',pattern);else params.delete('pattern');
    if(unit)params.set('unit',unit);else params.delete('unit');
    params.delete('q');
    window.history.pushState({},'',`${window.location.pathname}${params.size?'?'+params:''}`);
    setSelected(pattern);setSelectedUnit(unit);setQuery('');
  }

  useEffect(()=>{
    function pop(){const params=new URLSearchParams(window.location.search);setSelected(params.get('pattern'));setSelectedUnit(params.get('unit'));setQuery(params.get('q')?.slice(0,200)||'');}
    window.addEventListener('popstate',pop);return ()=>window.removeEventListener('popstate',pop);
  },[setQuery]);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(query)params.set('q',query);else params.delete('q');
    window.history.replaceState(window.history.state,'',`${window.location.pathname}${params.size?'?'+params:''}`);
  },[query]);

  function changeView(next) {
    setView(next);
    try { window.localStorage.setItem(VIEW_STORAGE_KEY, next); } catch { /* The current view still works when storage is unavailable. */ }
  }

  useEffect(() => {
    const controller = new AbortController();
    onLoadingChange?.(true);
    requestJson("/retention", { signal: controller.signal })
      .then((data) => {
        if(!Array.isArray(data?.categories)||!data.goal||data.categories.some(category=>!category?.summary||!Array.isArray(category.children)||typeof category.slug!=='string'||category.children.some(unit=>!unit||typeof unit.slug!=='string')))throw new Error('The server returned incomplete pattern data. Retry to recover.');
        if (!controller.signal.aborted) setResult({ data,updatedAt:new Date().toISOString() });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult(previous=>({ ...previous,error:error.message }));
      }).finally(()=>{if(!controller.signal.aborted)onLoadingChange?.(false);});
    return () => controller.abort();
  }, [version, retry,onLoadingChange]);

  useEffect(() => {
    function refresh(){if(document.visibilityState==='visible')setRetry(value=>value+1);}
    const timer = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange',refresh);
    return () => {clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
  }, []);

  useEffect(() => {
    if (selected) {
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? "auto" : "smooth" });
      titleRef.current?.focus({ preventScroll: true });
    } else if(returnPosition.current.slug) {
      const frame=requestAnimationFrame(()=>{document.getElementById(`pattern-${returnPosition.current.slug}`)?.focus({preventScroll:true});window.scrollTo({top:returnPosition.current.top,behavior:'auto'});});
      return ()=>cancelAnimationFrame(frame);
    }
  }, [selected,hasData]);

  if (result?.error && !result.data) {
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

  const groups = orderPatterns(result.data.categories, view).map(category => ({ ...category, children: orderPatterns(category.children, view) }));
  const visibleGroups = groups.filter((category) => category.slug !== "other" || category.count > 0);
  const sidebarGroups = [...visibleGroups].sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
  );
  const panel = groups.find((category) => category.slug === selected);
  const sections = dashboardSections(visibleGroups, view, query);
  const matching = sections.flatMap(section => section.items);
  const highlightedSlugs = new Set(query.trim() ? [] : matching.filter(category => highlightReason(category, view)).slice(0, 2).map(category => category.slug));
  const viewControl = <DashboardView view={view} onChange={changeView} configured={result.data.goal.configured} />;
  const syncStatus=<Box sx={{mb:2}}>{result.error&&<Alert severity="warning" action={<Button onClick={()=>setRetry(v=>v+1)}>Retry</Button>}>Showing saved data. {result.error}</Alert>}<Typography variant="caption" color="text.secondary">Last updated {new Intl.DateTimeFormat(undefined,{timeZone:result.data.timeZone,hour:'2-digit',minute:'2-digit'}).format(new Date(result.updatedAt))} · {result.data.timeZone}</Typography></Box>;

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
    if(!selected)returnPosition.current={top:window.scrollY,slug};
    navigate(slug);
  }

  const patternSidebar = (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ px: 0.75, display: "block", mb: 1 }}>
        PATTERNS
      </Typography>
      <Stack spacing={0.25}>
        {sidebarGroups.map((category) => {
          const active = category.slug === selected;
          const hasSubpatterns = category.children.length > 1;
          return (
            <Box key={category.slug}>
              <ButtonBase
                onClick={() => selectPattern(category.slug)}
                aria-current={active ? "page" : undefined}
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
                  {category.slug === "other" ? "Other" : category.name}
                </Typography>
              </ButtonBase>

              <Collapse in={active && hasSubpatterns} timeout={180} unmountOnExit>
                <Stack spacing={0.1} sx={{ mt: 0.35, mb: 0.6, pl: 1.25, borderLeft: 1, borderColor: "divider" }}>
                  {category.children.map((unit) => {
                    const unitActive = unit.slug === selectedUnit;
                    return (
                      <ButtonBase
                        key={unit.slug}
                        onClick={() => navigate(selected,unit.slug)}
                        aria-pressed={unitActive}
                        sx={{
                          width: "100%",
                          justifyContent: "flex-start",
                          textAlign: "left",
                          px: 1,
                          py: 0.55,
                          borderRadius: 1,
                          color: unitActive ? "primary.main" : "text.secondary",
                          bgcolor: unitActive ? "rgba(91, 140, 255, 0.08)" : "transparent",
                          "&:hover": { bgcolor: "#141c27", color: "text.primary" },
                        }}
                      >
                        <Typography variant="caption" fontWeight={unitActive ? 700 : 500} noWrap>
                          {unit.name}
                        </Typography>
                      </ButtonBase>
                    );
                  })}
                </Stack>
              </Collapse>
            </Box>
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
        Goal Coverage credits solves within each subpattern and difficulty quota. Surplus in one quota cannot fill another.
      </Typography>
      <Button size="small" variant="outlined" fullWidth onClick={() => { setGoalDraft(result.data.goal); setEditingGoal(true); }} sx={{ mt: 2 }}>
        Edit goal
      </Button>
    </Box>
  );

  const inlineGoal = result.data.goal.configured && !editingGoal ? (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} gap={2}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" color="primary">YOUR COVERAGE GOAL</Typography>
          <Typography variant="body2" fontWeight={700}>{result.data.goal.profileName} · {result.data.goal.target} problems</Typography>
        </Box>
        <GoalCoverage goal={result.data.goal} compact />
        <Button size="small" variant="outlined" onClick={() => { setGoalDraft(result.data.goal); setEditingGoal(true); }}>Edit goal</Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.25 }}>Solves are credited within each subpattern and difficulty quota. Surplus cannot fill a different quota.</Typography>
    </Paper>
  ) : goalSidebar;

  if (panel && !query.trim()) {
    const focusUnit = panel.summary;
    const hasSubpatterns = panel.children.length > 1;
    const activeUnit = selectedUnit ? panel.children.find((unit) => unit.slug === selectedUnit) : null;
    return (
      <DesktopShell patternSidebar={patternSidebar} goalSidebar={goalSidebar}>
      <Box>
        <Button startIcon={<ArcadeIcon name="arrow" sx={{ transform: "rotate(180deg)" }} />} onClick={() => navigate(null)} sx={{ mb: 3, ml: -1 }}>
          All patterns
        </Button>
        {viewControl}
        {syncStatus}
        <Box sx={{ display: { xs: "block", xl: "none" }, mb: 3 }}>{inlineGoal}</Box>
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
              <Typography variant="caption" color="text.secondary">
                {view === "coverage" ? result.data.goal.configured ? "Largest remaining goal gaps first." : "Shown in pattern order until a goal is set." : "Dated practice first, ordered by Practice Strength. Unknown dates and unpracticed subpatterns follow."}
              </Typography>
            </Box>
            {panel.children.map((unit) => {
              const active = unit.slug === activeUnit?.slug;
              return (
                <Paper key={unit.slug} variant="outlined" sx={{ overflow: "hidden", borderColor: active ? "primary.main" : "divider", bgcolor: active ? "#131d30" : "#111821" }}>
                  <ButtonBase aria-expanded={active} aria-controls={active ? `details-${unit.slug}` : undefined} onClick={() => navigate(selected,selectedUnit===unit.slug?null:unit.slug)} sx={{ display: "block", width: "100%", p: { xs: 1.75, sm: 2.25 }, textAlign: "left" }}>
                    <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} gap={2}>
                      <Box sx={{ minWidth: { md: 180 } }}>
                        <Typography fontWeight={700}>{unit.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{view === "retention" && !unit.assessed ? unit.experienced ? "Previous solves · dates unavailable" : "Not yet practiced" : unit.reason}</Typography>
                      </Box>
                      <Box sx={{ flex: 1, order: view === "coverage" && unit.goal ? 3 : 2 }}><PracticeStrength unit={unit} compact /></Box>
                      <Box sx={{ minWidth: { md: 180 }, order: view === "coverage" && unit.goal ? 2 : 3 }}>
                        {unit.goal ? <GoalCoverage goal={unit.goal} compact /> : (
                          <Typography variant="caption" color="text.secondary">{unit.distinctSolved} solved</Typography>
                        )}
                      </Box>
                    </Stack>
                  </ButtonBase>
                  {active && (
                    <Box id={`details-${unit.slug}`} sx={{ p: { xs: 1.5, md: 2.5 }, pt: 0, borderTop: 1, borderColor: "divider", bgcolor: "#0f161f" }}>
                      <Suspense fallback={<Typography role="status">Loading pattern details…</Typography>}><Box sx={{ py: 2 }}>
                        <PracticeInsights unit={unit} asOf={result.data.asOf} timeZone={result.data.timeZone} />
                      </Box>
                      <PatternProblems key={unit.slug} unit={unit.slug} name={unit.name + " problems"} version={retry + version} onSaved={saved} />
                      </Suspense>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Stack>
        ) : (
          <Suspense fallback={<Typography role="status">Loading pattern details…</Typography>}><Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, bgcolor: "#0f161f" }}>
            <Box sx={{ mb: 2 }}>
              <PracticeInsights unit={panel.children[0]} asOf={result.data.asOf} timeZone={result.data.timeZone} />
            </Box>
            <PatternProblems key={panel.children[0].slug} unit={panel.children[0].slug} name={panel.name + " problems"} version={retry + version} onSaved={saved} />
          </Paper></Suspense>
        )}
        <Snackbar open={notice} autoHideDuration={3500} onClose={() => setNotice(false)} message="Primary pattern updated." />
      </Box>
      </DesktopShell>
    );
  }

  return (
    <DesktopShell patternSidebar={patternSidebar} goalSidebar={goalSidebar}>
    <Box>
      {viewControl}
      {syncStatus}
      {!onboardingDismissed && !visibleGroups.some(category=>category.summary.experienced) && <Alert severity="info" sx={{mb:3}} action={<Button onClick={()=>{setOnboardingDismissed(true);try{localStorage.setItem('recall-onboarding-dismissed','true');}catch{/* Session dismissal still works. */}}}>Dismiss</Button>}><Typography fontWeight={700}>Start recording your practice</Typography>1. Keep the local API running. 2. Load Recall from apps/extension in Chrome. 3. Import accepted problems in extension Settings or skip. 4. After a new Accepted submission, choose your approach and save practice.</Alert>}
      {selected && query.trim() && <Button onClick={()=>setQuery('')} sx={{mb:2}}>Return to {panel?.name||'selected pattern'}</Button>}
      <Box sx={{ display: { xs: "block", xl: "none" }, mb: 3 }}>{inlineGoal}</Box>

      <Stack spacing={4}>
        {sections.map(section => section.items.length > 0 && (
          <Box key={section.id}>
            <Typography component="h2" variant="h6" sx={{ mb: 0.5 }}>{section.title}</Typography>
            {section.description && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{section.description}</Typography>}
            <Stack spacing={2}>
              {section.items.map((category, index) => (
                <PatternCard key={category.slug} category={category} view={view} index={index} featured={highlightedSlugs.has(category.slug)} highlight={highlightedSlugs.has(category.slug) ? highlightReason(category, view) : null} onSelect={() => selectPattern(category.slug)} />
              ))}
            </Stack>
          </Box>
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
          {result.data.excluded?.total>0 && ` ${result.data.excluded.total} Database problems are preserved in imports and excluded from DSA coverage.`}
        </Typography>
      </Box>
      </Box>
      </DesktopShell>
  );
}


