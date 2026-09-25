import { Box, LinearProgress, Stack, Typography } from "@mui/material";
export default function PracticeStrength({
  unit,
  compact = false,
  ring = false,
}) {
  const score = unit.displayStrength ?? unit.strength ?? unit.experienceScore ?? 0;
  const value = Math.floor(score);
  const trend = unit.trend30Days;
  const trendText = trend && Math.abs(trend.delta) > 0.4
    ? `${trend.delta > 0 ? "+" : "−"}${Math.abs(trend.delta).toFixed(1)} · 30d`
    : null;
  if (ring)
    return (
      <Box
        sx={{ position: "relative", width: 106, height: 106, flexShrink: 0 }}
      >
        <Box
          component="svg"
          viewBox="0 0 106 106"
          role="img"
          aria-label={
            unit.name +
            ": " +
            value +
            " out of 100 practice strength" +
            (unit.assessed ? "" : ", based on prior solves with date unknown")
          }
          sx={{ width: "100%", transform: "rotate(-90deg)" }}
        >
          <circle
            cx="53"
            cy="53"
            r="45"
            fill="none"
            stroke="#293442"
            strokeWidth="7"
          />
          <circle
            cx="53"
            cy="53"
            r="45"
            fill="none"
            stroke="#5b8cff"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="282.74"
            strokeDashoffset={282.74 * (1 - score / 100)}
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </Box>
        <Stack
          sx={{ position: "absolute", inset: 0 }}
          alignItems="center"
          justifyContent="center"
        >
          <Typography
            sx={{
              fontSize: 29,
              fontWeight: 700,
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {value}
          </Typography>
          <Typography
            sx={{ fontSize: 9, color: "text.secondary", letterSpacing: 1 }}
          >
            STRENGTH
          </Typography>
        </Stack>
      </Box>
    );
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
              new Date(unit.lastPracticedAt).toLocaleDateString()
            : unit.distinctSolved
              ? "Previous solves count · dates unavailable"
              : "No solved problems yet"}
        </Typography>
      )}
    </Stack>
  );
}

