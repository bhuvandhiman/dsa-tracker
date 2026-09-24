export async function getHealth(signal) {
  const response = await fetch('/api/health', { signal });
  if (!response.ok) throw new Error(`API returned HTTP ${response.status}.`);
  const health = await response.json();
  if (health?.status !== 'ok' || health.service !== 'dsa-tracker-api') throw new Error('Unexpected health response.');
  return health;
}

export async function requestJson(path, { body, signal, method } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method: method ?? (body === undefined ? 'GET' : 'POST'),
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new Error(cause.name === 'TimeoutError' ? 'The request timed out. Please try again.' : 'Could not reach the server. Check the API and try again.', { cause });
  }
  let data;
  try { data = await response.json(); }
  catch { throw new Error('The server returned an unreadable response. Please try again.'); }
  if (!response.ok) {
    const error = new Error(typeof data?.error === 'string' ? data.error : `Request failed (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}
