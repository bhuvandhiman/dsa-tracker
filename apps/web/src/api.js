let tokenProvider=null;
export function setTokenProvider(provider){tokenProvider=provider;}
export async function request(path, { signal, ...options } = {}) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 12000);
  try {
    const token=path==='/auth/config'?null:await tokenProvider?.();
    const response = await fetch(`/api${path}`, { ...options, signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal, headers: { 'Content-Type': 'application/json', ...(token?{Authorization:`Bearer ${token}`} : {}), ...options.headers } });
    let body;
    try { body = await response.json(); }
    catch (error) {
      if (signal?.aborted || timeout.signal.aborted) throw error;
      throw new Error(response.status >= 500 ? 'The local API is unavailable. Start it and try again.' : 'The local API returned an unreadable response. Please restart it and try again.', {cause:error});
    }
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
    return body;
  } catch (error) {
    if (timeout.signal.aborted && !signal?.aborted) throw new Error('The API took too long to respond. Please try again.', {cause:error});
    if (error instanceof TypeError) throw new Error('Cannot reach the local API. Start the API and try again.', {cause:error});
    throw error;
  } finally { clearTimeout(timer); }
}
