import { Box, ButtonBase, Paper, Stack, Typography } from "@mui/material";
import PracticeStrength from "./PracticeStrength.jsx";
import ArcadeIcon from "./ArcadeIcon.jsx";
export default function PatternCard({ category, selected, onSelect, index }) {
  const unit = category.children.find((u) => u.slug === category.attention);
  const gap = !unit;
  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected
          ? "#182b27"
          : gap
            ? "transparent"
            : "background.paper",
        borderStyle: gap ? "dashed" : "solid",
        transition: "transform 180ms ease, border-color 180ms ease",
        animation: "appear 300ms ease both",
        animationDelay: Math.min(index, 8) * 35 + "ms",
        "@keyframes appear": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "&:hover": {
          transform: "translateY(-3px)",
          borderColor: gap ? "text.secondary" : "primary.main",
        },
      }}
    >
      <ButtonBase
        onClick={onSelect}
        aria-label={"Open " + category.name}
        aria-pressed={selected}
        sx={{
          p: 2.4,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          textAlign: "left",
          gap: 2,
          minHeight: gap ? 158 : unit?.assessed ? 238 : 215,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: gap ? "#1c2430" : "#253931",
              color: gap ? "text.secondary" : "primary.main",
            }}
          >
            <ArcadeIcon
              name={/graph|tree/i.test(category.name) ? "branch" : "code"}
              fontSize="small"
            />
          </Box>
          <ArcadeIcon
            name="arrow"
            sx={{
              fontSize: 17,
              color: selected ? "primary.main" : "text.secondary",
            }}
          />
        </Stack>
        <Box>
          <Typography component="h3" variant="h6">
            {category.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {unit
              ? unit.name
              : category.slug === "other"
                ? "Needs classification"
                : "No practice recorded"}
          </Typography>
        </Box>
        {unit ? (
          <>
            <Box sx={{ mt: "auto" }}>
              <PracticeStrength unit={unit} compact />
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: unit.assessed ? "secondary.main" : "text.secondary",
              }}
            >
              {unit.reason}
            </Typography>
          </>
        ) : (
          <Typography variant="caption" color="text.secondary">
            {category.slug === "other"
              ? "Organize your unclassified problems"
              : "Coverage gap · explore subpatterns"}
          </Typography>
        )}
      </ButtonBase>
    </Paper>
  );
}

