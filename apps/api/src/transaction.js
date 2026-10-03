// A failed rollback must not hide the original failure or return an uncertain
// transaction to the shared pool (including another account's next checkout).
export async function transaction(pool, work, {readOnly = false} = {}) {
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query(readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); }
    catch { discard = true; }
    throw error;
  } finally { client.release(discard); }
}
