import { Box, LinearProgress, Stack, Typography } from "@mui/material";
export default function PracticeStrength({
  unit,
  compact = false,
  ring = false,
}) {
  const value = unit.assessed ? Math.floor(unit.strength) : null;
  if (ring && value === null)
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{
          width: 106,
          height: 106,
          flexShrink: 0,
          border: "1px dashed #526558",
          borderRadius: 3,
        }}
      >
        <Typography sx={{ fontSize: 28, color: "text.secondary" }}>
          —
        </Typography>
        <Typography
          sx={{ fontSize: 9, color: "text.secondary", letterSpacing: 1 }}
        >
          UNASSESSED
        </Typography>
      </Stack>
    );
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
            (value === null
              ? "unassessed"
              : value + " out of 100 practice strength")
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
          {value !== null && (
            <circle
              cx="53"
              cy="53"
              r="45"
              fill="none"
              stroke="#5ee6a8"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray="282.74"
              strokeDashoffset={282.74 * (1 - unit.strength / 100)}
              style={{ transition: "stroke-dashoffset 600ms ease" }}
            />
          )}
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
            {value ?? "—"}
          </Typography>
          <Typography
            sx={{ fontSize: 9, color: "text.secondary", letterSpacing: 1 }}
          >
            {value === null ? "UNASSESSED" : "STRENGTH"}
          </Typography>
        </Stack>
      </Box>
    );
  return (
    <Stack spacing={0.8}>
      <Stack direction="row" justifyContent="space-between" gap={1}>
        <Typography variant="caption" color="text.secondary">
          {unit.assessed ? "Practice strength" : "Unassessed"}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontFamily: "ui-monospace, monospace",
            color: unit.assessed ? "primary.main" : "text.secondary",
          }}
        >
          {unit.assessed ? value + " / 100" : "No dated practice"}
        </Typography>
      </Stack>
      {unit.assessed && (
        <LinearProgress
          aria-label={unit.name + " practice strength"}
          variant="determinate"
          value={unit.strength}
          sx={{
            height: 6,
            borderRadius: 5,
            bgcolor: "#293442",
            "& .MuiLinearProgress-bar": {
              borderRadius: 5,
              transition: "transform 600ms ease",
            },
          }}
        />
      )}
      {!compact && (
        <Typography variant="caption" color="text.secondary">
          {unit.distinctSolved} distinct problems ·{" "}
          {unit.lastPracticedAt
            ? "Last practiced " +
              new Date(unit.lastPracticedAt).toLocaleDateString()
            : unit.distinctSolved
              ? "Undated legacy experience"
              : "No practice recorded"}
        </Typography>
      )}
    </Stack>
  );
}
