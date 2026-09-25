import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, InputAdornment, Link, List,
  ListItemButton, ListItemText, Radio, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { requestJson } from "./api.js";
import ArcadeIcon from "./ArcadeIcon.jsx";

function relativePractice(value) {
  if (!value) return "Unknown";
  const days = Math.floor(Math.max(0, Date.now() - new Date(value).getTime()) / 86400000);
  if (days === 0) return "Today";
  return days === 1 ? "1 day ago" : days + " days ago";
}
function difficultyColor(value) {
  if (value?.toLowerCase() === "easy") return "success";
  if (value?.toLowerCase() === "hard") return "error";
  return "warning";
}
function historyLabel(item) {
  if (item.imported) return "Imported accepted solve";
  if (item.assistance === "independent") return "On my own";
  if (item.assistance === "hint") return "With hints";
  if (item.assistance === "solution") return "Read the solution";
  return "Practice recorded";
}
function historyDate(value) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function PlacementDialog({ problem, onClose, onSaved }) {
  const [choice, setChoice] = useState(problem.placement.unit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setSaving(true); setError("");
    try {
      await requestJson("/problems/" + problem.id + "/placement", { method: "PUT", body: { unit: choice } });
      onSaved(); onClose();
    } catch (caught) { setError(caught.message); }
    finally { setSaving(false); }
  }
  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Choose the primary pattern</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          These are the approaches supported by this problem&apos;s LeetCode topics.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <List disablePadding aria-label={"Pattern choices for " + problem.title}>
          {problem.candidates.map((item) => (
            <ListItemButton key={item.unit} selected={choice === item.unit} onClick={() => setChoice(item.unit)} sx={{ borderRadius: 1.5, mb: 0.5 }}>
              <Radio checked={choice === item.unit} tabIndex={-1} disableRipple />
              <ListItemText primary={item.name} secondary={item.categoryName === item.name ? undefined : item.categoryName} />
              {item.source === "curated" && <Chip size="small" label="Exact match" color="success" variant="outlined" />}
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} disabled={saving || !choice} variant="contained">
          {saving ? <CircularProgress size={18} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ProblemRow({ problem, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState("");
  const canEdit = problem.candidates?.length > 0;
  useEffect(() => {
    if (!historyOpen || history) return undefined;
    const controller = new AbortController();
    requestJson("/problems/" + problem.id + "/history?limit=6&offset=0", { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) { setHistory(data); setHistoryError(""); } })
      .catch((caught) => { if (!controller.signal.aborted) setHistoryError(caught.message); });
    return () => controller.abort();
  }, [historyOpen, history, problem.id]);
  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
      <Box sx={{
        display: "grid", gridTemplateColumns: { xs: "1fr auto", sm: "minmax(0, 1fr) 132px 112px 76px" },
        alignItems: "center", gap: { xs: 1, sm: 2 }, px: { xs: 1.5, sm: 2 }, py: 1.5,
        "&:hover": { bgcolor: "#17202a" }, transition: "background-color 160ms ease",
      }}>
        <Link href={problem.url} target="_blank" rel="noreferrer" underline="hover"
          sx={{ minWidth: 0, fontWeight: 650, color: "text.primary", overflowWrap: "anywhere" }}>
          {problem.title} ↗
        </Link>
        <Chip label={problem.difficulty || "Unknown"} size="small"
          color={problem.difficulty ? difficultyColor(problem.difficulty) : "default"} variant="outlined"
          sx={{ display: { xs: "none", sm: "inline-flex" }, justifySelf: "start" }} />
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
          {relativePractice(problem.lastPracticedAt)}
        </Typography>
        <Stack direction="row" justifyContent="flex-end">
          <Tooltip title="Show solve history">
            <IconButton size="small" onClick={() => setHistoryOpen((value) => !value)}
              aria-label={(historyOpen ? "Hide" : "Show") + " solve history for " + problem.title}
              aria-expanded={historyOpen}>
              <ArcadeIcon name="history" sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={canEdit ? "Change primary pattern" : "No supported pattern candidates"}>
            <span><IconButton size="small" disabled={!canEdit} onClick={() => setEditing(true)}
              aria-label={"Edit pattern for " + problem.title}><ArcadeIcon name="edit" sx={{ fontSize: 18 }} /></IconButton></span>
          </Tooltip>
        </Stack>
        <Stack direction="row" gap={1} alignItems="center" sx={{ display: { xs: "flex", sm: "none" }, gridColumn: "1 / -1" }}>
          <Chip label={problem.difficulty || "Unknown"} size="small"
            color={problem.difficulty ? difficultyColor(problem.difficulty) : "default"} variant="outlined" />
          <Typography variant="caption" color="text.secondary">Last practiced: {relativePractice(problem.lastPracticedAt)}</Typography>
        </Stack>
      </Box>
      <Collapse in={historyOpen}>
        <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5, bgcolor: "#0d141d", borderTop: 1, borderColor: "divider" }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>Solve history</Typography>
          {historyError && <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.75 }}>{historyError}</Typography>}
          {!history && !historyError && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>Loading history…</Typography>}
          {history && (
            <Stack spacing={0.8} sx={{ mt: 1 }}>
              {history.attempts.map((item) => (
                <Stack key={item.id} direction="row" justifyContent="space-between" gap={2} alignItems="baseline">
                  <Typography variant="caption" color="text.secondary">{historyDate(item.attemptedAt)}</Typography>
                  <Typography variant="caption" sx={{ textAlign: "right" }}>{historyLabel(item)}</Typography>
                </Stack>
              ))}
              {history.legacy && (
                <Stack direction="row" justifyContent="space-between" gap={2} alignItems="baseline">
                  <Typography variant="caption" color="text.secondary">Date unavailable</Typography>
                  <Typography variant="caption">Legacy accepted status</Typography>
                </Stack>
              )}
              {!history.attempts.length && !history.legacy && <Typography variant="caption" color="text.secondary">No solve history recorded.</Typography>}
              {history.more && <Typography variant="caption" color="text.secondary">More earlier records exist.</Typography>}
            </Stack>
          )}
        </Box>
      </Collapse>
      {editing && <PlacementDialog problem={problem} onClose={() => setEditing(false)} onSaved={onSaved} />}
    </Box>
  );
}

