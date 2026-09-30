import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';

export default function DashboardView({ view, onChange, configured }) {
  return (
    <Stack spacing={1.5} sx={{ mb: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2}>
        <Box>
          <Typography component="h2" variant="h6">Explore your practice</Typography>
          <Typography variant="body2" color="text.secondary">Two perspectives. Both metrics stay visible.</Typography>
        </Box>
        <ToggleButtonGroup exclusive value={view} onChange={(_event, next) => { if (next) onChange(next); }} aria-label="Dashboard perspective" size="small" sx={{ flexShrink: 0, '& .Mui-selected, & .Mui-selected:hover': { color: 'primary.light', bgcolor: 'action.selected', borderColor: 'primary.main' } }}>
          <ToggleButton value="coverage" sx={{ flex: { xs: 1, sm: 'initial' }, px: 2.5, textTransform: 'none' }}>Coverage</ToggleButton>
          <ToggleButton value="retention" sx={{ flex: { xs: 1, sm: 'initial' }, px: 2.5, textTransform: 'none' }}>Retention</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Typography variant="caption" color="text.secondary" aria-live="polite">
        {view === 'coverage'
          ? configured ? 'Largest remaining goal gaps first. Each subpattern and difficulty has its own quota.' : 'See which patterns you have explored. Set a goal to compare coverage with a target.'
          : 'Review patterns with dated practice first. Practice Strength reflects practice evidence, not a test of recall.'}
      </Typography>
    </Stack>
  );
}
