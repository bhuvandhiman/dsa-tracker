import { useState } from "react";
import { alpha } from "@mui/material/styles";
import { Box, Button, Collapse, Paper, Stack, Typography } from "@mui/material";
import ArcadeIcon from "./ArcadeIcon.jsx";

const DAY = 86400000;

function dayString(value, timeZone) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(value, amount) {
  const [year, month, date] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date) + amount * DAY).toISOString().slice(0, 10);
}

function relativePractice(value, asOf) {
  if (!value) return "No dated practice";
  const reference = new Date(asOf).getTime();
  const days = Math.floor(Math.max(0, reference - new Date(value).getTime()) / DAY);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 14) return days + " days ago";
  if (days < 70) return Math.floor(days / 7) + " weeks ago";
  return Math.floor(days / 30) + " months ago";
}

function evidenceCopy(unit) {
  if (!unit.experienced) return "No solved-problem evidence yet, so this bar stays at zero.";
  if (!unit.assessed) {
    return `Strength is based on ${unit.distinctSolved} previous ${unit.distinctSolved === 1 ? "solve" : "solves"}. Their dates are unavailable, so recency is not estimated.`;
  }
  if (unit.legacyDistinctSolved > (unit.datedDistinctSolved || 0)) {
    return `Strength is based mainly on experience. ${unit.legacyDistinctSolved} of ${unit.distinctSolved} solved problems do not have a dated practice record.`;
  }
  return "Strength combines different problems solved, repeat practice, and dated recency.";
}

function Trend({ trend }) {
  if (!trend) return <Typography variant="caption" color="text.secondary">No dated 30-day trend yet</Typography>;
  const delta = trend.delta;
  const arrow = delta > 0.4 ? "↑" : delta < -0.4 ? "↓" : "→";
  const magnitude = Math.abs(delta).toFixed(1);
  const label = Math.abs(delta) <= 0.4 ? "Stable over 30 days" : `${arrow} ${magnitude} points in 30 days`;
  return <Typography variant="caption" color="text.secondary">{label}</Typography>;
}

function ActivityStrip({ activity = [], asOf, timeZone }) {
  const activityByDay = new Map(activity.map((item) => [item.date, item.count]));
  const end = dayString(asOf, timeZone);
  const days = Array.from({ length: 84 }, (_, index) => addDays(end, index - 83));
  const hasActivity = activity.some((item) => item.count > 0);
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 650 }}>Recent dated activity</Typography>
        <Typography variant="caption" color="text.secondary">12 weeks</Typography>
      </Stack>
      {hasActivity ? (
        <Box sx={{ overflowX: "auto", pb: 0.5 }}>
          <Box sx={{ display: "grid", gridAutoFlow: "column", gridTemplateRows: "repeat(7, 8px)", gridAutoColumns: "8px", gap: "4px", width: "max-content" }}>
            {days.map((date) => {
              const count = activityByDay.get(date) || 0;
              const opacity = count === 0 ? 0.08 : Math.min(0.35 + count * 0.18, 0.95);
              return (
                <Box
                  key={date}
                  title={`${date}: ${count ? count + (count === 1 ? " practice" : " practices") : "no dated practice"}`}
                  aria-label={`${date}: ${count ? count + " dated practice" : "no dated practice"}`}
                  sx={(theme) => ({
                    width: 8,
                    height: 8,
                    borderRadius: "2px",
                    bgcolor: count ? alpha(theme.palette.primary.main, opacity) : alpha(theme.palette.text.secondary, opacity),
                  })}
                />
              );
            })}
          </Box>
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">No dated activity is available to plot yet.</Typography>
      )}
    </Box>
  );
}

export default function PracticeInsights({ unit, asOf, timeZone = "Asia/Calcutta" }) {
  const [open, setOpen] = useState(false);
  return (
    <Paper variant="outlined" sx={{ bgcolor: "#111821", overflow: "hidden" }}>
      <Button
        fullWidth
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        endIcon={<ArcadeIcon name="chevron" sx={{ fontSize: 17, transform: open ? "rotate(90deg)" : "none", transition: "transform 160ms ease" }} />}
        sx={{ justifyContent: "space-between", px: 1.75, py: 1.25, color: "text.primary" }}
      >
        Why this score?
      </Button>
      <Collapse in={open}>
        <Box sx={{ px: 1.75, pb: 1.75, borderTop: 1, borderColor: "divider" }}>
          <Typography variant="body2" color="text.secondary" sx={{ pt: 1.5, mb: 1.5 }}>
            {evidenceCopy(unit)} Different problems matter most; repeat practice adds support, and recent dated practice adds a smaller recency boost.
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, minmax(0, 1fr))" }, gap: 1, mb: 2 }}>
            {[
              ["Different problems", unit.distinctSolved],
              ["Repeat practice days", unit.revisitCount || 0],
              ["Last dated practice", relativePractice(unit.lastPracticedAt, asOf)],
              ["Previous solves without dates", unit.legacyDistinctSolved || 0],
            ].map(([label, value]) => (
              <Box key={label} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "#0d141d", border: 1, borderColor: "divider" }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </Box>
            ))}
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5} alignItems={{ sm: "flex-end" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}><ActivityStrip activity={unit.activity} asOf={asOf} timeZone={timeZone} /></Box>
            <Trend trend={unit.trend30Days} />
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
}
