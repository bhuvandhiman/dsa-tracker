export async function request(path, { signal, ...options } = {}) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 12000);
  try {
    const response = await fetch(`/api${path}`, { ...options, signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal, headers: { 'Content-Type': 'application/json', ...options.headers } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
    return body;
  } catch (error) {
    if (timeout.signal.aborted && !signal?.aborted) throw new Error('The API took too long to respond. Please try again.', {cause:error});
    if (error instanceof TypeError) throw new Error('Cannot reach the local API. Start the API and try again.', {cause:error});
    throw error;
  } finally { clearTimeout(timer); }
}
