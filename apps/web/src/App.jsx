import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Container, Stack, Typography } from '@mui/material';
import { requestJson } from './api.js';
import AttemptForm from './AttemptForm.jsx';
import History from './History.jsx';

export default function App() {
  const [catalog, setCatalog] = useState({ patterns: [], problems: [], more: false, ready: false, error: '' });
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [moreLoading, setMoreLoading] = useState(false);
  const [history, setHistory] = useState({ attempts: [], more: false, error: '', loading: true });
  const [page, setPage] = useState(0);
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    Promise.all([requestJson('/patterns', { signal: controller.signal }), requestJson('/problems?limit=100', { signal: controller.signal })])
      .then(([patterns, problems]) => {
        if (!Array.isArray(patterns.patterns) || !Array.isArray(problems.problems)) throw new Error('Unexpected catalog response.');
        if (active) setCatalog({ patterns: patterns.patterns, problems: problems.problems, more: problems.problems.length === 100, ready: true, error: '' });
      })
      .catch((error) => { if (active) setCatalog((current) => ({ ...current, ready: false, error: error.message })); });
    return () => { active = false; controller.abort(); };
  }, [catalogVersion]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    requestJson(`/attempts?limit=21&offset=${page * 20}`, { signal: controller.signal })
      .then((result) => {
        if (!Array.isArray(result.attempts)) throw new Error('Unexpected history response.');
        if (active) setHistory({ attempts: result.attempts.slice(0, 20), more: result.attempts.length > 20, loading: false, error: '' });
      })
      .catch((error) => { if (active) setHistory((current) => ({ ...current, loading: false, error: error.message })); });
    return () => { active = false; controller.abort(); };
  }, [page, historyVersion]);

  function refreshHistory(nextPage = page) {
    setHistory((current) => ({ ...current, attempts: nextPage === page ? current.attempts : [], loading: true, error: '' }));
    setPage(nextPage);
    setHistoryVersion((value) => value + 1);
  }
  function refreshAll() { setCatalogVersion((value) => value + 1); refreshHistory(); }
  function saved() { setCatalogVersion((value) => value + 1); refreshHistory(0); }
  async function moreProblems() {
    if (moreLoading) return;
    setMoreLoading(true);
    try {
      const result = await requestJson(`/problems?limit=100&offset=${catalog.problems.length}`);
      if (!Array.isArray(result.problems)) throw new Error('Unexpected catalog response.');
      setCatalog((current) => ({ ...current, problems: [...new Map([...current.problems, ...result.problems].map((problem) => [problem.id, problem])).values()], more: result.problems.length === 100 }));
    } catch (error) { setCatalog((current) => ({ ...current, error: error.message })); }
    finally { setMoreLoading(false); }
  }

  return <>
    <Box component="header" sx={{ bgcolor: 'background.paper', borderBottom: '1px solid #e0e7e2' }}>
      <Container maxWidth="lg"><Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 2.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center"><Box sx={{ bgcolor: 'primary.main', color: 'white', px: 1.3, py: 0.6, borderRadius: 2, fontWeight: 800 }}>R</Box><Typography variant="h6" component="span">recall</Typography></Stack>
        <Chip label="Phase 4 · LeetCode journal" size="small" variant="outlined" />
      </Stack></Container>
    </Box>
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>YOUR PRACTICE, WITH PURPOSE</Typography>
      <Typography variant="h4" component="h1" sx={{ mt: 1, mb: 1.5 }}>Build understanding. Keep it.</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Beyond a solved count: remember the approach, the help you needed, and what you learned.</Typography>
      {!catalog.ready && !catalog.error && <Alert severity="info" sx={{ mb: 3 }}>Connecting to your practice database…</Alert>}
      {catalog.error && <Alert severity="error" action={<Button color="inherit" onClick={refreshAll}>Retry</Button>} sx={{ mb: 3 }}>{catalog.error}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 5fr) minmax(0, 7fr)' }, gap: 3, alignItems: 'start' }}>
        <AttemptForm patterns={catalog.patterns} problems={catalog.problems} moreProblems={catalog.more} onMoreProblems={moreProblems} loadingProblems={moreLoading} ready={catalog.ready} onSaved={saved} />
        <History attempts={history.attempts} patterns={catalog.patterns} loading={history.loading} error={history.error} page={page} hasMore={history.more} onPage={refreshHistory} onRefresh={() => refreshHistory()} />
      </Box>
      <Typography component="footer" variant="caption" color="text.secondary" sx={{ display: 'block', mt: 4 }}>Manual practice journal · Open this journal from a LeetCode problem using the extension. Automatic capture and review scoring come later.</Typography>
    </Container>
  </>;
}
