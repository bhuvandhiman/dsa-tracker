import { Box, ButtonBase, Paper, Stack, Typography } from "@mui/material";
import PracticeStrength from "./PracticeStrength.jsx";
import { GoalCoverage } from "./GoalCoverage.jsx";
import ArcadeIcon from "./ArcadeIcon.jsx";
export default function PatternCard({ category, onSelect, index, featured = false, view = "coverage", highlight }) {
  const unit = category.summary;
  const gap = !unit?.experienced;
  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
        width: "100%",
        borderColor: featured ? "rgba(91, 140, 255, 0.42)" : "divider",
        bgcolor: "background.paper",
        boxShadow: featured ? "0 10px 28px rgba(0, 0, 0, 0.18)" : "none",
        transition: "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
        animation: "appear 300ms ease both",
        animationDelay: Math.min(index, 8) * 35 + "ms",
        "@keyframes appear": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "&:hover": {
          transform: "translateY(-3px)",
          borderColor: "primary.main",
        },
      }}
    >
      <ButtonBase
        id={`pattern-${category.slug}`}
        onClick={onSelect}
        aria-label={"Open " + category.name}
        sx={{
          p: featured ? { xs: 2.25, sm: 2.75 } : { xs: 2, sm: 2.5 },
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "stretch", md: "center" },
          textAlign: "left",
          gap: { xs: 2, sm: 3 },
          minHeight: featured ? 156 : 142,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ width: { md: 230 }, flexShrink: 0 }}>
          <Box
            sx={{
              width: 34,
              flexShrink: 0,
              height: 34,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: gap ? "#1c2430" : "#1b2a44",
              color: gap ? "text.secondary" : "primary.main",
            }}
          >
            <ArcadeIcon
              name={/graph|tree/i.test(category.name) ? "branch" : "code"}
              fontSize="small"
            />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h3" variant="h6">{category.name}</Typography>
            <Typography variant="caption" color="text.secondary">Across all subpatterns</Typography>
            {highlight && <Typography variant="caption" color="primary.main" sx={{ display: "block", mt: 0.75 }}>{highlight}</Typography>}
          </Box>
        </Stack>
        <Box sx={{ flex: 1, minWidth: 0, order: view === "coverage" && category.goal ? 3 : 2 }}>
          <PracticeStrength unit={unit} compact />
          <Typography variant="caption" sx={{ display: "block", mt: 1, color: unit.assessed ? "secondary.main" : "text.secondary" }}>{view === "retention" && !unit.assessed ? unit.experienced ? "Previous solves · dates unavailable" : "No retention assessment yet" : unit.reason}</Typography>
        </Box>
        <Stack direction="row" alignItems="center" justifyContent={view === "coverage" ? "flex-start" : "flex-end"} spacing={2} sx={{ minWidth: { md: category.goal ? 175 : 110 }, order: view === "coverage" && category.goal ? 2 : 3 }}>
          {category.goal ? <GoalCoverage goal={category.goal} compact /> : <Typography variant="caption" color="text.secondary">{unit.distinctSolved} solved</Typography>}
        </Stack>
        <ArcadeIcon name="arrow" sx={{ order: 4, alignSelf: { xs: "flex-end", md: "center" }, fontSize: 18, color: "primary.main" }} />
      </ButtonBase>
    </Paper>
  );
}
