export function identifyLeetCodeProblem(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'leetcode.com' || url.port || url.username || url.password) return null;
  const match = url.pathname.match(/^\/problems\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/);
  if (!match) return null;
  return { platform: 'leetcode', externalId: match[1], url: `https://leetcode.com/problems/${match[1]}/` };
}
