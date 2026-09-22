import { useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel, MenuItem, Paper, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { saveAttempt } from './api.js';
import { assistanceLabels, emptyForm, extensionDraft, pendingKey, prepareSave, readPending } from './attempt-form.js';

export default function AttemptForm({ patterns, problems, moreProblems, onMoreProblems, loadingProblems, ready, onSaved }) {
  const [initial] = useState(() => {
    try { return readPending(sessionStorage); } catch { return null; }
  });
  const [launch] = useState(() => extensionDraft(window.location.search));
  const [form, setForm] = useState(() => initial?.form || launch.form);
  const pending = useRef(initial?.draft || null);
  const inFlight = useRef(false);
  const [locked, setLocked] = useState(Boolean(initial));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initial ? { severity: 'warning', text: 'A previous save was not confirmed. Retry it to check or complete that same attempt. To record a different problem afterward, reopen it from the extension.' } : launch.message);

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); setMessage(null); }
  function clearPending() {
    pending.current = null;
    try { sessionStorage.removeItem(pendingKey); } catch { /* Storage may be blocked. */ }
    setLocked(false);
  }
  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    try {
      if (!pending.current) pending.current = prepareSave(form);
    } catch (error) { setMessage({ severity: 'error', text: error.message }); return; }
    inFlight.current = true;
    setBusy(true);
    setLocked(true);
    setMessage(null);
    try { sessionStorage.setItem(pendingKey, JSON.stringify({ draft: pending.current, form })); } catch { /* In-memory retry still works. */ }
    try {
      await saveAttempt(pending.current);
      clearPending();
      const location = new URL(window.location.href);
      location.searchParams.delete('problem');
      window.history.replaceState(null, '', location);
      setForm(emptyForm());
      setMessage({ severity: 'success', text: 'Attempt saved.' });
      onSaved();
    } catch (error) {
      // Validation failures cannot have saved an attempt. Network/server failures may have.
      if ([400, 404, 409, 413, 415].includes(error.status)) {
        clearPending();
        setMessage({ severity: 'error', text: error.message });
      } else {
        setMessage({ severity: 'warning', text: `${error.message} Your details are preserved. Retry this save before starting another attempt.` });
      }
    } finally { inFlight.current = false; setBusy(false); }
  }

  const disabled = locked || busy;
  const selectedProblem = problems.find((problem) => String(problem.id) === String(form.problemId));
  return <Paper id="record-attempt" component="section" variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
    <Typography component="h2" variant="h6">Record an attempt</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>Capture how you solved it, while it’s still fresh.</Typography>
    <Box component="form" onSubmit={submit} noValidate>
      <Stack spacing={2.5}>
        {message && <Alert severity={message.severity}>{message.text}</Alert>}
        <TextField select label="Problem" value={form.problemId} disabled={disabled || !ready} onChange={(event) => { update('problemId', event.target.value); setForm((current) => ({ ...current, patternSlugs: [] })); }}>
          <MenuItem value="">Add a problem by URL</MenuItem>
          {form.problemId && !selectedProblem && <MenuItem value={form.problemId}>Saved problem #{form.problemId}</MenuItem>}
          {problems.map((problem) => <MenuItem key={problem.id} value={String(problem.id)}>{problem.title}</MenuItem>)}
        </TextField>
        {moreProblems && <Button size="small" onClick={onMoreProblems} disabled={disabled || loadingProblems}>{loadingProblems ? 'Loading…' : 'Load more saved problems'}</Button>}
        {!form.problemId && <>
          <TextField label="LeetCode problem URL" value={form.url} required disabled={disabled} onChange={(event) => update('url', event.target.value)} placeholder="https://leetcode.com/problems/two-sum/" />
          <TextField label="Problem title" value={form.title} required disabled={disabled} onChange={(event) => update('title', event.target.value)} slotProps={{ htmlInput: { maxLength: 200 } }} />
          <TextField select label="Difficulty" value={form.difficulty} disabled={disabled} onChange={(event) => update('difficulty', event.target.value)}>
            <MenuItem value="">Not specified</MenuItem>{['easy', 'medium', 'hard'].map((value) => <MenuItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</MenuItem>)}
          </TextField>
        </>}
        <FormControl component="fieldset" required disabled={disabled}>
          <FormLabel component="legend" id="assistance-label">How did you solve it?</FormLabel>
          <RadioGroup aria-labelledby="assistance-label" value={form.assistance} onChange={(event) => update('assistance', event.target.value)}>
            {Object.entries(assistanceLabels).map(([value, label]) => <FormControlLabel key={value} value={value} control={<Radio />} label={label} />)}
          </RadioGroup>
        </FormControl>
        <FormControl component="fieldset" required disabled={disabled || !ready}>
          <FormLabel component="legend">Patterns actually used</FormLabel>
          <Typography variant="caption" color="text.secondary">Select only the approaches you practiced. Problem tags are not selected for you.</Typography>
          <FormGroup sx={{ maxHeight: 250, overflowY: 'auto', flexWrap: 'nowrap', mt: 1 }}>
            {patterns.map((pattern) => <FormControlLabel key={pattern.slug} label={pattern.name} control={<Checkbox checked={form.patternSlugs.includes(pattern.slug)} onChange={(event) => update('patternSlugs', event.target.checked ? [...form.patternSlugs, pattern.slug] : form.patternSlugs.filter((slug) => slug !== pattern.slug))} />} />)}
          </FormGroup>
        </FormControl>
        <TextField label="Attempt time" type="datetime-local" value={form.attemptedAt} required disabled={disabled} onChange={(event) => update('attemptedAt', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} helperText="Shown in your local time zone." />
        <TextField label="Notes" multiline minRows={3} value={form.notes} disabled={disabled} onChange={(event) => update('notes', event.target.value)} slotProps={{ htmlInput: { maxLength: 5000 } }} helperText={`${form.notes.length}/5000 · What helped, or where did you get stuck?`} />
        <Button type="submit" variant="contained" size="large" disabled={busy || (!ready && !locked)}>{busy ? 'Saving…' : locked ? 'Retry save' : 'Save attempt'}</Button>
      </Stack>
    </Box>
  </Paper>;
}