export default function PatternProblems({ unit, name, onSaved, version }) {
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      requestJson("/pattern-problems?category=" + encodeURIComponent(unit) + "&q=" + encodeURIComponent(query) + "&limit=10&offset=" + page * 10, { signal: controller.signal })
        .then((data) => { if (!controller.signal.aborted) { setResult(data); setError(""); } })
        .catch((caught) => { if (!controller.signal.aborted) setError(caught.message); });
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [unit, page, version, query, retry]);
  function changePage(delta) { setResult(null); setError(""); setPage((value) => value + delta); }
  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={1.5}>
        <Box>
          <Typography component="h2" variant="h6">{name || "Problems"}</Typography>
          <Typography variant="caption" color="text.secondary">Open a problem on LeetCode or correct its primary pattern.</Typography>
        </Box>
        <TextField size="small" placeholder="Find a problem…" value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(0); setResult(null); setError(""); }}
          slotProps={{ htmlInput: { "aria-label": "Search problems in " + (name || unit), maxLength: 200 },
            input: { startAdornment: <InputAdornment position="start"><ArcadeIcon name="search" sx={{ fontSize: 16 }} /></InputAdornment> } }}
          sx={{ width: { xs: "100%", sm: 260 } }} />
      </Stack>
      {error && <Alert severity="error" action={<Button size="small" onClick={() => setRetry((value) => value + 1)}>Retry</Button>}>{error}</Alert>}
      {result ? (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden", bgcolor: "#111821" }}>
          <Box sx={{ display: { xs: "none", sm: "grid" }, gridTemplateColumns: "minmax(0, 1fr) 132px 112px 76px", gap: 2, px: 2, py: 1, borderBottom: 1, borderColor: "divider", bgcolor: "#151d27" }}>
            <Typography variant="overline" color="text.secondary">Problem</Typography>
            <Typography variant="overline" color="text.secondary">Difficulty</Typography>
            <Typography variant="overline" color="text.secondary">Last practiced</Typography><Box />
          </Box>
          {result.problems.map((problem) => <ProblemRow key={problem.id} problem={problem} onSaved={onSaved} />)}
          {!result.total && <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>{query ? "No matching problems." : "No problems in this pattern yet."}</Typography>}
        </Box>
      ) : <Typography role="status" variant="body2" color="text.secondary">{error ? "Problems unavailable." : "Loading problems…"}</Typography>}
      {result && (page > 0 || result.total > 10) && (
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Button size="small" disabled={!page} onClick={() => changePage(-1)}>Previous</Button>
          <Typography variant="caption">{page + 1} / {Math.ceil(result.total / 10)}</Typography>
          <Button size="small" disabled={(page + 1) * 10 >= result.total} onClick={() => changePage(1)}>Next</Button>
        </Stack>
      )}
    </Stack>
  );
}
