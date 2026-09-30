import { Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";

const LABELS = { easy: "Easy", medium: "Medium", hard: "Hard" };
const DIFFICULTY_COLOR = { easy: "success.main", medium: "warning.main", hard: "error.main" };

function GoalRing({ value, credited, target, compact = false }) {
  const size = compact ? 58 : 78;
  const thickness = compact ? 5 : 4.5;

  return (
    <Box
      role="img"
      aria-label={`Goal coverage ${credited} of ${target}`}
      sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={thickness}
        sx={{ position: "absolute", inset: 0, color: "#26364a" }}
      />
      <CircularProgress
        variant="determinate"
        value={value}
        size={size}
        thickness={thickness}
        sx={{
          position: "absolute",
          inset: 0,
          color: "#70cde3",
          "& .MuiCircularProgress-circle": {
            strokeLinecap: "round",
            transition: "stroke-dashoffset 600ms ease",
          },
          "@media (prefers-reduced-motion: reduce)": {
            "& .MuiCircularProgress-circle": { transition: "none" },
          },
        }}
      />
      <Stack sx={{ position: "absolute", inset: 0 }} alignItems="center" justifyContent="center" spacing={0}>
        <Typography sx={{ fontSize: compact ? 12 : 16, lineHeight: 1.05, fontWeight: 800, fontFamily: "ui-monospace, monospace" }}>
          {credited}
        </Typography>
        <Typography sx={{ fontSize: compact ? 8 : 9, lineHeight: 1.1, color: "text.secondary" }}>
          / {target}
        </Typography>
      </Stack>
    </Box>
  );
}

export function GoalCoverage({ goal, compact = false }) {
  if (!goal) return null;
  const coverage = Math.max(0, Math.min(100, goal.coverage ?? 0));
  const difficulty = Object.fromEntries(["easy", "medium", "hard"].map((bucket) => {
    const categoryBucket = goal.difficulty?.[bucket];
    return [bucket, typeof categoryBucket === "object" ? categoryBucket : {
      target: Number(categoryBucket) || 0,
      actual: goal.actual?.[bucket] ?? 0,
      deficit: goal.deficitByDifficulty?.[bucket] ?? 0,
    }];
  }));
  const gaps = Object.entries(difficulty).filter(([, value]) => value.target > 0 && value.deficit > 0);
  const totalKnown = typeof goal.actual === "number"
    ? goal.actual
    : Object.values(goal.actual || {}).reduce((sum, value) => sum + (Number(value) || 0), 0) - (goal.actual?.unknown || 0);
  const exceeded = goal.deficit === 0 && totalKnown > goal.target;
  const buckets = Object.entries(difficulty).filter(([, value]) => value.target > 0);

  if (compact) {
    return (
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
        <GoalRing value={coverage} credited={goal.credited} target={goal.target} compact />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Target progress</Typography>
          <Typography variant="caption" sx={{ display: "block", color: goal.deficit > 0 ? "text.primary" : "info.main", fontWeight: 700 }}>
            {goal.deficit > 0 ? `${goal.deficit} remaining` : (exceeded ? "Target exceeded" : "Target met")}
          </Typography>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <GoalRing value={coverage} credited={goal.credited} target={goal.target} />
      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Target progress</Typography>
          <Typography variant="caption" color="text.secondary" sx={{display:'block'}}>Credit is capped for each subpattern and difficulty. Extra Easy problems do not replace missing Medium or Hard problems.</Typography>
          <Typography variant="caption" color="text.secondary" sx={{display:'block'}}>{totalKnown} solved · {goal.credited} credited{(goal.unknownDifficulty??goal.actual?.unknown??0)>0?' · unknown difficulty excluded':''}</Typography>
          <Typography variant="body2" fontWeight={700}>
            {goal.deficit > 0 ? `${goal.deficit} problems remaining` : (exceeded ? "Target exceeded" : "Target met")}
          </Typography>
        </Box>
        <Stack direction="row" gap={1.25} flexWrap="wrap" alignItems="center">
          {buckets.map(([bucket, value]) => {
            const above = value.actual > value.target;
            return (
              <Typography key={bucket} variant="caption" sx={{ color: value.deficit > 0 ? "text.secondary" : DIFFICULTY_COLOR[bucket] }}>
                {LABELS[bucket]}: {value.actual} solved / {value.target} target · {value.deficit} remaining{above ? " · Surplus" : ""}
              </Typography>
            );
          })}
          {!gaps.length && (
            <Typography variant="caption" sx={{ color: "info.main" }}>
              {exceeded ? "Target exceeded" : "All difficulty targets met"}
            </Typography>
          )}
          {(goal.unknownDifficulty ?? goal.actual?.unknown ?? 0) > 0 && (
            <Typography variant="caption" color="text.secondary">
              · {goal.unknownDifficulty ?? goal.actual.unknown} with unknown difficulty
            </Typography>
          )}
        </Stack>
        {goal.units?.length>0&&<Box component="details" sx={{fontSize:12,maxWidth:'100%',overflowX:'auto'}}><summary>Subpattern quota breakdown</summary><table><caption>Solved, credited and remaining by difficulty</caption><thead><tr><th scope="col">Subpattern</th><th scope="col">Difficulty</th><th scope="col">Solved</th><th scope="col">Credited</th><th scope="col">Target</th><th scope="col">Remaining</th></tr></thead><tbody>{goal.units.flatMap(unit=>['easy','medium','hard'].map(bucket=><tr key={`${unit.slug}-${bucket}`}><th scope="row">{unit.name}</th><td>{LABELS[bucket]}</td><td>{unit.actual[bucket]}</td><td>{unit.creditedByDifficulty[bucket]}</td><td>{unit.difficulty[bucket]}</td><td>{unit.deficitByDifficulty[bucket]}</td></tr>))}</tbody></table></Box>}
      </Stack>
    </Stack>
  );
}

export function GoalSetup({ goal, onSave, onCancel, saving = false, error = "", compact = false }) {
  const profiles = goal.profiles || [
    { id: "interview", name: "Interview Focused", description: "Prioritizes common coding-interview patterns." },
    { id: "deep", name: "Deep Understanding", description: "Reserves more coverage for advanced and lower-frequency patterns." },
  ];
  const targets = goal.targets || [300, 500, 1000];
  const selectedProfile = goal.profile || "interview";
  const selectedTarget = goal.target || 500;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 2 : { xs: 2.5, md: 3 },
        mb: compact ? 0 : 4,
        borderColor: compact ? "transparent" : "#31527e",
        bgcolor: compact ? "transparent" : "#111a27",
        boxShadow: "none",
        ...(compact && { p: 0 }),
      }}
    >
      <Stack spacing={compact ? 2 : 2.5}>
        <Box>
          <Typography variant="overline" color="info.main">SET A COVERAGE GOAL</Typography>
          <Typography variant={compact ? "subtitle1" : "h6"} sx={{ mt: 0.35 }}>What are you optimizing your practice for?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 760 }}>
            This does not change Practice Strength. It only compares your distinct solved problems with a profile-specific target, including separate Easy, Medium, and Hard coverage.
          </Typography>
        </Box>

        <Stack direction={compact ? "column" : { xs: "column", md: "row" }} gap={1.25}>
          {profiles.map((profile) => (
            <Paper
              key={profile.id}
              component="button"
              type="button"
              aria-pressed={selectedProfile===profile.id}
              disabled={saving}
              onClick={() => onSave({ preview: true, profile: profile.id, target: selectedTarget })}
              variant="outlined"
              sx={{
                flex: 1,
                p: 2,
                textAlign: "left",
                color: "inherit",
                font: "inherit",
                cursor: "pointer",
                borderColor: selectedProfile === profile.id ? "primary.main" : "divider",
                bgcolor: selectedProfile === profile.id ? "#14223a" : "#0f161f",
              }}
            >
              <Typography fontWeight={700}>{profile.name}</Typography>
              <Typography variant="caption" color="text.secondary">{profile.description}</Typography>
            </Paper>
          ))}
        </Stack>

        <Stack direction={compact ? "column" : { xs: "column", sm: "row" }} gap={2} justifyContent="space-between" alignItems={compact ? "stretch" : { xs: "stretch", sm: "center" }}>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {targets.map((target) => (
              <Chip
                key={target}
                label={`${target} solved`}
                onClick={() => onSave({ preview: true, profile: selectedProfile, target })}
                disabled={saving}
                aria-pressed={selectedTarget === target}
                variant={selectedTarget === target ? "filled" : "outlined"}
                sx={{
                  height: 32,
                  px: 0.5,
                  bgcolor: selectedTarget === target ? "#5b8cff22" : undefined,
                  color: selectedTarget === target ? "primary.main" : "text.secondary",
                  borderColor: selectedTarget === target ? "primary.main" : "divider",
                }}
              />
            ))}
          </Stack>
          <Stack direction="row" gap={1} justifyContent={compact ? "stretch" : "flex-end"}>
            {onCancel && <Button color="inherit" disabled={saving} onClick={onCancel}>Cancel</Button>}
            <Button
              variant="contained"
              fullWidth={compact}
              disabled={saving}
              onClick={() => onSave({ profile: selectedProfile, target: selectedTarget })}
            >
              {saving ? "Saving…" : "Use this goal"}
            </Button>
          </Stack>
        </Stack>
        {error && <Typography role="alert" variant="caption" color="error.main">{error}</Typography>}
        <Typography variant="caption" color="text.secondary">
          Exact quotas are Recall product policy informed by published interview-prep and algorithms curricula; they are not claimed as universal industry frequencies.
        </Typography>
      </Stack>
    </Paper>
  );
}
