import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { requestJson } from './api.js';
import { assistanceLabels } from './attempt-form.js';
export default function AttemptEditor({ attempt, patterns, onClose, onSaved }) {
  const [form, setForm] = useState({ practiceUnit: attempt.practiceUnit || 'other', assistance: attempt.assistance, patternSlugs: attempt.patternSlugs, notes: attempt.notes, attemptedAt: localTime(attempt.attemptedAt) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(false);
  const field = key => event => setForm(f => ({ ...f, [key]: event.target.value }));
  async function save(remove) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (!remove && (!form.patternSlugs.length || !form.attemptedAt || !Number.isFinite(Date.parse(form.attemptedAt)))) throw new Error('Choose the patterns you used and a valid practice time.');
      await requestJson(`/attempts/${attempt.id}`, { method: remove ? 'DELETE' : 'PUT', body: remove ? { revision: attempt.revision } : { ...form, revision: attempt.revision, attemptedAt: new Date(form.attemptedAt).toISOString() } });
      onSaved(); onClose();
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <Dialog open fullWidth onClose={busy ? undefined : onClose}><DialogTitle>{removing ? 'Remove this attempt?' : `Edit attempt: ${attempt.problem.title}`}</DialogTitle><DialogContent>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {removing ? <Alert severity="warning">This removes the attempt from your history and practice counts. There is no undo in the app. The problem and its other history remain.</Alert> : <Stack spacing={2} sx={{ pt: 1 }}>
      <TextField select label="Assistance" value={form.assistance} onChange={field('assistance')} disabled={busy}>{Object.entries(assistanceLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
      <TextField select label="Practiced approach" value={form.practiceUnit} onChange={field('practiceUnit')} disabled={busy}>{patterns.map(p => <MenuItem key={p.slug} value={p.slug}>{p.name}</MenuItem>)}</TextField>
      <TextField type="datetime-local" label="Practiced at" value={form.attemptedAt} onChange={field('attemptedAt')} slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: '0.001' } }} disabled={busy} />
      <TextField multiline minRows={3} label="Notes" value={form.notes} onChange={field('notes')} disabled={busy} />
    </Stack>}
  </DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Cancel</Button><Button color="error" disabled={busy} onClick={() => removing ? save(true) : setRemoving(true)}>{removing ? 'Confirm removal' : 'Remove attempt'}</Button>{!removing && <Button variant="contained" disabled={busy} onClick={() => save(false)}>Save changes</Button>}</DialogActions></Dialog>;
}
function localTime(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, -1);
}
