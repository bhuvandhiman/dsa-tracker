import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Link, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { requestJson } from './api.js';
import { assistanceLabels } from './attempt-form.js';

const pageSize = 10;
const formatTime = (value) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function ReviewQueue({ version, patterns }) {
  const [query, setQuery] = useState({ view: 'due', page: 0, refresh: 0 });
  const [state, setState] = useState({ data: null, key: '', error: '' });
  const key = `${version}:${query.view}:${query.page}:${query.refresh}`;
  const loading = state.key !== key;
  // Do not show an old page under a new page number or old counts during refresh.
  const data = loading ? null : state.data;
  const error = loading ? '' : state.error;
  const names = new Map(patterns.map((pattern) => [pattern.slug, pattern.name]));

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    requestJson(`/reviews?view=${query.view}&limit=${pageSize}&offset=${query.page * pageSize}`, { signal: controller.signal })
      .then((result) => {
        if (!Array.isArray(result.reviews) || !Number.isInteger(result.totalMatching) || !result.policy?.days) throw new Error('Unexpected review queue response.');
        if (active) setState({ data: result, key, error: '' });
      })
      .catch((failure) => { if (active) setState({ data: null, key, error: failure.message }); });
    return () => { active = false; controller.abort(); };
  }, [key, query.page, query.view]);

  return <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
      <Box><Typography variant="h6" component="h2">Review queue</Typography><Typography variant="body2" color="text.secondary">A small plan for what to practice again.</Typography></Box>
      <Stack direction="row" spacing={1}>
        <TextField select size="small" label="Show reviews" value={query.view} onChange={(event) => setQuery((current) => ({ ...current, view: event.target.value, page: 0 }))} sx={{ minWidth: 155 }}>
          <MenuItem value="due">Due now</MenuItem><MenuItem value="all">All scheduled</MenuItem>
        </TextField>
        <Button onClick={() => setQuery((current) => ({ ...current, page: 0, refresh: current.refresh + 1 }))} disabled={loading}>Refresh reviews</Button>
      </Stack>
    </Stack>
    {loading && <Typography role="status" sx={{ mt: 2 }}>Loading review queue…</Typography>}
    {error && <Alert severity="error" sx={{ mt: 2 }}>{error} Use Refresh reviews to retry.</Alert>}
    {data && <>
      <Typography variant="body2" sx={{ mt: 2 }}>{data.totalDue} due · {data.totalTracked} practiced problems</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>After your latest attempt: saw the solution → {data.policy.days.solution} day; hints → {data.policy.days.hint} days; independent → {data.policy.days.independent} days. This is a starter schedule, not a mastery score.</Typography>
      <Typography variant="caption" color="text.secondary">Checked {formatTime(data.asOf)}. Refresh to update what is due. Times are local.</Typography>
      {!data.reviews.length && <Typography sx={{ py: 3 }}>{data.totalTracked === 0 ? 'Record your first practice attempt to start a review schedule. Historical imports alone do not create a schedule.' : query.page > 0 ? 'No reviews on this page. Go back or refresh the queue.' : query.view === 'due' ? 'Nothing is due right now. Choose All scheduled to see upcoming reviews.' : 'No scheduled reviews.'}</Typography>}
      <Stack spacing={2} sx={{ mt: 2 }}>
        {data.reviews.map((review) => <Box key={review.problemId} component="article" sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2, overflowWrap: 'anywhere' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
            <Box><Typography component="h3" variant="subtitle1" fontWeight={650}>{review.title}</Typography><Typography variant="body2" color="text.secondary">{assistanceLabels[review.assistance]} · Last practiced {formatTime(review.attemptedAt)}</Typography></Box>
            <Chip label={review.due ? 'Due' : 'Upcoming'} color={review.due ? 'warning' : 'default'} size="small" sx={{ alignSelf: 'flex-start' }} />
          </Stack>
          <Typography variant="body2" sx={{ mt: 1 }}>Review {formatTime(review.dueAt)} · {review.intervalDays} {review.intervalDays === 1 ? 'day' : 'days'} after that attempt</Typography>
          <Typography variant="caption" color="text.secondary">Last practiced patterns: {review.patternSlugs.map((slug) => names.get(slug) || slug).join(', ')}</Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Link href={review.url} target="_blank" rel="noopener noreferrer">Practice on LeetCode</Link>
            <Link href={`/?problem=${encodeURIComponent(review.url)}#record-attempt`} target="_blank" rel="noopener noreferrer">Record another attempt</Link>
          </Stack>
        </Box>)}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Opening a problem does not complete a review. Record your next attempt afterward to update its schedule.</Typography>
      {(data.totalMatching > pageSize || query.page > 0) && <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
        <Button disabled={query.page === 0} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}>Previous reviews</Button>
        <Typography variant="body2">Page {query.page + 1}</Typography>
        <Button disabled={(query.page + 1) * pageSize >= data.totalMatching} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}>Next reviews</Button>
      </Stack>}
    </>}
  </Paper>;
}
