import { lazy, Suspense, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  InputAdornment,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { requestJson } from "./api.js";
const AttemptEditor = lazy(() => import("./AttemptEditor.jsx"));
import ArcadeIcon from "./ArcadeIcon.jsx";
import { assistanceLabels } from "./attempt-form.js";

function Problem({ problem, units, onSaved, version }) {
  const [open, setOpen] = useState(false),
    [result, setResult] = useState(null),
    [editing, setEditing] = useState(null),
    [page, setPage] = useState(0),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [moving, setMoving] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    requestJson(
      "/problems/" + problem.id + "/history?limit=20&offset=" + page * 20,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult(data);
          setError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [open, problem.id, page, version, retry]);
  async function placement(unit) {
    setMoving(true);
    setError("");
    try {
      await requestJson("/problems/" + problem.id + "/placement", {
        method: "PUT",
        body: { unit },
      });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setMoving(false);
    }
  }
  function changePage(delta) {
    setResult(null);
    setError("");
    setPage((v) => v + delta);
  }
  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Button
        fullWidth
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        sx={{
          justifyContent: "space-between",
          p: 1.5,
          color: "text.primary",
          gap: 1,
          textAlign: "left",
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="body2" fontWeight={600}>
            {problem.title}
          </Typography>
          {problem.difficulty && (
            <Typography
              variant="caption"
              sx={{
                color:
                  problem.difficulty.toLowerCase() === "easy"
                    ? "primary.main"
                    : problem.difficulty.toLowerCase() === "hard"
                      ? "#f49caa"
                      : "secondary.main",
              }}
            >
              {problem.difficulty}
            </Typography>
          )}
        </Stack>
        <ArcadeIcon
          name="chevron"
          sx={{
            fontSize: 16,
            flexShrink: 0,
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 180ms",
          }}
        />
      </Button>
      {open && (
        <Stack spacing={2} sx={{ p: 1.5, pt: 0.5 }}>
          <Link
            href={problem.url}
            target="_blank"
            rel="noreferrer"
            sx={{ fontSize: 12 }}
          >
            Open on LeetCode ↗
          </Link>
          <TextField
            disabled={moving}
            size="small"
            select
            label="Primary browsing pattern"
            value={problem.placement.unit}
            onChange={(e) => placement(e.target.value)}
            helperText="Browsing placement does not change recorded approaches."
          >
            {units.map((u) => (
              <MenuItem key={u.slug} value={u.slug}>
                {u.name}
              </MenuItem>
            ))}
          </TextField>
          {error && (
            <Alert
              severity="error"
              action={
                <Button size="small" onClick={() => setRetry((v) => v + 1)}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}
          {!result ? (
            <Typography role="status" variant="body2" color="text.secondary">
              {error ? "History unavailable." : "Loading history…"}
            </Typography>
          ) : (
            <>
              {result.attempts.map((a) => (
                <Stack
                  key={a.id}
                  spacing={1}
                  sx={{
                    pl: 1.5,
                    py: 0.5,
                    borderLeft: "2px solid",
                    borderColor:
                      a.assistance === "independent"
                        ? "primary.main"
                        : a.assistance === "hint"
                          ? "secondary.main"
                          : "divider",
                  }}
                >
                  <Stack direction="row" gap={0.5} flexWrap="wrap">
                    <Chip
                      size="small"
                      variant="outlined"
                      color={
                        a.imported
                          ? "default"
                          : a.assistance === "independent"
                            ? "success"
                            : a.assistance === "hint"
                              ? "warning"
                              : "info"
                      }
                      label={
                        a.imported
                          ? "Imported · assistance unknown"
                          : assistanceLabels[a.assistance]
                      }
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(a.attemptedAt).toLocaleString()}
                  </Typography>
                  <Typography variant="caption">
                    {units.find((u) => u.slug === a.practiceUnit)?.name ||
                      "Unspecified approach"}{" "}
                    ·{" "}
                    {a.approachSource === "confirmed"
                      ? "Confirmed approach"
                      : "Suggested approach"}
                  </Typography>
                  {a.selectedTopics?.length > 0 && (
                    <Stack direction="row" flexWrap="wrap" gap={0.5}>
                      {a.selectedTopics.map((topic) => (
                        <Chip key={topic} label={topic} size="small" />
                      ))}
                    </Stack>
                  )}
                  {!a.imported && (
                    <Typography variant="caption" color="text.secondary">
                      {a.captureSource === "accepted"
                        ? "Recorded after Accepted"
                        : "Self-reported practice"}
                    </Typography>
                  )}
                  {a.notes && (
                    <Box
                      sx={{ bgcolor: "#1c2632", p: 1.25, borderRadius: 1.5 }}
                    >
                      <Typography variant="overline" color="text.secondary">
                        NOTES
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {a.notes}
                      </Typography>
                    </Box>
                  )}
                  {!a.imported && (
                    <Button
                      size="small"
                      onClick={() => setEditing(a)}
                      sx={{ alignSelf: "flex-start", fontSize: 11 }}
                    >
                      Correct or remove
                    </Button>
                  )}
                </Stack>
              ))}
              {!result.more && result.legacy && (
                <Box sx={{ p: 1.5, bgcolor: "#202833", borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    LEGACY EXPERIENCE
                  </Typography>
                  <Typography variant="body2">
                    Previously solved · date and assistance unknown
                  </Typography>
                </Box>
              )}
              {!result.attempts.length && !result.legacy && (
                <Typography variant="body2" color="text.secondary">
                  No practice history recorded.
                </Typography>
              )}
              {(page > 0 || result.more) && (
                <Stack direction="row" justifyContent="space-between">
                  <Button
                    size="small"
                    disabled={!page}
                    onClick={() => changePage(-1)}
                  >
                    Newer
                  </Button>
                  <Button
                    size="small"
                    disabled={!result.more}
                    onClick={() => changePage(1)}
                  >
                    Older
                  </Button>
                </Stack>
              )}
            </>
          )}
        </Stack>
      )}
      {editing && (
        <Suspense
          fallback={<Typography role="status">Opening editor…</Typography>}
        >
          <AttemptEditor
            attempt={editing}
            patterns={units}
            onSaved={onSaved}
            onClose={() => setEditing(null)}
          />
        </Suspense>
      )}
    </Box>
  );
}
export default function PatternProblems({ unit, units, onSaved, version }) {
  const [open, setOpen] = useState(false),
    [result, setResult] = useState(null),
    [page, setPage] = useState(0),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      requestJson(
        "/pattern-problems?category=" +
          encodeURIComponent(unit) +
          "&q=" +
          encodeURIComponent(query) +
          "&limit=10&offset=" +
          page * 10,
        { signal: controller.signal },
      )
        .then((data) => {
          if (!controller.signal.aborted) {
            setResult(data);
            setError("");
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, unit, page, version, query, retry]);
  function changePage(delta) {
    setResult(null);
    setError("");
    setPage((v) => v + delta);
  }
  return (
    <>
      <Button
        size="small"
        startIcon={<ArcadeIcon name="history" sx={{ fontSize: 16 }} />}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        sx={{
          justifyContent: "flex-start",
          alignSelf: "flex-start",
          fontSize: 12,
        }}
      >
        {open ? "Hide" : "Explore"} problems and history
      </Button>
      {open && (
        <Stack spacing={1.5}>
          <TextField
            size="small"
            placeholder="Find a problem…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
              setResult(null);
              setError("");
            }}
            slotProps={{
              htmlInput: {
                "aria-label": "Search problems in " + unit,
                maxLength: 200,
              },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <ArcadeIcon name="search" sx={{ fontSize: 16 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          {error && (
            <Alert
              severity="error"
              action={
                <Button size="small" onClick={() => setRetry((v) => v + 1)}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}
          {result ? (
            <>
              {result.problems.map((p) => (
                <Problem
                  key={p.id}
                  problem={p}
                  units={units}
                  onSaved={onSaved}
                  version={version}
                />
              ))}
              {!result.total && (
                <Typography variant="body2" color="text.secondary">
                  {query
                    ? "No matching problems."
                    : "No problems yet. Your next recording will appear here."}
                </Typography>
              )}
              {(page > 0 || result.total > 10) && (
                <Stack direction="row" justifyContent="space-between">
                  <Button
                    size="small"
                    disabled={!page}
                    onClick={() => changePage(-1)}
                  >
                    Previous
                  </Button>
                  <Typography variant="caption" sx={{ alignSelf: "center" }}>
                    {page + 1} / {Math.ceil(result.total / 10)}
                  </Typography>
                  <Button
                    size="small"
                    disabled={(page + 1) * 10 >= result.total}
                    onClick={() => changePage(1)}
                  >
                    Next
                  </Button>
                </Stack>
              )}
            </>
          ) : (
            <Typography role="status" variant="body2" color="text.secondary">
              {error ? "Problems unavailable." : "Loading problems…"}
            </Typography>
          )}
        </Stack>
      )}
    </>
  );
}
