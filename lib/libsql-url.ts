/**
 * Split a Turso connection string into the URL and the auth token expected by
 * the libSQL client. The token may be given as `?authToken=` or `?api_key=`.
 */
export function parseLibsqlUrl(raw: string): { url: string; authToken?: string } {
  const u = new URL(raw);
  const authToken =
    u.searchParams.get("authToken") ?? u.searchParams.get("api_key") ?? undefined;
  u.searchParams.delete("authToken");
  u.searchParams.delete("api_key");
  return { url: u.toString().replace(/\/$/, ""), authToken };
}
