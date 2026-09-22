import { Alert, Box, Button, Chip, Divider, Link, Paper, Stack, Typography } from '@mui/material';
import { assistanceLabels } from './attempt-form.js';

export default function History({ attempts, patterns, loading, error, page, hasMore, onPage, onRefresh }) {
  const names = new Map(patterns.map((pattern) => [pattern.slug, pattern.name]));
  return <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
      <Box><Typography component="h2" variant="h6">Practice history</Typography><Typography variant="body2" color="text.secondary">Each attempt tells its own story.</Typography></Box>
      <Button onClick={onRefresh} disabled={loading}>Refresh</Button>
    </Stack>
    <Divider sx={{ my: 3 }} />
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error} {attempts.length > 0 ? 'Previously loaded attempts are shown below.' : ''}</Alert>}
    {loading && <Typography role="status" color="text.secondary">Loading attempts…</Typography>}
    {!loading && !error && !attempts.length && <Box sx={{ py: 5, textAlign: 'center' }}>
      <Typography variant="h6" component="p">{page === 0 ? 'Your practice story starts here.' : 'No more attempts on this page.'}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>{page === 0 ? 'Record your first attempt to see it here. Historical imports stay separate from practiced attempts.' : 'Go back to see earlier results.'}</Typography>
    </Box>}
    <Stack spacing={3} sx={{ opacity: loading ? 0.6 : 1 }}>
      {attempts.map((attempt) => <Box key={attempt.id} component="article" sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 3, overflowWrap: 'anywhere' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} spacing={1}>
          <Link href={attempt.problem.url} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ fontSize: '1.05rem', fontWeight: 650 }}>{attempt.problem.title}</Link>
          <Chip size="small" variant="outlined" color={attempt.assistance === 'independent' ? 'success' : attempt.assistance === 'hint' ? 'warning' : 'default'} label={assistanceLabels[attempt.assistance] || attempt.assistance} sx={{ alignSelf: 'flex-start' }} />
        </Stack>
        <Typography component="time" dateTime={attempt.attemptedAt} variant="caption" color="text.secondary">{new Date(attempt.attemptedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</Typography>
        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75} sx={{ mt: 1.5 }}>{attempt.patternSlugs.map((slug) => <Chip key={slug} label={names.get(slug) || slug} size="small" sx={{ bgcolor: '#edf4ef' }} />)}</Stack>
        {attempt.notes && <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>{attempt.notes}</Typography>}
      </Box>)}
    </Stack>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3 }}>
      <Button disabled={loading || page === 0} onClick={() => onPage(page - 1)}>Previous</Button>
      <Typography variant="body2" color="text.secondary">Page {page + 1}</Typography>
      <Button disabled={loading || !hasMore || Boolean(error)} onClick={() => onPage(page + 1)}>Next</Button>
    </Stack>
  </Paper>;
}
