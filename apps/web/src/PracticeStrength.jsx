import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import { dayString } from './dates.js';
export default function PracticeStrength({
  unit,
  compact = false,
}) {
  const score = unit.displayStrength ?? unit.strength ?? unit.experienceScore ?? 0;
  const value = Math.floor(score);
  const trend = unit.trend30Days;
  const trendText = trend && Math.abs(trend.delta) > 0.4
    ? `${trend.delta > 0 ? "+" : "−"}${Math.abs(trend.delta).toFixed(1)} · 30d`
    : null;
  return (
    <Stack spacing={0.8}>
      <Stack direction="row" justifyContent="space-between" gap={1}>
        <Typography variant="caption" color="text.secondary">
          Practice strength
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {trendText && <Typography variant="caption" color="text.secondary">{trendText}</Typography>}
          <Typography
            variant="caption"
            sx={{
              fontFamily: "ui-monospace, monospace",
              color: "primary.main",
            }}
          >
            {value} / 100
          </Typography>
        </Stack>
      </Stack>
      <LinearProgress
        aria-label={
          unit.name +
          " practice strength" +
          (unit.assessed ? "" : ", prior solves only")
        }
        variant="determinate"
        value={score}
        sx={{
          height: 8,
          borderRadius: 5,
          bgcolor: "#293442",
          "& .MuiLinearProgress-bar": {
            borderRadius: 5,
            transition: "transform 600ms ease",
          },
        }}
      />
      {!compact && (
        <Typography variant="caption" color="text.secondary">
          {unit.distinctSolved} distinct problems ·{" "}
          {unit.lastPracticedAt
            ? "Last practiced " +
              dayString(unit.lastPracticedAt)
            : unit.distinctSolved
              ? "Previous solves count · dates unavailable"
              : "No solved problems yet"}
        </Typography>
      )}
    </Stack>
  );
}

